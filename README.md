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
- 🎨 **Themes**: Notebook (bright, default), GitHub, VS Code Light/Dark,
  Solarized Light/Dark, Dracula, Nord, and Cyberpunk.
- 📁 **Open single files or whole folders** — a sidebar file explorer plus
  quick single-file open.
- 🪟 **Multiple tabs** with unsaved-change indicators.
- 🔗 **File association** for `.md` / `.markdown` (open on double-click).
- 📊 **Status bar** with live word, character and line counts, file size and
  last-modified time.
- 🔁 **Auto-reload** when a file changes outside the app.

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

## Keyboard shortcuts

| Shortcut   | Action          |
| ---------- | --------------- |
| `Ctrl+N`   | New document    |
| `Ctrl+O`   | Open file       |
| `Ctrl+S`   | Save            |

## License

[MIT](LICENSE) © 2026 Adrian Widmer
