<div align="center">

# ez.down

**A lightweight, beautiful, open-source WYSIWYG Markdown editor & reader for Windows and Linux.**

</div>

ez.down opens `.md` files already formatted (Typora-style): you edit directly in
the rendered text — no raw syntax. Set it as your default app for Markdown files
and read or write with a clean, modern interface.

## Features

- ✍️ **WYSIWYG editing** (Milkdown / Crepe on ProseMirror) — no split source pane.
- 🫧 **Selection toolbar** when you highlight text, plus a **`/` menu** to insert
  blocks — format without knowing Markdown syntax.
- 📄 **Full GFM**: tables, syntax-highlighted code blocks, task lists.
- 🎨 **Themes**: Notebook (default), GitHub, VS Code Light/Dark, Solarized Light/Dark,
  Dracula, Nord, Cyberpunk, and **macOS** (traffic-light window chrome).
- ⚙️ **Settings panel** in the sidebar — theme, reader mode, layout, and more.
- 📖 **Reader mode** — view-only; hides editing controls for distraction-free reading.
- 📁 **Open single files or whole folders** — a sidebar file explorer plus
  quick single-file open.
- 🪟 **Multiple tabs** with unsaved-change indicators.
- 🔗 **File association** for `.md` / `.markdown` (open on double-click).
- 📊 **Status bar** with live word, character and line counts (optional).
- 📤 **Export to PDF** from the top bar or context menu.
- 🖱️ **Custom context menus** per area (editor, tabs, file tree).
- 🔁 **Auto-reload** when a file changes outside the app.

## Settings

Open **Settings** at the bottom of the sidebar:

| Preference | Description |
| ---------- | ----------- |
| **Theme** | Light/dark skins including macOS-style chrome |
| **Start with sidebar hidden** | Open focused on the document |
| **Wide reading column** | Broader text column (920px) |
| **Show status bar** | Toggle word/line counts |
| **Reader mode** | Read-only — no editing or saving |

Preferences are stored locally and persist across sessions.

## Beta release

Current version: **1.0.0-beta.1**

## Tech stack

| Layer          | Technology               |
| -------------- | ------------------------ |
| Shell / OS     | Tauri 2 (Rust)           |
| Editor         | Milkdown + Crepe (TypeScript) |
| Frontend build | Vite + TypeScript        |

## Development

Prerequisites: [Node.js](https://nodejs.org), [Rust](https://rustup.rs), and the
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS.

```bash
npm install
npm run tauri dev      # run the app in development mode
```

## Building installers

### Local build

```bash
npm run tauri build
```

This produces, under `src-tauri/target/release/bundle/`:

- **Windows** — an NSIS installer (`.exe`) that registers ez.down as a handler
  for `.md` files (available under "Open with").
- **Linux** — `.deb` and AppImage packages. The `.deb` registers the
  `text/markdown` MIME association via the generated `.desktop` entry.

To verify the file association after installing on Linux:

```bash
xdg-mime query default text/markdown
```

### GitHub Release (CI)

Pushes to tags matching `v*` trigger [`.github/workflows/release.yml`](.github/workflows/release.yml),
which builds and attaches the Windows NSIS installer (`.exe`), Linux `.deb`, and AppImage
to the GitHub Release (alongside GitHub's automatic source archives).

1. Bump the version in `package.json`, `src-tauri/tauri.conf.json`, and
   `src-tauri/Cargo.toml`.
2. Commit, tag, and push:

```bash
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "chore: release v1.0.0-beta.1"
git tag v1.0.0-beta.1
git push origin main
git push origin v0.2.0
```

You can also run the workflow manually from the **Actions** tab (`workflow_dispatch`).

Ensure **Settings → Actions → General → Workflow permissions** is set to
**Read and write permissions** so the workflow can create releases.

## Keyboard shortcuts

| Shortcut   | Action          |
| ---------- | --------------- |
| `Ctrl+N`   | New document    |
| `Ctrl+O`   | Open file       |
| `Ctrl+S`   | Save            |

## License

[MIT](LICENSE) © 2026 Adrian Widmer
