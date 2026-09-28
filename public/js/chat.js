// chatroom client — a single websocket to /chat/, plus the local "user" name
// that gates access. no accounts, no persistence beyond the server's memory.
import * as storage from "./storage.js";

const HISTORY_CAP = 200;
const RETRY_MS = 4000;

let socket = null;
let retryTimer = 0;
let messages = [];
let status = "idle"; // idle | connecting | open | closed
const listeners = new Set();

const cleanName = (value) =>
	String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 24);

export const user = () => cleanName(storage.read("user", null)?.name);

export const snapshot = () => ({ user: user(), messages, status });

const emit = () => {
	const snap = snapshot();
	for (const fn of listeners)
		fn(snap);
};

export const subscribe = (fn) => {
	listeners.add(fn);
	fn(snapshot());
	return () => listeners.delete(fn);
};

const endpoint = () =>
	`${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/chat/`;

const connect = () => {
	if (!user())
		return;
	if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN))
		return;

	status = "connecting";
	emit();

	let opened;
	try {
		opened = new WebSocket(endpoint());
	}
	catch {
		status = "closed";
		emit();
		return;
	}
	socket = opened;

	opened.addEventListener("open", () => {
		status = "open";
		emit();
	});
	opened.addEventListener("message", (event) => {
		let packet;
		try {
			packet = JSON.parse(event.data);
		}
		catch {
			return;
		}
		if (packet?.type === "history" && Array.isArray(packet.messages)) {
			messages = packet.messages.slice(-HISTORY_CAP);
			emit();
		}
		else if (packet?.type === "message" && packet.message) {
			messages.push(packet.message);
			if (messages.length > HISTORY_CAP)
				messages = messages.slice(-HISTORY_CAP);
			emit();
		}
	});
	opened.addEventListener("error", () => { });
	opened.addEventListener("close", () => {
		if (socket === opened)
			socket = null;
		status = "closed";
		emit();
		clearTimeout(retryTimer);
		if (user())
			retryTimer = setTimeout(connect, RETRY_MS);
	});
};

export const signIn = (name) => {
	const clean = cleanName(name);
	if (!clean)
		return false;
	storage.write("user", { name: clean });
	connect();
	emit();
	return true;
};

export const signOut = () => {
	storage.remove("user");
	clearTimeout(retryTimer);
	messages = [];
	status = "idle";
	if (socket) {
		try {
			socket.close();
		}
		catch { }
		socket = null;
	}
	emit();
};

export const send = (text) => {
	const body = String(text ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
	const name = user();
	if (!body || !name)
		return false;
	if (status !== "open" || !socket) {
		connect();
		return false;
	}
	socket.send(JSON.stringify({ user: name, text: body }));
	return true;
};

export const boot = () => {
	if (user())
		connect();
};

export default { user, snapshot, subscribe, signIn, signOut, send, boot };
