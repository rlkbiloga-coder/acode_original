/**
 * Cache de respostas do Acodex AI (backend).
 *
 * Requisições idênticas (mesma config + mesmo histórico + mesmas tools)
 * devolvem a resposta da cache instantaneamente, sem gastar API.
 * - TTL de 24h e limite de 50 entradas (LRU simples)
 * - Respostas com tool_calls não são cacheadas (loop não determinístico)
 * - Persistência em localStorage quando disponível (WebView do app)
 */

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 50;
const STORAGE_KEY = "acodex.ai.responseCache.v1";

/** @type {Map<string, {at: number, message: object}>} */
let cache = new Map();
let loaded = false;

function hash(text) {
	let h = 5381;
	for (let i = 0; i < text.length; i += 1)
		h = ((h << 5) + h + text.charCodeAt(i)) | 0;
	return `${h}:${text.length}`;
}

function load() {
	if (loaded) return;
	loaded = true;
	try {
		const raw = localStorage?.getItem?.(STORAGE_KEY);
		const entries = raw ? JSON.parse(raw) : [];
		const now = Date.now();
		for (const [key, entry] of entries) {
			if (now - entry.at < TTL_MS) cache.set(key, entry);
		}
	} catch {
		// sem localStorage (testes): cache só em memória
	}
}

function persist() {
	try {
		localStorage?.setItem?.(
			STORAGE_KEY,
			JSON.stringify([...cache.entries()].slice(-MAX_ENTRIES)),
		);
	} catch {
		// ignora falha de persistência
	}
}

/**
 * Monta a chave da cache para uma requisição.
 * @param {object} config
 * @param {object[]} messages
 * @param {object[]} [tools]
 * @returns {string}
 */
export function cacheKey(config, messages, tools) {
	return hash(
		`${config?.baseUrl}|${config?.model}|${JSON.stringify(messages || [])}|${JSON.stringify(tools || [])}`,
	);
}

/**
 * Busca uma resposta cacheada ainda válida.
 * @param {object} config
 * @param {object[]} messages
 * @param {object[]} [tools]
 * @returns {object|null} mensagem da IA ou null
 */
export function getCachedResponse(config, messages, tools) {
	load();
	const entry = cache.get(cacheKey(config, messages, tools));
	if (!entry) return null;
	if (Date.now() - entry.at >= TTL_MS) {
		cache.delete(entry && cacheKey(config, messages, tools));
		persist();
		return null;
	}
	return entry.message;
}

/**
 * Guarda uma resposta na cache (LRU: remove a mais antiga acima do limite).
 * @param {object} config
 * @param {object[]} messages
 * @param {object[]} [tools]
 * @param {object} message resposta da IA (sem tool_calls)
 */
export function storeCachedResponse(config, messages, tools, message) {
	load();
	if (!message || message.tool_calls?.length) return;
	const key = cacheKey(config, messages, tools);
	cache.delete(key);
	cache.set(key, { at: Date.now(), message });
	while (cache.size > MAX_ENTRIES) {
		const oldest = cache.keys().next().value;
		cache.delete(oldest);
	}
	persist();
}

/** Limpa a cache inteira (testes / reset). */
export function clearResponseCache() {
	cache = new Map();
	loaded = true;
	try {
		localStorage?.removeItem?.(STORAGE_KEY);
	} catch {
		// ignora
	}
}
