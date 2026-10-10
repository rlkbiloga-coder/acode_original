import { nativeFetch } from "./nativeFetch";
/**
 * Catálogo central de provedores e modelos do Acodex AI.
 *
 * Para adicionar um novo provedor, basta acrescentar uma entrada em
 * AI_PROVIDERS abaixo — o seletor de modelos no chat mostra tudo
 * automaticamente, sem tocar em mais nada.
 *
 * @typedef {object} AiModel
 * @property {string} id Model id sent to the API (e.g. openai/gpt-5-mini)
 * @property {string} label Friendly display name
 * @property {string[]} [badges] e.g. ["visão", "tools", "128k"]
 *
 * @typedef {object} AiProvider
 * @property {string} id Stable id (e.g. "openrouter")
 * @property {string} label Display name
 * @property {string} baseUrl Default OpenAI-compatible base URL
 * @property {string} [match] Hostname (or suffix) used to detect the provider
 * @property {string} [accent] CSS color for the provider badge
 * @property {AiModel[]} [models] Curated models shown even before a refresh
 */

/** @type {AiProvider[]} */
export const AI_PROVIDERS = [
	{
		id: "nvidia",
		label: "NVIDIA NIM",
		baseUrl: "https://integrate.api.nvidia.com/v1",
		match: "integrate.api.nvidia.com",
		accent: "#76b900",
		models: [
			{
				id: "nvidia/nemotron-3.5-lightning-30b-a3b",
				label: "Nemotron 3.5 Lightning 30B A3B",
				badges: ["raciocínio", "rápido", "0.4s"],
			},
			{
				id: "google/diffusiongemma-26b-a4b-it",
				label: "DiffusionGemma 26B A4B",
				badges: ["visão", "raciocínio", "0.4s"],
			},
			{
				id: "nvidia/nemotron-3-ultra-550b-a55b",
				label: "Nemotron 3 Ultra 550B A55B",
				badges: ["raciocínio", "premium"],
			},
			{
				id: "nvidia/ising-calibration-1.5-31b",
				label: "Ising Calibration 1.5 31B",
				badges: ["visão", "tools"],
			},
			{
				id: "moonshotai/kimi-k3",
				label: "Kimi K3 (Moonshot)",
				badges: ["visão", "raciocínio"],
			},
			{
				id: "z-ai/glm-5.3-flash",
				label: "GLM 5.3 Flash (Z.AI)",
				badges: ["raciocínio", "rápido"],
			},
		],
	},
	{
		id: "openrouter",
		label: "OpenRouter",
		baseUrl: "https://openrouter.ai/api/v1",
		match: "openrouter.ai",
		accent: "#8b5cf6",
		models: [
			{
				id: "anthropic/claude-sonnet-4",
				label: "Claude Sonnet 4",
				badges: ["tools", "code"],
			},
			{ id: "openai/gpt-5-mini", label: "GPT-5 mini", badges: ["tools"] },
			{
				id: "google/gemini-2.5-flash",
				label: "Gemini 2.5 Flash",
				badges: ["visão", "rápido"],
			},
			{
				id: "deepseek/deepseek-r1",
				label: "DeepSeek R1",
				badges: ["raciocínio"],
			},
			{
				id: "deepseek/deepseek-r1:free",
				label: "DeepSeek R1 (free)",
				badges: ["raciocínio", "free"],
			},
			{
				id: "qwen/qwen3-coder:free",
				label: "Qwen3 Coder (free)",
				badges: ["code", "free"],
			},
		],
	},
	{
		id: "groq",
		label: "Groq",
		baseUrl: "https://api.groq.com/openai/v1",
		match: "api.groq.com",
		accent: "#f55036",
		models: [
			{
				id: "llama-3.3-70b-versatile",
				label: "Llama 3.3 70B Versatile",
				badges: ["rápido"],
			},
			{ id: "qwen/qwen3-32b", label: "Qwen 3 32B", badges: ["tools"] },
		],
	},
	{
		id: "cerebras",
		label: "Cerebras",
		baseUrl: "https://api.cerebras.ai/v1",
		match: "api.cerebras.ai",
		accent: "#f97316",
		models: [
			{
				id: "llama-3.1-8b",
				label: "Llama 3.1 8B",
				badges: ["free", "rápido"],
			},
			{
				id: "qwen-3-32b",
				label: "Qwen 3 32B",
				badges: ["free", "tools"],
			},
		],
	},
	{
		id: "mistral",
		label: "Mistral AI",
		baseUrl: "https://api.mistral.ai/v1",
		match: "api.mistral.ai",
		accent: "#ff7000",
		models: [
			{
				id: "codestral-latest",
				label: "Codestral",
				badges: ["code", "free"],
			},
			{
				id: "magistral-small-latest",
				label: "Magistral Small",
				badges: ["raciocínio", "free"],
			},
		],
	},
	{
		id: "together",
		label: "Together AI",
		baseUrl: "https://api.together.xyz/v1",
		match: "api.together.xyz",
		accent: "#0f6fff",
		models: [
			{
				id: "deepseek-ai/DeepSeek-R1",
				label: "DeepSeek R1",
				badges: ["raciocínio", "free"],
			},
			{
				id: "Qwen/Qwen2.5-Coder-32B-Instruct",
				label: "Qwen 2.5 Coder 32B",
				badges: ["code", "free"],
			},
		],
	},
	{
		id: "huggingface",
		label: "Hugging Face Router",
		baseUrl: "https://router.huggingface.co/v1",
		match: "router.huggingface.co",
		accent: "#ffd21e",
		models: [
			{
				id: "deepseek-ai/DeepSeek-V3-0324",
				label: "DeepSeek V3",
				badges: ["free"],
			},
			{
				id: "Qwen/Qwen3-235B-A22B",
				label: "Qwen 3 235B",
				badges: ["free", "raciocínio"],
			},
		],
	},
	{
		id: "ollama",
		label: "Ollama (local)",
		baseUrl: "http://localhost:11434/v1",
		match: "localhost:11434",
		accent: "#a3a3a3",
		models: [
			{
				id: "qwen2.5-coder:7b",
				label: "Qwen 2.5 Coder 7B",
				badges: ["local", "code"],
			},
			{
				id: "deepseek-r1:8b",
				label: "DeepSeek R1 8B",
				badges: ["local", "raciocínio"],
			},
		],
	},
	{
		id: "lmstudio",
		label: "LM Studio (local)",
		baseUrl: "http://localhost:1234/v1",
		match: "localhost:1234",
		accent: "#4a9eff",
		models: [
			{
				id: "qwen2.5-coder-7b-instruct",
				label: "Qwen 2.5 Coder 7B",
				badges: ["local", "code"],
			},
		],
	},
	{
		id: "vercel",
		label: "Vercel AI Gateway",
		baseUrl: "https://ai-gateway.vercel.sh/v1",
		match: "ai-gateway.vercel.sh",
		accent: "#ffffff",
		models: [
			{ id: "openai/gpt-5-mini", label: "GPT-5 mini", badges: ["tools"] },
			{
				id: "anthropic/claude-sonnet-4",
				label: "Claude Sonnet 4",
				badges: ["tools", "code"],
			},
		],
	},
	{
		id: "openai",
		label: "OpenAI",
		baseUrl: "https://api.openai.com/v1",
		match: "api.openai.com",
		accent: "#10a37f",
		models: [
			{ id: "gpt-5-mini", label: "GPT-5 mini", badges: ["tools"] },
			{ id: "gpt-4.1", label: "GPT-4.1", badges: ["visão", "tools"] },
		],
	},
];

/**
 * Detects which catalog provider a base URL belongs to.
 * @param {string} baseUrl
 * @returns {AiProvider|null}
 */
export function getProviderForBaseUrl(baseUrl) {
	// Compara host com porta (ex.: localhost:11434 para o Ollama local).
	let host = "";
	try {
		const url = new URL(baseUrl);
		host = `${url.hostname}${url.port ? `:${url.port}` : ""}`;
	} catch {
		return null;
	}
	return (
		AI_PROVIDERS.find(
			(p) => host === p.match || host.endsWith(`.${p.match}`),
		) || null
	);
}

/**
 * Builds the full flat catalog, tagging each entry with its provider.
 * @returns {{ provider: AiProvider, model: AiModel }[]}
 */
export function listCatalogModels() {
	return AI_PROVIDERS.flatMap((provider) =>
		(provider.models || []).map((model) => ({ provider, model })),
	);
}

/**
 * Fetches the models currently available on an OpenAI-compatible endpoint
 * (GET {baseUrl}/models). Whatever new model you enable on the provider
 * shows up here — that is what keeps the switcher always current.
 *
 * @param {object} params
 * @param {string} params.baseUrl
 * @param {string} [params.apiKey]
 * @param {typeof fetch} [params.fetchImpl]
 * @returns {Promise<string[]>} sorted model ids
 */
export async function fetchAvailableModels({
	baseUrl,
	apiKey,
	fetchImpl = nativeFetch,
}) {
	const url = `${baseUrl.replace(/\/+$/, "")}/models`;
	const headers = { Accept: "application/json" };
	if (apiKey?.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`;

	const response = await fetchImpl(url, { headers });
	if (!response.ok) {
		throw new Error(
			`HTTP ${response.status} ${response.statusText || ""}`.trim(),
		);
	}
	const data = await response.json();
	const ids = (Array.isArray(data) ? data : data?.data || [])
		.map((m) => m?.id)
		.filter(Boolean);
	return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}
