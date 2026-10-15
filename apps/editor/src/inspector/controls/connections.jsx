import { useState } from "react";
import { useTranslation } from "react-i18next";
import { edgeLabel } from "statewright";

import { Icon } from "@/components/ui/Icon";
import { centreOf, connectBoxes } from "@/editing/actions";
import { CatalogPicker } from "@/editing/CatalogPicker";
import { connectRefusal, startRefusal } from "@/editing/connect";
import { refusalKey } from "@/editing/refusals";
import { editorStore, useEditor } from "@/store/editor";

import { nodeName } from "../describe";
import { Row } from "./Row";

/** Select an element of the level, and bring it into view. */
function go(canvasId, id) {
  editorStore.getState().select([id], canvasId);
  editorStore.getState().reveal(canvasId, id);
}

/** One connection: what it says on the diagram (selects the arrow), and the box at its other end (selects that). */
function Connection({ canvasId, edgeId, label, other }) {
  return (
    <li className="flex min-h-8 items-center justify-between gap-3 border-b border-hairline last:border-b-0">
      <button
        type="button"
        onClick={() => go(canvasId, edgeId)}
        className="min-w-0 truncate py-1.5 text-left font-mono text-[11.5px] text-sub hover:text-ink"
      >
        {label || "—"}
      </button>
      <button
        type="button"
        onClick={() => go(canvasId, other.id)}
        className="shrink-0 py-1.5 text-ui font-medium text-accent hover:underline"
      >
        {other.name}
      </button>
    </li>
  );
}

/**
 * A box's connections in readable form (spec §7.4: "Goes to processing on psp.received, …"): what goes out, what comes
 * in, each a way to its arrow and to the box at the other end — and "+ Add a transition", which connects from the
 * keyboard to any box of the level, the box itself included; what the format forbids is said before it is chosen.
 */
export function ConnectionsControl({ id, layer, entry }) {
  const { t } = useTranslation("inspector");
  const { t: editor } = useTranslation("editor");
  const doc = useEditor(state => state.doc);
  const readOnly = useEditor(state => state.readOnly);
  const [adding, setAdding] = useState(false);
  const canvasId = entry.canvas;
  const canvas = doc.canvases[canvasId];
  const edges = Object.entries(canvas.edges);
  const row = (edgeId, otherId) => ({
    edgeId,
    label: edgeLabel(doc, edgeId),
    other: { id: otherId, name: nodeName(t, canvas.nodes[otherId]) }
  });
  const out = edges.filter(([, edge]) => edge.from === id).map(([edgeId, edge]) => row(edgeId, edge.to));
  const into = edges
    .filter(([, edge]) => edge.to === id && edge.from !== id)
    .map(([edgeId, edge]) => row(edgeId, edge.from));
  const cannot = startRefusal(doc, canvasId, id);

  const options = query => {
    const words = query.trim().toLowerCase();
    return Object.entries(canvas.nodes)
      .filter(([, node]) => nodeName(t, node).toLowerCase().includes(words))
      .slice(0, 8)
      .map(([target, node]) => {
        const refusal = connectRefusal(doc, canvasId, id, target);
        return {
          id: target,
          label: nodeName(t, node),
          meta:
            refusal ? editor(refusalKey(refusal))
            : target === id ? t("connections.itself")
            : undefined,
          disabled: Boolean(refusal),
          onPick: () => {
            setAdding(false);
            connectBoxes(editor, id, target, centreOf(doc, canvasId, [id]));
          }
        };
      });
  };

  return (
    <>
      <Row label={t("fields.connections")} layer={layer} wide>
        {out.length > 0 && (
          <ul>
            {out.map(item => (
              <Connection key={item.edgeId} canvasId={canvasId} {...item} />
            ))}
          </ul>
        )}
        {!readOnly &&
          (adding ?
            <div
              className="mt-1.5"
              onKeyDown={event => {
                if (event.key !== "Escape") return;
                event.stopPropagation();
                setAdding(false);
              }}
            >
              <CatalogPicker label={t("connections.pick")} placeholder={t("connections.pick")} options={options} />
            </div>
          : <button
              type="button"
              disabled={Boolean(cannot)}
              title={cannot ? editor(refusalKey(cannot)) : undefined}
              onClick={() => setAdding(true)}
              className="mt-1 inline-flex h-7 items-center gap-1 text-ui font-medium text-accent hover:underline disabled:text-muted disabled:no-underline"
            >
              <Icon name="plus" size={13} />
              {t(`connections.add.${canvas.kind}`)}
            </button>)}
        {cannot && !readOnly && <p className="text-label text-muted">{editor(refusalKey(cannot))}</p>}
      </Row>
      {into.length > 0 && (
        <Row label={t("connections.comesFrom")} layer={layer} wide>
          <ul>
            {into.map(item => (
              <Connection key={item.edgeId} canvasId={canvasId} {...item} />
            ))}
          </ul>
        </Row>
      )}
    </>
  );
}
