// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { transformSync } from "@babel/core";
import { describe, expect, it } from "vitest";
import vm from "node:vm";

const requireFromRoot = createRequire(path.resolve("package.json"));
requireFromRoot("html-tag-js/polyfill");
const tag = requireFromRoot("html-tag-js");

function loadActivityLog() {
	const filename = path.resolve(
		"src/sidebarApps/aiChat/activityLog.js",
	);
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
		tag,
	});
	return exportsOfModule.createActivityLog;
}

const createActivityLog = loadActivityLog();

function textOf(el, selector) {
	const found = el.querySelector(selector);
	return found ? found.textContent : "";
}

describe("createActivityLog", () => {
	it("exibe o painel e registra etapas com status", () => {
		const log = createActivityLog();
		expect(log.$el.classList.contains("open")).toBe(true);

		const step = log.addStep("Lendo arquivo ativo", { icon: "🔧" });
		expect(textOf(log.$el, ".ai-log-label")).toContain("Lendo arquivo ativo");

		step.done("ok");
		expect(
			log.$el.querySelectorAll(".ai-log-step.done").length,
		).toBe(1);

		log.setStatus("Escrevendo resposta…");
		expect(textOf(log.$el, ".ai-log-status")).toContain("Escrevendo");

		log.finish();
		expect(log.$el.classList.contains("finished")).toBe(true);
		expect(log.$el.classList.contains("ok")).toBe(true);
	});

	it("etapa com erro marca falha no painel", () => {
		const log = createActivityLog();
		const step = log.addStep("Executando skill", { icon: "🧩" });
		step.fail("timeout");
		log.finish({ error: true });
		expect(
			log.$el.querySelectorAll(".ai-log-step.fail").length,
		).toBe(1);
		expect(log.$el.classList.contains("failed")).toBe(true);
	});

	it("colapsa ao final quando há muitas etapas e ninguém mexeu", () => {
		const log = createActivityLog();
		log.addStep("a").done();
		log.addStep("b").done();
		log.addStep("c").done();
		log.finish();
		expect(log.$el.classList.contains("open")).toBe(false);
	});

	it("permanece aberto se a usuária expandir manualmente", () => {
		const log = createActivityLog({ open: false });
		expect(log.$el.classList.contains("open")).toBe(false);
		// simula clique manual no cabeçalho (handler ligado como propriedade)
		log.$el.querySelector(".ai-log-header").onclick();
		expect(log.$el.classList.contains("open")).toBe(true);
		log.addStep("x").done();
		log.addStep("y").done();
		log.addStep("z").done();
		log.finish();
		expect(log.$el.classList.contains("open")).toBe(true);
	});
});
