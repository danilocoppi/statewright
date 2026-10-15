/** Escape text for XML content and attribute values. */
export function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** A number for SVG output: integers as they are, others with one decimal. */
export function num(value) {
  const rounded = Math.round(value * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * One SVG element. Attributes with `undefined`, `null` or `false` values are left out; numbers are rounded.
 * @param {string} name
 * @param {Record<string, unknown>} attributes
 * @param {string} [children] Already-serialized content.
 */
export function el(name, attributes, children) {
  const attrs = Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([key, value]) => ` ${key}="${typeof value === "number" ? num(value) : esc(value)}"`)
    .join("");
  return children === undefined ? `<${name}${attrs}/>` : `<${name}${attrs}>${children}</${name}>`;
}

/** Path data of a polyline. */
export const pathData = points => points.map(([x, y], index) => `${index ? "L" : "M"} ${num(x)} ${num(y)}`).join(" ");

/**
 * Split text into lines no wider than `width` (word wrap; a single long word stays on its own line).
 * @param {string} text
 * @param {number} width
 * @param {(line: string) => number} measure
 */
export function wrap(text, width, measure) {
  const lines = [];
  for (const paragraph of String(text).split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && measure(candidate) > width) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}
