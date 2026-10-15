import { useViewport } from "@xyflow/react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Kbd } from "@/components/ui/Chip";
import { useEditor } from "@/store/editor";

import { insertNode, startTool } from "./actions";
import { CatalogPicker } from "./CatalogPicker";
import { findInsertables, insertables } from "./insertables";
import { editingStore } from "./state";
import { useInside } from "./useInside";

/** The landing ghost's box: the smallest box Core draws. */
const GHOST = { w: 140, h: 48 };

/**
 * Insert anything by name (spec §7.2, `/`): a search of the level's tools, the flow steps the dock leaves out, the
 * steps the catalog offers ("Emit psp.refund") and the reusable parts that fit here, opened where it will insert —
 * the pointer, or the middle of the view — with the landing ghost there.
 * @param {{ at: { x: number, y: number } }} props In canvas coordinates.
 */
export function InsertPalette({ at }) {
  const { t } = useTranslation("editor");
  const doc = useEditor(state => state.doc);
  const canvasId = useEditor(state => state.canvasId);
  const { x, y, zoom } = useViewport();
  const ref = useRef(null);
  useInside(ref);

  useEffect(() => {
    const palette = ref.current;
    const onPointerDown = event => !palette.contains(event.target) && editingStore.getState().close();
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  const items = insertables(doc, canvasId, t);
  const options = query =>
    findInsertables(items, query).map(item => ({
      id: item.id,
      label: item.label,
      meta: item.meta,
      onPick: () => (item.tool ? startTool(t, item.tool, at) : insertNode(t, item.node, at, item.label))
    }));
  const left = (at.x - GHOST.w / 2) * zoom + x;
  const top = (at.y - GHOST.h / 2) * zoom + y;

  return (
    <>
      <div
        aria-hidden="true"
        style={{ left, top, width: GHOST.w * zoom, height: GHOST.h * zoom }}
        className="sw-ghost pointer-events-none absolute z-20 rounded-[10px] border-[1.5px] border-dashed border-accent"
      />
      <section
        ref={ref}
        role="dialog"
        aria-modal="false"
        aria-label={t("insert.label")}
        onKeyDown={event => {
          if (event.key !== "Escape") return;
          event.stopPropagation();
          editingStore.getState().close();
        }}
        style={{ left: left + (GHOST.w * zoom) / 2, top: top + GHOST.h * zoom + 10 }}
        data-above={top - 10}
        className="nodrag nopan nowheel absolute z-40 w-[320px] -translate-x-1/2 rounded-island border border-island-border bg-island p-3 shadow-island backdrop-blur-md motion-safe:animate-[menu-in_160ms_var(--ease-soft)]"
      >
        <CatalogPicker label={t("insert.label")} placeholder={t("insert.placeholder")} options={options} />
        <p className="mt-2.5 flex gap-3 border-t border-hairline pt-2 text-label text-muted">
          <span className="flex items-center gap-1">
            <Kbd>↑↓</Kbd> {t("insert.move")}
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> {t("insert.pick")}
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Esc</Kbd> {t("insert.close")}
          </span>
        </p>
      </section>
    </>
  );
}
