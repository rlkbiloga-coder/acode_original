/**
 * Analytics e Speed Insights da Vercel — somente no deploy web.
 *
 * No APK (Cordova/Android) nada é injetado: não há Vercel por trás, o app
 * funciona offline e não deve fazer requisições de telemetria.
 */

/** @returns {boolean} true quando rodando no navegador (deploy Vercel) */
export function isWebDeploy() {
	return window.cordova?.platformId === "browser";
}

/**
 * Injeta Web Analytics + Speed Insights apenas no deploy web.
 * Falhas nunca quebram o boot do app.
 */
export async function initWebAnalytics() {
	if (!isWebDeploy()) return false;
	try {
		const [{ inject }, { injectSpeedInsights }] = await Promise.all([
			import("@vercel/analytics"),
			import("@vercel/speed-insights"),
		]);
		inject({ mode: "production" });
		injectSpeedInsights();
		return true;
	} catch (error) {
		console.warn("Vercel analytics indisponivel:", error);
		return false;
	}
}
