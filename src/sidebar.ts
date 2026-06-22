import { DirEntry, listDir, basename } from "./api";
import { icons } from "./icons";

interface RenderedDir {
  el: HTMLElement;
  loaded: boolean;
  expanded: boolean;
}

/**
 * Lazy folder tree. Directories load their children on first expand. Clicking a
 * markdown file calls `onOpenFile`.
 */
export class Sidebar {
  private readonly dirs = new Map<string, RenderedDir>();
  private rootPath: string | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly onOpenFile: (path: string) => void
  ) {}

  getRoot(): string | null {
    return this.rootPath;
  }

  async refresh(): Promise<void> {
    if (this.rootPath) await this.setRoot(this.rootPath);
  }

  async setRoot(path: string): Promise<void> {
    this.rootPath = path;
    this.dirs.clear();
    this.container.innerHTML = "";

    const header = document.createElement("div");
    header.className = "tree-root";
    header.textContent = basename(path) || path;
    this.container.appendChild(header);

    const children = document.createElement("div");
    children.className = "tree-children";
    this.container.appendChild(children);
    await this.loadInto(path, children);
  }

  private async loadInto(path: string, parent: HTMLElement): Promise<void> {
    let entries: DirEntry[] = [];
    try {
      entries = await listDir(path);
    } catch (e) {
      console.error(e);
      return;
    }
    parent.innerHTML = "";
    for (const entry of entries) {
      if (entry.is_dir) {
        parent.appendChild(this.makeDirNode(entry));
      } else if (entry.is_markdown) {
        parent.appendChild(this.makeFileNode(entry));
      }
    }
  }

  private makeDirNode(entry: DirEntry): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "tree-dir";

    const row = document.createElement("div");
    row.className = "tree-row";
    row.innerHTML = `<span class="tree-twisty">${icons.chevron}</span><span class="tree-icon">${icons.folder}</span><span class="tree-name"></span>`;
    (row.querySelector(".tree-name") as HTMLElement).textContent = entry.name;

    const childBox = document.createElement("div");
    childBox.className = "tree-children";
    childBox.hidden = true;

    const state: RenderedDir = { el: childBox, loaded: false, expanded: false };
    this.dirs.set(entry.path, state);

    row.addEventListener("click", async () => {
      state.expanded = !state.expanded;
      row.classList.toggle("expanded", state.expanded);
      childBox.hidden = !state.expanded;
      if (state.expanded && !state.loaded) {
        state.loaded = true;
        await this.loadInto(entry.path, childBox);
      }
    });

    wrap.appendChild(row);
    wrap.appendChild(childBox);
    return wrap;
  }

  private makeFileNode(entry: DirEntry): HTMLElement {
    const row = document.createElement("div");
    row.className = "tree-row tree-file";
    row.dataset.path = entry.path;
    row.innerHTML = `<span class="tree-twisty"></span><span class="tree-icon">${icons.file}</span><span class="tree-name"></span>`;
    (row.querySelector(".tree-name") as HTMLElement).textContent = entry.name;
    row.addEventListener("click", () => this.onOpenFile(entry.path));
    return row;
  }

  /** Highlight the row matching `path`, if visible. */
  setActive(path: string | null): void {
    this.container
      .querySelectorAll(".tree-file.active")
      .forEach((el) => el.classList.remove("active"));
    if (!path) return;
    const row = this.container.querySelector(
      `.tree-file[data-path="${CSS.escape(path)}"]`
    );
    row?.classList.add("active");
  }
}
