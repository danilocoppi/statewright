import { NodeToolbar, Position, useStore as useFlow } from "@xyflow/react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { noticeStore, useNotice } from "./notice";

/** Leave a point once the person clicks anywhere but the elements pointed out or the note. */
function useLeftOnClickElsewhere(pointed) {
  useEffect(() => {
    if (!pointed) return;
    const onPointerDown = event => {
      if (event.target.closest?.(".sw-pointed, .sw-pointer")) return;
      noticeStore.setState({ pointed: null });
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [pointed]);
}

/**
 * What an agent points out on the level shown (AI interface spec §4.2: view.point): the elements glow, still, and its
 * note stands above them — "AI" and the note — until the person clicks elsewhere or another point replaces it.
 * @param {{ canvasId: string }} props
 */
export function Pointer({ canvasId }) {
  const { t } = useTranslation("agent");
  const pointed = useNotice(state => (state.pointed?.canvasId === canvasId ? state.pointed : null));
  // The note stands over the boxes pointed out, or over the boxes a pointed edge joins.
  const boxes = useFlow(state => {
    if (!pointed?.note) return "";
    const ids = new Set();
    for (const id of pointed.ids) {
      if (state.nodeLookup.has(id)) ids.add(id);
      const edge = state.edgeLookup.get(id);
      if (edge) ids.add(edge.source).add(edge.target);
    }
    return [...ids].join(" ");
  });
  useLeftOnClickElsewhere(pointed);
  if (!pointed?.note || !boxes) return null;
  return (
    <NodeToolbar nodeId={boxes.split(" ")} isVisible position={Position.Top} offset={12} className="sw-pointer">
      <div
        role="note"
        data-testid="canvas-point"
        className="flex max-w-[300px] items-start gap-2 rounded-island border border-island-border bg-island px-3 py-2 text-read text-ink shadow-island backdrop-blur motion-safe:animate-[fade-in_160ms_var(--ease-soft)]"
      >
        <span className="mt-0.5 shrink-0 rounded-chip bg-accent-soft px-1.5 text-label font-semibold leading-[18px] text-accent">
          {t("point.by")}
        </span>
        <span className="min-w-0">{pointed.note}</span>
      </div>
    </NodeToolbar>
  );
}
