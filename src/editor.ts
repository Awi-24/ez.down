import { Crepe } from "@milkdown/crepe";

// Base Crepe styles. Colors/fonts are overridden per skin via CSS variables in
// src/themes/*.css, so we only need the structural "common" stylesheet plus a
// base flavor that declares the full set of --crepe-* variables.
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

export interface EditorHandle {
  getMarkdown: () => string;
  destroy: () => Promise<void>;
}

/**
 * Mount a Milkdown Crepe WYSIWYG editor into `host`.
 *
 * Crepe ships, enabled by default, exactly the UX we want:
 *  - a selection toolbar (bold/italic/heading/link/code…) that appears when the
 *    user highlights text — friendly formatting without knowing markdown syntax;
 *  - a "/" slash menu and a block "+" handle for inserting blocks;
 *  - GFM: tables, task lists, fenced code with syntax highlight (CodeMirror).
 *
 * `onChange` fires on every edit with the current markdown.
 */
export async function mountEditor(
  host: HTMLElement,
  value: string,
  onChange: (markdown: string) => void,
  readOnly = false
): Promise<EditorHandle> {
  const crepe = new Crepe({
    root: host,
    defaultValue: value,
    featureConfigs: {
      placeholder: {
        text: "Write here… type / to insert blocks",
      },
    },
  });

  crepe.on((listener) => {
    listener.markdownUpdated((_ctx, markdown) => {
      onChange(markdown);
    });
  });

  await crepe.create();
  crepe.setReadonly(readOnly);

  return {
    getMarkdown: () => crepe.getMarkdown(),
    destroy: async () => {
      await crepe.destroy();
    },
  };
}
