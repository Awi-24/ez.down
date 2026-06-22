use std::path::Path;
use std::sync::Mutex;

use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

/// Keeps a live filesystem watcher so the frontend can be told when an open
/// file changes on disk (e.g. edited by another program) and offer to reload.
#[derive(Default)]
pub struct WatchState(pub Mutex<Option<RecommendedWatcher>>);

#[derive(Clone, Serialize)]
struct FileChanged {
    path: String,
}

/// Replace the set of watched files. Passing an empty list stops watching.
#[tauri::command]
pub fn set_watched_paths(
    app: AppHandle,
    state: State<'_, WatchState>,
    paths: Vec<String>,
) -> Result<(), String> {
    let mut guard = state.0.lock().unwrap();
    *guard = None; // drop previous watcher first

    if paths.is_empty() {
        return Ok(());
    }

    let handle = app.clone();
    let mut watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        if let Ok(event) = res {
            if matches!(
                event.kind,
                EventKind::Modify(_) | EventKind::Create(_) | EventKind::Remove(_)
            ) {
                for p in event.paths {
                    let _ = handle.emit(
                        "file-changed",
                        FileChanged {
                            path: p.to_string_lossy().to_string(),
                        },
                    );
                }
            }
        }
    })
    .map_err(|e| format!("Failed to create watcher: {e}"))?;

    for p in &paths {
        let path = Path::new(p);
        if path.exists() {
            watcher
                .watch(path, RecursiveMode::NonRecursive)
                .map_err(|e| format!("Failed to watch {p}: {e}"))?;
        }
    }

    *guard = Some(watcher);
    Ok(())
}

/// Convenience for setup: register the watch state on the app.
pub fn init(app: &AppHandle) {
    app.manage(WatchState::default());
}
