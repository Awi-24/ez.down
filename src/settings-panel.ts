import { icons } from "./icons";
import {
  loadPreferences,
  savePreferences,
  type Preferences,
} from "./preferences";
import { THEME_GROUPS, THEME_LABELS, type ThemeId } from "./themes";

export interface SettingsPanelHandle {
  close: () => void;
  isOpen: () => boolean;
}

/** Sidebar settings drawer — theme + app preferences. */
export function initSettingsPanel(
  toggleBtn: HTMLButtonElement,
  panel: HTMLElement
): SettingsPanelHandle {
  let open = false;

  const render = (prefs: Preferences): void => {
    panel.innerHTML = `
      <div class="settings-header">
        <span class="settings-title">Settings</span>
        <button type="button" class="icon-btn settings-close" title="Close">${icons.close}</button>
      </div>
      <div class="settings-body">
        <section class="settings-section">
          <h3 class="settings-section-title">Appearance</h3>
          <div class="settings-theme-list" role="radiogroup" aria-label="Theme">
            ${THEME_GROUPS.map(
              (group) => `
              <div class="settings-theme-group">
                <div class="settings-theme-group-label">${group.label}</div>
                ${group.ids
                  .map(
                    (id) => `
                  <label class="settings-theme-option">
                    <input type="radio" name="theme" value="${id}"${
                      prefs.theme === id ? " checked" : ""
                    } />
                    <span>${THEME_LABELS[id]}</span>
                  </label>`
                  )
                  .join("")}
              </div>`
            ).join("")}
          </div>
        </section>
        <section class="settings-section">
          <h3 class="settings-section-title">Layout</h3>
          ${toggleRow("sidebar-collapsed", "Start with sidebar hidden", prefs.sidebarCollapsedOnStart, "Focus on the document — sidebar stays collapsed until you open it.")}
          ${toggleRow("wide-column", "Wide reading column", prefs.wideColumn, "Use a broader text column for comfortable reading.")}
          ${toggleRow("show-statusbar", "Show status bar", prefs.showStatusbar, "Word, character, and line counts at the bottom.")}
        </section>
        <section class="settings-section">
          <h3 class="settings-section-title">Editing</h3>
          ${toggleRow("reader-mode", "Reader mode", prefs.readerMode, "View documents only — disables editing, saving, and new files.")}
        </section>
        <p class="settings-version">ez.down <span id="settings-version-label"></span></p>
      </div>
    `;

    panel.querySelector(".settings-close")?.addEventListener("click", () => setOpen(false));

    panel.querySelectorAll<HTMLInputElement>('input[name="theme"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) return;
        savePreferences({ theme: input.value as ThemeId });
        render(loadPreferences());
      });
    });

    bindToggle(panel, "sidebar-collapsed", "sidebarCollapsedOnStart");
    bindToggle(panel, "wide-column", "wideColumn");
    bindToggle(panel, "show-statusbar", "showStatusbar");
    bindToggle(panel, "reader-mode", "readerMode");

    const versionEl = panel.querySelector("#settings-version-label");
    if (versionEl) versionEl.textContent = __APP_VERSION__;
  };

  const setOpen = (next: boolean): void => {
    open = next;
    panel.hidden = !open;
    toggleBtn.classList.toggle("active", open);
    toggleBtn.setAttribute("aria-expanded", String(open));
    const tree = document.getElementById("file-tree");
    if (tree) tree.hidden = open;
    if (open) render(loadPreferences());
  };

  toggleBtn.innerHTML = `${icons.settings}<span>Settings</span>`;
  toggleBtn.setAttribute("aria-expanded", "false");

  toggleBtn.addEventListener("click", () => setOpen(!open));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) setOpen(false);
  });

  return {
    close: () => setOpen(false),
    isOpen: () => open,
  };
}

function toggleRow(
  id: string,
  label: string,
  checked: boolean,
  hint: string
): string {
  return `
    <label class="settings-toggle" for="pref-${id}">
      <span class="settings-toggle-copy">
        <span class="settings-toggle-label">${label}</span>
        <span class="settings-toggle-hint">${hint}</span>
      </span>
      <span class="settings-switch">
        <input type="checkbox" id="pref-${id}" data-pref="${id}"${
          checked ? " checked" : ""
        } />
        <span class="settings-switch-track" aria-hidden="true"></span>
      </span>
    </label>`;
}

function bindToggle(
  panel: HTMLElement,
  inputId: string,
  key: keyof Preferences
): void {
  const input = panel.querySelector<HTMLInputElement>(`#pref-${inputId}`);
  input?.addEventListener("change", () => {
    savePreferences({ [key]: input.checked } as Partial<Preferences>);
  });
}

declare const __APP_VERSION__: string;
