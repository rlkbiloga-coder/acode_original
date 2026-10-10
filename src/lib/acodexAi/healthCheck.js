/**
 * Health check de modelos do Acodex AI (backend).
 *
 * Mede o TTFB (tempo até o primeiro byte) de cada modelo com uma
 * requisição mínima e expõe o resultado para:
 * - o switcher exibir badge "rápido/lento" (frontend, via getModelHealth)
 * - reordenar o catálogo por saúde medida (sortByHealth)
 *
 * Os resultados ficam em cache por 10 minutos para não sondar a API
 * toda hora.
 */

const PROBE_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Sonda um modelo e mede o TTFB em ms. Falha = null.
 * @param {import("./client").AiConfig} config
 * @param {{fetchImpl?: typeof fetch, timeoutMs?: number}} [options]
 * @returns {Promise<number|null>} ttfb em ms
 */
export async function probeModelTtfb(config, options = {}) {
	const { fetchImpl = fetch, timeoutMs = PROBE_TIMEOUT_MS } = options;
	const started = Date.now();
	try {
		const response = await fetchImpl(
			`${config.baseUrl.replace(/\/+$/, "")}/chat/completions`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${config.apiKey.trim()}`,
				},
				body: JSON.stringify({
					model: config.model,
					messages: [{ role: "user", content: "ok" }],
					max_tokens: 1,
					stream: false,
				}),
				signal: AbortSignal.timeout(timeoutMs),
			},
		);
		// lê o corpo para liberar a conexão
		await response.arrayBuffer?.().catch(() => {});
		return response.ok ? Date.now() - started : null;
	} catch {
		return null;
	}
}

/**
 * Sonda vários modelos em paralelo e devolve
 * { health: Map<modelId, {ttfbMs, at}>, sorted: configs ordenadas }
 * (falhos no fim, mais lentos antes dos falhos).
 * @param {import("./client").AiConfig[]} configs
 * @param {object} [options] repassado a probeModelTtfb
 * @returns {Promise<{health: Record<string, number>, sorted: object[]}>}
 */
export async function probeModels(configs, options = {}) {
	const results = await Promise.all(
		configs.map(async (config) => ({
			config,
			ttfbMs: await probeModelTtfb(config, options),
		})),
	);
	const health = {};
	for (const { config, ttfbMs } of results) health[config.model] = ttfbMs;
	const sorted = [...results]
		.filter((r) => r.ttfbMs != null)
		.sort((a, b) => a.ttfbMs - b.ttfbMs)
		.map((r) => r.config);
	const failed = results.filter((r) => r.ttfbMs == null).map((r) => r.config);
	return { health, sorted: [...sorted, ...failed] };
}

// cache da última sondagem: { at, health }
let last = { at: 0, health: {} };

/**
 * Última saúde conhecida por modelo (para o UI). null se nunca sondado.
 * @param {string} [modelId] filtro por modelo
 * @returns {Record<string, number>|number|null}
 */
export function getModelHealth(modelId) {
	if (modelId) return last.health[modelId] ?? null;
	return last.health;
}

/** Salva resultados de sondagem para getModelHealth. */
export function setModelHealth(health) {
	last = { at: Date.now(), health: { ...health } };
}

/** @returns {boolean} true se a sondagem em cache ainda é válida */
export function healthCacheValid() {
	return Date.now() - last.at < CACHE_TTL_MS;
}
