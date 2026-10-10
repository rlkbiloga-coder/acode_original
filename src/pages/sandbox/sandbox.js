import EditorFile from "lib/editorFile";
import {
	modePrompt,
	runJavaScript,
	runPython,
	runShellCommand,
	SANDBOX_MODES,
} from "lib/sandbox";

/**
 * Opens the Sandbox terminal tab as an EditorFile page.
 */
export default function openSandboxTab() {
	const existing = editorManager.files.find((f) => f.id === "sandbox-tab");
	if (existing) {
		existing.makeActive();
		return;
	}

	const sandboxFile = new EditorFile("Sandbox", {
		id: "sandbox-tab",
		render: true,
		type: "page",
		content: createSandboxContent(),
		tabIcon: "icon terminal",
		hideQuickTools: true,
	});
	sandboxFile.setCustomTitle(() => "Sandbox Terminal");
}

/**
 * Creates the sandbox terminal UI.
 * @returns {HTMLElement}
 */
function createSandboxContent() {
	let mode = "js";
	let busy = false;
	const history = [];
	let historyIndex = -1;

	const $output = <div id="sandbox-output" className="sandbox-output"></div>;

	const $input = (
		<input
			className="sandbox-input"
			type="text"
			placeholder="digite um comando… (help)"
			autofocus
			onkeydown={(e) => {
				if (e.key === "Enter") {
					submit(e.target.value);
					e.target.value = "";
				} else if (e.key === "ArrowUp") {
					if (history.length === 0) return;
					historyIndex = Math.max(0, historyIndex - 1);
					e.target.value = history[historyIndex] || "";
					e.preventDefault();
				} else if (e.key === "ArrowDown") {
					if (history.length === 0) return;
					historyIndex = Math.min(history.length, historyIndex + 1);
					e.target.value = history[historyIndex] || "";
					e.preventDefault();
				}
			}}
		/>
	);

	const $prompt = <span className="sandbox-prompt">{modePrompt(mode)}</span>;

	const submit = (raw) => {
		const line = String(raw || "").trim();
		if (!line) return;
		history.push(line);
		historyIndex = history.length;
		appendLine(modePrompt(mode), line, "cmd");
		if (line === "clear") {
			$output.innerHTML = "";
			return;
		}
		if (line === "help") {
			for (const item of [
				"js> JavaScript no Web Worker (console.log/error capturado)",
				"py> Python via Pyodide (baixa runtime na 1ª vez, requer internet)",
				"sh$ shell emulado: help, echo, date, whoami, ver",
				"'clear' limpa a tela • ↑/↓ navega o histórico",
			]) {
				appendLine("", item, "log");
			}
			return;
		}
		if (busy) return;
		if (mode === "sh") {
			const { lines } = runShellCommand(line);
			for (const l of lines) appendLine("", l.text, l.type);
			return;
		}
		busy = true;
		$runBtn.classList.add("busy");
		const runner = mode === "py" ? runPython(line) : runJavaScript(line);
		runner
			.then((lines) => {
				for (const l of lines) appendLine("", l.text, l.type);
			})
			.catch((error) => {
				appendLine("", error?.message || String(error), "error");
			})
			.finally(() => {
				busy = false;
				$runBtn.classList.remove("busy");
			});
	};

	const $runBtn = (
		<button
			className="sandbox-run"
			onclick={() => {
				submit($input.value);
				$input.value = "";
				$input.focus();
			}}
		>
			<span className="icon play_arrow"></span>
		</button>
	);

	function appendLine(prefix, text, type) {
		const $line = (
			<div className={`sandbox-line type-${type}`}>
				{prefix && <span className="sandbox-line-prefix">{prefix}</span>}
				<span className="sandbox-line-text">{text}</span>
			</div>
		);
		$output.append($line);
		$output.scrollTop = $output.scrollHeight;
	}

	const setMode = (next) => {
		mode = next;
		$prompt.textContent = modePrompt(mode);
		for (const $chip of modeChips) {
			$chip.classList.toggle("active", $chip.dataset.mode === mode);
		}
		$input.placeholder =
			mode === "py"
				? "print('olá acodex')"
				: mode === "sh"
					? "help"
					: "console.log('olá acodex')";
		$input.focus();
	};

	const modeChips = SANDBOX_MODES.map((m) => (
		<button
			className={`sandbox-chip${m === "js" ? " active" : ""}`}
			dataset={{ mode: m }}
			onclick={() => setMode(m)}
		>
			{m.toUpperCase()}
		</button>
	));

	const $root = (
		<div id="sandbox-tab" className="sandbox-page">
			<header className="sandbox-header">
				<span className="sandbox-title">
					<span className="icon terminal"></span> Acodex Sandbox
				</span>
				<div className="sandbox-modes">{modeChips}</div>
			</header>
			{$output}
			<div className="sandbox-inputbar">
				{$prompt}
				{$input}
				{$runBtn}
			</div>
		</div>
	);

	appendLine("", "Acodex Sandbox 1.0 — js ▸ py ▸ sh • digite 'help'", "result");
	return $root;
}
