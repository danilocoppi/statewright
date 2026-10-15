// What the pages Core writes share (the scenario page, the documentation page): descriptions as inline Markdown, and
// the fonts embedded with `@font-face`, so a page needs nothing else.
import { esc } from "./svg.js";

/** Inline Markdown of a description: `code`, **strong**, *emphasis* and links to the web; the rest as text. */
export function inline(text) {
  return esc(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

/**
 * Whether an address from the document leads to the web (`http:` or `https:`): only those become links, so a file
 * from someone else cannot make a page run a script (`javascript:`) or open a document it carries (`data:`).
 * @param {string | undefined} url
 */
export function webAddress(url) {
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

/** A description in paragraphs. */
export const paragraphs = text =>
  text
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => `<p>${inline(block.replace(/\s*\n\s*/g, " "))}</p>`)
    .join("");

/**
 * The fonts as `@font-face` rules, one per line (none without fonts: the page uses the system's).
 * @param {Array<{ family: string, weight: string, data: string }>} fonts WOFF2 files in base64.
 */
export const fontFaces = fonts =>
  fonts
    .map(
      font =>
        `@font-face { font-family: "${font.family}"; font-weight: ${font.weight}; font-style: normal; font-display: block; src: url(data:font/woff2;base64,${font.data}) format("woff2"); }`
    )
    .join("\n");
