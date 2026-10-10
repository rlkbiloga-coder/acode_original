import { createChatCompletion } from "./client";
import { compressHistory } from "./historyCompressor";

export const SYSTEM_PROMPT = `You are Acodex AI, the built-in assistant of the Acodex code editor for Android.
You can read and edit the user's open files and run app commands through tools.
- Before editing, read the active file with get_active_file.
- Prefer replace_active_file for multi-line edits and keep the user's code style.
- Use list_commands and run_command to control the app (themes, panes, terminal, search, save...).
- Be concise. Answer in the same language the user writes in. Use Markdown code blocks for code.`;

export const MAX_AGENT_STEPS = 8;

/**
 * @typedef {import("./client").ChatMessage} ChatMessage
 * @typedef {{type: "tool", name: string, result: object} | {type: "assistant", content: string} | {type: "assistant-delta", text: string}} AgentEvent
 */

/**
 * Runs the tool-calling loop until the model returns a final answer.
 * Mutates and returns `history` so the conversation can continue.
 * @param {object} params
 * @param {ChatMessage[]} params.history Conversation without the system prompt
 * @param {import("./client").AiConfig} params.config
 * @param {ReturnType<typeof import("./tools").createToolRegistry>} params.registry
 * @param {(event: AgentEvent) => void} [params.onEvent]
 * @param {AbortSignal} [params.signal]
 * @param {string} [params.systemContext] Extra context appended to the system prompt (e.g. active file info)
 * @param {string} [params.skillCatalog] Skill catalog prompt (see lib/acodexAi/skills.js) injected into the system prompt
 * @param {typeof createChatCompletion} [params.complete]
 * @returns {Promise<ChatMessage[]>}
 */
export async function runAgent({
	history,
	config,
	registry,
	onEvent = () => {},
	signal,
	systemContext = "",
	skillCatalog = "",
	complete = createChatCompletion,
}) {
	// histórico longo vira resumo compacto: latência estável conforme o chat cresce
	compressHistory(history);

	const parts = [SYSTEM_PROMPT];
	if (skillCatalog) parts.push(skillCatalog);
	if (systemContext) parts.push(`Contexto atual do editor:\n${systemContext}`);
	const systemPrompt = parts.join("\n\n");

	for (let step = 0; step < MAX_AGENT_STEPS; step++) {
		if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

		const message = await complete({
			config,
			messages: [{ role: "system", content: systemPrompt }, ...history],
			tools: registry.definitions,
			signal,
			onDelta: (text) => onEvent({ type: "assistant-delta", text }),
		});
		history.push(message);

		if (!message.tool_calls?.length) {
			onEvent({ type: "assistant", content: message.content || "" });
			return history;
		}

		for (const call of message.tool_calls) {
			const name = call.function?.name;
			const result = await registry.execute(name, call.function?.arguments);
			onEvent({ type: "tool", name, result });
			history.push({
				role: "tool",
				tool_call_id: call.id,
				content: JSON.stringify(result),
			});
		}
	}

	const content =
		"Limite de passos atingido. Peça para continuar se quiser que eu prossiga.";
	history.push({ role: "assistant", content });
	onEvent({ type: "assistant", content });
	return history;
}
