// anaria theme engine — 30 palettes, applied as css custom properties.
export const themes = [
	{ id: "nord", label: "nord", dark: true, vars: { bg: "#2e3440", surface: "#3b4252", raised: "#434c5e", fg: "#eceff4", dim: "#9aa5b8", line: "#4c566a", accent: "#88c0d0", accent2: "#b48ead" } },
	{ id: "mint", label: "mint", dark: true, vars: { bg: "#0b1512", surface: "#11201b", raised: "#172b23", fg: "#e6fff4", dim: "#7fae9b", line: "#1f3a30", accent: "#4ade9d", accent2: "#2dd4bf" } },
	{ id: "cappuccino", label: "cappuccino", dark: true, vars: { bg: "#1b1410", surface: "#241b16", raised: "#2e231c", fg: "#f4e6da", dim: "#b09484", line: "#3a2c23", accent: "#d9a066", accent2: "#c97b4a" } },
	{ id: "latte", label: "latte", dark: false, vars: { bg: "#f6efe7", surface: "#fffbf6", raised: "#ffffff", fg: "#3a2e26", dim: "#8a7a6c", line: "#e5d9cd", accent: "#a8643a", accent2: "#7d8f52" } },
	{ id: "monochrome", label: "monochrome", dark: true, vars: { bg: "#0a0a0a", surface: "#141414", raised: "#1e1e1e", fg: "#f2f2f2", dim: "#8f8f8f", line: "#2b2b2b", accent: "#ffffff", accent2: "#b0b0b0" } },
	{ id: "rose", label: "rose", dark: true, vars: { bg: "#1a0f14", surface: "#24151c", raised: "#2e1a23", fg: "#ffe9ef", dim: "#b78b96", line: "#3d2530", accent: "#ff7a9c", accent2: "#ff9f6e" } },
	{ id: "lavender", label: "lavender", dark: true, vars: { bg: "#16132a", surface: "#1e1a38", raised: "#272148", fg: "#ece9ff", dim: "#9c95c4", line: "#332c58", accent: "#b39dff", accent2: "#7fd7ff" } },
	{ id: "cyberpunk", label: "cyberpunk", dark: true, vars: { bg: "#0b0f1a", surface: "#121a2b", raised: "#18233a", fg: "#e9f7ff", dim: "#7f92ad", line: "#1f2c47", accent: "#fcee0a", accent2: "#ff2e97" } },
	{ id: "tokyo", label: "tokyo", dark: true, vars: { bg: "#1a1b2b", surface: "#22233a", raised: "#2a2b46", fg: "#e8e9ff", dim: "#8f92bd", line: "#34355a", accent: "#7aa2f7", accent2: "#bb9af7" } },
	{ id: "dracula", label: "dracula", dark: true, vars: { bg: "#282a36", surface: "#2f3241", raised: "#383a4d", fg: "#f8f8f2", dim: "#9ca0b0", line: "#44475a", accent: "#bd93f9", accent2: "#50fa7b" } },
	{ id: "gruvbox", label: "gruvbox", dark: true, vars: { bg: "#1d2021", surface: "#282828", raised: "#32302f", fg: "#ebdbb2", dim: "#928374", line: "#3c3836", accent: "#fabd2f", accent2: "#b8bb26" } },
	{ id: "catppuccin", label: "catppuccin", dark: true, vars: { bg: "#1e1e2e", surface: "#262637", raised: "#313244", fg: "#cdd6f4", dim: "#9399b2", line: "#45475a", accent: "#cba6f7", accent2: "#a6e3a1" } },
	{ id: "solarized", label: "solarized", dark: true, vars: { bg: "#002b36", surface: "#073642", raised: "#0b4351", fg: "#eee8d5", dim: "#839496", line: "#11525f", accent: "#2aa198", accent2: "#b58900" } },
	{ id: "ocean", label: "ocean", dark: true, vars: { bg: "#0b1622", surface: "#10202f", raised: "#152a3d", fg: "#e3f2ff", dim: "#7d97ad", line: "#1b3247", accent: "#38bdf8", accent2: "#34d399" } },
	{ id: "forest", label: "forest", dark: true, vars: { bg: "#0d1510", surface: "#131e16", raised: "#18261c", fg: "#e7f5ea", dim: "#86a38e", line: "#1f3327", accent: "#4ade80", accent2: "#a3e635" } },
	{ id: "sunset", label: "sunset", dark: true, vars: { bg: "#1c1016", surface: "#26161d", raised: "#301c25", fg: "#ffeae4", dim: "#bb9096", line: "#3c252e", accent: "#fb7185", accent2: "#fdba74" } },
	// grape is the official anaria palette — slick near-black with neon purple
	{ id: "grape", label: "grape", dark: true, official: true, vars: { bg: "#0f0a17", surface: "#16101f", raised: "#1e162c", fg: "#f4eeff", dim: "#9d90b6", line: "#2a1f3d", accent: "#c084fc", accent2: "#f472b6" } },
	{ id: "bloodmoon", label: "bloodmoon", dark: true, vars: { bg: "#14090b", surface: "#1d0e11", raised: "#261317", fg: "#ffe7e7", dim: "#ad7b7f", line: "#35191e", accent: "#ef4444", accent2: "#f97316" } },
	{ id: "aurora", label: "aurora", dark: true, vars: { bg: "#0a1120", surface: "#101a2e", raised: "#152340", fg: "#e6f6ff", dim: "#7d93b0", line: "#1d2c4a", accent: "#22d3ee", accent2: "#a78bfa" } },
	{ id: "terminal", label: "terminal", dark: true, vars: { bg: "#050805", surface: "#0a100a", raised: "#0f180f", fg: "#d7ffd7", dim: "#5f8f5f", line: "#14301a", accent: "#00ff66", accent2: "#00cc44" } },
	{ id: "paper", label: "paper", dark: false, vars: { bg: "#f7f7f5", surface: "#ffffff", raised: "#ffffff", fg: "#23231f", dim: "#78786f", line: "#e4e4dd", accent: "#3b7a57", accent2: "#b0603a" } },
	{ id: "slate", label: "slate", dark: true, vars: { bg: "#0f1418", surface: "#161d23", raised: "#1d262e", fg: "#e4ebf1", dim: "#8695a1", line: "#26313a", accent: "#94a3b8", accent2: "#38bdf8" } },
	{ id: "orchid", label: "orchid", dark: true, vars: { bg: "#1a0f1f", surface: "#231528", raised: "#2c1b33", fg: "#f8e9ff", dim: "#ab8fb5", line: "#3a2443", accent: "#e879f9", accent2: "#818cf8" } },
	{ id: "peach", label: "peach", dark: false, vars: { bg: "#fff4ec", surface: "#fffaf6", raised: "#ffffff", fg: "#40291c", dim: "#96796a", line: "#f2ded1", accent: "#d9553a", accent2: "#c9822f" } },
	{ id: "frost", label: "frost", dark: true, vars: { bg: "#0d1620", surface: "#13202c", raised: "#182936", fg: "#e9f7ff", dim: "#84a2b5", line: "#20323f", accent: "#7dd3fc", accent2: "#a5f3fc" } },
	{ id: "ember", label: "ember", dark: true, vars: { bg: "#170d0a", surface: "#201310", raised: "#2a1915", fg: "#ffece3", dim: "#b3897a", line: "#36201a", accent: "#ff8a3d", accent2: "#ffd166" } },
	{ id: "indigo", label: "indigo", dark: true, vars: { bg: "#0e1024", surface: "#151838", raised: "#1c2048", fg: "#e8eaff", dim: "#8e93c4", line: "#262b5c", accent: "#818cf8", accent2: "#22d3ee" } },
	{ id: "matcha", label: "matcha", dark: false, vars: { bg: "#f2f6ec", surface: "#fbfdf7", raised: "#ffffff", fg: "#2b331f", dim: "#7c8869", line: "#dfe7d1", accent: "#5c8a30", accent2: "#a67c22" } },
	{ id: "espresso", label: "espresso", dark: true, vars: { bg: "#120d0b", surface: "#1a1310", raised: "#221915", fg: "#f0e6df", dim: "#9d8b80", line: "#2c211b", accent: "#c89b6a", accent2: "#7c5c3e" } },
	{ id: "bubblegum", label: "bubblegum", dark: false, vars: { bg: "#fff0f6", surface: "#fff7fb", raised: "#ffffff", fg: "#43203a", dim: "#9a7590", line: "#fbdcea", accent: "#e63f8c", accent2: "#7c4dff" } },
];

export const themeIds = themes.map((theme) => theme.id);

export const getTheme = (id) => themes.find((theme) => theme.id === id) ?? themes[0];

export const applyTheme = (id) => {
	const theme = getTheme(id);
	const root = document.documentElement;
	for (const [name, value] of Object.entries(theme.vars)) {
		root.style.setProperty(`--${name}`, value);
	}
	root.dataset.theme = theme.id;
	root.style.colorScheme = theme.dark ? "dark" : "light";
	root.classList.toggle("theme--light", !theme.dark);
	return theme;
};
