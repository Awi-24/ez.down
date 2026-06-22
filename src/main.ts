import { listen } from "@tauri-apps/api/event";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";

import {
  readFile,
  writeFile,
  renameFile,
  setWatchedPaths,
  fileMeta,
  dirname,
  basename,
} from "./api";
import { mountEditor, EditorHandle } from "./editor";
import { TabsManager, Tab } from "./tabs";
import { Sidebar } from "./sidebar";
import { icons, iconLabel } from "./icons";
import { showStatusbar, updateMetrics } from "./statusbar";
import { exportEditorToPdf } from "./pdf";
import { initContextMenu } from "./context-menu";
import {
  applyPreferences,
  loadPreferences,
  onPreferencesChange,
} from "./preferences";
import { initSettingsPanel } from "./settings-panel";
import { initUpdateChecker } from "./updater";
import {
  buildSavePath,
  ensureMdExtension,
  nameFromPath,
  sanitizeFilename,
  stripMdExtension,
} from "./naming";

import "./styles.css";
import "./themes/skins.css";

const MD_FILTER = [
  { name: "Markdown", extensions: ["md", "markdown", "mdown", "mkd"] },
];

// --- DOM handles -----------------------------------------------------------
const editorHost = document.getElementById("editor-host") as HTMLElement;
const emptyState = document.getElementById("empty-state") as HTMLElement;
const tabbar = document.getElementById("tabbar") as HTMLElement;
const fileTree = document.getElementById("file-tree") as HTMLElement;
const settingsPanel = document.getElementById("settings-panel") as HTMLElement;
const settingsToggle = document.getElementById("settings-toggle") as HTMLButtonElement;
const appEl = document.getElementById("app") as HTMLElement;
const openFolderBtn = document.getElementById("open-folder") as HTMLButtonElement;
const openFileBtn = document.getElementById("open-file") as HTMLButtonElement;
const newFileBtn = document.getElementById("new-file") as HTMLButtonElement;
const toggleSidebarBtn = document.getElementById("toggle-sidebar") as HTMLButtonElement;
const exportPdfBtn = document.getElementById("export-pdf") as HTMLButtonElement;
const emptyNewFile = document.getElementById("empty-new-file") as HTMLButtonElement;
const emptyOpenFile = document.getElementById("empty-open-file") as HTMLButtonElement;
const emptyOpenFolder = document.getElementById("empty-open-folder") as HTMLButtonElement;

newFileBtn.innerHTML = icons.filePlus;
openFileBtn.innerHTML = icons.file;
openFolderBtn.innerHTML = icons.folderOpen;
toggleSidebarBtn.innerHTML = icons.panel;
exportPdfBtn.innerHTML = icons.filePdf;
emptyNewFile.innerHTML = iconLabel(icons.filePlus, "New document");
emptyOpenFile.innerHTML = iconLabel(icons.file, "Open file");
emptyOpenFolder.innerHTML = iconLabel(icons.folderOpen, "Open folder");

// --- Editor lifecycle ------------------------------------------------------
let editor: EditorHandle | null = null;
let loading = false;
let activeModified: number | null = null;
let baseDir: string | null = null;
let hasOpenDocument = false;

function isReaderMode(): boolean {
  return loadPreferences().readerMode;
}

function refreshStatusbarVisibility(): void {
  showStatusbar(hasOpenDocument && loadPreferences().showStatusbar);
}

async function showTab(tab: Tab): Promise<void> {
  loading = true;
  if (editor) {
    await editor.destroy();
    editor = null;
  }
  editorHost.innerHTML = "";
  emptyState.hidden = true;
  editorHost.hidden = false;
  hasOpenDocument = true;
  refreshStatusbarVisibility();

  const readOnly = isReaderMode();
  editor = await mountEditor(
    editorHost,
    tab.workingContent,
    (md) => {
      if (loading || readOnly) return;
      tabs.setWorking(tab.id, md);
      updateMetrics(md, activeModified);
    },
    readOnly
  );
  loading = false;
  editorHost.classList.remove("fade-in");
  void editorHost.offsetWidth;
  editorHost.classList.add("fade-in");

  sidebar.setActive(tab.path);
  baseDir = tab.path ? dirname(tab.path) : null;
  processImages();
  activeModified = tab.path ? await fetchModified(tab.path) : null;
  updateMetrics(tab.workingContent, activeModified);
}

function showEmpty(): void {
  if (editor) {
    void editor.destroy();
    editor = null;
  }
  editorHost.innerHTML = "";
  editorHost.hidden = true;
  emptyState.hidden = false;
  hasOpenDocument = false;
  refreshStatusbarVisibility();
  sidebar.setActive(null);
}

function captureActiveWorking(): void {
  const active = tabs.active;
  if (active && editor && !loading && !isReaderMode()) {
    tabs.setWorking(active.id, editor.getMarkdown());
  }
}

async function fetchModified(path: string): Promise<number | null> {
  try {
    const meta = await fileMeta(path);
    return meta.modified_ms;
  } catch {
    return null;
  }
}

// --- Managers --------------------------------------------------------------
const tabs = new TabsManager(
  tabbar,
  (tab) => {
    void showTab(tab);
    void refreshWatched();
  },
  () => {
    showEmpty();
    void refreshWatched();
  },
  (tab, newName) => {
    void renameTab(tab, newName);
  }
);

const sidebar = new Sidebar(fileTree, (path) => void openFile(path));

// --- File operations -------------------------------------------------------
async function openFile(path: string): Promise<void> {
  const existing = tabs.findByPath(path);
  if (existing) {
    tabs.activate(existing.id);
    return;
  }
  captureActiveWorking();
  try {
    const content = await readFile(path);
    tabs.open(path, content);
    if (loadPreferences().sidebarCollapsedOnStart) {
      setSidebarCollapsed(true);
    }
  } catch (e) {
    console.error(e);
    alert(`Could not open file:\n${e}`);
  }
}

function newFile(): void {
  if (isReaderMode()) return;
  captureActiveWorking();
  tabs.open(null, "");
}

async function pickFile(): Promise<void> {
  const file = await openDialog({ multiple: false, filters: MD_FILTER });
  if (typeof file === "string") await openFile(file);
}

async function pickFolder(): Promise<void> {
  const dir = await openDialog({ directory: true, multiple: false });
  if (typeof dir === "string") await sidebar.setRoot(dir);
}

function defaultSaveDirectory(tab: Tab): string | null {
  if (tab.path) return dirname(tab.path);
  return sidebar.getRoot();
}

async function renameTab(tab: Tab, rawName: string): Promise<void> {
  if (isReaderMode()) return;
  captureActiveWorking();

  const name = sanitizeFilename(rawName);
  if (!name) return;

  if (!tab.path) {
    tabs.setName(tab.id, name, true);
    return;
  }

  const dir = dirname(tab.path);
  const newPath = buildSavePath(name, dir);
  if (newPath === tab.path) {
    tabs.setName(tab.id, nameFromPath(newPath), false);
    return;
  }

  try {
    await renameFile(tab.path, newPath);
    tabs.updatePath(tab.id, newPath);
    if (tabs.active?.id === tab.id) {
      baseDir = dirname(newPath);
      sidebar.setActive(newPath);
    }
    await refreshWatched();
    await sidebar.refresh();
  } catch (e) {
    console.error(e);
    alert(`Could not rename file:\n${e}`);
    tabs.render();
  }
}

async function saveActive(): Promise<void> {
  if (isReaderMode()) return;
  const active = tabs.active;
  if (!active || !editor) return;
  const content = editor.getMarkdown();

  let path = active.path;
  if (!path) {
    const chosen = await saveDialog({
      defaultPath: buildSavePath(active.name, defaultSaveDirectory(active)),
      filters: MD_FILTER,
    });
    if (!chosen) return;
    path = ensureMdExtension(chosen);
  }

  try {
    await writeFile(path, content);
    tabs.markSaved(active.id, path, content);
    activeModified = await fetchModified(path);
    updateMetrics(content, activeModified);
    baseDir = dirname(path);
    sidebar.setActive(path);
    await refreshWatched();
    await sidebar.refresh();
  } catch (e) {
    console.error(e);
    alert(`Failed to save:\n${e}`);
  }
}

async function refreshWatched(): Promise<void> {
  try {
    await setWatchedPaths(tabs.paths());
  } catch (e) {
    console.error(e);
  }
}

// --- Local image rendering -------------------------------------------------
function resolveImageSrc(src: string): string {
  if (/^(https?:|data:|blob:|asset:)/i.test(src) || src.includes("asset.localhost")) {
    return src;
  }
  let p = src.replace(/^file:\/\//i, "");
  const isAbsolute =
    /^[a-zA-Z]:[\\/]/.test(p) || p.startsWith("/") || p.startsWith("\\\\");
  if (!isAbsolute) {
    if (!baseDir) return src;
    p = `${baseDir}/${p.replace(/^\.\//, "")}`;
  }
  try {
    return convertFileSrc(decodeURI(p));
  } catch {
    return src;
  }
}

function processImages(): void {
  editorHost.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src");
    if (!src || src === img.dataset.ezResolved) return;
    const resolved = resolveImageSrc(src);
    if (resolved !== src) {
      img.dataset.ezResolved = resolved;
      img.src = resolved;
    }
  });
}

const imageObserver = new MutationObserver(() => processImages());
imageObserver.observe(editorHost, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["src"],
});

// --- Sidebar collapse ------------------------------------------------------
const SIDEBAR_KEY = "ezdown.sidebar.collapsed";
function setSidebarCollapsed(collapsed: boolean): void {
  appEl.classList.toggle("sidebar-collapsed", collapsed);
  localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
  toggleSidebarBtn.title = collapsed
    ? "Show sidebar (Ctrl+B)"
    : "Collapse sidebar (Ctrl+B)";
}
function toggleSidebar(): void {
  setSidebarCollapsed(!appEl.classList.contains("sidebar-collapsed"));
}

async function exportPdf(): Promise<void> {
  const active = tabs.active;
  if (!active || !editor) return;
  captureActiveWorking();

  const prose = editorHost.querySelector(".milkdown .ProseMirror");
  if (!prose) return;

  const baseName = active.path
    ? stripMdExtension(basename(active.path))
    : active.name;
  const chosen = await saveDialog({
    defaultPath: `${baseName}.pdf`,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (!chosen) return;

  exportPdfBtn.disabled = true;
  try {
    await exportEditorToPdf(prose as HTMLElement, chosen, baseName);
  } catch (e) {
    console.error(e);
    alert(`Failed to export PDF:\n${e}`);
  } finally {
    exportPdfBtn.disabled = false;
  }
}

// --- Wiring ----------------------------------------------------------------
newFileBtn.addEventListener("click", () => newFile());
openFileBtn.addEventListener("click", () => void pickFile());
openFolderBtn.addEventListener("click", () => void pickFolder());
emptyNewFile.addEventListener("click", () => newFile());
emptyOpenFile.addEventListener("click", () => void pickFile());
emptyOpenFolder.addEventListener("click", () => void pickFolder());
toggleSidebarBtn.addEventListener("click", () => toggleSidebar());
exportPdfBtn.addEventListener("click", () => void exportPdf());

window.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === "s") {
    e.preventDefault();
    void saveActive();
  } else if (mod && e.key.toLowerCase() === "o") {
    e.preventDefault();
    void pickFile();
  } else if (mod && e.key.toLowerCase() === "n") {
    e.preventDefault();
    newFile();
  } else if (mod && e.key.toLowerCase() === "b") {
    e.preventDefault();
    toggleSidebar();
  }
});

void listen<{ path: string }>("file-changed", async (event) => {
  const tab = tabs.findByPath(event.payload.path);
  if (!tab || tab.dirty) return;
  try {
    const content = await readFile(event.payload.path);
    if (content === tab.savedContent) return;
    if (tabs.active?.id === tab.id) {
      tab.savedContent = content;
      tab.workingContent = content;
      await showTab(tab);
    } else {
      tabs.reloadFromDisk(tab.id, content);
    }
  } catch (e) {
    console.error(e);
  }
});

void listen<string[]>("open-files", (event) => {
  for (const path of event.payload) void openFile(path);
});

// --- Startup ---------------------------------------------------------------
async function start(): Promise<void> {
  const prefs = loadPreferences();
  applyPreferences(prefs);
  initSettingsPanel(settingsToggle, settingsPanel);
  initUpdateChecker();

  onPreferencesChange((next) => {
    applyPreferences(next);
    refreshStatusbarVisibility();
    if (tabs.active) void showTab(tabs.active);
  });

  initContextMenu({
    onNewFile: () => newFile(),
    onOpenFile: () => void pickFile(),
    onOpenFolder: () => void pickFolder(),
    onSave: () => void saveActive(),
    onExportPdf: () => void exportPdf(),
    onOpenFilePath: (path) => void openFile(path),
    onActivateTab: (tabId) => tabs.activate(tabId),
    onCloseTab: (tabId) => tabs.close(tabId),
    onCloseOtherTabs: (tabId) => tabs.closeOthers(tabId),
    getTabId: (el) => {
      const tab = el.closest(".tab") as HTMLElement | null;
      const id = tab?.dataset.tabId;
      return id ? Number(id) : null;
    },
    getFilePath: (el) => el.closest(".tree-file")?.getAttribute("data-path") ?? null,
  });

  if (prefs.sidebarCollapsedOnStart) {
    setSidebarCollapsed(true);
  } else {
    setSidebarCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
  }

  showEmpty();

  try {
    const { takePendingOpen } = await import("./api");
    const pending = await takePendingOpen();
    for (const path of pending) {
      await openFile(path);
      if (pending.length === 1) await sidebar.setRoot(dirname(path));
    }
  } catch (e) {
    console.error(e);
  }
}

void start();
