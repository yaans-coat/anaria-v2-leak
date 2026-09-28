// internal views rendered straight into the app shell — no iframes, so they
// inherit the active theme, motion settings and every animation.
import { icon } from "./icons.js";
import { sections, searchEngines, engineLabel, transportOptions, schema } from "./settings.js";
import { themes } from "./themes.js";
import * as chat from "./chat.js";

export const escapeHtml = (value) =>
	String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const VIEWS = ["home", "browse", "settings", "games", "movies", "chat", "music", "privacy", "dmca"];

export const TITLES = {
	home: "home",
	browse: "browse",
	settings: "settings",
	games: "games",
	movies: "movies",
	chat: "chatroom",
	music: "music",
	privacy: "privacy policy",
	dmca: "dmca",
};

// ---- shared bits ------------------------------------------------------
const switchControl = (name, checked) => `
	<label class="switch" for="set-${name}">
		<input id="set-${name}" type="checkbox" name="${name}"${checked ? " checked" : ""}>
		<span class="switch__track"><span class="switch__thumb"></span></span>
	</label>`;

const selectControl = (name, entry, value) => {
	const options = entry.options();
	return `<select class="select" id="set-${name}" name="${name}">
		${options.map((option) => `<option value="${escapeHtml(option.value)}"${option.value === value ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
	</select>`;
};

const textControl = (name, entry, value) =>
	`<input class="input" id="set-${name}" type="${entry.type ?? "text"}" name="${name}"
		value="${escapeHtml(value ?? "")}" placeholder="${escapeHtml(entry.placeholder ?? "")}"
		autocomplete="off" autocapitalize="off" spellcheck="false">`;

const themeControl = (value) => `
	<div class="theme-grid">
		${themes.map((theme) => `
			<button type="button" class="theme-card${theme.id === value ? " is-active" : ""}" data-theme-id="${theme.id}" aria-pressed="${theme.id === value}">
				<span class="theme-card__swatch" style="--t-bg:${theme.vars.bg};--t-surface:${theme.vars.surface};--t-accent:${theme.vars.accent};--t-accent2:${theme.vars.accent2}">
					<span class="theme-card__dot"></span>
					<span class="theme-card__bar"></span>
				</span>
				<span class="theme-card__name">${escapeHtml(theme.label)}</span>
				<span class="theme-card__check">${icon("check")}</span>
			</button>`).join("")}
	</div>`;

const field = (name, entry, value) => {
	const help = entry.showHelp && entry.help ? `<p class="field__help">${escapeHtml(entry.help)}</p>` : "";

	if (entry.kind === "toggle")
		return `
		<div class="field field--toggle">
			<div class="field__copy">
				<label for="set-${name}">${escapeHtml(entry.label)}</label>
				${help}
			</div>
			${switchControl(name, value)}
		</div>`;

	if (entry.kind === "themes")
		return `
		<div class="field field--stack">
			<div class="field__copy"><label>${escapeHtml(entry.label)}</label>${help}</div>
			${themeControl(value)}
		</div>`;

	const control =
		entry.kind === "select"
			? selectControl(name, entry, value)
			: textControl(name, entry, value);

	return `
		<div class="field${entry.kind === "select" ? " field--select" : ""}">
			<div class="field__copy">
				<label for="set-${name}">${escapeHtml(entry.label)}</label>
				${help}
			</div>
			<div class="field__control">${control}</div>
		</div>`;
};

const panelFields = (sectionId, current) =>
	Object.entries(schema)
		.filter(([, entry]) => entry.section === sectionId)
		.map(([name, entry]) => field(name, entry, current[name]))
		.join("");

// ---- home -------------------------------------------------------------
export const quips = [
	"why do people use gn-math again?",
	"best ubg site evea!",
	"howdy.",
	"yellow? banana?",
	"imamadarfadargentelman...",
	"js is lwk fire.",
	"first time using a dedicated server, wish me luck!",
	"welcome.",
	"enjoy your stay!",
];

export const links = {
	github: "https://github.com/yaans-coat/anaria",
	discord: "https://discord.com/invite/VPq3CD6d7B",
};

const quickLinks = [
	{ label: "wikipedia", url: "https://wikipedia.org" },
	{ label: "youtube", url: "https://youtube.com" },
	{ label: "reddit", url: "https://reddit.com" },
	{ label: "github", url: "https://github.com" },
	{ label: "discord", url: "https://discord.com/app" },
	{ label: "twitch", url: "https://twitch.tv" },
	{ label: "x", url: "https://x.com" },
	{ label: "netflix", url: "https://netflix.com" },
];

const hostOf = (url) => {
	try {
		return new URL(url).host.replace(/^www\./, "");
	}
	catch {
		return "";
	}
};

const tile = (link) => {
	const host = hostOf(link.url);
	return `
	<button class="tile" type="button" data-open="${escapeHtml(link.url)}" title="${escapeHtml(link.label)}">
		<span class="tile__glyph">
			<span class="tile__letter">${escapeHtml(link.label.slice(0, 1))}</span>
			<img class="tile__logo" src="/api/icon?host=${encodeURIComponent(host)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">
		</span>
		<span class="tile__label">${escapeHtml(link.label)}</span>
	</button>`;
};

const miniLog = (entry) => `
	<li class="mini-log mini-log--${entry.status}">
		<span class="status-dot"></span>
		<span class="mini-log__url">${escapeHtml(entry.display)}</span>
		<span class="mini-log__meta">${escapeHtml(entry.ms ? `${entry.ms} ms` : entry.kind)}</span>
		<span class="mini-log__time">${escapeHtml(entry.rel)}</span>
	</li>`;

const homeView = (ctx) => `
	<div class="home view-pane">
		<section class="hero">
			<h1 class="hero__title">anaria</h1>
			<p class="hero__quip" id="quip">${escapeHtml(quips[0])}</p>
			<form class="searchbox" data-home-search role="search">
				<span class="searchbox__icon">${icon("search")}</span>
				<input id="home-q" class="searchbox__input" type="text" name="q"
					placeholder="search or type a url" autocomplete="off" autocapitalize="off"
					spellcheck="false" enterkeyhint="go" aria-label="search">
				<button class="btn btn--accent searchbox__go" type="submit">
					${icon("arrow")}<span>go</span>
				</button>
			</form>
		</section>

		<section class="links">
			<div class="tiles">${quickLinks.map(tile).join("")}</div>
			<div class="social">
				<a class="btn btn--ghost" href="${links.github}" target="_blank" rel="noreferrer">${icon("github")}<span>github</span></a>
				<a class="btn btn--ghost" href="${links.discord}" target="_blank" rel="noreferrer">${icon("discord")}<span>discord</span></a>
			</div>
		</section>

		${ctx.historyOn ? `
		<section class="section">
			<div class="section__head">
				<h2 class="section__title">recent traffic</h2>
				${ctx.recent.length ? `<button class="iconbtn iconbtn--tiny" type="button" data-action="clear-logs" title="clear history">${icon("trash")}</button>` : ""}
			</div>
			${ctx.recent.length
				? `<ul class="mini-logs">${ctx.recent.map(miniLog).join("")}</ul>`
				: `<div class="empty">${icon("bolt")}<p>nothing has moved yet.</p></div>`}
		</section>` : ""}
	</div>`;

// ---- games ------------------------------------------------------------
const gameCard = (game) => `
	<button class="game-card" type="button" data-game="${escapeHtml(game.id)}">
		<span class="game-card__icon">${icon("gamepad")}</span>
		<span class="game-card__name">${escapeHtml(game.name)}</span>
	</button>`;

const gamePlayer = (game) => `
	<div class="player">
		<header class="player__bar">
			<button class="iconbtn" type="button" data-action="close-game" title="back to games">${icon("back")}</button>
			<span class="player__title">${escapeHtml(game.name)}</span>
			<button class="iconbtn" type="button" data-action="fullscreen" title="fullscreen">${icon("expand")}</button>
		</header>
		<iframe class="player__frame" src="${escapeHtml(game.src)}" title="${escapeHtml(game.name)}"
			allow="fullscreen; autoplay; gamepad; encrypted-media" referrerpolicy="no-referrer"></iframe>
	</div>`;

const gamesView = (ctx) => {
	if (ctx.activeGame)
		return gamePlayer(ctx.activeGame);
	return `
	<div class="view-pane games">
		<header class="view-head">
			<div class="view-head__copy"><h1>games</h1></div>
			<div class="view-head__actions">
				<input class="input games__filter" id="games-filter" type="search" placeholder="find a game" aria-label="find a game" spellcheck="false">
			</div>
		</header>
		<div class="games__grid" id="games-grid">
			<div class="boot"><span class="boot__spinner"></span><span>loading games…</span></div>
		</div>
	</div>`;
};

// ---- chat -------------------------------------------------------------
const timeOf = (ts) => {
	try {
		return new Date(ts ?? Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}
	catch {
		return "";
	}
};

const messageRow = (message, me) => `
	<div class="msg${message.user === me ? " msg--me" : ""}">
		<span class="msg__avatar">${escapeHtml(String(message.user ?? "?").slice(0, 1).toLowerCase())}</span>
		<div class="msg__body">
			<span class="msg__head"><b>${escapeHtml(message.user ?? "someone")}</b><time>${timeOf(message.ts)}</time></span>
			<p class="msg__text">${escapeHtml(message.text ?? "")}</p>
		</div>
	</div>`;

const chatView = (ctx) => `
	<div class="view-pane chat">
		<header class="view-head">
			<div class="view-head__copy"><h1>chatroom</h1></div>
			<div class="view-head__actions">
				${ctx.chatUser
					? `<span class="userchip">${icon("user")}<span>${escapeHtml(ctx.chatUser)}</span><button class="linklike" type="button" data-action="switch-user">switch</button></span>`
					: `<span class="userchip userchip--off">${icon("user")}<span>guest</span></span>`}
			</div>
		</header>

		${ctx.chatUser ? `
		<div class="chat__panel">
			<div class="chat__log" id="chat-log" aria-live="polite"></div>
			<form class="chat__form" id="chat-form">
				<input class="input" id="chat-input" type="text" placeholder="say something…" maxlength="300" autocomplete="off" aria-label="message">
				<button class="btn btn--accent" type="submit">${icon("arrow")}<span>send</span></button>
			</form>
			<p class="chat__status" id="chat-status"></p>
		</div>` : `
		<div class="chat__join">
			<span class="chat__join-icon">${icon("user")}</span>
			<h2>pick a name to enter</h2>
			<p>the chatroom is only open to users. your name lives on this device — no email, no password.</p>
			<form class="chat__join-form" id="chat-join">
				<input class="input" id="chat-name" type="text" placeholder="username" maxlength="24" autocomplete="off" spellcheck="false" required>
				<button class="btn btn--accent" type="submit">join</button>
			</form>
		</div>`}
	</div>`;

// ---- settings ---------------------------------------------------------
const creditsBody = `credits!

lyra.zip - inspo for anaria which lyra was formley waves which was inspo blackwaves
selenite.cc - ui/ux inspo
GitHub - html5 games and also other ubgs
bog from truffled.lol - gave me the help and support i needed

that's it! bye! (˶>⩊<˶)`;

const creditsPanel = () => `
	<section class="settings__panel" data-panel="credits" hidden>
		<header class="panel__head"><h2>credits</h2></header>
		<div class="credits">
			<span class="credits__badge">${icon("heart")}</span>
			<pre class="credits__body">${escapeHtml(creditsBody)}</pre>
		</div>
		<div class="social social--credits">
			<a class="btn btn--ghost" href="${links.github}" target="_blank" rel="noreferrer">${icon("github")}<span>github</span></a>
			<a class="btn btn--ghost" href="${links.discord}" target="_blank" rel="noreferrer">${icon("discord")}<span>discord</span></a>
		</div>
	</section>`;

const settingsView = (ctx) => {
	const current = ctx.settings;
	const nav = sections
		.map((section, index) => `
			<button class="settings__tab${index === 0 ? " is-active" : ""}" type="button" data-tab="${section.id}">
				<span class="settings__tab-icon">${icon(section.icon)}</span>
				<span class="settings__tab-copy"><strong>${escapeHtml(section.label)}</strong></span>
				<span class="settings__tab-chevron">${icon("chevron")}</span>
			</button>`)
		.join("");

	const panels = sections
		.filter((section) => section.id !== "credits")
		.map((section, index) => `
			<section class="settings__panel" data-panel="${section.id}"${index === 0 ? "" : " hidden"}>
				<header class="panel__head"><h2>${escapeHtml(section.label)}</h2></header>
				<form class="settings__form" data-settings-form>
					${panelFields(section.id, current)}
				</form>
				${section.id === "cloaking" ? `
				<div class="panel__actions">
					<button class="btn btn--danger" type="button" data-action="cloak-now">${icon("ghost")}<span>disguise this tab now</span></button>
				</div>` : ""}
			</section>`)
		.join("");

	return `
	<div class="settings view-pane">
		<header class="view-head">
			<div class="view-head__copy"><h1>settings</h1></div>
			<div class="view-head__actions">
				<button class="btn btn--ghost btn--danger" type="button" data-action="reset-settings">${icon("reload")}<span>reset all</span></button>
			</div>
		</header>
		<div class="settings__layout">
			<nav class="settings__nav" aria-label="settings categories">${nav}</nav>
			<div class="settings__panels">
				${panels}
				${creditsPanel()}
			</div>
		</div>
	</div>`;
};

// ---- privacy / dmca ---------------------------------------------------
const privacyView = () => `
	<div class="view-pane article">
		<header class="article__head">
			<h1>privacy policy</h1>
			<p>short version: we do not sell or share your data, everything is end to end encrypted, and we do not profit off your search history or off you.</p>
		</header>

		<section class="card">
			<h2>we do not sell or share your data</h2>
			<p>anaria has no advertising partners, no data brokers, no analytics vendors and no third parties that receive your information. there is no user database to sell because there are no accounts. we do not sell your data. we do not share your data. full stop.</p>
		</section>

		<section class="card">
			<h2>everything is end to end encrypted</h2>
			<p>your traffic travels through an encrypted tunnel from your browser to the destination. requests are wrapped inside the tunnel, so the anaria server only acts as a relay: it cannot read the pages you open, the queries you type or any form you submit. the encryption runs end to end between your browser and the site you asked for.</p>
		</section>

		<section class="card">
			<h2>we are not profiting off your search history or you</h2>
			<p>anaria runs no ads, no tracking pixels and no profiling. your search history is never analysed, never monetised and never used to build an audience profile. we do not profit off your search history, and we do not profit off you in any other way either — there is nothing here to sell you and nothing here to sell you with.</p>
		</section>

		<section class="card">
			<h2>what is stored, and where</h2>
			<ul class="ticks">
				<li>${icon("check")} <span><b>your settings</b> — themes, search engine and toggles live in your own browser's local storage. they are never transmitted to us.</span></li>
				<li>${icon("check")} <span><b>your traffic history</b> — a local-only feature you can turn off under <button class="linklike" type="button" data-goto="settings">advanced</button>, and clear at any time from the home page.</span></li>
				<li>${icon("check")} <span><b>cookies</b> — controlled by the cookie toggle under advanced. when you turn it off, anaria wipes its own stored data on the next load.</span></li>
				<li>${icon("check")} <span><b>server logs</b> — we do not keep browsing records. there is nothing tying a request back to you.</span></li>
			</ul>
		</section>

		<section class="card">
			<h2>your choices</h2>
			<p>turn off history, turn off cookies, clear the log, pick another search engine, or close the tab — every option lives in <button class="linklike" type="button" data-goto="settings">settings</button>. using anaria is as private as it gets by default, and you can always make it more private.</p>
		</section>

		<footer class="article__foot">
			<p>questions about this policy? reach out through the contact channel listed on our homepage.</p>
			<button class="btn btn--accent" type="button" data-goto="home">${icon("home")}<span>back to home</span></button>
		</footer>
	</div>`;

const dmcaView = () => `
	<div class="view-pane article">
		<header class="article__head">
			<h1>dmca</h1>
			<p>please read this before filing. most notices sent to anaria are aimed at the wrong party, and we would rather point you at the right one.</p>
		</header>

		<section class="card card--accent">
			<h2>contact the third party providers, not us</h2>
			<p>instead of sending a dmca notice to anaria, please contact the third party providers directly. anaria does not create, select, upload, share or host any of the content you find through it. the fastest and most effective route is always the source that actually stores the material.</p>
		</section>

		<section class="card">
			<h2>we do not host or share the content</h2>
			<p>anaria is a proxy front end. it fetches pages and games from online sources at the moment you request them and streams the response back to your browser. nothing is copied onto our servers, nothing is stored by us, and nothing is redistributed by us. we do not host the games ourselves and we do not share the games ourselves.</p>
		</section>

		<section class="card">
			<h2>where the content comes from</h2>
			<p>games and pages are retrieved from third party providers and public sources across the open web. those providers are the rights holders or their distributors, and they control what is published under their names. anaria has no editorial control over, and no ownership of, that material.</p>
		</section>

		<section class="card">
			<h2>if you still want to reach us</h2>
			<ul class="ticks">
				<li>${icon("check")} <span>identify the exact url you believe infringes your work.</span></li>
				<li>${icon("check")} <span>contact the provider that actually serves that url — that is where the takedown takes effect.</span></li>
				<li>${icon("check")} <span>only if the source cannot be reached, contact us through our published channel with the same details, and we will help route it onward.</span></li>
			</ul>
			<p class="note">${icon("info")} <span>we do not sell or share user data, and we do not profit from the content or from you. filing against anaria cannot remove material from the providers that actually store it.</span></p>
		</section>

		<footer class="article__foot">
			<button class="btn btn--accent" type="button" data-goto="home">${icon("home")}<span>back to home</span></button>
			<button class="btn btn--ghost" type="button" data-goto="privacy">${icon("shield")}<span>privacy policy</span></button>
		</footer>
	</div>`;

// ---- movies ------------------------------------------------------------
// tmdb for the catalogue, cinesrc for the streams. both are relayed: tmdb has
// no cors/corp headers (coep would block a direct call) and cinesrc frames
// need the credentialless attribute to survive require-corp.
const tmdb = async (apiPath, params = {}) => {
	const query = new URLSearchParams({ path: apiPath });
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === "")
			continue;
		if (!/^[a-z0-9_]+$/i.test(key))
			continue;
		query.set(key, String(value));
	}
	const response = await fetch(`/api/tmdb?${query}`);
	if (!response.ok)
		throw new Error(`tmdb ${response.status}`);
	return response.json();
};

const art = (file, size = "w342") =>
	file
		? `/api/tmdbg?size=${size}&file=${encodeURIComponent(String(file).replace(/^\/+/, ""))}`
		: "";

const mediaKind = (item) =>
	item.media_type === "tv" || (item.first_air_date && !item.release_date) ? "tv" : "movie";
const mediaTitle = (item) => item.title || item.name || "untitled";
const mediaYear = (item) => String(item.release_date || item.first_air_date || "").slice(0, 4);
const mediaScore = (vote) => (Number(vote) > 0 ? `★ ${Number(vote).toFixed(1)}` : "");

const formatRuntime = (minutes) => {
	if (!minutes)
		return "";
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return hours ? `${hours}h ${mins}m` : `${mins}m`;
};

const bootRow = (label) =>
	`<div class="boot"><span class="boot__spinner"></span><span>${escapeHtml(label)}</span></div>`;

const emptyState = (title, hint = "") =>
	`<div class="empty">${icon("film")}<p><b>${escapeHtml(title)}</b>${hint ? `<br><span>${escapeHtml(hint)}</span>` : ""}</p></div>`;

const posterCard = (item) => {
	const kind = mediaKind(item);
	const file = item.poster_path;
	return `
	<button class="poster" type="button" data-media="${kind}" data-id="${Number(item.id) || 0}" data-title="${escapeHtml(mediaTitle(item))}">
		${file
			? `<img class="poster__art" src="${escapeHtml(art(file))}" alt="" loading="lazy" decoding="async">`
			: `<span class="poster__art poster__art--glyph">${icon("film")}</span>`}
		<span class="poster__glow" aria-hidden="true"></span>
		<span class="poster__copy">
			<b>${escapeHtml(mediaTitle(item))}</b>
			<i>${escapeHtml([mediaYear(item), mediaScore(item.vote_average)].filter(Boolean).join(" · "))}</i>
		</span>
	</button>`;
};

const personCard = (person) => `
	<button class="person" type="button" data-person="${Number(person.id) || 0}">
		${person.profile_path
			? `<img src="${escapeHtml(art(person.profile_path, "w185"))}" alt="" loading="lazy" decoding="async">`
			: `<span class="person__glyph">${icon("user")}</span>`}
		<b>${escapeHtml(person.name)}</b>
		<i>${escapeHtml(person.known_for_department || "actor")}</i>
	</button>`;

const posterGrid = (items) => `<div class="poster-grid">${items.map(posterCard).join("")}</div>`;

const mediaRow = (title, items) => {
	const usable = (items ?? []).filter((item) => item && item.id != null && item.media_type !== "person");
	if (!usable.length)
		return "";
	return `
	<section class="row">
		<div class="row__head"><h2>${escapeHtml(title)}</h2></div>
		<div class="row__scroller">${usable.map(posterCard).join("")}</div>
	</section>`;
};

const genreStrip = (list) => `
	<section class="row">
		<div class="row__head"><h2>browse by genre</h2></div>
		<div class="row__scroller row__scroller--tags">
			${list.map((genre) => `<button class="tag tag--btn" type="button" data-genre="${genre.id}" data-genre-name="${escapeHtml(genre.name)}">${escapeHtml(genre.name)}</button>`).join("")}
		</div>
	</section>`;

const peopleRow = (people) => `
	<section class="row">
		<div class="row__head"><h2>people</h2></div>
		<div class="row__scroller row__scroller--people">${people.map(personCard).join("")}</div>
	</section>`;

const resultsHead = (label) => `
	<div class="results__head">
		<button class="btn btn--ghost" type="button" data-movies="home">${icon("back")}<span>back</span></button>
		<h2>${escapeHtml(label)}</h2>
	</div>`;

const heroCard = (item) => {
	const kind = mediaKind(item);
	const backdrop = art(item.backdrop_path || item.poster_path, "w1280");
	return `
	<section class="spotlight"${backdrop ? ` style="--spot-art:url('${escapeHtml(backdrop)}')"` : ""}>
		<div class="spotlight__scrim" aria-hidden="true"></div>
		<div class="spotlight__copy">
			<span class="spotlight__kicker">${icon("bolt")} trending this week</span>
			<h2>${escapeHtml(mediaTitle(item))}</h2>
			<p class="spotlight__meta">${escapeHtml([mediaYear(item), mediaScore(item.vote_average), kind === "tv" ? "series" : "film"].filter(Boolean).join("  ·  "))}</p>
			${item.overview ? `<p class="spotlight__text">${escapeHtml(String(item.overview).slice(0, 260))}…</p>` : ""}
			<div class="spotlight__actions">
				<button class="btn btn--accent" type="button" data-media="${kind}" data-id="${Number(item.id) || 0}" data-play="1" data-title="${escapeHtml(mediaTitle(item))}">
					${icon("play")}<span>watch now</span>
				</button>
				<button class="btn btn--ghost" type="button" data-media="${kind}" data-id="${Number(item.id) || 0}">
					${icon("info")}<span>more info</span>
				</button>
			</div>
		</div>
	</section>`;
};

const detailMarkup = (detail, kind) => {
	const cast = (detail.credits?.cast ?? []).filter((person) => person.profile_path).slice(0, 14);
	const genres = (detail.genres ?? []).map((genre) => genre.name);
	const facts = [
		mediaYear(detail),
		kind === "tv"
			? `${detail.number_of_seasons ?? "?"} season${detail.number_of_seasons === 1 ? "" : "s"}`
			: formatRuntime(detail.runtime),
		mediaScore(detail.vote_average),
	].filter(Boolean).join("  ·  ");
	const backdrop = art(detail.backdrop_path || detail.poster_path, "w1280");
	const poster = art(detail.poster_path, "w500");
	return `
	<div class="detail__scrim" data-detail="close"></div>
	<article class="detail" role="dialog" aria-modal="true" aria-label="${escapeHtml(mediaTitle(detail))}">
		<button class="iconbtn detail__close" type="button" data-detail="close" aria-label="close">${icon("close")}</button>
		<div class="detail__art">
			${backdrop ? `<img src="${escapeHtml(backdrop)}" alt="" decoding="async">` : ""}
			${poster ? `<img class="detail__poster" src="${escapeHtml(poster)}" alt="" decoding="async">` : ""}
		</div>
		<div class="detail__body">
			<h2>${escapeHtml(mediaTitle(detail))}</h2>
			<p class="detail__facts">${escapeHtml(facts)}</p>
			${genres.length ? `<div class="detail__tags">${genres.map((genre) => `<span class="tag">${escapeHtml(genre)}</span>`).join("")}</div>` : ""}
			${detail.tagline ? `<p class="detail__tagline">${escapeHtml(detail.tagline)}</p>` : ""}
			<p class="detail__text">${escapeHtml(detail.overview || "no synopsis on file.")}</p>
			<div class="detail__actions">
				<button class="btn btn--accent" type="button" data-detail="play">${icon("play")}<span>watch now</span></button>
				${kind === "tv" ? `<span class="detail__hint">starts at season 1, episode 1 — change it in the player.</span>` : ""}
			</div>
			${cast.length ? `
			<div class="cast">
				<h3>cast</h3>
				<div class="cast__row">
					${cast.map((person) => `
					<button class="cast__card" type="button" data-person="${Number(person.id) || 0}">
						<img src="${escapeHtml(art(person.profile_path, "w185"))}" alt="" loading="lazy" decoding="async">
						<b>${escapeHtml(person.name)}</b>
						<i>${escapeHtml(String(person.character || "").slice(0, 34))}</i>
					</button>`).join("")}
				</div>
			</div>` : ""}
		</div>
	</article>`;
};

// ---- movies view shell ------------------------------------------------
const moviesView = () => `
	<div class="view-pane movies">
		<header class="view-head">
			<div class="view-head__copy">
				<h1>movies</h1>
				<p class="view-head__sub">streamed straight through anaria — tmdb for the catalogue, cinesrc for the play button.</p>
			</div>
			<div class="view-head__actions">
				<form class="searchbox searchbox--compact" id="movies-search" role="search">
					<span class="searchbox__icon">${icon("search")}</span>
					<input class="searchbox__input" type="search" name="q"
						placeholder="search titles, actors, genres…" autocomplete="off" autocapitalize="off"
						spellcheck="false" enterkeyhint="search" aria-label="search movies and tv">
					<button class="btn btn--accent searchbox__go" type="submit">${icon("arrow")}<span>go</span></button>
				</form>
			</div>
		</header>
		<div class="movies__body" id="movies-body">
			${bootRow("loading the catalogue…")}
		</div>
	</div>`;

const createMoviesController = (root, bridge) => {
	const body = root.querySelector("#movies-body");
	const form = root.querySelector("#movies-search");
	if (!body)
		return null;

	let genres = [];
	let searchTimer = 0;
	let detail = null;
	let detailEl = null;
	let cine = null;
	let gone = false;

	// --- accent for the cinesrc player (it wants a plain hex) --------------
	const themeAccent = () => {
		try {
			const raw = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
			if (raw.startsWith("#"))
				return raw.slice(0, 7).toLowerCase();
			const srgb = raw.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
			const parts = srgb
				? srgb.slice(1, 4).map((part) => Math.round(Number(part) * 255))
				: (raw.match(/(\d+(?:\.\d+)?)[^\d]+(\d+(?:\.\d+)?)[^\d]+(\d+(?:\.\d+)?)/) || []).slice(1, 4).map(Number);
			if (parts.length === 3)
				return `#${parts.map((part) => Math.max(0, Math.min(255, part)).toString(16).padStart(2, "0")).join("")}`;
		}
		catch { }
		return "";
	};

	// --- player -------------------------------------------------------------
	const closeCine = () => {
		if (!cine)
			return;
		window.removeEventListener("message", cine.listener);
		document.removeEventListener("keydown", cine.onKey);
		const el = cine.el;
		cine = null;
		el.classList.remove("is-open");
		setTimeout(() => el.remove(), 260);
	};

	const openCine = ({ kind, id, season = 1, episode = 1, title }) => {
		closeCine();
		const params = new URLSearchParams({ back: "close", autoskip: "true", autonext: "true" });
		const accent = themeAccent();
		if (accent)
			params.set("color", accent);
		const src = kind === "tv"
			? `https://cinesrc.st/embed/tv/${encodeURIComponent(id)}?s=${encodeURIComponent(season)}&e=${encodeURIComponent(episode)}&${params}`
			: `https://cinesrc.st/embed/movie/${encodeURIComponent(id)}?${params}`;

		const el = document.createElement("div");
		el.className = "cine";
		el.innerHTML = `
			<header class="cine__bar">
				<button class="iconbtn" type="button" data-cine="close" aria-label="close player">${icon("back")}</button>
				<span class="cine__title">${escapeHtml(title || "now playing")}</span>
				${kind === "tv" ? `
				<span class="cine__eps">
					<label>season <input class="input" id="cine-season" type="number" inputmode="numeric" min="1" value="${Number(season) || 1}"></label>
					<label>episode <input class="input" id="cine-episode" type="number" inputmode="numeric" min="1" value="${Number(episode) || 1}"></label>
					<button class="btn btn--ghost" type="button" data-cine="jump">play</button>
				</span>` : ""}
				<a class="iconbtn" href="${escapeHtml(src)}" target="_blank" rel="noreferrer" aria-label="open the player in a new tab">${icon("external")}</a>
			</header>
			<div class="cine__stage">
				<iframe class="cine__frame" credentialless allow="autoplay; fullscreen; picture-in-picture"
					allowfullscreen referrerpolicy="no-referrer" title="${escapeHtml(title || "player")}"
					src="${escapeHtml(src)}"></iframe>
			</div>`;

		const listener = (event) => {
			if (event.origin !== "https://cinesrc.st")
				return;
			const data = event.data || {};
			if (data.type === "cinesrc:close")
				closeCine();
		};
		const onKey = (event) => {
			if (event.key === "Escape")
				closeCine();
		};
		const current = { kind, id, season, episode, title };

		el.addEventListener("click", (event) => {
			const action = event.target.closest("[data-cine]")?.dataset.cine;
			if (action === "close") {
				closeCine();
				return;
			}
			if (action === "jump" && cine) {
				openCine({
					...current,
					season: Math.max(1, Number(el.querySelector("#cine-season")?.value) || 1),
					episode: Math.max(1, Number(el.querySelector("#cine-episode")?.value) || 1),
				});
			}
		});

		cine = { el, listener, onKey };
		window.addEventListener("message", listener);
		document.addEventListener("keydown", onKey);
		document.body.append(el);
		requestAnimationFrame(() => el.classList.add("is-open"));
	};

	// --- detail sheet -------------------------------------------------------
	const closeDetail = () => {
		if (!detailEl)
			return;
		const el = detailEl;
		detail = null;
		detailEl = null;
		el.classList.remove("is-open");
		setTimeout(() => el.remove(), 240);
	};

	const openDetail = async (kind, id) => {
		closeDetail();
		const el = document.createElement("div");
		el.className = "detailwrap is-open";
		el.innerHTML = `<div class="detail detail--loading">${bootRow("loading title…")}</div>`;
		detailEl = el;
		el.addEventListener("click", (event) => {
			const person = event.target.closest("[data-person]");
			if (person) {
				closeDetail();
				void showPerson(person.dataset.person);
				return;
			}
			const action = event.target.closest("[data-detail]")?.dataset.detail;
			if (action === "close")
				closeDetail();
			else if (action === "play" && detail)
				openCine(detail);
		});
		document.body.append(el);
		try {
			const data = await tmdb(`${kind}/${id}`, { append_to_response: "credits" });
			if (detailEl !== el)
				return;
			detail = { kind, id: Number(id), season: 1, episode: 1, title: mediaTitle(data), data };
			el.innerHTML = detailMarkup(data, kind);
		}
		catch {
			if (detailEl !== el)
				return;
			el.innerHTML = `<div class="detail">${emptyState("could not load this title", "tmdb did not answer — try again in a moment.")}</div>`;
		}
	};

	// --- pages --------------------------------------------------------------
	const showHome = async () => {
		const token = Symbol();
		showHome.last = token;
		body.innerHTML = bootRow("loading the catalogue…");
		try {
			const [trending, popular, top, upcoming, shows, genreData] = await Promise.all([
				tmdb("trending/all/week"),
				tmdb("movie/popular"),
				tmdb("movie/top_rated"),
				tmdb("movie/upcoming"),
				tmdb("tv/popular"),
				tmdb("genre/movie/list"),
			]);
			if (showHome.last !== token || gone)
				return;
			genres = genreData.genres ?? [];
			const featured = (trending.results ?? []).find((item) => item.backdrop_path) ?? (trending.results ?? [])[0];
			body.innerHTML = `
				${featured ? heroCard(featured) : ""}
				${mediaRow("trending this week", trending.results)}
				${genreStrip(genres)}
				${mediaRow("popular right now", popular.results)}
				${mediaRow("coming soon", upcoming.results)}
				${mediaRow("top rated of all time", top.results)}
				${mediaRow("binge-worthy shows", shows.results)}`;
		}
		catch (error) {
			if (showHome.last !== token || gone)
				return;
			body.innerHTML = emptyState("the catalogue would not load", String(error?.message ?? error));
		}
	};

	const showSearch = async (query) => {
		const needle = String(query ?? "").trim();
		if (needle.length < 2) {
			void showHome();
			return;
		}
		const token = Symbol();
		showSearch.last = token;
		body.innerHTML = bootRow(`searching for “${needle}”…`);
		try {
			const results = await tmdb("search/multi", { query: needle, include_adult: "false" });
			if (showSearch.last !== token || gone)
				return;
			const hits = results.results ?? [];
			const people = hits.filter((item) => item.media_type === "person");
			const titles = hits.filter((item) => item.media_type && item.media_type !== "person");
			const matches = genres.filter((genre) => genre.name.toLowerCase().includes(needle.toLowerCase())).slice(0, 8);
			body.innerHTML = `
				${resultsHead(`results for “${needle}”`)}
				${matches.length ? genreStrip(matches) : ""}
				${people.length ? peopleRow(people.slice(0, 12)) : ""}
				${titles.length ? posterGrid(titles.slice(0, 24)) : ""}
				${!matches.length && !people.length && !titles.length
					? emptyState("nothing matched", "try an actor, a genre like “horror”, or part of a title.")
					: ""}`;
		}
		catch (error) {
			if (showSearch.last !== token || gone)
				return;
			body.innerHTML = `${resultsHead("search")}<div class="empty">${icon("search")}<p>search failed — ${escapeHtml(String(error?.message ?? error))}</p></div>`;
		}
	};

	const showGenre = async (genre) => {
		const token = Symbol();
		showGenre.last = token;
		body.innerHTML = bootRow(`loading ${genre.name}…`);
		try {
			const data = await tmdb("discover/movie", {
				with_genres: genre.id,
				sort_by: "popularity.desc",
				include_adult: "false",
			});
			if (showGenre.last !== token || gone)
				return;
			body.innerHTML = `
				${resultsHead(`${genre.name} movies`)}
				${data.results?.length ? posterGrid(data.results) : emptyState("no titles in this genre")}`;
		}
		catch (error) {
			if (showGenre.last !== token || gone)
				return;
			body.innerHTML = `${resultsHead(genre.name)}<div class="empty">${icon("film")}<p>${escapeHtml(String(error?.message ?? error))}</p></div>`;
		}
	};

	const showPerson = async (personId) => {
		const token = Symbol();
		showPerson.last = token;
		body.innerHTML = bootRow("loading filmography…");
		try {
			const [person, credits] = await Promise.all([
				tmdb(`person/${personId}`),
				tmdb(`person/${personId}/combined_credits`),
			]);
			if (showPerson.last !== token || gone)
				return;
			const worked = (credits.cast ?? [])
				.filter((entry) => entry.id != null && (entry.vote_count ?? 0) > 5)
				.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
				.slice(0, 30);
			body.innerHTML = `
				${resultsHead(person.name || "person")}
				${person.biography ? `<p class="person__bio">${escapeHtml(person.biography.slice(0, 320))}</p>` : ""}
				${worked.length ? posterGrid(worked) : emptyState("no credits on file")}`;
		}
		catch (error) {
			if (showPerson.last !== token || gone)
				return;
			body.innerHTML = `${resultsHead("person")}<div class="empty">${icon("user")}<p>${escapeHtml(String(error?.message ?? error))}</p></div>`;
		}
	};

	// --- wiring -------------------------------------------------------------
	body.addEventListener("click", (event) => {
		const media = event.target.closest("[data-media]");
		if (media && media.dataset.id !== "0") {
			const kind = media.dataset.media === "tv" ? "tv" : "movie";
			if (media.dataset.play)
				openCine({ kind, id: media.dataset.id, title: media.dataset.title || "now playing" });
			else
				void openDetail(kind, media.dataset.id);
			return;
		}
		const person = event.target.closest("[data-person]");
		if (person) {
			void showPerson(person.dataset.person);
			return;
		}
		const genre = event.target.closest("[data-genre]");
		if (genre) {
			void showGenre({ id: genre.dataset.genre, name: genre.dataset.genreName || "genre" });
			return;
		}
		if (event.target.closest('[data-movies="home"]'))
			void showHome();
	});

	if (form) {
		const input = form.querySelector("input");
		form.addEventListener("submit", (event) => {
			event.preventDefault();
			clearTimeout(searchTimer);
			void showSearch(input.value);
			input.blur();
		});
		input?.addEventListener("input", () => {
			clearTimeout(searchTimer);
			searchTimer = setTimeout(() => void showSearch(input.value), 380);
		});
	}

	return {
		start: () => void showHome(),
		teardown: () => {
			gone = true;
			clearTimeout(searchTimer);
			showHome.last = showSearch.last = showGenre.last = showPerson.last = Symbol();
			closeCine();
			closeDetail();
		},
	};
};

// ---- music -------------------------------------------------------------
const MUSIC_HOME = "https://music.youtube.com/";

const musicView = () => `
	<div class="view-pane music">
		<header class="view-head">
			<div class="view-head__copy">
				<h1>music</h1>
				<p class="view-head__sub">youtube music, pulled through the proxy — nobody sees this but you.</p>
			</div>
			<div class="view-head__actions">
				<form class="searchbox searchbox--compact" id="music-search" role="search">
					<span class="searchbox__icon">${icon("search")}</span>
					<input class="searchbox__input" type="search" name="q" placeholder="search youtube music…"
						autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="search youtube music">
					<button class="btn btn--accent searchbox__go" type="submit">${icon("arrow")}<span>go</span></button>
				</form>
			</div>
		</header>
		<div class="music__stage" id="music-stage">
			${bootRow("opening youtube music…")}
		</div>
	</div>`;

const mountMusic = (root, bridge) => {
	const stage = root.querySelector("#music-stage");
	if (stage)
		void bridge.music?.attach(stage);

	const form = root.querySelector("#music-search");
	if (!form)
		return;
	const input = form.querySelector("input");
	form.addEventListener("submit", (event) => {
		event.preventDefault();
		const query = String(input.value ?? "").trim();
		if (!query)
			return;
		bridge.music?.go(`${MUSIC_HOME}search?q=${encodeURIComponent(query)}`);
		input.blur();
	});
};

// ---- dispatcher -------------------------------------------------------
export const renderView = (name, ctx = {}) => {
	switch (name) {
		case "home":
			return homeView(ctx);
		case "settings":
			return settingsView(ctx);
		case "games":
			return gamesView(ctx);
		case "movies":
			return moviesView();
		case "chat":
			return chatView(ctx);
		case "music":
			return musicView();
		case "privacy":
			return privacyView();
		case "dmca":
			return dmcaView();
		default:
			return "";
	}
};

// ---- mount / unmount --------------------------------------------------
let quipTimer = 0;
let chatUnsub = null;
let moviesCtl = null;

export const unmountView = (next) => {
	clearInterval(quipTimer);
	quipTimer = 0;
	if (chatUnsub) {
		chatUnsub();
		chatUnsub = null;
	}
	// repaints of the same view keep the player alive; leaving it closes it
	if (moviesCtl && next !== "movies") {
		moviesCtl.teardown();
		moviesCtl = null;
	}
};

const paintMessages = (log, snap) => {
	const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
	log.innerHTML = snap.messages.length
		? snap.messages.map((message) => messageRow(message, snap.user)).join("")
		: `<div class="empty">${icon("chat")}<p>quiet in here. say hi.</p></div>`;
	if (nearBottom)
		log.scrollTop = log.scrollHeight;
};

// some favicons ship pure black on transparent — invisible on a dark tile.
// sample the pixels once loaded and flip anything that would disappear.
const wireTileLogos = (root) => {
	for (const image of root.querySelectorAll("img.tile__logo")) {
		const judge = () => {
			try {
				const size = 16;
				const canvas = document.createElement("canvas");
				canvas.width = canvas.height = size;
				const ctx = canvas.getContext("2d", { willReadFrequently: true });
				ctx.drawImage(image, 0, 0, size, size);
				const { data } = ctx.getImageData(0, 0, size, size);
				let lum = 0;
				let sat = 0;
				let seen = 0;
				for (let i = 0; i < data.length; i += 4) {
					if (data[i + 3] < 40)
						continue;
					const r = data[i];
					const g = data[i + 1];
					const b = data[i + 2];
					const hi = Math.max(r, g, b) / 255;
					const lo = Math.min(r, g, b) / 255;
					lum += (r * 0.299 + g * 0.587 + b * 0.114) / 255;
					sat += hi === 0 ? 0 : (hi - lo) / hi;
					seen += 1;
				}
				if (!seen)
					return;
				lum /= seen;
				sat /= seen;
				// flat monochrome artwork disappears on a dark tile — flip it bright.
				if (lum < 0.34 && sat < 0.4)
					image.style.filter = "invert(1)";
				// dark but coloured (a red wordmark, say): lift it, keep the hue.
				else if (lum < 0.3)
					image.style.filter = "brightness(1.75) saturate(1.15)";
			}
			catch { }
		};
		if (image.complete && image.naturalWidth)
			judge();
		else
			image.addEventListener("load", judge, { once: true });
	}
};

const mountGames = (root, bridge) => {
	const grid = root.querySelector("#games-grid");
	const filter = root.querySelector("#games-filter");
	if (!grid)
		return;

	let games = [];

	const paint = () => {
		const needle = (filter?.value ?? "").trim().toLowerCase();
		const visible = needle
			? games.filter((game) => game.name.includes(needle))
			: games;
		if (!visible.length) {
			grid.innerHTML = `<div class="empty">${icon("gamepad")}<p>${games.length ? "no game matches that." : "no games found on this server."}</p></div>`;
			return;
		}
		grid.innerHTML = visible.map(gameCard).join("");
		for (const card of grid.querySelectorAll(".game-card")) {
			card.addEventListener("click", (event) => {
				const game = games.find((entry) => entry.id === card.dataset.game);
				if (game)
					bridge.openGame(game);
				bridge.ripple?.(card, event);
			});
		}
	};

	const fill = (list) => {
		games = Array.isArray(list) ? list : [];
		paint();
	};

	if (bridge.gamesCache?.length) {
		fill(bridge.gamesCache);
	}
	else {
		bridge.games().then(fill).catch(() => {
			grid.innerHTML = `<div class="empty">${icon("bolt")}<p>the game library could not be loaded.</p></div>`;
		});
	}

	filter?.addEventListener("input", paint);
};

const mountChat = (root, bridge) => {
	const join = root.querySelector("#chat-join");
	if (join) {
		join.addEventListener("submit", (event) => {
			event.preventDefault();
			const input = join.querySelector("#chat-name");
			if (bridge.signIn(input.value)) {
				bridge.repaint();
			}
			else {
				input.focus();
				input.classList.add("is-invalid");
			}
		});
		return;
	}

	const log = root.querySelector("#chat-log");
	const form = root.querySelector("#chat-form");
	const status = root.querySelector("#chat-status");
	if (!log || !form)
		return;

	chatUnsub = chat.subscribe((snap) => {
		paintMessages(log, snap);
		if (status) {
			status.textContent =
				snap.status === "open"
					? "connected"
					: snap.status === "connecting"
						? "connecting…"
						: "offline — retrying";
			status.dataset.state = snap.status;
		}
	});

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		const input = form.querySelector("#chat-input");
		if (chat.send(input.value))
			input.value = "";
		input.focus();
	});
};

export const mountView = (name, root, bridge) => {
	for (const button of root.querySelectorAll("[data-goto]")) {
		button.addEventListener("click", () => bridge.navigate(button.dataset.goto));
	}

	for (const button of root.querySelectorAll("[data-open]")) {
		button.addEventListener("click", () => bridge.navigate(button.dataset.open));
	}

	for (const button of root.querySelectorAll("[data-action]")) {
		button.addEventListener("click", () => bridge.action(button.dataset.action, button));
	}

	if (name === "home") {
		wireTileLogos(root);
		const homeSearch = root.querySelector("[data-home-search]");
		if (homeSearch) {
			homeSearch.addEventListener("submit", (event) => {
				event.preventDefault();
				const input = homeSearch.querySelector("input");
				bridge.navigate(input.value);
				input.blur();
			});
		}

		// rotating one-liners under the wordmark
		const quip = root.querySelector("#quip");
		if (quip && quips.length > 1) {
			let index = Math.floor(Math.random() * quips.length);
			quipTimer = setInterval(() => {
				index = (index + 1) % quips.length;
				quip.classList.add("is-out");
				setTimeout(() => {
					quip.textContent = quips[index];
					quip.classList.remove("is-out");
				}, 320);
			}, 4600);
		}
	}

	if (name === "settings") {
		const tabs = [...root.querySelectorAll(".settings__tab")];
		const panels = [...root.querySelectorAll(".settings__panel")];
		const activate = (id) => {
			for (const tab of tabs) {
				const active = tab.dataset.tab === id;
				tab.classList.toggle("is-active", active);
				tab.setAttribute("aria-selected", String(active));
			}
			for (const panel of panels) {
				const active = panel.dataset.panel === id;
				panel.hidden = !active;
				panel.classList.toggle("is-active", active);
				if (active) {
					panel.classList.remove("panel--in");
					void panel.offsetWidth;
					panel.classList.add("panel--in");
				}
			}
		};
		for (const tab of tabs) {
			tab.addEventListener("click", (event) => {
				activate(tab.dataset.tab);
				bridge.ripple?.(tab, event);
			});
		}
		panels[0]?.classList.add("panel--in");

		for (const form of root.querySelectorAll("[data-settings-form]")) {
			form.addEventListener("submit", (event) => event.preventDefault());
			form.addEventListener("change", (event) => {
				const element = event.target;
				if (!element?.name)
					return;
				bridge.saveSettings({ [element.name]: element.type === "checkbox" ? element.checked : element.value });
			});
		}

		for (const card of root.querySelectorAll(".theme-card")) {
			card.addEventListener("click", (event) => {
				bridge.saveSettings({ theme: card.dataset.themeId });
				bridge.ripple?.(card, event);
			});
		}
	}

	if (name === "games")
		mountGames(root, bridge);

	if (name === "movies") {
		if (moviesCtl)
			moviesCtl.teardown();
		moviesCtl = createMoviesController(root, bridge);
		moviesCtl?.start();
	}

	if (name === "music")
		mountMusic(root, bridge);

	if (name === "chat")
		mountChat(root, bridge);
};

export { searchEngines, transportOptions, engineLabel };
