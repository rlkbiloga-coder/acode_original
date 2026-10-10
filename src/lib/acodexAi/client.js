import { nativeFetch } from "./nativeFetch";
import { checkRequest, inspectResponse } from "./securityMonitor";

/**
 * @typedef {object} AiConfig
 * @property {string} baseUrl OpenAI-compatible base URL (e.g. https://ai-gateway.vercel.sh/v1)
 * @property {string} apiKey API key sent as a Bearer token
 * @property {string} model Model id (e.g. openai/gpt-5-mini)
 */

/**
 * @typedef {object} ToolCall
 * @property {string} id
 * @property {"function"} type
 * @property {{name: string, arguments: string}} function
 */

/**
 * @typedef {object} ChatMessage
 * @property {"system"|"user"|"assistant"|"tool"} role
 * @property {string|null} [content]
 * @property {ToolCall[]} [tool_calls]
 * @property {string} [tool_call_id]
 */

export const DEFAULT_AI_CONFIG = Object.freeze({
	baseUrl: "https://ai-gateway.vercel.sh/v1",
	model: "openai/gpt-5-mini",
});

import { BUILTIN_API_KEYS } from "./builtinCredentials";

/**
 * Retorna a chave embutida no build para a URL base, se houver.
 * @param {string} baseUrl
 * @returns {string} chave ou ""
 */
const keyPoolState = { index: 0, failed: {} };

/**
 * Retorna a chave embutida no build para a URL base, se houver. Usa o pool
 * rotativo quando existir, pulando chaves marcadas como sobrecarregadas.
 * @param {string} baseUrl
 * @returns {string} chave ou ""
 */
export function getBuiltinKeyForBaseUrl(baseUrl) {
	const url = String(baseUrl || "");
	if (!url.includes("integrate.api.nvidia.com")) return "";
	const pool = Array.isArray(BUILTIN_API_KEYS.pool)
		? BUILTIN_API_KEYS.pool.filter(Boolean)
		: [];
	if (!pool.length) return BUILTIN_API_KEYS.nvidia || "";
	const now = Date.now();
	for (let i = 0; i < pool.length; i += 1) {
		const key = pool[(keyPoolState.index + i) % pool.length];
		if ((keyPoolState.failed[key] || 0) < now) {
			keyPoolState.index = (keyPoolState.index + i + 1) % pool.length;
			return key;
		}
	}
	// todas as chaves em cooldown: usa a próxima mesmo assim
	keyPoolState.index = (keyPoolState.index + 1) % pool.length;
	return pool[keyPoolState.index];
}

/**
 * Marca uma chave do pool como falha (429/quota) por um tempo.
 * @param {string} apiKey
 * @param {number} cooldownMs
 */
export function markBuiltinKeyFailed(apiKey, cooldownMs = 60_000) {
	if (apiKey) keyPoolState.failed[apiKey] = Date.now() + cooldownMs;
}

/**
 * Completa a config com a chave embutida quando o usuário não definiu a sua.
 * @param {AiConfig} config
 * @returns {AiConfig}
 */
export function withBuiltinKey(config) {
	if (config?.apiKey?.trim()) return config;
	const key = getBuiltinKeyForBaseUrl(config?.baseUrl);
	return key ? { ...config, apiKey: key } : config;
}

export class AiRequestError extends Error {
	/**
	 * @param {string} message
	 * @param {number} [status]
	 */
	constructor(message, status) {
		super(message);
		this.name = "AiRequestError";
		this.status = status;
	}
}

/**
 * @param {Partial<AiConfig>} config
 * @returns {string|null} error message, or null when valid
 */
export function validateAiConfig(config) {
	if (!config?.apiKey?.trim()) return "missing-api-key";
	if (!config.model?.trim()) return "missing-model";
	try {
		const url = new URL(config.baseUrl || "");
		if (url.protocol !== "https:" && url.hostname !== "localhost") {
			return "insecure-base-url";
		}
	} catch {
		return "invalid-base-url";
	}
	return null;
}

/**
 * @param {string} baseUrl
 */
export function buildCompletionsUrl(baseUrl) {
	return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

/**
 * Sends one chat completion request. When `onDelta` is provided the request
 * is streamed (SSE) and each text chunk is passed to the callback; the final
 * assembled message (including tool calls) is returned either way.
 * @param {object} params
 * @param {AiConfig} params.config
 * @param {ChatMessage[]} params.messages
 * @param {object[]} [params.tools]
 * @param {AbortSignal} [params.signal]
 * @param {(delta: string) => void} [params.onDelta]
 * @param {typeof fetch} [params.fetchImpl]
 * @returns {Promise<ChatMessage>}
 */
export async function createChatCompletion({
	config,
	messages,
	tools,
	signal,
	onDelta,
	fetchImpl = nativeFetch,
}) {
	const configError = validateAiConfig(config);
	if (configError) throw new AiRequestError(configError);

	const verdict = checkRequest({ config, messages });
	if (!verdict.allowed)
		throw new AiRequestError(
			`blocked-by-security-monitor (${verdict.reasons.join(", ")})`,
			429,
		);

	const body = { model: config.model, messages };
	if (tools?.length) body.tools = tools;
	if (onDelta) body.stream = true;

	const send = () =>
		fetchImpl(buildCompletionsUrl(config.baseUrl), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: onDelta ? "text/event-stream" : "application/json",
				Authorization: `Bearer ${config.apiKey.trim()}`,
			},
			body: JSON.stringify(body),
			signal,
		});

	let response = await send();
	// sobrecarga (429): se a chave em uso veio do pool embutido, gira e tenta mais uma
	if (response.status === 429) {
		const current = config.apiKey?.trim?.() || "";
		const pool = (BUILTIN_API_KEYS.pool || []).filter(Boolean);
		if (pool.includes(current) || current === BUILTIN_API_KEYS.nvidia) {
			const next = getBuiltinKeyForBaseUrl(config.baseUrl);
			if (next && next !== current) {
				markBuiltinKeyFailed(current);
				config = { ...config, apiKey: next };
				response = await send();
			}
		}
	}

	if (!response.ok) {
		let detail = "";
		try {
			const data = await response.json();
			detail = data?.error?.message || "";
		} catch {
			// Non-JSON error body; fall back to the status text.
		}
		throw new AiRequestError(
			detail || response.statusText || `HTTP ${response.status}`,
			response.status,
		);
	}

	if (!onDelta || !response.body?.getReader) {
		const data = await response.json();
		const message = data?.choices?.[0]?.message;
		if (!message) throw new AiRequestError("empty-response");
		const inspection = inspectResponse(message.content, config.baseUrl);
		if (inspection.blocked)
			throw new AiRequestError("response-blocked-by-security-monitor", 0);
		return {
			role: "assistant",
			content: message.content ?? null,
			...(message.tool_calls?.length ? { tool_calls: message.tool_calls } : {}),
		};
	}

	const assembled = await readStream(response.body, onDelta);
	const inspection = inspectResponse(assembled?.content, config.baseUrl);
	if (inspection.blocked)
		throw new AiRequestError("response-blocked-by-security-monitor", 0);
	return assembled;
}

/**
 * Reads an OpenAI-compatible SSE stream and assembles the final message.
 * @param {ReadableStream} stream
 * @param {(delta: string) => void} onDelta
 * @returns {Promise<ChatMessage>}
 */
async function readStream(stream, onDelta) {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	const toolCalls = [];
	let content = "";
	let buffer = "";
	let sawAnything = false;

	/**
	 * @param {string} payload
	 */
	function handleEvent(payload) {
		if (!payload || payload === "[DONE]") return;
		let data;
		try {
			data = JSON.parse(payload);
		} catch {
			return; // keep-alive or malformed line
		}
		const delta = data?.choices?.[0]?.delta;
		if (!delta) return;
		sawAnything = true;
		if (typeof delta.content === "string" && delta.content) {
			content += delta.content;
			onDelta(delta.content);
		}
		for (const call of delta.tool_calls || []) {
			const slot = (toolCalls[call.index] ??= {
				id: "",
				type: "function",
				function: { name: "", arguments: "" },
			});
			if (call.id) slot.id = call.id;
			if (call.function?.name) slot.function.name += call.function.name;
			if (call.function?.arguments)
				slot.function.arguments += call.function.arguments;
		}
	}

	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			let sep;
			while ((sep = buffer.indexOf("\n\n")) !== -1) {
				const rawEvent = buffer.slice(0, sep);
				buffer = buffer.slice(sep + 2);
				for (const line of rawEvent.split("\n")) {
					if (line.startsWith("data:")) handleEvent(line.slice(5).trim());
				}
			}
		}
	} finally {
		reader.releaseLock?.();
	}

	if (!sawAnything && !toolCalls.length && !content)
		throw new AiRequestError("empty-response");

	return {
		role: "assistant",
		content: content || null,
		...(toolCalls.length ? { tool_calls: toolCalls } : {}),
	};
}
