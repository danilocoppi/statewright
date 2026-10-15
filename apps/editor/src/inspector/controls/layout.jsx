import { useTranslation } from "react-i18next";

import { Segmented } from "@/components/ui/Segmented";
import { boxesOf } from "@/editing/changes";
import { cn } from "@/lib/cn";
import { useEditor } from "@/store/editor";

import { useField } from "../useField";
import { ParsedPart } from "./parts";
import { Row } from "./Row";

/** A node's stored layout, if any. */
const stored = (doc, canvasId, id) => doc.layout?.canvases?.[canvasId]?.nodes?.[id] ?? {};

/**
 * Place a node again with some of its layout changed (Core replaces the entry: its position, size and display are
 * carried; `null` leaves one out).
 */
function placeCommands(doc, canvasId, id, change) {
  const own = stored(doc, canvasId, id);
  const box = boxesOf(doc, canvasId).get(id);
  const entry = {
    x: own.x ?? Math.round(box.x),
    y: own.y ?? Math.round(box.y),
    w: own.w,
    h: own.h,
    display: own.display,
    ...change
  };
  const args = Object.fromEntries(Object.entries(entry).filter(([, value]) => value !== undefined && value !== null));
  return [{ type: "layout.node.set", args: { canvas: canvasId, id, ...args } }];
}

/** "Look here" (format §13: focus): the box or arrow is highlighted on the diagram. */
export function FocusControl({ id, field, layer }) {
  const edit = useField(id, field);
  const doc = useEditor(state => state.doc);
  const focus = doc.annotations?.focus ?? [];
  const on = focus.includes(id);
  return (
    <Row label={edit.label} layer={layer} error={edit.error}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={edit.label}
        disabled={edit.readOnly}
        onClick={() =>
          edit.run([{ type: "focus.set", args: { ids: on ? focus.filter(item => item !== id) : [...focus, id] } }], {
            named: edit.label
          })
        }
        className="inline-flex h-8 items-center disabled:opacity-60"
      >
        <span
          aria-hidden="true"
          className={cn(
            "relative h-[18px] w-8 rounded-full transition-colors duration-150",
            on ? "bg-accent" : "bg-control-border"
          )}
        >
          <span
            className={cn(
              "absolute top-[2px] size-[14px] rounded-full bg-surface shadow-sm transition-[left] duration-150",
              on ? "left-[16px]" : "left-[2px]"
            )}
          />
        </span>
      </button>
    </Row>
  );
}

/** How a box with an interior is shown (format §14): as a box, a card, or a frame with its interior drawn inside. */
export function DisplayControl({ id, field, layer, entry }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const doc = useEditor(state => state.doc);
  if (!entry.value.inner) return null;
  const current = stored(doc, entry.canvas, id).display ?? "node";
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      <Segmented
        label={edit.label}
        value={current}
        pills
        disabled={edit.readOnly}
        options={["node", "card", "frame"].map(display => ({ value: display, label: t(`layout.${display}`) }))}
        onChange={display =>
          edit.run(placeCommands(doc, entry.canvas, id, { display: display === "node" ? null : display }), {
            named: edit.label
          })
        }
      />
    </Row>
  );
}

const size = text => (/^\d+$/.test(text) && Number(text) > 0 ? Number(text) : undefined);

/** A box's size: automatic (what its words need), or a width and height of its own. */
export function SizeControl({ id, field, layer, entry }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const doc = useEditor(state => state.doc);
  const own = stored(doc, entry.canvas, id);
  const drawn = boxesOf(doc, entry.canvas).get(id);
  const set = change => edit.run(placeCommands(doc, entry.canvas, id, change), { named: edit.label });
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <ParsedPart
          label={t("layout.width")}
          value={own.w}
          parse={size}
          hint={drawn ? String(Math.round(drawn.w)) : undefined}
          readOnly={edit.readOnly}
          mono
          onCommit={w => set({ w: w ?? null })}
        />
        <ParsedPart
          label={t("layout.height")}
          value={own.h}
          parse={size}
          hint={drawn ? String(Math.round(drawn.h)) : undefined}
          readOnly={edit.readOnly}
          mono
          onCommit={h => set({ h: h ?? null })}
        />
        {(own.w || own.h) && !edit.readOnly ?
          <button
            type="button"
            onClick={() => set({ w: null, h: null })}
            className="h-8 text-[12px] font-medium text-accent hover:underline"
          >
            {t("layout.automatic")}
          </button>
        : <span className="h-8 text-[12px] leading-8 text-muted">{t("layout.automatic")}</span>}
      </div>
    </Row>
  );
}

/** An arrow's route: drawn automatically, or stored (by Auto-layout); Reset route draws it plainly again. */
export function RouteControl({ id, field, layer, entry }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const doc = useEditor(state => state.doc);
  const route = doc.layout?.canvases?.[entry.canvas]?.edges?.[id];
  const bends = route?.points ? Math.max(0, route.points.length - 2) : null;
  return (
    <Row label={edit.label} layer={layer} error={edit.error}>
      <div className="flex min-h-8 items-center justify-between gap-2">
        <span className="text-ui text-sub">
          {route ? t("layout.stored", { count: bends ?? 0 }) : t("layout.drawn")}
        </span>
        {route && !edit.readOnly && (
          <button
            type="button"
            onClick={() =>
              edit.run([{ type: "layout.edge.set", args: { canvas: entry.canvas, id } }], { named: t("layout.reset") })
            }
            className="text-[12px] font-medium text-accent hover:underline"
          >
            {t("layout.reset")}
          </button>
        )}
      </div>
    </Row>
  );
}
