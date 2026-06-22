// Bottom status bar: live document metrics (words, characters, lines) plus the
// file size and last-modified time.

const el = {
  bar: () => document.getElementById("statusbar") as HTMLElement,
  words: () => document.getElementById("st-words") as HTMLElement,
  chars: () => document.getElementById("st-chars") as HTMLElement,
  lines: () => document.getElementById("st-lines") as HTMLElement,
  size: () => document.getElementById("st-size") as HTMLElement,
  modified: () => document.getElementById("st-modified") as HTMLElement,
};

const plural = (n: number, one: string, many: string) =>
  `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function showStatusbar(visible: boolean): void {
  el.bar().hidden = !visible;
}

/** Recompute and render metrics for the given content. */
export function updateMetrics(content: string, modifiedMs: number | null): void {
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars = [...content].length;
  const lines = content ? content.split(/\r\n|\r|\n/).length : 0;
  const bytes = new TextEncoder().encode(content).length;

  el.words().textContent = plural(words, "word", "words");
  el.chars().textContent = plural(chars, "character", "characters");
  el.lines().textContent = plural(lines, "line", "lines");
  el.size().textContent = formatBytes(bytes);
  el.modified().textContent =
    modifiedMs != null ? `Modified ${formatDate(modifiedMs)}` : "Not saved";
}
