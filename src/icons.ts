// Minimalist flat line icons (lucide-style). Each is an inline SVG string using
// `currentColor`, so size and color are inherited from CSS. No emojis anywhere.

const svg = (paths: string) =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const icons = {
  file: svg(
    '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M5 21V5a2 2 0 0 1 2-2h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/>'
  ),
  filePlus: svg(
    '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M5 21V5a2 2 0 0 1 2-2h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M12 11v6"/><path d="M9 14h6"/>'
  ),
  folder: svg(
    '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'
  ),
  folderOpen: svg(
    '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2"/><path d="M3 7v10a2 2 0 0 0 2 2h12.5a2 2 0 0 0 1.9-1.4l1.9-6A1 1 0 0 0 20.3 10H6.2a2 2 0 0 0-1.9 1.4z"/>'
  ),
  chevron: svg('<path d="M9 6l6 6-6 6"/>'),
  close: svg('<path d="M6 6l12 12"/><path d="M18 6L6 18"/>'),
  panel: svg(
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>'
  ),
};

/** Build a button's inner HTML: icon + optional label. */
export function iconLabel(icon: string, label?: string): string {
  return label ? `${icon}<span>${label}</span>` : icon;
}
