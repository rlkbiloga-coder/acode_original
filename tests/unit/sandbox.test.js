import { describe, expect, it } from "vitest";
import {
	modePrompt,
	parseShellCommand,
	runJavaScript,
	runShellCommand,
	SANDBOX_MODES,
} from "lib/sandbox";
import { JS_WORKER_SOURCE } from "lib/sandbox/workerSource";

describe("sandbox modes", () => {
	it("exposes js, py and sh", () => {
		expect(SANDBOX_MODES).toEqual(["js", "py", "sh"]);
	});

	it("renders the prompt prefix per mode", () => {
		expect(modePrompt("js")).toBe("js>");
		expect(modePrompt("py")).toBe("py>");
		expect(modePrompt("sh")).toBe("sh$");
		expect(modePrompt("unknown")).toBe("js>");
	});
});

describe("parseShellCommand", () => {
	it("splits name and args", () => {
		expect(parseShellCommand("echo  hello   world")).toEqual({
			name: "echo",
			args: ["hello", "world"],
		});
	});

	it("handles empty lines", () => {
		expect(parseShellCommand("   ")).toEqual({ name: "", args: [] });
	});
});

describe("runShellCommand", () => {
	it("echoes arguments", () => {
		const { lines } = runShellCommand("echo hi there");
		expect(lines).toEqual([{ type: "log", text: "hi there" }]);
	});

	it("clears the screen", () => {
		expect(runShellCommand("clear").clear).toBe(true);
	});

	it("identifies the user as acodex", () => {
		expect(runShellCommand("whoami").lines[0].text).toBe("acodex");
	});

	it("rejects unsupported commands with an error line", () => {
		const { lines } = runShellCommand("rm -rf /");
		expect(lines[0].type).toBe("error");
		expect(lines[0].text).toContain("rm");
	});

	it("returns nothing for an empty line", () => {
		expect(runShellCommand("").lines).toEqual([]);
	});
});

describe("worker source", () => {
	it("is a non-empty script string", () => {
		expect(typeof JS_WORKER_SOURCE).toBe("string");
		expect(JS_WORKER_SOURCE).toContain("addEventListener");
		expect(JS_WORKER_SOURCE).toContain("console");
	});
});

describe("runJavaScript", () => {
	/** Minimal in-memory Worker double driven by the real worker contract. */
	function makeFakeWorker() {
		const listeners = {};
		const instance = {
			onmessage: null,
			onerror: null,
			posted: null,
			terminate: () => {},
			postMessage: (message) => {
				instance.posted = message;
				// Simulate: console.log then end
				instance.onmessage?.({ data: { type: "log", text: "olá" } });
				instance.onmessage?.({ data: { type: "end", text: "" } });
			},
		};
		return instance;
	}

	it("collects log lines from the worker", async () => {
		const worker = makeFakeWorker();
		const lines = await runJavaScript("console.log('x')", {
			WorkerCtor: function FakeWorker() {
				return worker;
			},
			makeUrl: () => "blob:fake",
			timeoutMs: 1000,
		});
		// the "end" signal terminates the worker and is not surfaced as a line
		expect(lines).toEqual([{ type: "log", text: "olá" }]);
		expect(worker.posted).toEqual({ code: "console.log('x')" });
	});

	it("resolves with an error line when Worker cannot start", async () => {
		const lines = await runJavaScript("1", {
			WorkerCtor: function BrokenWorker() {
				throw new Error("boom");
			},
			makeUrl: () => "blob:fake",
		});
		expect(lines[0].type).toBe("error");
		expect(lines[0].text).toContain("boom");
	});

	it("times out long-running code", async () => {
		const worker = {
			onmessage: null,
			onerror: null,
			terminate: () => {},
			postMessage: () => {},
			addEventListener: () => {},
		};
		const lines = await runJavaScript("while(true){}", {
			WorkerCtor: function FakeWorker() {
				return worker;
			},
			makeUrl: () => "blob:fake",
			timeoutMs: 30,
		});
		expect(lines[0].type).toBe("error");
		expect(lines[0].text).toContain("Timeout");
	});
});
