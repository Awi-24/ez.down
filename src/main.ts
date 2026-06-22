import { listen } from "@tauri-apps/api/event";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";

import {
  readFile,
  writeFile,
  setWatchedPaths,
  fileMeta,
  dirname,
} from "./api";
import { mountEditor, EditorHandle } from "./editor";
import { TabsManager, Tab } from "./tabs";
import { Sidebar } from "./sidebar";
import { applyTheme, loadTheme, ThemeId } from "./themes";
import { icons, iconLabel } from "./icons";
import { showStatusbar, updateMetrics } from "./statusbar";

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
const themeSelect = document.getElementById("theme-select") as HTMLSelectElement;
const appEl = document.getElementById("app") as HTMLElement;
const openFolderBtn = document.getElementById("open-folder") as HTMLButtonElement;
const openFileBtn = document.getElementById("open-file") as HTMLButtonElement;
const newFileBtn = document.getElementById("new-file") as HTMLButtonElement;
const toggleSidebarBtn = document.getElementById("toggle-sidebar") as HTMLButtonElement;
const showSidebarBtn = document.getElementById("show-sidebar") as HTMLButtonElement;
const emptyNewFile = document.getElementById("empty-new-file") as HTMLButtonElement;
const emptyOpenFile = document.getElementById("empty-open-file") as HTMLButtonElement;
const emptyOpenFolder = document.getElementById("empty-open-folder") as HTMLButtonElement;

newFileBtn.innerHTML = icons.filePlus;
openFileBtn.innerHTML = icons.file;
openFolderBtn.innerHTML = icons.folderOpen;
toggleSidebarBtn.innerHTML = icons.panel;
showSidebarBtn.innerHTML = icons.panel;
emptyNewFile.innerHTML = iconLabel(icons.filePlus, "New document");
emptyOpenFile.innerHTML = iconLabel(icons.file, "Open file");
emptyOpenFolder.innerHTML = iconLabel(icons.folderOpen, "Open folder");

// --- Editor lifecycle ------------------------------------------------------
let editor: EditorHandle | null = null;
// Suppress change events fired while we are (re)mounting content programmatically.
let loading = false;
// Last-modified time (epoch ms) of the active tab's file on disk.
let activeModified: number | null = null;
// Directory of the active file, used to resolve relative image paths.
let baseDir: string | null = null;

async function showTab(tab: Tab): Promise<void> {
  loading = true;
  if (editor) {
    await editor.destroy();
    editor = null;
  }
  editorHost.innerHTML = "";
  emptyState.hidden = true;
  editorHost.hidden = false;
  showStatusbar(true);

  editor = await mountEditor(editorHost, tab.workingContent, (md) => {
    if (loading) return;
    tabs.setWorking(tab.id, md);
    updateMetrics(md, activeModified);
  });
  loading = false;
  editorHost.classList.remove("fade-in");
  void editorHost.offsetWidth; // restart the entrance animation
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
  showStatusbar(false);
  sidebar.setActive(null);
}

function captureActiveWorking(): void {
  const active = tabs.active;
  if (active && editor && !loading) {
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
  } catch (e) {
    console.error(e);
    alert(`Could not open file:\n${e}`);
  }
}

function newFile(): void {
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

async function saveActive(): Promise<void> {
  const active = tabs.active;
  if (!active || !editor) return;
  const content = editor.getMarkdown();

  let path = active.path;
  if (!path) {
    const chosen = await saveDialog({
      defaultPath: "untitled.md",
      filters: MD_FILTER,
    });
    if (!chosen) return;
    path = chosen;
  }

  try {
    await writeFile(path, content);
    tabs.markSaved(active.id, path, content);
    activeModified = await fetchModified(path);
    updateMetrics(content, activeModified);
    await refreshWatched();
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
// The webview cannot load local files by raw path, and relative paths in a
// Markdown file resolve against the file's folder. We rewrite the *displayed*
// src of each <img> to a Tauri asset URL (the node's stored src — and thus the
// saved Markdown — is left untouched).
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
}
function toggleSidebar(): void {
  setSidebarCollapsed(!appEl.classList.contains("sidebar-collapsed"));
}

// --- Theme -----------------------------------------------------------------
function initTheme(): void {
  const theme = loadTheme();
  applyTheme(theme);
  themeSelect.value = theme;
  themeSelect.addEventListener("change", () => {
    applyTheme(themeSelect.value as ThemeId);
  });
}

// --- Wiring ----------------------------------------------------------------
newFileBtn.addEventListener("click", () => newFile());
openFileBtn.addEventListener("click", () => void pickFile());
openFolderBtn.addEventListener("click", () => void pickFolder());
emptyNewFile.addEventListener("click", () => newFile());
emptyOpenFile.addEventListener("click", () => void pickFile());
emptyOpenFolder.addEventListener("click", () => void pickFolder());
toggleSidebarBtn.addEventListener("click", () => toggleSidebar());
showSidebarBtn.addEventListener("click", () => setSidebarCollapsed(false));

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

// External change to an open file → reload silently if there are no local edits.
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

// A second instance forwarded files to open.
void listen<string[]>("open-files", (event) => {
  for (const path of event.payload) void openFile(path);
});

// --- Startup ---------------------------------------------------------------
async function start(): Promise<void> {
  initTheme();
  setSidebarCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
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
