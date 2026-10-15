import { useViewport } from "@xyflow/react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

import { useEditor } from "@/store/editor";

import { receiveWith } from "./actions";
import { CatalogPicker } from "./CatalogPicker";
import { editingStore } from "./state";
import { useInside } from "./useInside";

/**
 * Which of a place's actions a participant receives (mixed levels spec §4.1), asked where the connector was dropped
 * when the state or transition runs several: picking one gives that action the participant's party.
 * @param {{ editor: { from: string, to: string, at: { x: number, y: number }, actions: string[] } }} props
 */
export function Receive({ editor }) {
  const { t } = useTranslation("editor");
  const doc = useEditor(state => state.doc);
  const canvasId = useEditor(state => state.canvasId);
  const { x, y, zoom } = useViewport();
  const section = useRef(null);
  useInside(section);
  const participant = doc.canvases[canvasId].nodes[editor.to];
  const who = participant?.label ?? doc.catalog.parties[participant?.party]?.name ?? editor.to;
  const options = query =>
    editor.actions
      .map(id => ({ id, name: doc.catalog.actions[id]?.name ?? id }))
      .filter(item => item.name.toLowerCase().includes(query.trim().toLowerCase()))
      .map(item => ({ id: item.id, label: item.name, onPick: () => receiveWith(t, item.id) }));
  const title = t("roles.whichAction", { name: who });
  return (
    <section
      ref={section}
      role="dialog"
      aria-modal="false"
      aria-label={title}
      onKeyDown={event => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        editingStore.getState().close();
      }}
      style={{ left: editor.at.x * zoom + x, top: editor.at.y * zoom + y + 12 }}
      className="nodrag nopan nowheel absolute z-40 w-[280px] -translate-x-1/2 rounded-island border border-island-border bg-island p-3 shadow-island backdrop-blur-md motion-safe:animate-[menu-in_160ms_var(--ease-soft)]"
    >
      <p className="mb-2 text-ui text-sub">{title}</p>
      <CatalogPicker label={title} placeholder={t("roles.actionPlaceholder")} options={options} />
    </section>
  );
}
