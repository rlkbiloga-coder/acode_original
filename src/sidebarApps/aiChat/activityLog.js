/**
 * Log de atividade (raciocínio) do Acodex AI.
 *
 * Painel expansível que mostra ao vivo o que o agente está fazendo:
 * preparação de contexto, cada ferramenta/skill executada (com status
 * e duração) e a escrita da resposta. Substitui a linha "Pensando…".
 */

const STEP_ICONS = {
	tool: "🔧",
	skill: "🧩",
	think: "🧠",
	write: "✍️",
};

/**
 * Cria um painel de atividade para um turno do agente.
 * @param {{ open?: boolean }} [options] estado inicial expandido
 */
export function createActivityLog({ open = true } = {}) {
	const startedAt = Date.now();
	let userToggled = false;
	let currentStep = null;

	const $steps = <ol className="ai-log-steps" aria-live="polite"></ol>;
	const $status = <span className="ai-log-status">Iniciando…</span>;
	const $chevron = <span className="icon expand_more ai-log-chev" />;

	const $header = (
		<button
			type="button"
			className="ai-log-header"
			aria-expanded={String(open)}
			onclick={() => {
				userToggled = true;
				toggle();
			}}
		>
			<span className="ai-log-icon" aria-hidden="true">
				🧠
			</span>
			{$status}
			{$chevron}
		</button>
	);

	const $el = (
		<div className={`ai-log${open ? " open" : ""}`}>
			{$header}
			{$steps}
		</div>
	);

	function toggle() {
		$el.classList.toggle("open");
		$header.setAttribute(
			"aria-expanded",
			String($el.classList.contains("open")),
		);
	}

	/** Tempo decorrido formatado (s.4ms). */
	function elapsed() {
		return `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
	}

	/**
	 * Adiciona uma etapa ao log.
	 * @param {string} label rótulo da etapa
	 * @param {{ icon?: string, detail?: string, running?: boolean }} [options]
	 * @returns {{ done: (detail?: string) => void, fail: (detail: string) => void }}
	 */
	function addStep(
		label,
		{ icon = STEP_ICONS.think, detail = "", running = true } = {},
	) {
		const $dot = <span className="ai-log-dot" aria-hidden="true" />;
		const $label = (
			<span className="ai-log-label">
				<span aria-hidden="true">{icon}</span> {label}
			</span>
		);
		const $meta = <span className="ai-log-meta">{detail}</span>;
		const $li = (
			<li className={`ai-log-step${running ? " running" : ""}`}>
				{$dot}
				{$label}
				{$meta}
			</li>
		);
		$steps.append($li);
		currentStep = $li;
		$el.classList.add("open");
		$header.setAttribute("aria-expanded", "true");
		scrollIntoView();

		function finish(state, text) {
			$li.classList.remove("running");
			$li.classList.add(state);
			if (text) $meta.textContent = text;
			const prefix = $meta.textContent ? $meta.textContent + " · " : "";
			$meta.textContent = prefix + elapsed();
			currentStep = null;
		}

		return {
			done: (text) => finish("done", text),
			fail: (text) => finish("fail", text),
		};
	}

	/**
	 * Atualiza a linha de status do cabeçalho.
	 * @param {string} text
	 */
	function setStatus(text) {
		$status.textContent = text;
		scrollIntoView();
	}

	function scrollIntoView() {
		if (typeof $el.scrollIntoView === "function") {
			$el.scrollIntoView({ block: "nearest" });
		}
	}

	/**
	 * Encerra o turno: status final, colapsa se ninguém mexeu.
	 * @param {{ error?: boolean }} [options]
	 */
	function finish({ error = false } = {}) {
		setStatus((error ? "Falhou · " : "Concluído · ") + elapsed());
		$el.classList.add("finished", error ? "failed" : "ok");
		if (!userToggled && $steps.childElementCount > 2) {
			$el.classList.remove("open");
			$header.setAttribute("aria-expanded", "false");
		}
	}

	return { $el, addStep, setStatus, finish };
}
