// Addresses of the guide and of what it ships beside the app, and the ways into it (spec §8.4: "The Editor links into
// the guide where it helps"). Inside the editor the guide opens in a new tab, so the editor keeps its work, its view
// and its hold on the project; elsewhere it is a page like any other.

/** A file the guide ships beside the app (a figure, the raw Markdown), at the app's base. */
export const asset = path => `${import.meta.env.BASE_URL}${path}`;

/**
 * The guide's address in this app, at a section or a rule when given.
 * @param {string} [anchor] a heading's id (`reading-a-diagram`) or a rule's (`ruleAnchor(code)`)
 */
export const guideHref = (anchor = "") => asset(`readme${anchor ? `#${anchor}` : ""}`);

/** Where the guide explains a rule: its row in the rules table. */
export const ruleAnchor = code => `rule-${code}`;

/** Open the guide in a new tab. */
export const openGuide = anchor => globalThis.open(guideHref(anchor), "_blank", "noopener");
