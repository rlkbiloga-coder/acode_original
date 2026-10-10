/**
 * Entrada de imagem do Acodex AI (frontend).
 *
 * Permite anexar uma imagem à mensagem. A imagem é reduzida no cliente
 * (canvas) para um tamanho compatível com APIs de visão e convertida em
 * data URL. O conteúdo da mensagem segue o formato OpenAI (array de
 * partes text/image_url), compatível com Vercel AI Gateway, OpenRouter,
 * OpenAI e afins.
 */

/** Maior dimensão da imagem reduzida antes do envio. */
export const MAX_IMAGE_DIM = 1024;

/** Qualidade JPEG da redução. */
export const IMAGE_QUALITY = 0.85;

/**
 * Prompt padrão quando a usuária envia só a imagem, sem texto.
 * Análise avançada de código e contexto visual.
 */
export const DEFAULT_IMAGE_PROMPT =
	"Analise esta imagem em profundidade: identifique qualquer código (linguagem, framework, bibliotecas, versões), aponte erros, bugs e problemas visuais, descreva todo o conteúdo e dê recomendações acionáveis. Se houver código, transcreva-o corrigido.";

/**
 * Monta o conteúdo (formato OpenAI) de uma mensagem de usuário com imagem.
 * @param {string} text texto da mensagem
 * @param {string} dataUrl imagem em data URL
 * @returns {{type: "text", text: string}[] | {type: "image_url", image_url: {url: string}}[]}
 */
export function buildVisionContent(text, dataUrl) {
	return [
		{ type: "text", text: String(text || "") },
		{ type: "image_url", image_url: { url: dataUrl } },
	];
}

/**
 * Reduz e normaliza uma imagem de arquivo para data URL JPEG.
 * @param {File} file arquivo de imagem
 * @param {number} [maxDim] maior dimensão permitida
 * @returns {Promise<string>} data URL JPEG
 */
export async function fileToScaledDataUrl(file, maxDim = MAX_IMAGE_DIM) {
	if (!file?.type?.startsWith("image/")) {
		throw new Error("Arquivo não é uma imagem.");
	}
	const objectUrl = URL.createObjectURL(file);
	try {
		const img = await loadImage(objectUrl);
		const scale = Math.min(
			1,
			maxDim / Math.max(img.naturalWidth, img.naturalHeight),
		);
		const width = Math.max(1, Math.round(img.naturalWidth * scale));
		const height = Math.max(1, Math.round(img.naturalHeight * scale));
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d");
		// fundo branco: JPEG não tem transparência
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, width, height);
		ctx.drawImage(img, 0, 0, width, height);
		return canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}

/** @returns {Promise<HTMLImageElement>} */
function loadImage(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error("Não foi possível ler a imagem."));
		img.src = src;
	});
}

/**
 * Cria a UI de anexo de imagem: botão 📷, input de arquivo oculto e
 * chip de pré-visualização.
 * @param {{ onChange: () => void }} callbacks
 */
export function createImageInput({ onChange } = {}) {
	/** @type {{dataUrl: string, name: string} | null} */
	let pending = null;

	const $chip = <span className="ai-attach-chip" hidden></span>;
	const $fileInput = (
		<input
			type="file"
			accept="image/*"
			className="ai-attach-input"
			aria-hidden="true"
			tabindex="-1"
			onchange={onFilePicked}
		/>
	);
	const $btn = (
		<button
			type="button"
			className="ai-send ai-attach"
			aria-label="Anexar imagem"
			title="Anexar imagem para análise"
			onclick={() => $fileInput.click()}
		>
			<span className="icon image_alt" />
		</button>
	);

	async function onFilePicked() {
		const file = $fileInput.files?.[0];
		$fileInput.value = "";
		if (!file) return;
		try {
			const dataUrl = await fileToScaledDataUrl(file);
			pending = { dataUrl, name: file.name || "imagem" };
			renderChip();
			onChange?.();
		} catch (error) {
			pending = null;
			renderChip();
			alert(String(error?.message || error));
		}
	}

	function renderChip() {
		if (!pending) {
			$chip.hidden = true;
			$chip.replaceChildren();
			return;
		}
		const $thumb = (
			<img
				src={pending.dataUrl}
				alt={pending.name}
				className="ai-attach-thumb"
			/>
		);
		const $name = <span className="ai-attach-name">{pending.name}</span>;
		const $remove = (
			<button
				type="button"
				className="ai-attach-remove"
				aria-label="Remover imagem"
				onclick={() => clear()}
			>
				<span className="icon clearclose" />
			</button>
		);
		$chip.hidden = false;
		$chip.replaceChildren($thumb, $name, $remove);
	}

	function clear() {
		pending = null;
		renderChip();
		onChange?.();
	}

	return {
		$btn,
		$chip,
		$fileInput,
		/** Imagem pendente (data URL + nome) ou null. */
		get pending() {
			return pending;
		},
		clear,
	};
}
