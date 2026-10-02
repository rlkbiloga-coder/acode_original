import "./about.scss";
import Logo from "components/logo";
import Page from "components/page";
import Reactive from "html-tag-js/reactive";
import actionStack from "lib/actionStack";
import config from "lib/config";
import helpers from "utils/helpers";
export default function AboutInclude() {
	const $page = Page(strings.about.capitalize());
	const webviewVersionName = Reactive("N/A");
	const webviewPackageName = Reactive("N/A");

	$page.classList.add("about-us");
	$page.body = (
		<main id="about-page" className="main scroll">
			<Logo />

			<div className="version-info">
				<h1 className="version-title">Thcode editor</h1>
				<div className="version-number">
					Version {BuildInfo.version} ({BuildInfo.versionCode})
				</div>
			</div>

			<div className="info-section">
				<a
					href="#"
					className="info-item"
					onclick={(e) => {
						e.preventDefault();
						system.openInBrowser(
							`https://play.google.com/store/apps/details?id=${webviewPackageName.value}`,
						);
					}}
				>
					<div className="info-item-icon">
						<span className="icon googlechrome"></span>
					</div>
					<div className="info-item-text">
						Webview {webviewVersionName}
						<div className="info-item-subtext">{webviewPackageName}</div>
					</div>
				</a>
				<a href={config.SITE_URL} className="info-item">
					<div className="info-item-icon">
						<span className="icon acode"></span>
					</div>
					<div className="info-item-text">
						Thcode — site oficial
						<div className="info-item-subtext">{config.SITE_URL}</div>
					</div>
				</a>
				<a href={config.BASE_URL} className="info-item">
					<div className="info-item-icon">
						<span className="icon cloud"></span>
					</div>
					<div className="info-item-text">
						Conta e plugins (serviço do editor base)
						<div className="info-item-subtext">{config.BASE_URL}</div>
					</div>
				</a>
			</div>

			<div className="social-links">
				<a href={config.GITHUB_URL} className="social-link">
					<div className="social-icon">
						<span className="icon github"></span>
					</div>
					GitHub
				</a>
			</div>
		</main>
	);

	system.getWebviewInfo((res) => {
		webviewPackageName.value = res?.packageName || "N/A";
		webviewVersionName.value = res?.versionName || "N/A";
	});

	actionStack.push({
		id: "about",
		action: $page.hide,
	});

	$page.onhide = function () {
		actionStack.remove("about");
	};

	app.append($page);
	helpers.showAd();
}
