import { useViewport } from "@xyflow/react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { useEditor } from "@/store/editor";

import { placeTool } from "./actions";
import { CatalogPicker } from "./CatalogPicker";
import { NameEditor } from "./NameEditor";
import { ghostSize } from "./place";
import { editingStore } from "./state";
import { useInside } from "./useInside";
import { toolsFor } from "./tools";
import { matches } from "./triggers";

/** The room the draft's label ("New state") takes above its box, at 100 %. */
const LABEL = 20;

/** The choice a flow action or a link needs before it is added: the action it performs, the level it leads to. */
function Choose({ tool, onPick }) {
  const { t } = useTranslation("editor");
  const doc = useEditor(state => state.doc);
  const canvasId = useEditor(state => state.canvasId);
  const options =
    tool.needs === "action" ?
      query => {
        const typed = query.trim();
        const known = Object.values(doc.catalog.actions).some(item => item.name === typed);
        return [
          ...(typed && !known ?
            [
              {
                id: "create",
                create: true,
                label: t("tools.createAction", { name: typed }),
                onPick: () => onPick({ action: { name: typed } })
              }
            ]
          : []),
          ...matches(doc, "actions", typed, 5).map(item => ({
            id: item.id,
            label: item.name,
            meta: t("trigger.uses", { count: item.uses }),
            onPick: () => onPick({ action: { id: item.id } })
          }))
        ];
      }
    : query => {
        const typed = query.trim().toLowerCase();
        return Object.entries(doc.canvases)
          .filter(([id, canvas]) => id !== canvasId && canvas.name.toLowerCase().includes(typed))
          .slice(0, 6)
          .map(([id, canvas]) => ({
            id,
            label: canvas.name,
            meta: t(`tools.kinds.${canvas.kind}`),
            onPick: () => onPick({ target: id })
          }));
      };
  return (
    <CatalogPicker
      label={t(tool.needs === "action" ? "tools.pickAction" : "tools.pickLevel")}
      placeholder={t(tool.needs === "action" ? "tools.actionPlaceholder" : "tools.levelPlaceholder")}
      options={options}
    />
  );
}

/**
 * An element being placed (spec §7.2, mockup 07): a dashed box where it will land, with its name typed in place — or
 * its note written, or its action or level chosen beside it — before it is added. Enter adds it; Esc drops it.
 * @param {{ draft: { tool: string, at: { x: number, y: number }, from?: string } }} props `from`: the box a connection
 *   dragged to empty space came from; the new box is connected from it.
 */
export function Draft({ draft }) {
  const { t } = useTranslation("editor");
  const doc = useEditor(state => state.doc);
  const canvasId = useEditor(state => state.canvasId);
  const { x, y, zoom } = useViewport();
  const chooser = useRef(null);
  useInside(chooser);
  const tool = toolsFor(doc.canvases[canvasId].kind).find(item => item.id === draft.tool);

  // A choice is dropped by a click elsewhere (a name being typed is kept, as when its field loses the focus).
  useEffect(() => {
    const section = chooser.current;
    if (!section) return;
    const onPointerDown = event => !section.contains(event.target) && editingStore.getState().close();
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  if (!tool) return null;
  const fallback = tool.named ? t(`tools.defaults.${tool.id}`) : undefined;
  const size = ghostSize(doc, canvasId, tool, fallback);
  const close = () => editingStore.getState().close();
  const place = choice => placeTool(t, tool, draft.at, { ...choice, from: draft.from });
  const left = (draft.at.x - size.w / 2) * zoom + x;
  const top = (draft.at.y - size.h / 2) * zoom + y;
  const note = !tool.node;

  return (
    <>
      <div
        style={{ left, top, width: size.w, height: size.h, transform: `scale(${zoom})` }}
        className="nodrag nopan absolute z-30 origin-top-left"
      >
        <p className="absolute -top-5 left-0 whitespace-nowrap text-[11px] font-medium text-accent">
          {note ? t("tools.note") : (fallback ?? t(`tools.${tool.id}`))}
        </p>
        <div
          className={
            note ?
              "h-full rounded-[6px] border-[1.5px] border-dashed border-accent bg-surface p-2"
            : "flex h-full items-center rounded-[10px] border-[1.5px] border-dashed border-accent bg-surface/95 px-3"
          }
        >
          {note ?
            <NameEditor
              value=""
              multiline
              label={t("editing.noteText")}
              className="h-full text-[11px] leading-[15px]"
              onCancel={close}
              onCommit={text => (text.trim() ? place({ text }) : close())}
            />
          : tool.named ?
            <NameEditor
              value=""
              label={t("editing.name")}
              className="text-center text-[12px] font-semibold"
              onCancel={close}
              // Enter adds the box, named for the person if nothing was typed; going elsewhere keeps only a name.
              onCommit={(text, how) =>
                text.trim() || how === "enter" ? place({ name: text.trim() || fallback }) : close()
              }
            />
          : null}
        </div>
      </div>
      {tool.needs && (
        <section
          ref={chooser}
          role="dialog"
          aria-modal="false"
          aria-label={t(tool.needs === "action" ? "tools.pickAction" : "tools.pickLevel")}
          onKeyDown={event => {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            close();
          }}
          style={{ left: left + (size.w * zoom) / 2, top: top + size.h * zoom + 10 }}
          data-above={top - LABEL * zoom - 10}
          className="nodrag nopan nowheel absolute z-40 w-[280px] -translate-x-1/2 rounded-island border border-island-border bg-island p-3 shadow-island backdrop-blur-md motion-safe:animate-[menu-in_160ms_var(--ease-soft)]"
        >
          <p className="mb-2 text-ui text-sub">{t(tool.needs === "action" ? "tools.pickAction" : "tools.pickLevel")}</p>
          <Choose tool={tool} onPick={place} />
        </section>
      )}
    </>
  );
}
