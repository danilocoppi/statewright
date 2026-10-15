// How the inspector heads an element (mockup 09): its name, or what stands for it, and what it is, where.
import { edgeHome, isGuest, stepText } from "statewright";

/**
 * What a node is called on its level: its name, or its kind ("Initial node"); a guest, given the document, by what it
 * stands for (its label, its party, its action, its state).
 */
export function nodeName(t, node, doc) {
  if (node?.name) return node.name;
  const guest = node?.kind === "participant" || node?.kind === "steps" || (node?.kind === "state" && node.target);
  if (doc && guest) return node.label ?? stepText(doc, node);
  return t(`inspector:kinds.node.${node?.kind}`);
}

/** The words for an element's kind ("State", "Transition", "Event"…). */
export function kindWords(t, doc, entry) {
  const { type, value } = entry;
  if (type === "node") return t(`inspector:kinds.node.${value.kind}`);
  if (type === "edge") {
    const canvas = doc.canvases[entry.canvas];
    // A mixed level's connection is called what it is at home (mixed levels spec §4.5).
    const canvasKind = canvas.kind === "mixed" ? (edgeHome(canvas, value) ?? "machine") : canvas.kind;
    const kind =
      canvasKind !== "machine" ? canvasKind
      : value.kind === "link" ? "link"
      : "transition";
    return t(`inspector:kinds.edge.${kind}`);
  }
  if (type === "canvas") return t(`inspector:kinds.canvas.${value.kind}`);
  if (type === "catalog") return t(`inspector:kinds.catalog.${entry.collection}`);
  return t(`inspector:kinds.${type}`);
}

/** The level an element is on, for those that are on one. */
function levelOf(doc, entry) {
  if (entry.canvas) return doc.canvases[entry.canvas];
  if (entry.type === "note" || entry.type === "lane") return doc.canvases[entry.value.canvas];
  return null;
}

/**
 * The inspector's heading for an element.
 * @returns {{ title: string, stand: string, subtitle: string }} `title`: its own name (may be empty); `stand`: what is
 *   shown when it has none ("created → awaiting_payment", "Unnamed initial node"); `subtitle`: what it is, where.
 */
export function headingOf(t, doc, entry) {
  const { type, value } = entry;
  const kind = kindWords(t, doc, entry);
  const level = levelOf(doc, entry);
  const subtitle = level ? t("inspector:in", { kind, level: level.name }) : kind;
  if (type === "edge") {
    const nodes = doc.canvases[entry.canvas].nodes;
    return {
      title: value.name ?? "",
      stand: `${nodeName(t, nodes[value.from])} → ${nodeName(t, nodes[value.to])}`,
      subtitle
    };
  }
  if (type === "note") return { title: "", stand: value.text.split("\n")[0], subtitle };
  // The key the heading edits: a lane's label, a finding's title, everything else's name.
  const title =
    (type === "lane" ? value.label
    : type === "finding" ? value.title
    : value.name) ?? "";
  // A guest is what it stands for (mixed levels spec §6): its party, its action, its state.
  if (type === "node" && isGuest(level.kind, value))
    return { title, stand: value.label ?? stepText(doc, value), subtitle };
  return { title, stand: t("inspector:unnamed", { kind: kind.toLowerCase() }), subtitle };
}
