// animated toast notifications.
import { icon } from "./icons.js";

let stack = null;
const live = new Set();

const ensureStack = () => {
	if (stack && document.body.contains(stack))
		return stack;
	stack = document.createElement("div");
	stack.className = "toast-stack";
	stack.setAttribute("role", "status");
	stack.setAttribute("aria-live", "polite");
	document.body.append(stack);
	return stack;
};

const toneIcon = {
	success: "check",
	error: "info",
	info: "info",
	theme: "paint",
	network: "bolt",
	cloak: "ghost",
};

export const dismiss = (node) => {
	if (!node || node.dataset.leaving === "1")
		return;
	node.dataset.leaving = "1";
	node.classList.add("toast--out");
	live.delete(node);
	setTimeout(() => node.remove(), 360);
};

export const toast = (options = {}) => {
	const {
		title = "",
		message = "",
		tone = "info",
		duration = 4200,
		swatch = null,
	} = options;

	const root = ensureStack();

	// never stack more than four
	while (live.size >= 4) {
		const oldest = live.values().next().value;
		dismiss(oldest);
	}

	const node = document.createElement("div");
	node.className = `toast toast--${tone}`;
	node.dataset.tone = tone;

	const glyph = swatch
		? `<span class="toast__swatch" style="--sw:${swatch}"></span>`
		: icon(toneIcon[tone] ?? "info");

	node.innerHTML = `
		<span class="toast__glyph">${glyph}</span>
		<span class="toast__body">
			<strong class="toast__title">${title}</strong>
			${message ? `<span class="toast__text">${message}</span>` : ""}
		</span>
		<button class="toast__close" type="button" aria-label="dismiss">${icon("close")}</button>
		<span class="toast__bar"><span class="toast__bar-fill"></span></span>`;

	node.querySelector(".toast__close").addEventListener("click", () => dismiss(node));
	node.querySelector(".toast__bar-fill").style.animationDuration = `${duration}ms`;

	root.append(node);
	// force a frame so the enter transition runs
	void node.offsetWidth;
	node.classList.add("toast--in");
	live.add(node);

	let timer = setTimeout(() => dismiss(node), duration);
	const pause = () => {
		clearTimeout(timer);
		node.classList.add("toast--paused");
	};
	const resume = () => {
		node.classList.remove("toast--paused");
		timer = setTimeout(() => dismiss(node), 1200);
	};
	node.addEventListener("pointerenter", pause);
	node.addEventListener("pointerleave", resume);

	return node;
};

export default toast;
