/**
 * Source code of the sandbox Web Worker.
 *
 * Runs untrusted JavaScript inside a Worker: console.* calls and errors are
 * posted back to the host as structured messages. Kept as a plain string
 * (no imports) so it can be unit-tested and instantiated via a Blob URL.
 */

export const JS_WORKER_SOURCE = `
"use strict";
function fmt(value) {
	if (typeof value === "string") return value;
	try {
		return JSON.stringify(value);
	} catch (_) {
		return String(value);
	}
}
function post(type, text) {
	self.postMessage({ type, text });
}
function makeSend(level) {
	return function send() {
		var parts = [];
		for (var i = 0; i < arguments.length; i++) {
			parts.push(fmt(arguments[i]));
		}
		post(level, parts.join(" "));
	};
}
self.console = {
	log: makeSend("log"),
	info: makeSend("log"),
	warn: makeSend("warn"),
	error: makeSend("error"),
	debug: makeSend("log"),
};
self.addEventListener("error", function (event) {
	post("error", event.message || "Unknown error");
});
self.addEventListener("unhandledrejection", function (event) {
	var reason = event.reason && event.reason.message
		? event.reason.message
		: String(event.reason);
	post("error", "Unhandled promise rejection: " + reason);
});
self.addEventListener("message", function (event) {
	var code = event.data && event.data.code;
	try {
		var result = self.eval(code);
		if (result !== undefined) {
			post("result", fmt(result));
		}
		post("end", "");
	} catch (error) {
		post("error", error && error.message ? error.message : String(error));
		post("end", "");
	}
});
`;

/** Builds a Blob URL for the worker source. Exposed for tests. */
export function createWorkerUrl(source = JS_WORKER_SOURCE) {
	return URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
}
