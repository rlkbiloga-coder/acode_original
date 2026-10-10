/**
 * Janela de contexto do cursor (backend).
 *
 * Em vez de injetar o arquivo inteiro no prompt, extrai só a janela de
 * linhas ao redor do cursor (o trecho que o programador está vendo).
 * Menos tokens = resposta mais rápida e mais barata.
 *
 * O frontend chama buildFileWindowContext e adiciona ao systemContext.
 */

export const DEFAULT_WINDOW_ROWS = 80;

/**
 * Monta o contexto do arquivo ativo limitado à janela do cursor.
 * @param {object} params
 * @param {string} [params.filename] nome do arquivo
 * @param {string} [params.text] conteúdo completo do arquivo
 * @param {number} [params.cursorRow] linha do cursor (0-based)
 * @param {number} [params.windowRows] total de linhas da janela
 * @returns {string} contexto pronto para o systemContext
 */
export function buildFileWindowContext({
	filename = "",
	text = "",
	cursorRow = 0,
	windowRows = DEFAULT_WINDOW_ROWS,
} = {}) {
	if (!text) return "";
	const lines = text.split("\n");
	const half = Math.floor(windowRows / 2);
	let start = Math.max(0, (cursorRow || 0) - half);
	let end = Math.min(lines.length, start + windowRows);
	start = Math.max(0, end - windowRows);
	const visible = lines.slice(start, end);
	const gutterWidth = String(end).length;
	const numbered = visible
		.map(
			(line, i) =>
				`${String(start + i + 1).padStart(gutterWidth, " ")}| ${line}`,
		)
		.join("\n");
	return [
		`Arquivo ativo: ${filename || "(sem nome)"}`,
		`Exibindo linhas ${start + 1}-${end} de ${lines.length} (janela do cursor).`,
		"```",
		numbered,
		"```",
	].join("\n");
}
