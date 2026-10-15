import {
  commandsReference,
  formatReference,
  legendReference,
  operationsReference,
  rulesReference
} from "./reference.js";

/** Generated blocks of the guide, by marker name (spec §23). */
const BLOCKS = {
  commands: () => commandsReference(),
  legend: () => legendReference(),
  operations: () => operationsReference(),
  rules: () => rulesReference(),
  "schema-reference": () => formatReference()
};

const MARKERS = /<!-- generated:([a-z-]+) -->[\s\S]*?<!-- \/generated:\1 -->/g;
const OPENINGS = /<!-- generated:([a-z-]+) -->/g;

/**
 * Fill the generated blocks of the guide source: everything between `<!-- generated:name -->` and
 * `<!-- /generated:name -->` is replaced, so the published README never drifts from the code.
 * @param {string} source Markdown of docs/guide/README.md.
 * @returns {string} The README.
 */
export function renderGuide(source) {
  // An opening marker without its closing one would be left as it is, publishing stale text.
  for (const [, name] of source.matchAll(OPENINGS)) {
    if (!source.includes(`<!-- /generated:${name} -->`)) {
      throw new Error(`<!-- generated:${name} --> has no closing <!-- /generated:${name} -->`);
    }
  }
  return source.replace(MARKERS, (_, name) => {
    const block = BLOCKS[name];
    if (!block) throw new Error(`Unknown generated block "${name}" (known: ${Object.keys(BLOCKS).join(", ")})`);
    return `<!-- generated:${name} -->\n\n${block()}\n\n<!-- /generated:${name} -->`;
  });
}
