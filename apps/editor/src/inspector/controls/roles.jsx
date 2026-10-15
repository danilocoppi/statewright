import { useTranslation } from "react-i18next";
import { associationsOf, edgeLabel } from "statewright";

import { editorStore, useEditor } from "@/store/editor";

import { nodeName } from "../describe";
import { Row } from "./Row";

/** Select an element of the level, and bring it into view. */
function go(canvasId, id) {
  editorStore.getState().select([id], canvasId);
  editorStore.getState().reveal(canvasId, id);
}

/**
 * An element's roles (mixed levels spec §6): what a participant sends and receives, where embedded steps run, who sends
 * a transition and who receives its actions — each a way to the element at the other end. Nothing when it has none.
 */
export function RolesControl({ id, layer, entry }) {
  const { t } = useTranslation("inspector");
  const doc = useEditor(state => state.doc);
  const canvasId = entry.canvas;
  const canvas = doc.canvases[canvasId];
  const nameOf = other =>
    canvas.nodes[other] ? nodeName(t, canvas.nodes[other], doc) : edgeLabel(doc, other) || other;
  const rows = new Map();
  for (const association of associationsOf(doc, canvasId)) {
    const outgoing = association.from === id;
    if (!outgoing && association.to !== id) continue;
    const key = `${association.role}.${outgoing ? "from" : "to"}`;
    if (!rows.has(key)) rows.set(key, []);
    rows
      .get(key)
      .push({ id: association.id, other: outgoing ? association.to : association.from, label: association.label });
  }
  if (!rows.size) return null;
  return [...rows].map(([key, items]) => (
    <Row key={key} label={t(`roles.${key}`)} layer={layer} wide>
      <ul>
        {items.map(item => (
          <li
            key={item.id}
            className="flex min-h-8 items-center justify-between gap-3 border-b border-hairline last:border-b-0"
          >
            <button
              type="button"
              onClick={() => go(canvasId, item.other)}
              className="min-w-0 truncate py-1.5 text-left text-ui font-medium text-accent hover:underline"
            >
              {nameOf(item.other)}
            </button>
            {item.label && <span className="shrink-0 font-mono text-[11.5px] text-muted">{item.label}</span>}
          </li>
        ))}
      </ul>
    </Row>
  ));
}
