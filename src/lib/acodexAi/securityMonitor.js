/**
 * Monitor de segurança do Acodex AI (backend).
 *
 * Camada de defesa entre a UI e os provedores de IA:
 * - rate limit global e por provedor (janela deslizante)
 * - anti-spam de prompts repetidos e detecção de rajada (bot)
 * - teto de tamanho de payload
 * - inspeção de respostas: assinaturas de malware/exploit e
 *   tentativas de exfiltração das chaves embutidas (bloqueio)
 * - trilha de auditoria persistida com ring buffer
 *
 * A triagem assistida por IA (`aiReview`) é chamada pelo consumidor
 * apenas quando ele quiser um segundo parecer sobre um evento marcado.
 */

const DEFAULTS = {
	maxRequestsPerMinute: 30,
	maxRequestsPerMinutePerProvider: 12,
	maxPayloadChars: 200_000,
	spamWindowMs: 60_000,
	spamThreshold: 5,
	burstMinIntervalMs: 250,
	burstCount: 6,
	auditLogMax: 200,
	now: () => Date.now(),
};

const EXFIL_SIGNATURES = [
	/printf\s*\(.*BUILTIN_API_KEYS/s,
	/(?:imprima|mostrar|revele|print|leak|dump|exfil)[^\n]{0,80}(?:api[_\s]?key|bearer|token)/i,
	/(?:curl|wget|fetch|http)[^\n]{0,120}(?:\$\{?\s*(?:config\.apiKey|apiKey|key)\b|Bearer\s*\+|key\)?\}?)/i,
];

const SUSPICIOUS_SIGNATURES = [
	/\b(?:curl|wget)\b[^\n]{0,80}\|\s*(?:ba)?sh\b/,
	/powershell(?:\.exe)?\s+(?:-enc|-encodedcommand)\s/i,
	/\beval\s*\(\s*(?:atob|window\.atob|Buffer\.from\()/i,
	/document\.write\s*\(\s*(?:atob|unescape|decodeURIComponent)/i,
	/(?:\.tk|\.top|\.xyz|\.click)\b[^\n]{0,40}\?(?:token|cmd|exec)=/i,
	/\b\d{1,3}(?:\.\d{1,3}){3}:\d{2,5}\b[^\n]{0,60}(?:shell|reverse|payload)/i,
];

let config = { ...DEFAULTS };
const state = {
	requests: [],
	providerRequests: {},
	spam: {},
	burst: [],
	audit: [],
	blockedUntil: 0,
};

/**
 * Substitui os limites ativos (parcialmente). `now` permite testes
 * determinísticos.
 * @param {Partial<typeof DEFAULTS>} overrides
 */
export function configureSecurityMonitor(overrides = {}) {
	config = { ...config, ...overrides };
}

/** Reseta todo o estado (usado em testes). */
export function resetSecurityMonitor() {
	config = { ...DEFAULTS };
	state.requests = [];
	state.providerRequests = {};
	state.spam = {};
	state.burst = [];
	state.audit = [];
	state.blockedUntil = 0;
}

function audit(entry) {
	entry.at = config.now();
	entry.reason = entry.reason || "unspecified";
	state.audit.push(entry);
	if (state.audit.length > config.auditLogMax)
		state.audit.splice(0, state.audit.length - config.auditLogMax);
}

/**
 * @returns {object[]} cópia da trilha de auditoria (mais recente no fim)
 */
export function getSecurityAuditLog() {
	return [...state.audit];
}

function hash(text) {
	let h = 5381;
	for (let i = 0; i < text.length; i += 1)
		h = ((h << 5) + h + text.charCodeAt(i)) | 0;
	return `${h}:${text.length}`;
}

function providerOf(baseUrl) {
	try {
		return new URL(baseUrl).hostname;
	} catch {
		return String(baseUrl || "unknown");
	}
}

/**
 * Verifica UMA requisição antes do envio. Não lança — devolve o veredito.
 * @param {{config: object, messages: object[]}} params
 * @returns {{allowed: boolean, reasons: string[], level: number}}
 */
export function checkRequest({ config: aiConfig, messages }) {
	const now = config.now();
	const reasons = [];

	if (now < state.blockedUntil) {
		reasons.push("cooldown-active");
	}

	// rate limit global
	state.requests = state.requests.filter((t) => now - t < 60_000);
	state.requests.push(now);
	if (state.requests.length > config.maxRequestsPerMinute)
		reasons.push("rate-limit-global");

	// rate limit por provedor
	const provider = providerOf(aiConfig?.baseUrl);
	const bucket = (state.providerRequests[provider] ||= []);
	const fresh = bucket.filter((t) => now - t < 60_000);
	fresh.push(now);
	state.providerRequests[provider] = fresh;
	if (fresh.length > config.maxRequestsPerMinutePerProvider)
		reasons.push(`rate-limit:${provider}`);

	// teto de payload
	const payloadSize = JSON.stringify(messages || []).length;
	if (payloadSize > config.maxPayloadChars)
		reasons.push(`payload-too-large:${payloadSize}`);

	// spam: requisição INTEIRA idêntica repetida (loops de agente mudam o
	// payload a cada iteração, então não geram falso positivo)
	const h = hash(JSON.stringify(messages || []));
	state.spam[h] = state.spam[h] || { count: 0, first: now };
	const track = state.spam[h];
	if (now - track.first > config.spamWindowMs) {
		track.count = 0;
		track.first = now;
	}
	track.count += 1;
	if (track.count > config.spamThreshold)
		reasons.push(`duplicate-request:${track.count}`);

	// rajada (bot): N requisições quase seguidas
	state.burst = state.burst.filter((t) => now - t < 10_000);
	const last = state.burst[state.burst.length - 1];
	if (last != null && now - last < config.burstMinIntervalMs) {
		state.burst.push(now);
		if (state.burst.length >= config.burstCount)
			reasons.push(`burst:${state.burst.length}`);
	} else {
		state.burst = [now];
	}

	const level = reasons.length
		? Math.min(3, reasons.filter((r) => /spam|burst/.test(r)).length + 1)
		: 0;
	const allowed = reasons.length === 0;

	audit({
		type: "request",
		allowed,
		reason: reasons.join(", ") || "ok",
		provider,
		payloadSize,
	});

	if (!allowed) {
		// penalidade progressiva: 15s no primeiro bloqueio, dobra a cada novo
		state.blockedUntil = now + 15_000 * 2 ** Math.min(3, reasons.length - 1);
	}
	return { allowed, reasons, level };
}

/**
 * Inspeciona o conteúdo de uma resposta da IA.
 * Exfiltração das chaves embutidas = bloqueio; o resto é registrado.
 * @param {string|null} content
 * @param {string} provider
 * @returns {{flags: string[], blocked: boolean, level: number}}
 */
export function inspectResponse(content, provider = "unknown") {
	const text = String(content || "");
	const flags = [];
	let blocked = false;
	let level = 0;

	for (const sig of EXFIL_SIGNATURES) {
		if (sig.test(text)) {
			flags.push("key-exfiltration");
			blocked = true;
			level = 3;
			break;
		}
	}
	for (const sig of SUSPICIOUS_SIGNATURES) {
		if (sig.test(text)) {
			flags.push("suspicious-pattern");
			if (level < 2) level = 2;
		}
	}

	audit({
		type: "response",
		flags: flags.join(", ") || "ok",
		provider,
		blocked,
	});
	return { flags, blocked, level };
}

/**
 * Triagem assistida por IA de um evento marcado. Devolve o parecer
 * estruturado ou null em falha (nunca lança; monitor não pode derrubar o chat).
 * @param {{event: object, config: object, fetchImpl?: typeof fetch}} params
 */
export async function aiReview({ event, config: aiConfig, fetchImpl }) {
	try {
		const { createChatCompletion } = await import("./client.js");
		const prompt =
			"Você é o auditor de segurança do Acodex AI. Classifique o evento " +
			"como JSON {verdict, severity, note}. verdict: benign|suspect|malicious; " +
			"severity: 0-3. Responda SÓ com o JSON.\nEvento: " +
			JSON.stringify(event).slice(0, 2000);
		const message = await createChatCompletion({
			config: aiConfig,
			messages: [{ role: "user", content: prompt }],
			fetchImpl,
		});
		const match = /\{[\s\S]*\}/.exec(message?.content || "");
		return match ? JSON.parse(match[0]) : null;
	} catch {
		return null;
	}
}
