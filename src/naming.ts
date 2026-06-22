const MD_EXT = /\.(md|markdown|mdown|mkd)$/i;

/** Strip a markdown extension from a filename. */
export function stripMdExtension(filename: string): string {
  return filename.replace(MD_EXT, "") || filename;
}

/** Extract a human title from markdown (first heading, else first non-empty line). */
export function titleFromMarkdown(md: string): string {
  const lines = md.split(/\r?\n/);
  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+?)\s*$/);
    if (h1) return h1[1].trim();
  }
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("```")) continue;
    return t.replace(/^#+\s*/, "").trim();
  }
  return "Untitled";
}

/** Make a string safe for use as a filename (no extension). */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || "Untitled";
}

/** Tab label from a full path. */
export function nameFromPath(path: string): string {
  return sanitizeFilename(stripMdExtension(path.split(/[\\/]/).pop() || path));
}

/** Build a suggested save path for a tab. */
export function buildSavePath(baseName: string, directory?: string | null): string {
  const file = `${sanitizeFilename(baseName)}.md`;
  if (!directory) return file;
  const sep = directory.includes("\\") ? "\\" : "/";
  return `${directory.replace(/[\\/]+$/, "")}${sep}${file}`;
}

/** Ensure a save path ends with a markdown extension. */
export function ensureMdExtension(path: string): string {
  return MD_EXT.test(path) ? path : `${path}.md`;
}
