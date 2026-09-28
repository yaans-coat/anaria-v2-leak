import { engine } from "./engine.js";
import { resolveInput, formatForDisplay } from "./url.js";
import * as settings from "./settings.js";
import * as storage from "./storage.js";
import { applyTheme, getTheme, themes } from "./themes.js";
import { toast } from "./notify.js";
import { renderView, mountView, unmountView, VIEWS, TITLES, searchEngines } from "./views.js";
import * as chat from "./chat.js";
import * as snow from "./snow.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const addressBar = $("#address");
const frames = $("#frames");
const viewRoot = $("#view");
const progress = $("#progress");
const netnote = $("#netnote");

// ---- notifications ----------------------------------------------------
const notify = (options) => {
	if (!settings.get("notifications"))
		return null;
	return toast(options);
};

// ---- ripple + motion helpers -----------------------------------------
const motionOn = () => settings.get("animations") && !matchMedia("(prefers-reduced-motion: reduce)").matches;

const ripple = (element, event) => {
	if (!motionOn() || !element)
		return;
	const rect = element.getBoundingClientRect();
	const x = event?.clientX ?? rect.left + rect.width / 2;
	const y = event?.clientY ?? rect.top + rect.height / 2;
	const span = document.createElement("span");
	span.className = "ripple";
	const size = Math.max(rect.width, rect.height) * 2.2;
	span.style.width = span.style.height = `${size}px`;
	span.style.left = `${x - rect.left - size / 2}px`;
	span.style.top = `${y - rect.top - size / 2}px`;
	element.append(span);
	setTimeout(() => span.remove(), 620);
};

document.addEventListener("pointerdown", (event) => {
	const target = event.target.closest("button, .tile, .theme-card, .settings__tab, .game-card");
	if (target && !target.disabled)
		ripple(target, event);
});

// ---- traffic log ------------------------------------------------------
const MAX_LOGS = 300;
let logs = [];

const relTime = (timestamp) => {
	const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
	if (seconds < 5)
		return "just now";
	if (seconds < 60)
		return `${seconds}s ago`;
	const minutes = Math.round(seconds / 60);
	if (minutes < 60)
		return `${minutes}m ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24)
		return `${hours}h ago`;
	return `${Math.round(hours / 24)}d ago`;
};

const displayOf = (url) => {
	try {
		return formatForDisplay(url) || url;
	}
	catch {
		return url;
	}
};

const hydrate = (entry) => ({
	...entry,
	rel: relTime(entry.t),
	display: displayOf(entry.url || entry.display || ""),
});

const persistLogs = () => {
	if (settings.get("saveHistory"))
		storage.write("logs", logs);
	else
		storage.remove("logs");
};

const loadLogs = () => {
	logs = settings.get("saveHistory") ? storage.read("logs", []) : [];
	if (!Array.isArray(logs))
		logs = [];
};

const addLog = (entry) => {
	const row = { id: `l${Date.now()}${Math.random().toString(36).slice(2, 6)}`, t: Date.now(), ...entry };
	logs.unshift(row);
	if (logs.length > MAX_LOGS)
		logs.length = MAX_LOGS;
	persistLogs();
	refreshLiveLogs();
	return row;
};

const patchLog = (id, patch) => {
	const row = logs.find((entry) => entry.id === id);
	if (row)
		Object.assign(row, patch);
	persistLogs();
	refreshLiveLogs();
};

const recentLogs = (count = 5) => logs.slice(0, count).map(hydrate);

const refreshLiveLogs = () => {
	if (currentView !== "home")
		return;
	// never yank the dom out from under someone mid-keystroke
	if (viewRoot.contains(document.activeElement))
		return;
	paintView(currentView, { keepScroll: true });
};

// ---- routing ----------------------------------------------------------
let currentView = "home";
let paintToken = 0;
let activeGame = null;

const viewContext = () => ({
	settings: settings.all(),
	recent: recentLogs(5),
	historyOn: settings.get("saveHistory"),
	chatUser: chat.user(),
	activeGame,
});

const paintView = (name, { keepScroll = false } = {}) => {
	const scroll = keepScroll ? viewRoot.scrollTop : 0;
	const token = ++paintToken;
	unmountView(name);
	viewRoot.innerHTML = renderView(name, viewContext());
	if (token !== paintToken)
		return;
	const pane = viewRoot.firstElementChild;
	if (pane && motionOn()) {
		pane.classList.add("pane--enter");
		requestAnimationFrame(() => pane.classList.add("pane--enter-active"));
	}
	mountView(name, viewRoot, bridge);
	if (keepScroll)
		viewRoot.scrollTop = scroll;
};

const setNavActive = (name) => {
	for (const item of $$(".dock__btn[data-view]")) {
		const active = item.dataset.view === name;
		item.classList.toggle("is-active", active);
		item.setAttribute("aria-current", active ? "page" : "false");
	}
};

const route = (name) => {
	if (!VIEWS.includes(name))
		name = "home";

	// leaving music stops the audio — a hidden player nobody can reach is a trap
	if (currentView === "music" && name !== "music")
		music.destroy();

	if (name !== "games")
		activeGame = null;

	if (name === "browse") {
		if (!state.url) {
			route("home");
			return;
		}
		currentView = "browse";
		unmountView("browse");
		frames.hidden = false;
		viewRoot.hidden = true;
	}
	else {
		currentView = name;
		frames.hidden = true;
		viewRoot.hidden = false;
		paintView(name);
		viewRoot.scrollTop = 0;
	}

	setNavActive(currentView);
	updateTitle();
	renderChrome();
};

const hostOf = (url) => {
	try {
		return new URL(url).host.replace(/^www\./, "");
	}
	catch {
		return "";
	}
};

const updateTitle = () => {
	if (settings.get("cloak") && settings.get("cloakTitle")) {
		document.title = settings.get("cloakTitle");
		return;
	}
	document.title = currentView === "browse"
		? `${hostOf(state.url) || "anaria"} — anaria`
		: `${TITLES[currentView] ?? "anaria"} — anaria`;
};

// ---- history ----------------------------------------------------------
const state = { url: "", loading: false };
const visited = [];
let visitedIndex = -1;

const record = (url) => {
	state.url = url;
	if (visited[visitedIndex] === url)
		return;
	const existing = visited.lastIndexOf(url, visitedIndex - 1);
	if (existing >= 0) {
		visitedIndex = existing;
		return;
	}
	visited.splice(visitedIndex + 1);
	visited.push(url);
	visitedIndex = visited.length - 1;
};

const canGoBack = () => visitedIndex > 0;
const canGoForward = () => visitedIndex >= 0 && visitedIndex < visited.length - 1;
const goBack = () => (canGoBack() ? visited[--visitedIndex] ?? null : null);
const goForward = () => (canGoForward() ? visited[++visitedIndex] ?? null : null);

// ---- session ----------------------------------------------------------
let session = null;
let sessionPending = null;
let pendingLog = null;
let pendingTimer = 0;
let autoBrowse = false;

const finishPending = (status, extra = {}) => {
	if (!pendingLog)
		return;
	clearTimeout(pendingTimer);
	patchLog(pendingLog.id, { status, ms: Math.round(performance.now() - pendingLog.started), ...extra });
	pendingLog = null;
};

const ensureSession = async () => {
	if (session)
		return session;
	if (sessionPending)
		return sessionPending;
	sessionPending = engine.createSession(frame, {
		url: (url) => {
			record(url);
			finishPending("ok");
			if (autoBrowse && currentView !== "browse")
				route("browse");
			else
				renderChrome();
			autoBrowse = false;
			refreshLiveLogs();
		},
		loading: () => {
			state.loading = true;
			renderChrome();
		},
		ready: () => {
			state.loading = false;
			finishPending("ok");
			renderChrome();
		},
		error: (error) => {
			state.loading = false;
			finishPending("fail", { message: String(error?.message ?? error) });
			const message = String(error?.message ?? error ?? "request failed");
			notify({ title: "request failed", message, tone: "error", duration: 6000 });
			renderChrome();
		},
		escape: (url) => void navigate(url),
	});
	try {
		session = await sessionPending;
	}
	finally {
		sessionPending = null;
	}
	return session;
};

const frame = document.createElement("iframe");
frame.className = "frame";
frame.title = "proxied page";
frames.append(frame);

// ---- music session ----------------------------------------------------
// youtube music refuses to be framed (x-frame-options) and sends no corp, so it
// only loads one way: through our own proxy, same-origin, rewritten by scramjet.
const MUSIC_URL = "https://music.youtube.com/";
let musicFrame = null;
let musicSession = null;
let musicPending = null;

const music = {
	async attach(stage) {
		if (!stage || musicSession)
			return musicSession;
		if (!musicFrame) {
			musicFrame = document.createElement("iframe");
			musicFrame.className = "frame music__frame";
			musicFrame.title = "youtube music";
			musicFrame.referrerPolicy = "no-referrer";
		}
		stage.append(musicFrame);
		if (musicPending)
			return musicPending;
		musicPending = (async () => {
			try {
				// the stage is repainted on every mount — always re-query it
				const stageOf = () => document.querySelector("#music-stage");
				const session = await engine.createSession(musicFrame, {
					loading: () => stageOf()?.classList.add("is-loading"),
					ready: () => stageOf()?.classList.add("is-ready"),
					error: (error) => {
						const message = String(error?.message ?? error ?? "request failed");
						notify({ title: "music failed", message, tone: "error", duration: 6000 });
					},
					escape: (url) => void navigate(url),
				});
				musicSession = session;
				musicSession.go(MUSIC_URL);
				return session;
			}
			finally {
				musicPending = null;
			}
		})();
		return musicPending;
	},
	go(url) {
		const target = /^https?:\/\//i.test(url) ? url : MUSIC_URL;
		void music.attach(document.querySelector("#music-stage"))
			.then(() => musicSession?.go(target))
			.catch(() => { });
	},
	destroy() {
		try {
			musicSession?.destroy();
		}
		catch { }
		musicSession = null;
		musicPending = null;
		musicFrame?.remove();
		musicFrame = null;
	},
};

// ---- omnibox / navigation --------------------------------------------
const searchTemplate = () => settings.get("searchEngine");

const navigate = async (input, options = {}) => {
	const raw = String(input ?? "").trim();

	// internal view shortcuts typed into the omnibox
	const asView = raw.toLowerCase();
	if (VIEWS.includes(asView) && !/[\s./:]/.test(raw)) {
		route(asView);
		return;
	}

	const { url, kind } = resolveInput(raw, searchTemplate());
	switch (kind) {
		case "empty":
			return;
		case "blocked":
			notify({ title: "blocked", message: "that address cannot be opened through the proxy.", tone: "error" });
			return;
		case "external":
			location.assign(url);
			return;
		default: {
			await ensureSession();
			const started = performance.now();
			if (options.record === false)
				state.url = url;
			else
				record(url);

			finishPending("fail", { message: "superseded" });
			pendingLog = addLog({
				status: "pending",
				url,
				kind: kind === "search" ? "search" : "page",
				started,
			});

			frame.removeAttribute("srcdoc");
			state.loading = true;
			autoBrowse = true;
			if (currentView !== "browse")
				route("browse");
			session.go(url);
			renderChrome();

			clearTimeout(pendingTimer);
			pendingTimer = setTimeout(() => {
				if (pendingLog) {
					state.loading = false;
					finishPending("fail", { message: "timed out" });
					notify({ title: "timed out", message: "the tunnel did not answer in time. try reloading.", tone: "error" });
					renderChrome();
				}
			}, 45000);
		}
	}
};

// ---- chrome -----------------------------------------------------------
// the status note only surfaces when it carries news: a transport change,
// a protocol hiccup, a dead backend. otherwise it stays out of the way.
let noteTimer = 0;

const flashNote = ({ state: tone = "idle", text, ttl = 4600 } = {}) => {
	if (!text || !netnote)
		return;
	netnote.hidden = false;
	netnote.dataset.state = tone;
	netnote.querySelector(".netnote__text").textContent = text;
	clearTimeout(noteTimer);
	noteTimer = setTimeout(() => {
		netnote.hidden = true;
	}, ttl);
};

const renderChrome = () => {
	$("#back").disabled = !canGoBack();
	$("#forward").disabled = !canGoForward();
	$("#reload").disabled = !session;

	if (document.activeElement !== addressBar)
		addressBar.value = state.url ? formatForDisplay(state.url) : "";

	document.body.classList.toggle("is-loading", state.loading);
	progress.classList.toggle("is-active", state.loading);
	$("#reload").classList.toggle("is-spinning", state.loading);
};

// ---- settings plumbing ------------------------------------------------
let engineReady = false;

const applyUiStyle = () => {
	document.documentElement.dataset.uistyle = settings.get("uiStyle");
};

const applyMotion = () => {
	document.documentElement.dataset.motion = settings.get("animationLevel");
	document.documentElement.classList.toggle("no-motion", !settings.get("animations"));
	if (settings.get("animations"))
		snow.start();
	else
		snow.stop();
};

let iconLink = null;

const applyCloak = () => {
	const enabled = settings.get("cloak");
	const favicon = settings.get("cloakFavicon");
	updateTitle();

	if (!iconLink) {
		iconLink = document.createElement("link");
		iconLink.rel = "icon";
		document.head.append(iconLink);
	}
	iconLink.href = enabled && favicon ? favicon : "/favicon.svg";
};

const preloadSearchEngine = () => {
	if (!settings.get("preloadSearch"))
		return;
	try {
		const origin = new URL(settings.get("searchEngine").replace("%s", "preload")).origin;
		if (document.querySelector(`link[data-preload][href="${origin}"]`))
			return;
		for (const rel of ["preconnect", "dns-prefetch"]) {
			const link = document.createElement("link");
			link.rel = rel;
			link.href = origin;
			link.crossOrigin = "";
			link.dataset.preload = "1";
			document.head.append(link);
		}
	}
	catch { }
};

const applyTransport = async () => {
	try {
		await engine.setTransport?.({
			kind: settings.get("transport"),
			wisp: settings.get("wispUrl"),
		});
		flashNote({ state: "ready", text: `${settings.get("transport")} · connected` });
	}
	catch (error) {
		flashNote({ state: "fail", text: "transport failed" });
		notify({ title: "transport error", message: error.message, tone: "error" });
	}
};

const applySettingEffects = (next, patch = {}) => {
	if (!Object.keys(patch).length)
		return;

	// --- feedback toasts -------------------------------------------------
	if ("theme" in patch) {
		const theme = getTheme(next.theme);
		applyTheme(next.theme);
		snow.refresh();
		notify({
			title: "theme changed",
			message: `${theme.label} is live`,
			tone: "theme",
			swatch: theme.vars.accent,
			duration: 3400,
		});
	}
	else if ("transport" in patch) {
		notify({ title: "transport switched", message: next.transport, tone: "network" });
	}
	else if ("notifications" in patch && next.notifications) {
		notify({ title: "notifications on", message: "animated toasts for theme swaps and network events.", tone: "success" });
	}
	else if ("cloak" in patch) {
		notify({
			title: next.cloak ? "cloaking enabled" : "cloaking disabled",
			message: next.cloak ? "tab title and favicon are disguised." : "tab shows its real title again.",
			tone: "cloak",
		});
	}
	else if ("openBlank" in patch && next.openBlank) {
		notify({ title: "about:blank armed", message: "disguising now wipes this tab.", tone: "cloak" });
	}
	else if ("panicKey" in patch) {
		notify({
			title: next.panicKey ? "panic key set" : "panic key disabled",
			message: next.panicKey ? `press ${next.panicKey} to vanish instantly.` : "no panic key is bound.",
			tone: "cloak",
		});
		const hint = $("#help-panic");
		if (hint)
			hint.textContent = next.panicKey || "off";
	}
	else if ("saveHistory" in patch) {
		if (next.saveHistory) {
			loadLogs();
			notify({ title: "history on", message: "traffic is now kept between visits.", tone: "success" });
		}
		else {
			logs = [];
			storage.remove("logs");
			notify({ title: "history off", message: "recent traffic is hidden and the list was wiped.", tone: "success" });
		}
		refreshLiveLogs();
	}
	else if ("saveCookies" in patch && !next.saveCookies) {
		storage.remove("logs");
		notify({ title: "stored data cleared", message: "anaria will not keep anything between sessions.", tone: "success" });
	}
	else if ("uiStyle" in patch || "animations" in patch || "animationLevel" in patch || "preloadSearch" in patch || "searchEngine" in patch) {
		notify({ title: "settings saved", message: "applied to this browser.", tone: "success", duration: 2600 });
	}

	// --- live effects ----------------------------------------------------
	if ("uiStyle" in patch)
		applyUiStyle();
	if ("animations" in patch || "animationLevel" in patch)
		applyMotion();
	if ("cloak" in patch || "cloakTitle" in patch || "cloakFavicon" in patch)
		applyCloak();
	if ("preloadSearch" in patch || "searchEngine" in patch)
		preloadSearchEngine();
	if ("transport" in patch || "wispUrl" in patch)
		void applyTransport();

	// keep the theme grid in sync without re-rendering the whole panel
	for (const card of viewRoot.querySelectorAll(".theme-card")) {
		const active = card.dataset.themeId === next.theme;
		card.classList.toggle("is-active", active);
		card.setAttribute("aria-pressed", String(active));
	}
	for (const swatch of document.querySelectorAll("#welcome-themes .swatch")) {
		swatch.classList.toggle("is-active", swatch.dataset.themeId === next.theme);
	}
	// keep visible controls honest when a value changes outside its own form
	for (const [key, value] of Object.entries(patch)) {
		const input = document.getElementById(`set-${key}`);
		if (!input)
			continue;
		if (input.type === "checkbox")
			input.checked = Boolean(value);
		else if (input.value !== String(value ?? ""))
			input.value = value ?? "";
	}
};

const saveSettings = (patch) => settings.set(patch);

// ---- cloaking + panic -------------------------------------------------
const keyFromEvent = (event) => {
	const parts = [];
	if (event.ctrlKey || event.metaKey)
		parts.push("ctrl");
	if (event.altKey)
		parts.push("alt");
	if (event.shiftKey)
		parts.push("shift");
	parts.push(event.key.toLowerCase());
	return parts.join("+");
};

const panic = () => {
	const destination = settings.get("panicUrl") || "about:blank";
	location.replace(destination);
};

const cloakNow = () => {
	if (settings.get("openBlank")) {
		location.replace("about:blank");
		return;
	}
	const disguise = settings.get("cloakTitle").trim();
	if (!disguise) {
		notify({
			title: "no disguise yet",
			message: "give the tab a disguised title below, then hit this again.",
			tone: "cloak",
		});
		return;
	}
	settings.set({ cloak: true });
	notify({
		title: "tab disguised",
		message: `the tab now reads “${disguise}”.`,
		tone: "cloak",
	});
};

// ---- view bridge ------------------------------------------------------
const viewBridgeAction = (action) => {
	switch (action) {
		case "reset-settings":
			settings.reset();
			applyTheme(settings.get("theme"));
			applyUiStyle();
			applyMotion();
			applyCloak();
			preloadSearchEngine();
			void applyTransport();
			loadLogs();
			snow.refresh();
			paintView("settings");
			notify({ title: "settings reset", message: "back to the anaria defaults.", tone: "success" });
			break;
		case "clear-logs":
			logs = [];
			persistLogs();
			paintView(currentView, { keepScroll: true });
			notify({ title: "history cleared", message: "every local traffic entry is gone.", tone: "success" });
			break;
		case "cloak-now":
			cloakNow();
			break;
		case "close-game":
			activeGame = null;
			paintView("games");
			break;
		case "fullscreen": {
			const player = viewRoot.querySelector(".player");
			if (player?.requestFullscreen)
				player.requestFullscreen().catch(() => { });
			break;
		}
		case "switch-user":
			openAccount();
			break;
	}
};

const bridge = {
	navigate: (input) => void navigate(input),
	saveSettings,
	action: viewBridgeAction,
	ripple,
	repaint: () => paintView(currentView),
	notify: (options) => notify(options),
	music,
	signIn: (name) => {
		const ok = chat.signIn(name);
		syncAccountTip();
		return ok;
	},
	gamesCache: null,
	games: async () => {
		const response = await fetch("/api/games");
		if (!response.ok)
			throw new Error("games unavailable");
		const data = await response.json();
		bridge.gamesCache = Array.isArray(data.games) ? data.games : [];
		return bridge.gamesCache;
	},
	openGame: (game) => {
		activeGame = game;
		route("games");
	},
};

// ---- modals -----------------------------------------------------------
const openModal = (element) => {
	if (!element)
		return;
	element.hidden = false;
	element.classList.add("is-open");
};

const closeModal = (element) => {
	if (!element)
		return;
	element.classList.remove("is-open");
	element.hidden = true;
};

const markSetupDone = () => storage.write("setup", { done: true });

const wireWelcome = () => {
	const panel = $("#welcome");
	if (!panel || storage.read("setup", null)?.done)
		return;

	const host = $("#welcome-themes");
	const official = themes.find((theme) => theme.id === "grape");
	const picks = [official, ...themes.filter((theme) => theme.id !== "grape").slice(0, 7)].filter(Boolean);
	host.innerHTML = picks
		.map((theme) => `
			<button class="swatch${theme.id === settings.get("theme") ? " is-active" : ""}" type="button"
				data-theme-id="${theme.id}" title="${theme.label}"
				style="--t-bg:${theme.vars.bg};--t-surface:${theme.vars.surface};--t-accent:${theme.vars.accent};--t-accent2:${theme.vars.accent2}">
				<span class="swatch__dot"></span><span class="swatch__bar"></span>
			</button>`)
		.join("");
	for (const swatch of host.querySelectorAll(".swatch")) {
		swatch.addEventListener("click", (event) => {
			saveSettings({ theme: swatch.dataset.themeId });
			ripple(swatch, event);
		});
	}

	const engineSelect = $("#welcome-engine");
	engineSelect.innerHTML = searchEngines
		.map((entry) => `<option value="${entry.template}"${entry.template === settings.get("searchEngine") ? " selected" : ""}>${entry.label}</option>`)
		.join("");

	const finish = (skip) => {
		if (!skip) {
			if (engineSelect.value !== settings.get("searchEngine"))
				saveSettings({ searchEngine: engineSelect.value });
			const name = $("#welcome-name").value.trim();
			if (name)
				chat.signIn(name);
		}
		markSetupDone();
		closeModal(panel);
	};

	$("#welcome-start").addEventListener("click", () => finish(false));
	$("#welcome-skip").addEventListener("click", () => finish(true));

	openModal(panel);
};

const openAccount = () => {
	const panel = $("#account");
	if (!panel)
		return;
	const name = chat.user();
	$("#account-name").value = name;
	$("#account-text").textContent = name
		? `you are browsing as “${name}”. change it whenever you like — it lives on this device.`
		: "pick a name — it stays on this device and unlocks the chatroom.";
	$("#account-signout").hidden = !name;
	openModal(panel);
	$("#account-name").focus();
};

const syncAccountTip = () => {
	const tip = $("#account-tip");
	if (tip)
		tip.textContent = chat.user() || "account";
};

const wireHelp = () => {
	const button = $("#help-btn");
	const panel = $("#help-panel");
	if (!button || !panel)
		return;
	const hint = $("#help-panic");
	if (hint)
		hint.textContent = settings.get("panicKey") || "off";

	const toggle = (open) => {
		panel.hidden = !open;
		button.setAttribute("aria-expanded", String(open));
		button.classList.toggle("is-open", open);
	};
	button.addEventListener("click", () => toggle(panel.hidden));
	$("#help-close")?.addEventListener("click", () => toggle(false));
};

// ---- boot -------------------------------------------------------------
const wireChrome = () => {
	$("#omnibox").addEventListener("submit", (event) => {
		event.preventDefault();
		addressBar.blur();
		void navigate(addressBar.value);
	});

	addressBar.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			addressBar.value = state.url ? formatForDisplay(state.url) : "";
			addressBar.blur();
		}
	});

	$("#back").addEventListener("click", () => {
		const url = goBack();
		if (url)
			void navigate(url, { record: false });
	});
	$("#forward").addEventListener("click", () => {
		const url = goForward();
		if (url)
			void navigate(url, { record: false });
	});
	$("#reload").addEventListener("click", () => session?.reload());
	$("#settings-btn").addEventListener("click", (event) => {
		ripple(event.currentTarget, event);
		route("settings");
	});

	for (const item of $$(".dock__btn[data-view]")) {
		item.addEventListener("click", () => route(item.dataset.view));
	}
	$("#account-btn")?.addEventListener("click", openAccount);

	// account modal
	const account = $("#account");
	account?.addEventListener("click", (event) => {
		if (event.target === account || event.target.closest("[data-close]"))
			closeModal(account);
	});
	$("#account-form")?.addEventListener("submit", (event) => {
		event.preventDefault();
		const value = $("#account-name").value;
		if (chat.signIn(value)) {
			syncAccountTip();
			closeModal(account);
			notify({ title: "welcome", message: `you are in as ${chat.user()}.`, tone: "success" });
			if (currentView === "chat")
				paintView("chat");
		}
		else {
			$("#account-name").classList.add("is-invalid");
		}
	});
	$("#account-signout")?.addEventListener("click", () => {
		chat.signOut();
		syncAccountTip();
		closeModal(account);
		notify({ title: "signed out", message: "the chatroom needs a name again.", tone: "success" });
		if (currentView === "chat")
			paintView("chat");
	});
	$("#account-chat")?.addEventListener("click", () => {
		closeModal(account);
		route("chat");
	});

	// floating dock magnification
	const dock = $("#dock");
	if (dock) {
		const items = [...dock.querySelectorAll(".dock__btn")];
		const reset = () => {
			for (const item of items)
				item.style.setProperty("--mag", "1");
		};
		dock.addEventListener("pointermove", (event) => {
			if (!motionOn())
				return;
			for (const item of items) {
				const rect = item.getBoundingClientRect();
				const center = rect.top + rect.height / 2;
				const distance = Math.abs(event.clientY - center);
				const scale = 1 + 0.26 * Math.max(0, 1 - distance / 110);
				item.style.setProperty("--mag", scale.toFixed(3));
			}
		});
		dock.addEventListener("pointerleave", reset);
	}

	addEventListener("keydown", (event) => {
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
			event.preventDefault();
			addressBar.focus();
			addressBar.select();
			return;
		}
		const panicKey = settings.get("panicKey");
		if (panicKey) {
			const pressed = keyFromEvent(event);
			const relaxed = pressed.split("+").filter((part) => part !== "shift").join("+");
			if (pressed === panicKey || relaxed === panicKey) {
				event.preventDefault();
				panic();
			}
		}
	});
};

const start = async () => {
	// settings first so nothing flashes the wrong palette
	applyTheme(settings.get("theme"));
	applyUiStyle();
	applyCloak();
	preloadSearchEngine();
	loadLogs();
	// privacy switch: no stored data survives a session when cookies are off
	if (!settings.get("saveCookies")) {
		storage.remove("logs");
		logs = [];
	}

	snow.init($("#snow"));
	snow.refresh();

	settings.onChange((next, rejected, patch) => {
		if (rejected?.length) {
			notify({ title: "invalid value", message: `reset: ${rejected.join(", ")}`, tone: "error" });
		}
		if (patch && Object.keys(patch).length)
			applySettingEffects(next, patch);
	});

	wireChrome();
	wireHelp();
	applyMotion();
	syncAccountTip();
	renderChrome();

	void applyTransport();
	engine
		.init()
		.then(() => {
			engineReady = true;
			renderChrome();
		})
		.catch(() => {
			notify({ title: "backend unreachable", message: "could not reach the proxy backend.", tone: "error", duration: 8000 });
			flashNote({ state: "fail", text: "backend unreachable", ttl: 7000 });
		});

	chat.boot();
	wireWelcome();

	const configured = settings.get("homeUrl");
	route("home");
	if (configured)
		void navigate(configured);

	// keep relative timestamps honest while the tab sits open
	setInterval(() => {
		if (currentView === "home")
			refreshLiveLogs();
	}, 30000);
};

void start();
