/**
 * Dev account authentication — real only, no simulation.
 *
 * This module talks to a real authentication server. While `DEV_ACCOUNT.apiBase`
 * is empty, the dev account page shows an honest "not configured" state and never
 * fakes a signed-in session. See issue #27 and the Login.html portal for the
 * server-side contract.
 */

const DEV_ACCOUNT = {
	// Authentication server base URL, e.g. "https://auth.example.com".
	// Must be configured before the dev account sign in can work.
	apiBase: "",
	endpoints: {
		// POST {email, licenseKey, password} → 200 {user, token} | 401 {error}
		login: "/dev/login",
		// POST {token} → 204
		logout: "/dev/logout",
	},
};

const SESSION_STORAGE_KEY = "cached-dev-account-session";

/**
 * @typedef {object} DevAccountLicense
 * @property {string} key
 * @property {string} tier
 * @property {string} status
 * @property {string} expiresAt
 */

/**
 * @typedef {object} DevAccountUser
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} role
 * @property {DevAccountLicense} license
 */

/** @returns {boolean} whether a real authentication server is configured */
export function isConfigured() {
	return Boolean(DEV_ACCOUNT.apiBase);
}

/**
 * Cached dev account user, if a session exists.
 * @returns {DevAccountUser|null}
 */
export function getSession() {
	try {
		const raw = localStorage.getItem(SESSION_STORAGE_KEY);
		if (!raw) return null;
		return JSON.parse(raw)?.user ?? null;
	} catch {
		return null;
	}
}

function saveSession(user, token) {
	localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user, token }));
}

/**
 * Sign in against the real authentication server.
 * @param {{email: string, licenseKey: string, password: string}} credentials
 * @returns {Promise<DevAccountUser>}
 */
export async function login({ email, licenseKey, password }) {
	if (!isConfigured()) {
		throw new Error("Dev account server is not configured.");
	}

	const res = await fetch(
		`${DEV_ACCOUNT.apiBase}${DEV_ACCOUNT.endpoints.login}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ email, licenseKey, password }),
		},
	);

	const data = await res.json().catch(() => null);
	if (!res.ok || !data?.user || !data?.token) {
		throw new Error(
			data?.error || `Authentication failed (HTTP ${res.status}).`,
		);
	}

	saveSession(data.user, data.token);
	return data.user;
}

/**
 * Sign out. The local session is always cleared, even if the server is
 * unreachable, so the app never keeps a stale signed-in state.
 * @returns {Promise<void>}
 */
export async function logout() {
	let token = null;
	try {
		const raw = localStorage.getItem(SESSION_STORAGE_KEY);
		token = raw ? JSON.parse(raw)?.token : null;
	} catch {
		// Malformed cache: fall through to clear the session.
	}

	if (isConfigured() && token) {
		try {
			await fetch(`${DEV_ACCOUNT.apiBase}${DEV_ACCOUNT.endpoints.logout}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ token }),
			});
		} catch (error) {
			console.warn("Dev account logout request failed:", error);
		}
	}

	localStorage.removeItem(SESSION_STORAGE_KEY);
}
