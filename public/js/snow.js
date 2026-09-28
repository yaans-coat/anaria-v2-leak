// slow snow drifting behind the interface. it reads its tint from the active
// theme, so flakes stay visible on both dark and light palettes.
let canvas = null;
let ctx = null;
let flakes = [];
let raf = 0;
let running = false;
let tint = "#ffffff";
let accentTint = "#ffffff";
let last = 0;

const style = () => {
	const css = getComputedStyle(document.documentElement);
	tint = (css.getPropertyValue("--dim").trim() || "#cfd6e4") + "ff";
	accentTint = (css.getPropertyValue("--accent").trim() || "#c084fc") + "ff";
};

const resize = () => {
	if (!canvas)
		return;
	const dpr = Math.min(devicePixelRatio || 1, 2);
	canvas.width = Math.round(innerWidth * dpr);
	canvas.height = Math.round(innerHeight * dpr);
	canvas.style.width = `${innerWidth}px`;
	canvas.style.height = `${innerHeight}px`;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	seed();
};

const seed = () => {
	const count = Math.max(40, Math.min(130, Math.round((innerWidth * innerHeight) / 16000)));
	flakes = Array.from({ length: count }, () => ({
		x: Math.random() * innerWidth,
		y: Math.random() * innerHeight,
		r: 0.6 + Math.random() * 2.1,
		speed: 14 + Math.random() * 44,
		sway: 8 + Math.random() * 26,
		phase: Math.random() * Math.PI * 2,
		alpha: 0.16 + Math.random() * 0.42,
		accent: Math.random() < 0.18,
	}));
};

const frame = (now) => {
	if (!running)
		return;
	const dt = Math.min((now - last) / 1000 || 0, 0.05);
	last = now;

	ctx.clearRect(0, 0, innerWidth, innerHeight);
	for (const flake of flakes) {
		flake.y += flake.speed * dt;
		flake.phase += dt * 0.7;
		flake.x += Math.sin(flake.phase) * (flake.sway * dt);

		if (flake.y - flake.r > innerHeight) {
			flake.y = -flake.r - Math.random() * 60;
			flake.x = Math.random() * innerWidth;
		}
		if (flake.x < -12) flake.x = innerWidth + 12;
		if (flake.x > innerWidth + 12) flake.x = -12;

		ctx.globalAlpha = flake.alpha;
		ctx.fillStyle = flake.accent ? accentTint : tint;
		ctx.beginPath();
		ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.globalAlpha = 1;

	raf = requestAnimationFrame(frame);
};

export const init = (element) => {
	canvas = element;
	ctx = canvas?.getContext("2d");
	if (!ctx)
		return;
	style();
	resize();
	addEventListener("resize", () => {
		if (running)
			resize();
	});
};

export const refresh = () => style();

export const start = () => {
	if (!ctx || running)
		return;
	running = true;
	last = performance.now();
	resize();
	raf = requestAnimationFrame(frame);
};

export const stop = () => {
	running = false;
	cancelAnimationFrame(raf);
	ctx?.clearRect(0, 0, innerWidth, innerHeight);
};

export const isRunning = () => running;

export default { init, refresh, start, stop, isRunning };
