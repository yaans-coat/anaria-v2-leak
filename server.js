import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import { createRequire } from "node:module";
import { WebSocketServer } from "ws";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";
import { createBareServer } from "@tomphttp/bare-server-node";
import ipaddr from "ipaddr.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticRoot = path.join(__dirname, "public");
const gamesRoot = path.join(__dirname, "games");
const app = express();
app.use((_req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
});
const require = createRequire(import.meta.url);
const dirOf = (specifier) => path.dirname(require.resolve(specifier));
app.use("/scram/", express.static(scramjetPath));
app.use("/utils/", express.static(dirOf("@mercuryworkshop/scramjet-utils")));
app.use("/controller/", express.static(dirOf("@mercuryworkshop/scramjet-controller")));
app.use("/libcurl/", express.static(dirOf("@mercuryworkshop/libcurl-transport")));
app.use("/epoxy/", express.static(dirOf("@mercuryworkshop/epoxy-transport")));
app.use("/baremod/", express.static(dirOf("@mercuryworkshop/bare-transport")));
// local game library — every folder under /games that carries an index.html
if (fs.existsSync(gamesRoot)) {
    app.use("/games/", express.static(gamesRoot, { extensions: ["html"], maxAge: "1h" }));
}
const gameIndexCache = { at: 0, list: [] };
const findEntry = (dir) => {
    const candidates = ["index.html", "play/index.html", "game/index.html", "html5/index.html", "dist/index.html", "build/index.html"];
    for (const rel of candidates) {
        if (fs.existsSync(path.join(dir, rel)))
            return rel;
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory())
            continue;
        const rel = path.join(entry.name, "index.html");
        if (fs.existsSync(path.join(dir, rel)))
            return rel;
    }
    return null;
};
const scanGames = () => {
    if (Date.now() - gameIndexCache.at < 60000 && gameIndexCache.list.length)
        return gameIndexCache.list;
    let folders = [];
    try {
        folders = fs.readdirSync(gamesRoot, { withFileTypes: true });
    }
    catch {
        return [];
    }
    const list = [];
    for (const folder of folders) {
        if (!folder.isDirectory())
            continue;
        const found = findEntry(path.join(gamesRoot, folder.name));
        if (!found)
            continue;
        const name = folder.name.replace(/[-_]+/g, " ");
        list.push({ id: folder.name, name, src: `/games/${folder.name}/${found.split(path.sep).join("/")}` });
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    gameIndexCache.at = Date.now();
    gameIndexCache.list = list;
    return list;
};
app.get("/api/games", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=60");
    res.json({ games: scanGames() });
});
// favicon proxy so site logos survive the cross-origin-embedder policy
app.get("/api/icon", async (req, res) => {
    const host = String(req.query.host ?? "").toLowerCase().replace(/[^a-z0-9.-]/g, "");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    if (!host.includes(".")) {
        res.status(400).end();
        return;
    }
    res.setHeader("Cache-Control", "public, max-age=86400");
    try {
        const upstream = await fetch(`https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`, {
            signal: AbortSignal.timeout(4000),
        });
        if (!upstream.ok)
            throw new Error("no icon");
        const body = Buffer.from(await upstream.arrayBuffer());
        res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "image/x-icon");
        res.send(body);
    }
    catch {
        res.status(404).end();
    }
});

// ---- tmdb (movies) -----------------------------------------------------
// the tmdb api and image cdn send neither cors nor corp headers, and the shell
// runs under cross-origin-embedder-policy, so every call is relayed from here.
const TMDB_KEY = process.env.TMDB_KEY || "ebbc810d0c9a9a4a13a264f96897036e";
const TMDB_API = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org";
const TMDB_SIZES = new Set(["w92", "w154", "w185", "w342", "w500", "w780", "h632", "w1280", "original"]);

app.get("/api/tmdb", async (req, res) => {
    const apiPath = String(req.query.path ?? "").replace(/^\/+|\/+$/g, "");
    if (!/^[a-z0-9_/-]+$/i.test(apiPath) || apiPath.includes("..")) {
        res.status(400).json({ error: "bad path" });
        return;
    }
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
        if (key === "path" || !/^[a-z0-9_]+$/i.test(key))
            continue;
        params.set(key, String(value).slice(0, 400));
    }
    params.set("api_key", TMDB_KEY);
    res.setHeader("Cache-Control", "public, max-age=60");
    try {
        const upstream = await fetch(`${TMDB_API}/${apiPath}?${params}`, { signal: AbortSignal.timeout(9000) });
        const body = Buffer.from(await upstream.arrayBuffer());
        res.status(upstream.status);
        res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "application/json");
        res.send(body);
    }
    catch {
        res.status(502).json({ error: "tmdb unreachable" });
    }
});

app.get("/api/tmdbg", async (req, res) => {
    const size = String(req.query.size ?? "w500");
    const file = String(req.query.file ?? "").replace(/^\/+/, "");
    if (!TMDB_SIZES.has(size) || !/^[A-Za-z0-9._-]+$/.test(file)) {
        res.status(400).end();
        return;
    }
    res.setHeader("Cache-Control", "public, max-age=2592000");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    try {
        const upstream = await fetch(`${TMDB_IMG}/t/p/${size}/${file}`, { signal: AbortSignal.timeout(9000) });
        if (!upstream.ok)
            throw new Error("missing art");
        const body = Buffer.from(await upstream.arrayBuffer());
        res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "image/jpeg");
        res.send(body);
    }
    catch {
        res.status(404).end();
    }
});

app.use(express.static(staticRoot, {
    setHeaders(res, filePath) {
        if (path.basename(filePath).endsWith("sw.js")) {
            res.setHeader("Cache-Control", "no-cache");
        }
    }
}));
const bareServer = createBareServer("/bare/", {
    filterRemote(url) {
        const hostname = url.hostname.replace(/^\[|\]$/g, "");
        if (ipaddr.isValid(hostname) &&
            ipaddr.parse(hostname).range() !== "unicast") {
            throw new RangeError("Forbidden IP");
        }
    },
    connectionLimiter: {
        maxConnectionsPerIP: 2000,
        windowDuration: 60,
        blockDuration: 10
    }
});
// a handler that throws must still answer instead of hanging the socket.
app.use((error, _req, res, _next) => {
    console.error("request failed:", error?.message ?? error);
    if (!res.headersSent)
        res.status(500).type("text/plain").send("internal server error");
    else
        res.end();
});
const handleRequest = (req, res) => {
    if (bareServer.shouldRoute(req)) {
        bareServer.routeRequest(req, res);
        return;
    }
    app(req, res);
};
const server = http.createServer(handleRequest);
// long-lived proxy streams must not be cut by the default keep-alive window:
// keep sockets alive past the 5s node default and only drop truly idle peers.
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.on("clientError", (error, socket) => {
    if (error.code === "ECONNRESET" || !socket.writable)
        return;
    socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
});
// tiny broadcast-only chatroom (in-memory, no accounts, no persistence)
const chatServer = new WebSocketServer({ noServer: true });
const CHAT_HISTORY_LIMIT = 150;
const chatHistory = [];
const chatClean = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const chatSend = (socket, payload) => {
    if (socket.readyState === socket.OPEN)
        socket.send(JSON.stringify(payload));
};
const chatBroadcast = (payload) => {
    for (const client of chatServer.clients)
        chatSend(client, payload);
};
chatServer.on("connection", (ws) => {
    ws.chatLast = 0;
    chatSend(ws, { type: "history", messages: chatHistory });
    ws.on("message", (raw) => {
        let packet;
        try {
            packet = JSON.parse(String(raw));
        }
        catch {
            return;
        }
        const text = chatClean(packet?.text, 300);
        const user = chatClean(packet?.user, 24);
        if (!text || !user || Date.now() - ws.chatLast < 700)
            return;
        ws.chatLast = Date.now();
        const message = { user, text, ts: Date.now() };
        chatHistory.push(message);
        if (chatHistory.length > CHAT_HISTORY_LIMIT)
            chatHistory.shift();
        chatBroadcast({ type: "message", message });
    });
    ws.on("error", () => { });
});
server.on("upgrade", (req, socket, head) => {
    if (bareServer.shouldRoute(req)) {
        bareServer.routeUpgrade(req, socket, head);
        return;
    }
    const wispPath = new URL(req.url ?? "/", "http://localhost").pathname;
    if (wispPath === "/wisp/") {
        req.url = wispPath;
        wisp.routeRequest(req, socket, head);
        return;
    }
    if (wispPath === "/chat/") {
        chatServer.handleUpgrade(req, socket, head, (ws) => chatServer.emit("connection", ws, req));
        return;
    }
    socket.end();
});
const listenWithFallback = (target, startPort, attempts = 20) => {
    let port = startPort;
    let left = attempts;
    const onError = (error) => {
        if (error.code !== "EADDRINUSE" || left-- <= 0) {
            console.error(`Could not listen on port ${port}: ${error.message}`);
            process.exit(1);
        }
        console.warn(`Port ${port} is in use, trying ${port + 1}...`);
        port += 1;
        target.listen(port);
    };
    target.on("error", onError);
    target.listen(port, () => {
        target.off("error", onError);
        process.send?.({ type: "listening", port });
        console.log(process.env.BACKEND_ONLY
            ? `Backend listening on http://localhost:${port}`
            : `anaria listening on http://localhost:${port}`);
    });
};
const port = Number(process.env.PORT) || Number("8080");
listenWithFallback(server, port);
for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => server.close(() => process.exit(0)));
}
