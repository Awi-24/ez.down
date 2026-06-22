## Learned User Preferences

- Prefers communicating in Portuguese.
- Wants UI controls and chrome polished and consistent with the active theme (dropdowns, scrollbars, context menus, task-list checkboxes).
- Prefers a document-first layout: collapsible sidebar, optional reader-only mode, and minimal topbar chrome.
- Prefers consolidated controls over duplicates (e.g. one sidebar toggle, not separate expand/collapse buttons).
- Wants tab titles and new-file names derived from the Markdown heading or first line when possible.
- Expects GitHub Releases to include Windows and Linux installers, not just source archives.

## Learned Workspace Facts

- ez.down is a Tauri 2 desktop Markdown editor: Vite/TypeScript frontend, Milkdown Crepe editor, Rust backend in `src-tauri/`.
- GitHub repo is `Awi-24/ez.down`; pushing a `v*` tag triggers `.github/workflows/release.yml` (Windows NSIS `.exe`, Linux `.deb` and AppImage).
- Keep version in sync across `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`.
- App preferences live in `src/preferences.ts` (localStorage) and are edited via the sidebar Settings panel (`src/settings-panel.ts`).
- Tab naming, rename, and save-path logic live in `src/naming.ts` and `src/tabs.ts`; file rename uses the Rust `rename_file` command.
- Current beta line targets version `1.0.0-beta.1`.
