import { describe, expect, it, vi } from "vitest";
import { runAgent } from "lib/acodexAi/agent";
import {
	buildCompletionsUrl,
	createChatCompletion,
	validateAiConfig,
	clearResponseCache,
} from "lib/acodexAi/client";
import { createToolRegistry, truncate } from "lib/acodexAi/tools";
import { splitMarkdownCode } from "sidebarApps/aiChat/format";

const config = {
	baseUrl: "https://ai-gateway.vercel.sh/v1/",
	apiKey: "key",
	model: "openai/gpt-5-mini",
};

function makeEditor(text) {
	const state = {
		doc: {
			toString: () => text,
			get length() {
				return text.length;
			},
			sliceString: (a, b) => text.slice(a, b),
		},
		selection: { main: { from: 0, to: 0 } },
	};
	return {
		state,
		dispatch: vi.fn(({ changes }) => {
			text = text.slice(0, changes.from) + changes.insert + text.slice(changes.to);
		}),
		get text() {
			return text;
		},
	};
}

function makeDeps(overrides = {}) {
	const editor = makeEditor("hello");
	const file = { id: "f1", filename: "a.js", uri: "file:///a.js", type: "editor" };
	return {
		editor,
		deps: {
			getActiveFile: () => file,
			getOpenFiles: () => [file],
			getEditor: () => editor,
			createFile: vi.fn(),
			openFile: vi.fn(),
			switchFile: vi.fn(),
			execCommand: vi.fn(),
			listCommands: () => ["save", "exit", "toggle-sidebar"],
			confirm: vi.fn(async () => true),
			...overrides,
		},
	};
}

describe("acodexAi client", () => {
	it("validates config", () => {
		expect(validateAiConfig({ ...config, apiKey: "" })).toBe("missing-api-key");
		expect(validateAiConfig({ ...config, baseUrl: "nope" })).toBe("invalid-base-url");
		expect(validateAiConfig({ ...config, baseUrl: "http://evil.com" })).toBe(
			"insecure-base-url",
		);
		expect(validateAiConfig(config)).toBeNull();
	});

	it("builds the completions url without double slashes", () => {
		expect(buildCompletionsUrl(config.baseUrl)).toBe(
			"https://ai-gateway.vercel.sh/v1/chat/completions",
		);
	});

	it("sends bearer auth and returns the assistant message", async () => {
		const fetchImpl = vi.fn(async () => ({
			ok: true,
			json: async () => ({ choices: [{ message: { content: "hi" } }] }),
		}));
		const msg = await createChatCompletion({ config, messages: [], fetchImpl });
		expect(msg).toEqual({ role: "assistant", content: "hi" });
		expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe("Bearer key");
	});

	it("surfaces API error messages", async () => {
		clearResponseCache(); // evita resposta da cache do teste anterior
		const fetchImpl = async () => ({
			ok: false,
			status: 401,
			json: async () => ({ error: { message: "bad key" } }),
		});
		await expect(
			createChatCompletion({ config, messages: [], fetchImpl }),
		).rejects.toThrow("bad key");
	});
});

describe("acodexAi tools", () => {
	it("reads the active file", async () => {
		const { deps } = makeDeps();
		const result = await createToolRegistry(deps).execute("get_active_file", "{}");
		expect(result).toMatchObject({ name: "a.js", content: "hello", truncated: false });
	});

	it("replaces content only after confirmation", async () => {
		const { deps, editor } = makeDeps({ confirm: vi.fn(async () => false) });
		const registry = createToolRegistry(deps);
		expect(
			await registry.execute("replace_active_file", '{"content":"x"}'),
		).toHaveProperty("error");
		expect(editor.text).toBe("hello");

		deps.confirm.mockResolvedValue(true);
		expect(await registry.execute("replace_active_file", '{"content":"x"}')).toEqual({
			ok: true,
		});
		expect(editor.text).toBe("x");
	});

	it("blocks dangerous and unknown commands", async () => {
		const { deps } = makeDeps();
		const registry = createToolRegistry(deps);
		expect(await registry.execute("run_command", '{"command":"exit"}')).toHaveProperty(
			"error",
		);
		expect(await registry.execute("run_command", '{"command":"rm"}')).toHaveProperty(
			"error",
		);
		await registry.execute("run_command", '{"command":"save"}');
		expect(deps.execCommand).toHaveBeenCalledWith("save");
		const { commands } = await registry.execute("list_commands", "");
		expect(commands).not.toContain("exit");
	});

	it("handles invalid JSON and unknown tools", async () => {
		const registry = createToolRegistry(makeDeps().deps);
		expect(await registry.execute("get_selection", "{bad")).toHaveProperty("error");
		expect(await registry.execute("nope", "{}")).toHaveProperty("error");
	});

	it("rejects invalid file names", async () => {
		const { deps } = makeDeps();
		const registry = createToolRegistry(deps);
		expect(await registry.execute("create_file", '{"name":"../x"}')).toHaveProperty(
			"error",
		);
		await registry.execute("create_file", '{"name":"b.js","content":"1"}');
		expect(deps.createFile).toHaveBeenCalledWith("b.js", "1");
	});

	it("truncates long text", () => {
		expect(truncate("abcdef", 3)).toEqual({ text: "abc", truncated: true });
	});
});

describe("acodexAi agent", () => {
	it("executes tool calls then returns the final answer", async () => {
		const registry = createToolRegistry(makeDeps().deps);
		const complete = vi
			.fn()
			.mockResolvedValueOnce({
				role: "assistant",
				content: null,
				tool_calls: [
					{ id: "c1", type: "function", function: { name: "get_selection", arguments: "{}" } },
				],
			})
			.mockResolvedValueOnce({ role: "assistant", content: "done" });
		const events = [];
		const history = [{ role: "user", content: "go" }];
		await runAgent({ history, config, registry, complete, onEvent: (e) => events.push(e) });
		expect(events.map((e) => e.type)).toEqual(["tool", "assistant"]);
		expect(history.at(-2).role).toBe("tool");
		expect(history.at(-1).content).toBe("done");
		expect(complete.mock.calls[0][0].messages[0].role).toBe("system");
	});
});

describe("splitMarkdownCode", () => {
	it("splits text and fenced code", () => {
		expect(splitMarkdownCode("Hi\n```js\nconst a = 1;\n```\nBye")).toEqual([
			{ type: "text", text: "Hi" },
			{ type: "code", lang: "js", text: "const a = 1;" },
			{ type: "text", text: "Bye" },
		]);
	});
});
