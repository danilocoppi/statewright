import { ViewportPortal, useReactFlow, useStore as useFlow } from "@xyflow/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useEditor } from "@/store/editor";

import { beginGesture, eraseAlong, eraseAt } from "./gesture";
import { geometryOf } from "./payload";
import { DRAWING, INK, marksStore, useMarksState } from "./store";

/** How near the eraser reaches, in screen pixels. */
const REACH = 6;

/** The element of the level under a screen point: a box, a region or an arrow of its own (not one inside a frame). */
function elementAt(x, y) {
  for (const found of document.elementsFromPoint?.(x, y) ?? []) {
    const node = found.closest?.(".react-flow__node");
    if (node?.dataset.id) {
      const id = node.dataset.id;
      if (id.startsWith("region:")) return id.slice("region:".length);
      if (!id.includes("/") && !id.includes(":")) return id;
    }
    const edge = found.closest?.(".react-flow__edge");
    const edgeId = edge?.dataset.id ?? edge?.getAttribute("data-testid")?.replace(/^rf__edge-/, "");
    if (edgeId && !edgeId.includes("/")) return edgeId;
  }
  return null;
}

/** One mark, drawn. */
function Mark({ mark, draft = false }) {
  const colour = INK[mark.colour];
  const common = {
    "data-mark":
      draft ? undefined
      : mark.kind === "stroke" ? "stroke"
      : mark.kind,
    stroke: colour,
    strokeWidth: 2.5,
    vectorEffect: "non-scaling-stroke",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    opacity: draft ? 0.7 : 1
  };
  if (mark.kind === "stroke")
    return <polyline {...common} points={mark.points.map(point => point.join(",")).join(" ")} />;
  if (mark.kind === "rectangle") {
    const { x, y, width, height } = mark.rect;
    return <rect {...common} x={x} y={y} width={width} height={height} rx={6} />;
  }
  if (mark.kind === "ellipse") {
    const { x, y, width, height } = mark.rect;
    return <ellipse {...common} cx={x + width / 2} cy={y + height / 2} rx={width / 2} ry={height / 2} />;
  }
  return (
    <text
      data-mark="label"
      x={mark.at[0]}
      y={mark.at[1]}
      fill={colour}
      stroke="var(--canvas)"
      strokeWidth={4}
      paintOrder="stroke"
      fontSize={13}
      fontWeight={600}
    >
      {mark.text}
    </text>
  );
}

/**
 * The marks on the level shown (collaboration spec §5.1), in its own coordinates: the strokes, shapes and labels drawn
 * on it, a ring round each element marked for the AI, and — while a marking tool is in hand — the pointer, taken from
 * the canvas so nothing is selected, moved or connected: a drag draws or erases, a click marks or erases, Alt+click
 * with the pencil writes a label. The wheel still zooms and pans.
 * @param {{ canvasId: string }} props
 */
export function MarksLayer({ canvasId }) {
  const { t } = useTranslation("agent");
  const doc = useEditor(state => state.doc);
  const tool = useMarksState(state => state.tool);
  const marks = useMarksState(state => state.marks);
  const forAI = useMarksState(state => state.forAI);
  const shown = useMarksState(state => state.shown);
  const flow = useReactFlow();
  const domNode = useFlow(state => state.domNode);
  const zoom = useFlow(state => state.transform[2]);
  const [draft, setDraft] = useState(null);
  const [label, setLabel] = useState(null);
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const geometry = useMemo(
    () => (doc?.canvases[canvasId] ? geometryOf(doc, canvasId) : { boxes: [], lines: [] }),
    [doc, canvasId]
  );
  const drawn = (shown?.marks ?? marks).filter(mark => mark.level === canvasId);
  const marked = new Set((shown?.forAI ?? forAI).filter(item => item.level === canvasId).map(item => item.id));

  useEffect(() => {
    if (!tool || !domNode) return undefined;
    const pointOf = event => {
      const { x, y } = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      return [x, y];
    };
    const keep = event => {
      if (event.target.closest?.(".react-flow__minimap, .sw-mark-label")) return false;
      event.preventDefault();
      event.stopPropagation();
      return true;
    };
    const follow = (onMove, onEnd) => {
      const move = event => onMove(event);
      const up = event => {
        window.removeEventListener("pointermove", move, true);
        window.removeEventListener("pointerup", up, true);
        onEnd(event);
      };
      window.addEventListener("pointermove", move, true);
      window.addEventListener("pointerup", up, true);
    };
    const onPointerDown = event => {
      if (event.button !== 0 || !keep(event)) return;
      const store = marksStore;
      const point = pointOf(event);
      if (tool === "mark") {
        const id = elementAt(event.clientX, event.clientY);
        if (id) store.getState().toggleForAI(id, canvasId);
        return;
      }
      if (tool === "eraser") {
        const reach = REACH / zoomRef.current;
        if (!eraseAt(store, canvasId, point, reach)) {
          const id = elementAt(event.clientX, event.clientY);
          if (id && store.getState().forAI.some(item => item.id === id)) store.getState().unmark(id);
        }
        let last = point;
        follow(
          moved => {
            const next = pointOf(moved);
            eraseAlong(store, canvasId, last, next, reach);
            last = next;
          },
          () => {}
        );
        return;
      }
      if (tool === "pencil" && event.altKey) {
        const box = domNode.getBoundingClientRect();
        setLabel({ at: point, left: event.clientX - box.left, top: event.clientY - box.top, text: "" });
        return;
      }
      if (!DRAWING.has(tool)) return;
      const gesture = beginGesture(store, canvasId, point, { step: 2 / zoomRef.current });
      setDraft(gesture.draft());
      follow(
        moved => {
          gesture.move(pointOf(moved), { shift: moved.shiftKey });
          setDraft(gesture.draft());
        },
        () => {
          gesture.end();
          setDraft(null);
        }
      );
    };
    // The canvas's own clicks (select, open, connect) wait while a tool is in hand.
    const swallow = event => keep(event);
    domNode.addEventListener("pointerdown", onPointerDown, true);
    for (const type of ["mousedown", "click", "dblclick", "contextmenu"]) domNode.addEventListener(type, swallow, true);
    return () => {
      domNode.removeEventListener("pointerdown", onPointerDown, true);
      for (const type of ["mousedown", "click", "dblclick", "contextmenu"])
        domNode.removeEventListener(type, swallow, true);
    };
  }, [tool, domNode, flow, canvasId]);

  // A sent message's marks, shown again, go once the person clicks anywhere but the conversation.
  useEffect(() => {
    if (!shown) return undefined;
    const leave = event => {
      if (event.target.closest?.('[data-testid="conversation-bar"]')) return;
      marksStore.getState().show(null);
    };
    document.addEventListener("pointerdown", leave, true);
    return () => document.removeEventListener("pointerdown", leave, true);
  }, [shown]);

  const keepLabel = () => {
    if (label?.text.trim()) {
      marksStore.getState().add({
        level: canvasId,
        kind: "label",
        colour: marksStore.getState().colour,
        at: label.at,
        text: label.text.trim()
      });
    }
    setLabel(null);
  };

  return (
    <>
      <ViewportPortal>
        <svg
          data-testid="marks-layer"
          width={1}
          height={1}
          className="pointer-events-none absolute left-0 top-0 overflow-visible"
          aria-hidden="true"
        >
          {geometry.boxes
            .filter(box => marked.has(box.id))
            .map(box => (
              <rect
                key={box.id}
                data-for-ai={box.id}
                x={box.x - 6}
                y={box.y - 6}
                width={box.width + 12}
                height={box.height + 12}
                rx={10}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2}
                strokeDasharray="5 4"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          {geometry.lines
            .filter(line => marked.has(line.id))
            .map(line => (
              <polyline
                key={line.id}
                data-for-ai={line.id}
                points={line.points.map(point => point.join(",")).join(" ")}
                fill="none"
                stroke="var(--accent)"
                strokeOpacity={0.35}
                strokeWidth={8}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          {drawn.map(mark => (
            <Mark key={mark.id} mark={mark} />
          ))}
          {draft && <Mark mark={draft} draft />}
        </svg>
      </ViewportPortal>
      {label && (
        <input
          // A label is written where the person Alt+clicked: Enter keeps it, Esc drops it.
          autoFocus
          aria-label={t("marks.label")}
          placeholder={t("marks.labelPlaceholder")}
          value={label.text}
          onChange={event => setLabel({ ...label, text: event.target.value })}
          onKeyDown={event => {
            event.stopPropagation();
            if (event.key === "Enter") keepLabel();
            if (event.key === "Escape") setLabel(null);
          }}
          onBlur={keepLabel}
          style={{ left: label.left, top: label.top - 14 }}
          className="sw-mark-label absolute z-10 h-7 w-48 rounded-control border border-control-border bg-surface px-2 text-ui text-ink shadow-island outline-none focus:border-accent"
        />
      )}
    </>
  );
}
