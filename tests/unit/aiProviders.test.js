// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
	AI_PROVIDERS,
	getProviderForBaseUrl,
	listCatalogModels,
} from "lib/acodexAi/models";

describe("catálogo de provedores AI", () => {
	it("ids de provedores são únicos", () => {
		const ids = AI_PROVIDERS.map((p) => p.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("lista os provedores free/open-source", () => {
		const ids = AI_PROVIDERS.map((p) => p.id);
		for (const id of [
			"openrouter",
			"groq",
			"cerebras",
			"mistral",
			"together",
			"huggingface",
			"ollama",
			"lmstudio",
		]) {
			expect(ids).toContain(id);
		}
	});

	it("todo provedor tem baseUrl e label", () => {
		for (const p of AI_PROVIDERS) {
			expect(p.baseUrl).toMatch(/^https?:\/\/\S+\/v1$/);
			expect(p.label.length).toBeGreaterThan(0);
		}
	});

	it("detecta provedor pelo baseUrl, inclusive localhost com porta", () => {
		expect(getProviderForBaseUrl("https://openrouter.ai/api/v1")?.id).toBe(
			"openrouter",
		);
		expect(
			getProviderForBaseUrl("http://localhost:11434/v1")?.id,
		).toBe("ollama");
		expect(getProviderForBaseUrl("http://localhost:1234/v1")?.id).toBe(
			"lmstudio",
		);
		expect(getProviderForBaseUrl("https://api.cerebras.ai/v1")?.id).toBe(
			"cerebras",
		);
		expect(getProviderForBaseUrl("https://exemplo.com/v1")).toBe(null);
	});

	it("modelos free do OpenRouter carregam badge free", () => {
		const free = listCatalogModels().filter((e) =>
			e.model.id.endsWith(":free"),
		);
		expect(free.length).toBeGreaterThanOrEqual(2);
		for (const e of free) {
			expect(e.model.badges).toContain("free");
		}
	});
});
