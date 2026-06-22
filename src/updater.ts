import { isTauri } from "@tauri-apps/api/core";

export type UpdateStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available"; version: string; notes: string }
  | { state: "downloading"; progress: number }
  | { state: "ready" }
  | { state: "uptodate" }
  | { state: "error"; message: string };

type Listener = (status: UpdateStatus) => void;

let status: UpdateStatus = { state: "idle" };
let pending: import("@tauri-apps/plugin-updater").Update | null = null;
const listeners = new Set<Listener>();

function emit(next: UpdateStatus): void {
  status = next;
  for (const fn of listeners) fn(status);
}

export function onUpdateStatus(fn: Listener): () => void {
  listeners.add(fn);
  fn(status);
  return () => listeners.delete(fn);
}

export function updateAvailable(): boolean {
  return status.state === "available" || status.state === "downloading";
}

export async function checkForUpdates(silent = false): Promise<void> {
  if (!isTauri()) return;

  emit({ state: "checking" });
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (!update) {
      pending = null;
      emit(silent ? { state: "idle" } : { state: "uptodate" });
      return;
    }
    pending = update;
    emit({
      state: "available",
      version: update.version,
      notes: update.body ?? "",
    });
  } catch (e) {
    pending = null;
    const message = e instanceof Error ? e.message : String(e);
    emit(silent ? { state: "idle" } : { state: "error", message });
  }
}

export async function installUpdate(): Promise<void> {
  if (!isTauri() || !pending) return;

  try {
    emit({ state: "downloading", progress: 0 });
    let downloaded = 0;
    let total = 0;

    await pending.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started":
          total = event.data.contentLength ?? 0;
          break;
        case "Progress":
          downloaded += event.data.chunkLength;
          emit({
            state: "downloading",
            progress: total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : 0,
          });
          break;
        case "Finished":
          break;
      }
    });

    emit({ state: "ready" });
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    emit({ state: "error", message });
  }
}

/** Background check on launch and every few hours. */
export function initUpdateChecker(): void {
  if (!isTauri()) return;

  window.setTimeout(() => void checkForUpdates(true), 10_000);
  window.setInterval(() => void checkForUpdates(true), 4 * 60 * 60 * 1000);
}
