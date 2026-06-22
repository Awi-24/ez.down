import { icons } from "./icons";
import {
  loadPreferences,
  savePreferences,
  type Preferences,
} from "./preferences";
import { THEME_GROUPS, THEME_LABELS, type ThemeId } from "./themes";
import {
  checkForUpdates,
  installUpdate,
  onUpdateStatus,
  type UpdateStatus,
} from "./updater";
import { isTauri } from "@tauri-apps/api/core";

const GITHUB_USER = "https://github.com/Awi-24";
const GITHUB_REPO = "https://github.com/Awi-24/ez.down";

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
  let updateStatus: UpdateStatus = { state: "idle" };

  const renderUpdateBadge = (): void => {
    toggleBtn.classList.toggle(
      "has-update",
      updateStatus.state === "available" || updateStatus.state === "downloading"
    );
  };

  const updateSectionHtml = (): string => {
    if (!isTauri()) return "";

    let body = "";
    switch (updateStatus.state) {
      case "checking":
        body = `<p class="settings-update-msg">Checking for updates…</p>`;
        break;
      case "available":
        body = `
          <p class="settings-update-msg settings-update-available">
            Version <strong>${escapeHtml(updateStatus.version)}</strong> is available.
          </p>
          ${updateStatus.notes ? `<p class="settings-update-notes">${escapeHtml(updateStatus.notes)}</p>` : ""}
          <button type="button" class="btn btn-primary settings-update-install">Install update</button>`;
        break;
      case "downloading":
        body = `
          <p class="settings-update-msg">Downloading… ${updateStatus.progress}%</p>
          <div class="settings-update-progress" role="progressbar" aria-valuenow="${updateStatus.progress}" aria-valuemin="0" aria-valuemax="100">
            <span style="width:${updateStatus.progress}%"></span>
          </div>`;
        break;
      case "uptodate":
        body = `<p class="settings-update-msg">You are on the latest version.</p>`;
        break;
      case "error":
        body = `<p class="settings-update-msg settings-update-error">${escapeHtml(updateStatus.message)}</p>`;
        break;
      default:
        body = `<p class="settings-update-msg">Check GitHub for new releases.</p>`;
    }

    return `
        <section class="settings-section">
          <h3 class="settings-section-title">Updates</h3>
          <div class="settings-update">
            ${body}
            <button type="button" class="btn settings-update-check"${
              updateStatus.state === "checking" || updateStatus.state === "downloading"
                ? " disabled"
                : ""
            }>Check for updates</button>
          </div>
        </section>`;
  };

  const bindUpdateControls = (): void => {
    panel.querySelector(".settings-update-check")?.addEventListener("click", () => {
      void checkForUpdates(false);
    });
    panel.querySelector(".settings-update-install")?.addEventListener("click", () => {
      void installUpdate();
    });
  };

  const bindAboutLinks = (): void => {
    panel.querySelectorAll<HTMLElement>("[data-open-url]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const url = el.dataset.openUrl;
        if (!url) return;
        void openExternal(url);
      });
    });
  };

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
          ${toggleRow("sidebar-collapsed", "Start with sidebar hidden", prefs.sidebarCollapsedOnStart, "Hide sidebar on start.")}
          ${toggleRow("wide-column", "Wide reading column", prefs.wideColumn, "Wider text column.")}
          ${toggleRow("show-statusbar", "Show status bar", prefs.showStatusbar, "Document stats.")}
        </section>
        <section class="settings-section">
          <h3 class="settings-section-title">Editing</h3>
          ${toggleRow("reader-mode", "Reader mode", prefs.readerMode, "View only, no edits.")}
        </section>
        ${updateSectionHtml()}
        <section class="settings-section settings-about">
          <h3 class="settings-section-title">About</h3>
          <p class="settings-about-text">
            Open source by
            <button type="button" class="settings-link" data-open-url="${GITHUB_USER}">Awi-24</button>.
          </p>
          <div class="settings-about-links">
            <button type="button" class="settings-link" data-open-url="${GITHUB_USER}">github.com/Awi-24</button>
            <button type="button" class="settings-link" data-open-url="${GITHUB_REPO}">Repository</button>
          </div>
          <p class="settings-version">ez.down <span id="settings-version-label"></span></p>
        </section>
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
    bindUpdateControls();
    bindAboutLinks();

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

  onUpdateStatus((next) => {
    updateStatus = next;
    renderUpdateBadge();
    if (open) render(loadPreferences());
  });

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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
