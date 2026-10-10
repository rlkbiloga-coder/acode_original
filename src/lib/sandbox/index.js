/**
 * Acodex Sandbox engine — runs JavaScript (Web Worker), Python (Pyodide)
 * and a minimal shell emulator. Pure helpers are exported for unit tests.
 */

import { runPythonCode } from "lib/pythonRunner";
import { createWorkerUrl, JS_WORKER_SOURCE } from "./workerSource";

/** Available sandbox modes. */
export const SANDBOX_MODES = ["js", "py", "sh"];

/** Prompt prefix per mode. */
export function modePrompt(mode) {
	switch (mode) {
		case "py":
			return "py>";
		case "sh":
			return "sh$";
		default:
			return "js>";
	}
}

/** Parses the first word of a command line. Exposed for tests. */
export function parseShellCommand(line) {
	const parts = String(line || "")
		.trim()
		.split(/\s+/);
	return { name: parts[0] || "", args: parts.slice(1) };
}

/**
 * Minimal shell emulator: a few no-side-effect commands that work without
 * a real filesystem. Real bash needs Termux-level native integration.
 * @param {string} line raw command line
 * @returns {{lines: Array<{type: string, text: string}>, clear?: boolean}}
 */
export function runShellCommand(line) {
	const { name, args } = parseShellCommand(line);
	const out = (text, type = "log") => ({ type, text });
	switch (name) {
		case "":
			return { lines: [] };
		case "help":
			return {
				lines: [
					out("Acodex sandbox shell (emulado)"),
					out("Comandos: help, clear, echo, date, whoami, ver"),
					out("Para bash real: integração Termux (roadmap)"),
					out("Modos: js> JavaScript • py> Python (Pyodide) • sh$ shell"),
				],
			};
		case "clear":
			return { lines: [], clear: true };
		case "echo":
			return { lines: [out(args.join(" "))] };
		case "date":
			return { lines: [out(new Date().toString())] };
		case "whoami":
			return { lines: [out("acodex")] };
		case "ver":
			return { lines: [out("Acodex Sandbox 1.0")] };
		default:
			return {
				lines: [
					out(`sh: comando não suportado: ${name} (use "help")`, "error"),
				],
			};
	}
}

/**
 * Runs JavaScript in a fresh Web Worker, capturing console output and errors.
 * @param {string} code
 * @param {{timeoutMs?: number, WorkerCtor?: any, makeUrl?: Function}} [options]
 * @returns {Promise<Array<{type: string, text: string}>>}
 */
export function runJavaScript(code, options = {}) {
	const {
		timeoutMs = 5000,
		WorkerCtor = Worker,
		makeUrl = createWorkerUrl,
	} = options;
	return new Promise((resolve) => {
		const lines = [];
		let worker;
		try {
			worker = new WorkerCtor(makeUrl(JS_WORKER_SOURCE));
		} catch (error) {
			resolve([
				{ type: "error", text: `Falha ao iniciar sandbox: ${error.message}` },
			]);
			return;
		}
		const finish = () => {
			clearTimeout(timer);
			worker.terminate();
			resolve(lines);
		};
		const timer = setTimeout(() => {
			lines.push({ type: "error", text: `Timeout de ${timeoutMs}ms excedido` });
			finish();
		}, timeoutMs);
		worker.onmessage = (event) => {
			const { type, text } = event.data || {};
			if (type === "end") {
				finish();
				return;
			}
			lines.push({ type, text });
		};
		worker.onerror = (event) => {
			lines.push({ type: "error", text: event.message || "Worker error" });
			finish();
		};
		worker.postMessage({ code });
	});
}

/**
 * Runs Python via Pyodide, returning sandbox lines.
 * @param {string} code
 * @returns {Promise<Array<{type: string, text: string}>>}
 */
export async function runPython(code) {
	const lines = [];
	const { stdout, stderr, result } = await runPythonCode(code);
	for (const line of (stdout || "").split("\n")) {
		if (line) lines.push({ type: "log", text: line });
	}
	for (const line of (stderr || "").split("\n")) {
		if (line) lines.push({ type: "error", text: line });
	}
	if (result !== null && !stdout) lines.push({ type: "result", text: result });
	return lines;
}
