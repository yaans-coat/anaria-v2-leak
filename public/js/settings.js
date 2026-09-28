import * as storage from "./storage.js";
import { themeIds } from "./themes.js";

// ---- validators -------------------------------------------------------
const text = (max = 160) => (value, fallback) => {
	const s = typeof value === "string" ? value.trim() : "";
	return s.length <= max ? s : fallback;
};
const bool = (value, fallback) => (typeof value === "boolean" ? value : fallback);
const oneOf = (allowed) => (value, fallback) => (allowed.includes(value) ? value : fallback);

const httpUrl = (value, fallback) => {
	const s = typeof value === "string" ? value.trim() : "";
	if (!s)
		return "";
	try {
		const url = new URL(s);
		return ["http:", "https:"].includes(url.protocol) ? url.href : fallback;
	}
	catch {
		return fallback;
	}
};

const searchTemplate = (value, fallback) => {
	const s = typeof value === "string" ? value.trim() : "";
	if (!s.includes("%s"))
		return fallback;
	try {
		const probe = new URL(s.replaceAll("%s", "test"));
		return ["http:", "https:"].includes(probe.protocol) ? s : fallback;
	}
	catch {
		return fallback;
	}
};

const wispUrl = (value, fallback) => {
	const s = typeof value === "string" ? value.trim() : "";
	if (!s)
		return "";
	try {
		const url = new URL(s);
		if (!["ws:", "wss:"].includes(url.protocol))
			return fallback;
		if (url.username || url.password || url.hash || s.includes("?"))
			return fallback;
		if (location.protocol === "https:" && url.protocol !== "wss:")
			return fallback;
		if (!url.pathname.endsWith("/"))
			url.pathname += "/";
		return url.href;
	}
	catch {
		return fallback;
	}
};

const modifierKeys = ["ctrl", "alt", "shift", "meta", "ctrlorcmd", "cmd"];
const keyPattern = /^(?:f(?:[1-9]|1[0-2])|[a-z0-9]|escape|tab|space|enter|backspace|delete|arrow(?:up|down|left|right)|`|\[|\]|\\|;|'|,|\.|\/|-|=)$/;

const keybind = (value, fallback) => {
	if (typeof value !== "string")
		return fallback;
	const s = value.trim().toLowerCase();
	if (!s)
		return "";
	if (s.length > 40)
		return fallback;
	const parts = s.split("+").filter(Boolean);
	if (parts.length === 0)
		return fallback;
	const key = parts.at(-1);
	if (!parts.slice(0, -1).every((part) => modifierKeys.includes(part)))
		return fallback;
	if (!keyPattern.test(key))
		return fallback;
	return parts.join("+");
};

// ---- search engines ---------------------------------------------------
export const searchEngines = [
	{ id: "duckduckgo", label: "duckduckgo", template: "https://duckduckgo.com/?q=%s" },
	{ id: "brave", label: "brave", template: "https://search.brave.com/search?q=%s" },
	{ id: "startpage", label: "startpage", template: "https://www.startpage.com/sp/search?query=%s" },
	{ id: "bing", label: "bing", template: "https://www.bing.com/search?q=%s" },
	{ id: "google", label: "google", template: "https://www.google.com/search?q=%s" },
	{ id: "ecosia", label: "ecosia", template: "https://www.ecosia.org/search?q=%s" },
	{ id: "searx", label: "searx", template: "https://searx.be/search?q=%s" },
];

export const engineLabel = (template) =>
	searchEngines.find((engine) => engine.template === template)?.label ?? "custom";

export const transportOptions = [
	{ id: "libcurl", label: "libcurl", detail: "curl in webassembly, over wisp. widest site compatibility." },
	{ id: "epoxy", label: "epoxy", detail: "a rust tls stack in webassembly, over wisp. smaller than libcurl." },
	{ id: "bare", label: "bare", detail: "runs on request/response serverless hosts. websocket sites will not work." },
];

// ---- sections ---------------------------------------------------------
export const sections = [
	{ id: "preferences", label: "preferences", icon: "tool", blurb: "search engine, interface and notifications" },
	{ id: "appearance", label: "appearance", icon: "brush", blurb: "theme, motion and how anaria feels" },
	{ id: "cloaking", label: "cloaking", icon: "ghost", blurb: "disguise the tab and escape in one keypress" },
	{ id: "advanced", label: "advanced", icon: "hammer", blurb: "history, cookies, preloading and transport" },
	{ id: "credits", label: "credits", icon: "heart", blurb: "the people who made anaria possible" },
];

// ---- schema -----------------------------------------------------------
export const schema = {
	searchEngine: {
		section: "preferences",
		kind: "select",
		label: "search engine",
		default: "https://duckduckgo.com/?q=%s",
		validate: searchTemplate,
		options: () => searchEngines.map((engine) => ({ value: engine.template, label: engine.label })),
		help: "used whenever what you type is not a url. duckduckgo by default.",
	},
	homeUrl: {
		section: "preferences",
		kind: "text",
		type: "url",
		label: "home page",
		default: "",
		validate: httpUrl,
		placeholder: "leave blank for the built-in start page",
		help: "opened when anaria starts. blank keeps the search start page.",
	},
	uiStyle: {
		section: "preferences",
		kind: "select",
		label: "ui style",
		default: "modern",
		validate: oneOf(["modern", "compact", "classic"]),
		options: () => [
			{ value: "modern", label: "modern — soft, rounded, spacious" },
			{ value: "compact", label: "compact — tight, small chrome" },
			{ value: "classic", label: "classic — square, utilitarian" },
		],
		help: "changes spacing, radii and density across the interface.",
	},
	notifications: {
		section: "preferences",
		kind: "toggle",
		label: "notifications",
		default: true,
		validate: bool,
		help: "animated toast popups for theme swaps, saved settings and network events.",
	},

	theme: {
		section: "appearance",
		kind: "themes",
		label: "theme",
		default: "grape",
		validate: oneOf(themeIds),
		help: "30 hand-tuned palettes. changes apply instantly.",
	},
	animations: {
		section: "appearance",
		kind: "toggle",
		label: "animations",
		default: true,
		validate: bool,
		help: "button ripples, page transitions and toast motion.",
	},
	animationLevel: {
		section: "appearance",
		kind: "select",
		label: "animation level",
		default: "normal",
		validate: oneOf(["subtle", "normal", "extra"]),
		options: () => [
			{ value: "subtle", label: "subtle — barely there" },
			{ value: "normal", label: "normal — balanced" },
			{ value: "extra", label: "extra — full spring" },
		],
		help: "how much motion every element is allowed to use.",
	},

	cloak: {
		section: "cloaking",
		kind: "toggle",
		label: "enable cloaking",
		default: false,
		validate: bool,
		help: "replaces the tab title and favicon with the disguise below.",
	},
	cloakTitle: {
		section: "cloaking",
		kind: "text",
		type: "text",
		label: "disguised tab title",
		default: "",
		validate: text(120),
		placeholder: "e.g. document - google docs",
		help: "shown in the tab strip while cloaking. blank keeps the page title.",
	},
	cloakFavicon: {
		section: "cloaking",
		kind: "text",
		type: "url",
		label: "disguised favicon",
		default: "",
		validate: httpUrl,
		placeholder: "https://…/icon.png",
		help: "swapped into the tab while cloaking.",
	},
	openBlank: {
		section: "cloaking",
		kind: "toggle",
		label: "open disguise in about:blank",
		default: false,
		validate: bool,
		help: "the cloak button wipes this tab to about:blank instead of only renaming it.",
	},
	panicKey: {
		section: "cloaking",
		kind: "text",
		type: "text",
		label: "panic key",
		default: "f2",
		validate: keybind,
		placeholder: "f2 or ctrl+shift+p",
		showHelp: true,
		help: "one keypress leaves the page instantly. blank disables it.",
	},
	panicUrl: {
		section: "cloaking",
		kind: "text",
		type: "url",
		label: "panic destination",
		default: "",
		validate: httpUrl,
		placeholder: "blank opens about:blank",
		help: "where the panic key sends you. leave blank for about:blank.",
	},

	saveHistory: {
		section: "advanced",
		kind: "toggle",
		label: "save browsing history",
		default: true,
		validate: bool,
		help: "keeps your log list between sessions, stored only in this browser.",
	},
	saveCookies: {
		section: "advanced",
		kind: "toggle",
		label: "save cookies",
		default: true,
		validate: bool,
		help: "when off, anaria wipes everything it stored for you on the next load, so nothing survives the session.",
	},
	preloadSearch: {
		section: "advanced",
		kind: "toggle",
		label: "pre-load search engine",
		default: true,
		validate: bool,
		help: "warms the search engine connection so the first query feels instant.",
	},
	transport: {
		section: "advanced",
		kind: "select",
		label: "transport",
		default: "libcurl",
		validate: oneOf(["libcurl", "epoxy", "bare"]),
		options: () => transportOptions.map((entry) => ({ value: entry.id, label: entry.label })),
		help: "how requests leave your browser.",
	},
	wispUrl: {
		section: "advanced",
		kind: "text",
		type: "url",
		label: "wisp server",
		default: "",
		validate: wispUrl,
		placeholder: "blank uses this site's own tunnel",
		help: "a custom wss:// endpoint for the tunnel.",
	},
};

export const defaults = Object.fromEntries(
	Object.entries(schema).map(([key, entry]) => [key, entry.default]),
);

const storeKey = "settings";
let current = null;
const listeners = new Set();

const validate = (raw) => {
	const out = {};
	const rejected = [];
	for (const [name, entry] of Object.entries(schema)) {
		const incoming = raw?.[name];
		if (incoming === undefined) {
			out[name] = entry.default;
			continue;
		}
		const invalid = Symbol(name);
		const value = entry.validate(incoming, invalid);
		if (value === invalid) {
			rejected.push(name);
			out[name] = entry.default;
		}
		else {
			out[name] = value;
		}
	}
	return { settings: out, rejected };
};

export const load = () => {
	if (current)
		return current;
	current = validate(storage.read(storeKey, {})).settings;
	return current;
};

export const get = (name) => load()[name];
export const all = () => ({ ...load() });

export const set = (patch) => {
	const { settings, rejected } = validate({ ...load(), ...patch });
	current = settings;
	const persisted = storage.write(storeKey, settings);
	for (const fn of listeners)
		fn(settings, rejected, patch ?? {});
	return { settings, rejected, persisted };
};

export const reset = () => {
	current = { ...defaults };
	const persisted = storage.write(storeKey, current);
	for (const fn of listeners)
		fn(current, [], {});
	return { settings: current, persisted };
};

export const onChange = (fn) => {
	listeners.add(fn);
	return () => listeners.delete(fn);
};
