import { ThemeId, THEMES, applyTheme } from "./themes";

export interface Preferences {
  theme: ThemeId;
  sidebarCollapsedOnStart: boolean;
  readerMode: boolean;
  showStatusbar: boolean;
  wideColumn: boolean;
}

const PREFS_KEY = "ezdown.preferences";
const LEGACY_THEME_KEY = "ezdown.theme";

const DEFAULT: Preferences = {
  theme: "notebook",
  sidebarCollapsedOnStart: false,
  readerMode: false,
  showStatusbar: true,
  wideColumn: false,
};

type PrefListener = (prefs: Preferences) => void;
const listeners = new Set<PrefListener>();

function migrateLegacyTheme(): ThemeId | null {
  const legacy = localStorage.getItem(LEGACY_THEME_KEY) as ThemeId | null;
  if (legacy && THEMES.includes(legacy)) {
    localStorage.removeItem(LEGACY_THEME_KEY);
    return legacy;
  }
  return null;
}

export function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Preferences>;
      return {
        ...DEFAULT,
        ...parsed,
        theme:
          parsed.theme && THEMES.includes(parsed.theme)
            ? parsed.theme
            : DEFAULT.theme,
      };
    }
  } catch {
    /* ignore corrupt prefs */
  }

  const legacyTheme = migrateLegacyTheme();
  return legacyTheme ? { ...DEFAULT, theme: legacyTheme } : { ...DEFAULT };
}

export function savePreferences(patch: Partial<Preferences>): Preferences {
  const next = { ...loadPreferences(), ...patch };
  if (patch.theme && !THEMES.includes(patch.theme)) {
    next.theme = DEFAULT.theme;
  }
  localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  applyPreferences(next);
  listeners.forEach((fn) => fn(next));
  return next;
}

export function onPreferencesChange(fn: PrefListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Apply DOM side effects for the current preference set. */
export function applyPreferences(prefs: Preferences): void {
  applyTheme(prefs.theme);
  document.documentElement.dataset.readerMode = prefs.readerMode ? "true" : "false";
  document.documentElement.dataset.wideColumn = prefs.wideColumn ? "true" : "false";
  document.documentElement.style.setProperty(
    "--content-width",
    prefs.wideColumn ? "920px" : "760px"
  );
}
