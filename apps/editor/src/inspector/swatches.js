// What a choice looks like on the diagram (spec §7.4: "the semantic choices that change the look"): the Core style each
// value gives, so the inspector shows it in the figure's own colours — what you choose is what the diagram shows.

/** Provenances drawn in a style of their own (boxes); the others look plain. */
const PROVENANCE_STYLES = ["proposed", "fix", "legacy", "defect", "implied"];

/** The arrow style of each provenance that has one (Core's edge styles). */
const EDGE_PROVENANCE = {
  defect: "edge.defect",
  proposed: "edge.proposed",
  fix: "edge.proposed",
  implied: "edge.implied"
};

/**
 * The swatch of a choice's value: a box style, an arrow style, or a tone (status pills, notes). `value` is undefined
 * for the choice that leaves the key out.
 * @param {string} key The field's key.
 * @param {string | undefined} value
 * @param {string} type The element's index type ("node", "edge", "catalog", "note", …).
 * @returns {{ node: string } | { edge: string } | { tone: string } | null}
 */
export function swatchOf(key, value, type) {
  if (key === "category") return { node: value ? `state.${value}` : "state.plain" };
  if (key === "outcome" && type === "node") return { node: value ? `outcome.${value}` : "state.plain" };
  if (key === "provenance") {
    if (type === "edge") return { edge: EDGE_PROVENANCE[value] ?? "edge.default" };
    return { node: PROVENANCE_STYLES.includes(value) ? `prov.${value}` : "state.plain" };
  }
  if (key === "intent") return { edge: value ? `edge.${value}` : "edge.default" };
  if (key === "tone") return { tone: value ?? (type === "note" ? "info" : "neutral") };
  return null;
}
