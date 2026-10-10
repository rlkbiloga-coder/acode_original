import { describe, expect, it, beforeEach } from "vitest";
import {
	cacheKey,
	clearResponseCache,
	getCachedResponse,
	storeCachedResponse,
} from "lib/acodexAi/responseCache";
import { compressHistory } from "lib/acodexAi/historyCompressor";
import { buildFileWindowContext } from "lib/acodexAi/contextWindow";
import {
	getModelHealth,
	probeModels,
	setModelHealth,
} from "lib/acodexAi/healthCheck";
import { createChatCompletion } from "lib/acodexAi/client";

const cfg = {
	baseUrl: "https://integrate.api.nvidia.com/v1",
	model: "test-model",
	apiKey: "k",
};

describe("responseCache", () => {
	beforeEach(() => clearResponseCache());

	it("guarda e devolve resposta idêntica", () => {
		const messages = [{ role: "user", content: "oi" }];
		storeCachedResponse(cfg, messages, undefined, {
			role: "assistant",
			content: "olá",
		});
		expect(getCachedResponse(cfg, messages, undefined)?.content).toBe("olá");
	});

	it("não cacheia resposta com tool_calls", () => {
		const messages = [{ role: "user", content: "oi" }];
		storeCachedResponse(cfg, messages, undefined, {
			role: "assistant",
			content: null,
			tool_calls: [{ id: "1", type: "function", function: { name: "f", arguments: "{}" } }],
		});
		expect(getCachedResponse(cfg, messages, undefined)).toBeNull();
	});

	it("chave difere com histórico ou modelo diferente", () => {
		const a = cacheKey(cfg, [{ role: "user", content: "a" }], []);
		const b = cacheKey({ ...cfg, model: "outro" }, [{ role: "user", content: "a" }], []);
		const c = cacheKey(cfg, [{ role: "user", content: "b" }], []);
		expect(new Set([a, b, c]).size).toBe(3);
	});
});

describe("compressHistory", () => {
	it("não altera histórico curto", () => {
		const history = [
			{ role: "user", content: "oi" },
			{ role: "assistant", content: "olá" },
		];
		expect(compressHistory(history)).toHaveLength(2);
	});

	it("comprime histórico longo em resumo + recentes", () => {
		const history = [];
		for (let i = 0; i < 30; i += 1)
			history.push({ role: "user", content: `pergunta ${i}` });
		const compressed = compressHistory(history);
		expect(compressed.length).toBeLessThan(30);
		expect(compressed[0].role).toBe("system");
		expect(compressed[0].content).toContain("pergunta 0");
	});

	it("nunca começa a janela mantida com mensagem tool", () => {
		const history = [];
		for (let i = 0; i < 24; i += 1)
			history.push({ role: "user", content: `p${i}` });
		history.push({
			role: "assistant",
			content: null,
			tool_calls: [{ id: "t1", type: "function", function: { name: "read", arguments: "{}" } }],
		});
		history.push({ role: "tool", tool_call_id: "t1", content: "{}" });
		const compressed = compressHistory(history);
		expect(compressed[0].role).not.toBe("tool");
		// o pareamento tool_calls -> tool sobreviveu
		const toolIdx = compressed.findIndex((m) => m.role === "tool");
		expect(compressed[toolIdx - 1].tool_calls?.[0].id).toBe("t1");
	});
});

describe("buildFileWindowContext", () => {
	it("arquivo vazio gera string vazia", () => {
		expect(buildFileWindowContext({ text: "" })).toBe("");
	});

	it("extrai janela centrada no cursor", () => {
		const text = Array.from({ length: 300 }, (_, i) => `linha ${i + 1}`).join("\n");
		const context = buildFileWindowContext({
			filename: "app.js",
			text,
			cursorRow: 150,
			windowRows: 10,
		});
		expect(context).toContain("app.js");
		expect(context).toContain("linha 146");
		expect(context).toContain("linha 155");
		expect(context).not.toContain("linha 1\n");
	});

	it("arquivo menor que a janela mostra tudo", () => {
		const context = buildFileWindowContext({
			filename: "a.js",
			text: "um\ndois",
			cursorRow: 0,
			windowRows: 80,
		});
		expect(context).toContain("um");
		expect(context).toContain("dois");
	});
});

describe("healthCheck", () => {
	it("mede TTFB e ordena por velocidade (falhos no fim)", async () => {
		const impl = {
			fast: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }),
			slow: async () => {
				await new Promise((r) => setTimeout(r, 5));
				return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) };
			},
			dead: async () => ({ ok: false, arrayBuffer: async () => new ArrayBuffer(0) }),
		};
		// injeta via monkey patch do módulo não é trivial; usamos fetchImpl global
		const fetchByModel = async (url, init) => {
			const model = JSON.parse(init.body).model;
			if (model === "slow") return impl.slow();
			if (model === "dead") return impl.dead();
			return impl.fast();
		};
		const makeConfig = (model) => ({ ...cfg, model });
		const { health, sorted } = await probeModels(
			[makeConfig("slow"), makeConfig("dead"), makeConfig("fast")],
			{ fetchImpl: fetchByModel },
		);
		expect(health.fast).toBeLessThan(health.slow);
		expect(health.dead).toBeNull();
		expect(sorted[0].model).toBe("fast");
		expect(sorted.at(-1).model).toBe("dead");
	});

	it("getModelHealth expõe a última sondagem", () => {
		setModelHealth({ "m1": 123 });
		expect(getModelHealth("m1")).toBe(123);
		expect(getModelHealth("x")).toBeNull();
	});
});

describe("client com cache e retry", () => {
	it("responde da cache na segunda chamada sem chamar fetch", async () => {
		clearResponseCache();
		let calls = 0;
		const fetchImpl = async () => {
			calls += 1;
			return {
				ok: true,
				json: async () => ({
					choices: [{ message: { role: "assistant", content: "resposta" } }],
				}),
			};
		};
		const messages = [{ role: "user", content: "pergunta" }];
		const first = await createChatCompletion({ config: cfg, messages, fetchImpl });
		const second = await createChatCompletion({ config: cfg, messages, fetchImpl });
		expect(first.content).toBe("resposta");
		expect(second.content).toBe("resposta");
		expect(calls).toBe(1);
	});
});
