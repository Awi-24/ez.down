export type ThemeId =
  | "notebook"
  | "github"
  | "vscode-light"
  | "solarized-light"
  | "dracula"
  | "nord"
  | "solarized-dark"
  | "cyberpunk"
  | "vscode-dark";

const STORAGE_KEY = "ezdown.theme";
const DEFAULT: ThemeId = "notebook";

export const THEMES: ThemeId[] = [
  "notebook",
  "github",
  "vscode-light",
  "solarized-light",
  "dracula",
  "nord",
  "solarized-dark",
  "cyberpunk",
  "vscode-dark",
];

export function loadTheme(): ThemeId {
  const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
  return saved && THEMES.includes(saved) ? saved : DEFAULT;
}

export function applyTheme(theme: ThemeId): void {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
}
