// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

const inject = vi.hoisted(() => vi.fn());
const injectSpeedInsights = vi.hoisted(() => vi.fn());
vi.mock("@vercel/analytics", () => ({ inject }));
vi.mock("@vercel/speed-insights", () => ({ injectSpeedInsights }));

import { initWebAnalytics, isWebDeploy } from "lib/webAnalytics";

afterEach(() => {
	delete window.cordova;
	vi.clearAllMocks();
});

describe("webAnalytics", () => {
	it("não injeta nada no Android (APK)", async () => {
		window.cordova = { platformId: "android" };
		expect(isWebDeploy()).toBe(false);
		expect(await initWebAnalytics()).toBe(false);
		expect(inject).not.toHaveBeenCalled();
		expect(injectSpeedInsights).not.toHaveBeenCalled();
	});

	it("injeta analytics e speed insights no deploy web", async () => {
		window.cordova = { platformId: "browser" };
		expect(await initWebAnalytics()).toBe(true);
		expect(inject).toHaveBeenCalledWith({ mode: "production" });
		expect(injectSpeedInsights).toHaveBeenCalledTimes(1);
	});

	it("falha de import não quebra o boot", async () => {
		window.cordova = { platformId: "browser" };
		inject.mockImplementationOnce(() => {
			throw new Error("blocked");
		});
		expect(await initWebAnalytics()).toBe(false);
	});
});
