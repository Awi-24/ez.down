import { basename } from "./api";
import { icons } from "./icons";

export interface Tab {
  id: number;
  /** Absolute path on disk, or null for an unsaved scratch buffer. */
  path: string | null;
  /** Display name. */
  name: string;
  /** Content as last persisted to disk (or initial empty for scratch). */
  savedContent: string;
  /** In-memory working copy reflecting unsaved edits. */
  workingContent: string;
  dirty: boolean;
}

let nextId = 1;

/**
 * Owns the set of open tabs and renders the tab bar. Pure state + DOM; the
 * editor lifecycle and file IO live in main.ts, driven through the callbacks.
 */
export class TabsManager {
  private tabs: Tab[] = [];
  private activeId: number | null = null;

  constructor(
    private readonly bar: HTMLElement,
    private readonly onActivate: (tab: Tab) => void,
    private readonly onClose: (tab: Tab) => void
  ) {}

  get active(): Tab | null {
    return this.tabs.find((t) => t.id === this.activeId) ?? null;
  }

  list(): Tab[] {
    return this.tabs;
  }

  findByPath(path: string): Tab | undefined {
    return this.tabs.find((t) => t.path === path);
  }

  open(path: string | null, content: string): Tab {
    const tab: Tab = {
      id: nextId++,
      path,
      name: path ? basename(path) : "Untitled",
      savedContent: content,
      workingContent: content,
      dirty: false,
    };
    this.tabs.push(tab);
    this.activeId = tab.id;
    this.render();
    this.onActivate(tab);
    return tab;
  }

  activate(id: number): void {
    if (id === this.activeId) return;
    const tab = this.tabs.find((t) => t.id === id);
    if (!tab) return;
    this.activeId = id;
    this.render();
    this.onActivate(tab);
  }

  /** Record working content / dirty flag for a tab (called on edits). */
  setWorking(id: number, content: string): void {
    const tab = this.tabs.find((t) => t.id === id);
    if (!tab) return;
    tab.workingContent = content;
    const dirty = content !== tab.savedContent;
    if (dirty !== tab.dirty) {
      tab.dirty = dirty;
      this.render();
    }
  }

  markSaved(id: number, path: string, content: string): void {
    const tab = this.tabs.find((t) => t.id === id);
    if (!tab) return;
    tab.path = path;
    tab.name = basename(path);
    tab.savedContent = content;
    tab.workingContent = content;
    tab.dirty = false;
    this.render();
  }

  /** Update working+saved content from an external on-disk change. */
  reloadFromDisk(id: number, content: string): void {
    const tab = this.tabs.find((t) => t.id === id);
    if (!tab) return;
    tab.savedContent = content;
    tab.workingContent = content;
    tab.dirty = false;
    this.render();
  }

  close(id: number): void {
    const idx = this.tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const [tab] = this.tabs.splice(idx, 1);
    if (this.activeId === id) {
      const next = this.tabs[idx] ?? this.tabs[idx - 1] ?? null;
      this.activeId = next?.id ?? null;
      this.render();
      if (next) this.onActivate(next);
      else this.onClose(tab);
    } else {
      this.render();
    }
  }

  paths(): string[] {
    return this.tabs.map((t) => t.path).filter((p): p is string => !!p);
  }

  render(): void {
    this.bar.innerHTML = "";
    for (const tab of this.tabs) {
      const el = document.createElement("div");
      el.className = "tab" + (tab.id === this.activeId ? " active" : "");
      el.title = tab.path ?? tab.name;

      if (tab.dirty) {
        const dot = document.createElement("span");
        dot.className = "tab-dot";
        el.appendChild(dot);
      }

      const label = document.createElement("span");
      label.className = "tab-label";
      label.textContent = tab.name;
      el.appendChild(label);

      const close = document.createElement("button");
      close.className = "tab-close";
      close.innerHTML = icons.close;
      close.title = "Close";
      close.addEventListener("click", (e) => {
        e.stopPropagation();
        this.close(tab.id);
      });
      el.appendChild(close);

      el.addEventListener("click", () => this.activate(tab.id));
      this.bar.appendChild(el);
    }
  }
}
