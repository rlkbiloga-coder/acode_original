import "./login.scss";

import Page from "components/page";
import toast from "components/toast";
import actionStack from "lib/actionStack";
import { getSession, isConfigured, login, logout } from "lib/devAccount";

let $loginPage = null;

/**
 * Dev account page: real sign in with a developer license.
 * Without an authentication server configured it shows an honest
 * "not configured" state — never a simulated session (see lib/devAccount.js).
 */
export default function openDevAccountPage() {
	if ($loginPage) {
		$loginPage.show?.();
		return $loginPage;
	}

	const $page = Page("Dev account");

	async function handleSubmit(event) {
		event.preventDefault();
		const form = event.currentTarget;
		const email = form.email.value.trim();
		const licenseKey = form.licenseKey.value.trim();
		const password = form.password.value;
		const $error = form.querySelector(".dev-account-error");
		const $button = form.querySelector("button[type='submit']");

		$error.textContent = "";

		if (!email || !email.includes("@")) {
			$error.textContent = "Enter a valid e-mail address.";
			return;
		}
		if (licenseKey.length < 8) {
			$error.textContent = "Enter a valid license key issued by the developer.";
			return;
		}
		if (password.length < 6) {
			$error.textContent = "Password must have at least 6 characters.";
			return;
		}

		$button.disabled = true;
		$button.textContent = "Signing in...";

		try {
			const user = await login({ email, licenseKey, password });
			toast(`Welcome, ${user.name || email}!`);
			render();
		} catch (error) {
			$error.textContent = error.message || "Unable to sign in.";
		} finally {
			$button.disabled = false;
			$button.textContent = "Sign in";
		}
	}

	async function handleLogout() {
		await logout();
		toast("Signed out.");
		render();
	}

	function render() {
		if (!isConfigured()) {
			$page.body = (
				<main id="dev-account-page" className="main scroll">
					<section className="dev-card">
						<span className="dev-card-icon icon httpslock" />
						<h3>Dev account is not configured</h3>
						<p>
							Set <code>DEV_ACCOUNT.apiBase</code> in{" "}
							<code>src/lib/devAccount.js</code> to enable sign in with a
							developer license.
						</p>
						<p className="dev-muted">
							The app never signs in without a real authentication server.
						</p>
					</section>
				</main>
			);
			return;
		}

		const user = getSession();
		if (user) {
			$page.body = (
				<main id="dev-account-page" className="main scroll">
					<section className="dev-card">
						<span className="dev-card-icon icon account_circle" />
						<h3>{user.name}</h3>
						<p className="dev-muted">{user.email}</p>
						<p className="dev-muted">{user.role}</p>
						<p className="dev-license">
							{user.license?.key} — {user.license?.tier}
						</p>
						<button id="dev-logout" type="button" className="button">
							Sign out
						</button>
					</section>
				</main>
			);
			$page
				.querySelector("#dev-logout")
				?.addEventListener("click", handleLogout);
			return;
		}

		$page.body = (
			<main id="dev-account-page" className="main scroll">
				<form id="dev-login-form" className="dev-card">
					<span className="dev-card-icon icon account_circle" />
					<h3>Dev account</h3>
					<p className="dev-muted">
						Sign in with your developer license to publish plugins and sync your
						setup.
					</p>
					<input
						name="email"
						type="email"
						placeholder="E-mail"
						autocomplete="email"
						required
					/>
					<input
						name="licenseKey"
						type="text"
						placeholder="License key"
						required
					/>
					<input
						name="password"
						type="password"
						placeholder="Password"
						autocomplete="current-password"
						required
						minLength="6"
					/>
					<p className="dev-account-error" role="alert" />
					<button type="submit" className="button">
						Sign in
					</button>
				</form>
			</main>
		);
		$page
			.querySelector("#dev-login-form")
			?.addEventListener("submit", handleSubmit);
	}

	$page.onhide = () => {
		actionStack.remove("dev-account");
		$loginPage = null;
	};

	actionStack.push({
		id: "dev-account",
		action: $page.hide,
	});

	render();
	app.append($page);
	$loginPage = $page;

	return $page;
}
