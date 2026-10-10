// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import { transformSync } from "@babel/core";
import { describe, expect, it } from "vitest";

const DATA_URL =
	"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsHBwgHBgoICAgLCgoLDhgQDg0NDAsPDhA=";

// O módulo fonte usa JSX (html-tag-js), compilado aqui como nos demais
// testes de páginas (ver appIconSetting.test.js).
function loadImageInput() {
	const filename = path.resolve("src/sidebarApps/aiChat/imageInput.js");
	const code = transformSync(readFileSync(filename, "utf8"), {
		filename,
		babelrc: false,
		configFile: false,
		presets: [
			["@babel/preset-env", { targets: { node: "current" }, modules: "commonjs" }],
		],
		plugins: [
			"html-tag-js/jsx/syntax-parser.js",
			"html-tag-js/jsx/jsx-to-tag.js",
		],
	}).code;
	const exportsOfModule = {};
	vm.runInNewContext(code, {
		module: { exports: exportsOfModule },
		exports: exportsOfModule,
	});
	return exportsOfModule;
}

const { buildVisionContent, DEFAULT_IMAGE_PROMPT, MAX_IMAGE_DIM } =
	loadImageInput();

describe("buildVisionContent", () => {
	it("monta conteúdo OpenAI com texto + imagem", () => {
		const content = buildVisionContent("analise este erro", DATA_URL);
		expect(content).toEqual([
			{ type: "text", text: "analise este erro" },
			{ type: "image_url", image_url: { url: DATA_URL } },
		]);
	});

	it("mantém prompt padrão pronto para uso", () => {
		expect(DEFAULT_IMAGE_PROMPT).toContain("código");
		expect(MAX_IMAGE_DIM).toBeGreaterThan(0);
	});

	it("texto vazio vira parte de texto vazia (não quebra o formato)", () => {
		const content = buildVisionContent("", DATA_URL);
		expect(content[0]).toEqual({ type: "text", text: "" });
		expect(content[1].type).toBe("image_url");
	});
});
