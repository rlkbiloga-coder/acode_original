/**
 * Compressão de histórico longo do Acodex AI (backend).
 *
 * Conversas grandes viram um resumo compacto no início, mantendo as
 * mensagens recentes intactas. Isso mantém a latência e o custo estáveis
 * conforme o chat cresce (em vez de reenviar tudo em cada requisição).
 *
 * Regras de integridade:
 * - nunca deixa um `tool` como primeira mensagem mantida (quebra o pareamento
 *   com o `assistant.tool_calls` anterior); nesse caso estende a janela
 */

const DEFAULTS = {
	/** acima desse total de mensagens, comprime */
	threshold: 20,
	/** mensagens recentes mantidas ipsis litteris */
	keepLast: 12,
	/** tamanho máximo do resumo gerado, em caracteres */
	maxDigestChars: 1500,
	/** caracteres por linha do resumo */
	lineLimit: 90,
};

/**
 * Comprime `history` IN PLACE e devolve o mesmo array. Histórias curtas
 * retornam sem alteração.
 * @param {import("./client").ChatMessage[]} history
 * @param {Partial<typeof DEFAULTS>} [options]
 * @returns {import("./client").ChatMessage[]}
 */
export function compressHistory(history, options = {}) {
	const cfg = { ...DEFAULTS, ...options };
	if (!Array.isArray(history) || history.length <= cfg.threshold)
		return history;

	// ponto de corte: começa em length - keepLast e nunca num `tool`
	let cut = history.length - cfg.keepLast;
	while (cut > 0 && history[cut]?.role === "tool") cut -= 1;
	if (cut <= 0) return history;

	const digestLines = [];
	for (const message of history.slice(0, cut)) {
		const line = digestLine(message, cfg.lineLimit);
		if (line) digestLines.push(line);
	}
	let digest = digestLines.join("\n");
	if (digest.length > cfg.maxDigestChars)
		digest = `${digest.slice(0, cfg.maxDigestChars)}\n[…resumo truncado]`;

	history.splice(0, cut, {
		role: "system",
		content:
			`Resumo de ${cut} mensagens anteriores desta conversa ` +
			`(resumidas para economizar tokens; os detalhes estão abaixo):\n${digest}`,
	});
	return history;
}

function digestLine(message, lineLimit = DEFAULTS.lineLimit) {
	const clip = (text) => {
		const flat = String(text || "")
			.replace(/\s+/g, " ")
			.trim();
		return flat.length > lineLimit ? `${flat.slice(0, lineLimit)}…` : flat;
	};
	if (message?.role === "user") return `user: ${clip(message.content)}`;
	if (message?.role === "assistant") {
		const tools = (message.tool_calls || [])
			.map((c) => c.function?.name)
			.filter(Boolean)
			.join(",");
		return `assistant${tools ? ` (tools: ${tools})` : ""}: ${clip(message.content)}`;
	}
	if (message?.role === "tool") return `tool: ${clip(message.content)}`;
	return null;
}
