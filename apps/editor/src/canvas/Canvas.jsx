// The canvas (spec §6.1): the current level drawn as Core draws it, on React Flow — pan, zoom, select, and open a
// box's interior. Every box keeps Core's position and size (the projection), so what is shown is what is exported.
import "@xyflow/react/dist/base.css";

import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
  useStore
} from "@xyflow/react";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { centreOf, startTool } from "@/editing/actions";
import { CanvasMenu } from "@/editing/CanvasMenu";
import { connectRefusal, naturalTool, startRefusal } from "@/editing/connect";
import { Draft } from "@/editing/Draft";
import { Ghost } from "@/editing/Ghost";
import { InsertPalette } from "@/editing/InsertPalette";
import { TOOL_TYPE } from "@/editing/place";
import { Refusal } from "@/editing/Refusal";
import { TriggerEditor } from "@/editing/TriggerEditor";
import { hasTrigger } from "@/editing/triggers";
import { editingStore, useEditing } from "@/editing/state";
import { toolsFor } from "@/editing/tools";
import { elementName } from "@/inspector/references";
import { useSubject } from "@/inspector/state";
import { cn } from "@/lib/cn";
import { indexOf } from "@/lib/derived";
import { isWithin } from "@/features/editor/levels";
import { useNotice } from "@/agent/notice";
import { Pointer } from "@/agent/Pointer";
import { useFrames, useMarks } from "@/simulate/hooks";
import { simulationStore, useSimulation } from "@/simulate/store";
import { pathName } from "@/simulate/words";
import { editorStore, useEditor } from "@/store/editor";
import { currentInspectorWidth, useInspectorWidth } from "@/stores/inspector";
import { useView } from "@/stores/view";

import { ConnectionLine } from "./ConnectionLine";
import { DiagramDefs } from "./DiagramDefs";
import { FigureEdge } from "./FigureEdge";
import { FindingPopover } from "./FindingPopover";
import { Legend } from "./Legend";
import { MarkActions } from "./marks";
import { DecorationNode, FigureNode, HeadingNode, NoteNode } from "./parts";
import { ProblemPopover } from "./ProblemPopover";
import { LAYERS, projectLevel } from "./project";
import { StageMotion } from "./StageMotion";
import { dressedAs, steadier } from "./steady";
import { boundsOf, MOTION, prefersReducedMotion, useLevelView } from "./useLevelView";
import { useConnect } from "./useConnect";
import { useDrag } from "./useDrag";
import { usePlacement } from "./usePlacement";
import { clearOfInspector, fitFor, inspectorSpace, ZOOM } from "./viewport";
import { ZoomIsland } from "./ZoomIsland";

const nodeTypes = {
  node: FigureNode,
  frame: FigureNode,
  region: DecorationNode,
  lane: DecorationNode,
  note: NoteNode,
  heading: HeadingNode
};
const edgeTypes = { figure: FigureEdge };

const NO_SELECTION = [];

/** The minimap shows the boxes of the level, quietly. */
const minimapColor = node => (node.type === "node" || node.type === "frame" ? "var(--control-border)" : "transparent");
const MINIMAP = { width: 200, height: 136 };

/** Apply React Flow's selection changes to a selection. */
function selectionAfter(current, changes) {
  const next = new Set(current);
  for (const change of changes) {
    if (change.type !== "select") continue;
    if (change.selected) next.add(change.id);
    else next.delete(change.id);
  }
  return [...next];
}

/** What a screen reader hears: the level shown, then each selection still on it (spec §9). */
function Announcer({ name, level, selection }) {
  const { t } = useTranslation("editor");
  const names = selection.flatMap(id => {
    const item = level.nodes.find(node => node.id === id) ?? level.edges.find(edge => edge.id === id);
    return item?.ariaLabel ? [item.ariaLabel] : [];
  });
  return (
    <p className="sr-only" aria-live="polite">
      {names.length ? t("canvas.selected", { names: names.join(", ") }) : t("canvas.shown", { level: name })}
    </p>
  );
}

/** What a screen reader hears of a box the run marks: its name, and that the run is there, inside it, or was there. */
function markedLabel(t, name, mark, doc, top) {
  if (mark.kind === "active") return t("simulate:marks.activeLabel", { name });
  if (mark.kind === "left") return t("simulate:marks.leftLabel", { name });
  const states = [...new Set(mark.leaves.map(leaf => pathName(doc, top, leaf, t)))].join(", ");
  return t("simulate:marks.insideLabel", { name, states });
}

/** @param {{ onNavigate?: (canvasId: string) => void }} props */
function Flow({ onNavigate }) {
  const { t } = useTranslation("editor");
  const doc = useEditor(state => state.doc);
  const canvasId = useEditor(state => state.canvasId);
  const readOnly = useEditor(state => state.readOnly);
  // While simulating, the level is shown, not edited (simulator spec §6.1): nothing moves, connects or is selected;
  // and it is framed left of the panel (the tool dock is not shown).
  const simulating = useSimulation(state => state.mode !== null);
  // Presenting (simulator spec §7.1), the level is framed on the stage and follows the story.
  const presenting = useSimulation(state => state.stage);
  const locked = readOnly || simulating;
  const selection = useEditor(state => state.view.selections[state.canvasId] ?? NO_SELECTION);
  const flow = useReactFlow();
  // A level is framed with room for the tool dock on a narrow canvas (viewport.js).
  const paneWidth = useStore(state => state.width);
  // Beside the simulation panel, as wide as the person made the inspector.
  const inspector = useInspectorWidth();
  const fit = useMemo(
    () => fitFor(paneWidth, { beside: simulating && !presenting, stage: presenting, inspector }),
    [paneWidth, simulating, presenting, inspector]
  );
  const container = useRef(null);
  // Presenting, the level is shown alone (simulator spec §7.1: "no editing islands"): no zoom, legend or minimap.
  const showLegend = useView(state => state.legend) && !presenting;
  const showMinimap = useView(state => state.minimap) && !presenting;
  const legendBox = useRef(null);
  // The panels on the right (the inspector, the Problems) stop above the islands at the bottom right — the support
  // badge, the minimap and the legend, stacked in that order — what they take from the bottom of the window is
  // `--sw-bottom-right`, unless that leaves them under 280 px: then they go over.
  useEffect(() => {
    const root = document.documentElement;
    const measure = () => {
      const islands = [
        legendBox.current,
        container.current?.querySelector(".react-flow__minimap"),
        document.querySelector("[data-support]")
      ];
      const tops = islands.filter(Boolean).map(island => island.getBoundingClientRect().top);
      if (tops.length) root.style.setProperty("--sw-bottom-right", `${innerHeight - Math.min(...tops) + 8}px`);
      else root.style.removeProperty("--sw-bottom-right");
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (legendBox.current) observer.observe(legendBox.current);
    addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      removeEventListener("resize", measure);
      root.style.removeProperty("--sw-bottom-right");
    };
  }, [showLegend, showMinimap, presenting]);

  // The layers the View menu hides, as one string so the selection is stable.
  const hiddenLayers = useView(state => LAYERS.filter(layer => !state[layer]).join(" "));
  const hidden = useMemo(() => hiddenLayers.split(" ").filter(Boolean), [hiddenLayers]);
  // A screen reader names what the figure leaves unnamed as the inspector does: a start dot by its kind, an arrow by its
  // ends.
  const nameOf = useMemo(() => {
    const unnamed = kind => t(`inspector:kinds.node.${kind}`, { defaultValue: kind });
    return id => {
      const entry = indexOf(doc).get(id);
      return entry && elementName(doc, entry, unnamed);
    };
  }, [doc, t]);
  const base = useMemo(() => projectLevel(doc, canvasId, { hidden, nameOf }), [doc, canvasId, hidden, nameOf]);
  const { placed, placing, failed, retry } = usePlacement(doc, canvasId, base.unplaced.length);
  const projected = useMemo(
    () => (placed ? projectLevel(placed, canvasId, { hidden, nameOf }) : base),
    [placed, base, canvasId, hidden, nameOf]
  );
  // The parts an edit did not change keep their objects, so React Flow redraws only what changed.
  const [steadyNodes] = useState(steadier);
  const [steadyEdges] = useState(steadier);
  const level = useMemo(
    () => ({ ...projected, nodes: steadyNodes(projected.nodes), edges: steadyEdges(projected.edges) }),
    [projected, steadyNodes, steadyEdges]
  );

  // The run shown, marked on the level (simulator spec §6.3): where it is, and what can happen from there.
  const marks = useMarks(canvasId);
  // What an agent just created or changed on this level glows (AI interface spec §7.3).
  const changed = useNotice(state => state.marked?.canvases[canvasId]);
  const glowing = useMemo(() => new Set(changed ?? []), [changed]);
  // What an agent points out on this level (view.point) glows, still, until the person clicks elsewhere.
  const pointedIds = useNotice(state => (state.pointed?.canvasId === canvasId ? state.pointed.ids : null));
  const pointed = useMemo(() => new Set(pointedIds ?? []), [pointedIds]);

  const drag = useDrag(t, canvasId);
  const connect = useConnect(t, flow);
  const [hovered, setHovered] = useState(null);
  const selected = useMemo(() => new Set(selection), [selection]);
  // Boxes a connection can start from: not in a read-only tab, not from a terminal state or a used initial node.
  const starts = useMemo(
    () =>
      new Set(
        locked ?
          []
        : level.nodes
            .filter(node => ["node", "frame"].includes(node.type) && node.selectable)
            .filter(node => !startRefusal(doc, canvasId, node.id))
            .map(node => node.id)
      ),
    [level, doc, canvasId, locked]
  );
  // While a connection is dragged, the box under the pointer says whether it can be its end (itself included).
  const target =
    connect.from && hovered ?
      connectRefusal(doc, canvasId, connect.from, hovered) ? "invalid"
      : "valid"
    : null;
  // Each node as shown now (moved by a drag, selected, a connection's possible start or end, marked by the run), the
  // same object while none of that changes. A box the run is not at, nor leads to, recedes.
  const nodes = useMemo(
    () =>
      level.nodes.map(node => {
        const position = drag.positions?.get(node.id);
        const canStart = starts.has(node.id);
        const aimed = node.id === hovered && target;
        const box = node.type === "node" || node.type === "frame";
        const mark = box ? marks?.nodes.get(node.id) : undefined;
        const recede = Boolean(marks) && box && node.selectable && !marks.kept.has(node.id);
        const glow = glowing.has(node.id);
        const point = pointed.has(node.id);
        if (!position && !selected.has(node.id) && !canStart && !aimed && !mark && !recede && !glow && !point) {
          return node;
        }
        const state = [
          selected.has(node.id),
          canStart,
          aimed,
          position?.x,
          position?.y,
          JSON.stringify(mark),
          recede,
          glow,
          point
        ];
        return dressedAs(node, state.join("|"), () => ({
          ...node,
          ...(position && { position }),
          selected: selected.has(node.id),
          ...(mark && { ariaLabel: markedLabel(t, node.ariaLabel, mark, doc, simulationStore.getState().canvas) }),
          data: { ...node.data, canStart, ...(aimed && { target }), ...(mark && { mark }) },
          ...((aimed === "invalid" || recede || glow || point) && {
            className: cn(
              aimed === "invalid" && "sw-refuse",
              recede && "sw-recede",
              glow && "sw-ai",
              point && "sw-pointed"
            )
          })
        }));
      }),
    [level, selected, drag.positions, starts, hovered, target, marks, t, doc, glowing, pointed]
  );
  const edges = useMemo(
    () =>
      level.edges.map(edge => {
        const moving = drag.positions?.has(edge.source) || drag.positions?.has(edge.target);
        const mark = marks?.edges.get(edge.id);
        const recede = Boolean(marks) && edge.selectable && !mark;
        const glow = glowing.has(edge.id);
        const point = pointed.has(edge.id);
        if (!moving && !selected.has(edge.id) && !mark && !recede && !glow && !point) return edge;
        return {
          ...edge,
          selected: selected.has(edge.id),
          ...((moving || mark) && { data: { ...edge.data, ...(moving && { moving }), ...(mark && { mark }) } }),
          ...((recede || glow || point) && {
            className: cn(recede && "sw-recede", glow && "sw-ai", point && "sw-pointed")
          })
        };
      }),
    [level, selected, drag.positions, marks, glowing, pointed]
  );

  // The level whose view is in place: what is brought into view waits for it.
  const [framed, setFramed] = useState(null);
  const framedRef = useLevelView({
    flow,
    doc,
    canvasId,
    nodes: level.nodes,
    ready: !placing,
    container,
    onFramed: setFramed,
    beside: simulating && !presenting,
    stage: presenting
  });
  // A run that starts frames its level whole, left of the panel, its marks in view.
  const running = useSimulation(state => state.mode === "run");
  useEffect(() => {
    if (!running) return;
    flow.fitView({
      ...fitFor(container.current?.clientWidth ?? 0, { beside: true, inspector: currentInspectorWidth() }),
      duration: 0
    });
  }, [running, flow]);
  // Presenting, and back from it: the level is framed again in the room it now has.
  const presented = useRef(false);
  useEffect(() => {
    if (!presenting && !presented.current) return;
    presented.current = presenting;
    const room = presenting ? { stage: true } : { beside: true, inspector: currentInspectorWidth() };
    flow.fitView({
      ...fitFor(container.current?.clientWidth ?? 0, room),
      duration: prefersReducedMotion() ? 0 : MOTION.zoom
    });
  }, [presenting, flow]);
  // The inspector never covers what it shows (spec §6.1).
  const subject = useSubject();
  const shown = subject && "id" in subject ? subject.id : null;
  const revealed = useRef(null);

  // Leaving a level puts the tool down and closes what was open on it.
  useEffect(() => () => editingStore.getState().reset(), [canvasId]);

  // Bring an element into view when asked (a Problem picked in the panel, ⌘K, a use in the catalog), once its level is
  // framed: in the middle of what the inspector leaves free when it shows something.
  const reveal = useEditor(state => state.view.reveal);
  useEffect(() => {
    if (placing || framed !== canvasId || reveal?.canvasId !== canvasId) return;
    const item = level.nodes.find(node => node.id === reveal.id) ?? level.edges.find(edge => edge.id === reveal.id);
    const part = item?.data.part;
    if (part) {
      const duration = prefersReducedMotion() ? 0 : MOTION.zoom;
      const zoom = Math.max(flow.getZoom(), 0.75);
      const aside = shown ? inspectorSpace(currentInspectorWidth()) / 2 / zoom : 0;
      flow.setCenter(part.x + part.w / 2 + aside, part.y + part.h / 2, { zoom, duration });
      revealed.current = reveal.id;
    }
    editorStore.getState().reveal(canvasId, null);
  }, [flow, reveal, canvasId, placing, framed, level, shown]);

  // A box the inspector shows under it (one just made at the right edge, one selected there) slides into view on its
  // left — unless it was just brought into view, already clear of it.
  const keepClear = useEffectEvent(id => {
    if (revealed.current === id) return void (revealed.current = null);
    const part = level.nodes.find(node => node.id === id)?.data.part;
    const bounds = container.current?.getBoundingClientRect();
    if (!part || !bounds?.width) return;
    const left = flow.flowToScreenPosition({ x: part.x, y: part.y }).x - bounds.left;
    const right = flow.flowToScreenPosition({ x: part.x + part.w, y: part.y }).x - bounds.left;
    const slide = clearOfInspector(left, right, bounds.width, currentInspectorWidth());
    if (!slide) return;
    const { x, y, zoom } = flow.getViewport();
    flow.setViewport({ x: x - slide, y, zoom }, { duration: prefersReducedMotion() ? 0 : MOTION.zoom });
  });
  useEffect(() => {
    if (shown && !placing && framed === canvasId) keepClear(shown);
  }, [shown, placing, framed, canvasId]);

  // React Flow reports a click as two changes in a row (select this, unselect the rest): apply each to the stored
  // selection, not to the one this render saw.
  const onChange = changes => {
    drag.onMove(changes);
    // While simulating, nothing is selected: the level is shown, not edited (simulator spec §6.1).
    if (simulating || !changes.some(change => change.type === "select")) return;
    const { view } = editorStore.getState();
    editorStore.getState().select(selectionAfter(view.selections[canvasId] ?? NO_SELECTION, changes));
  };

  /**
   * Open a box's interior: the box grows into the screen, then the interior is shown (spec §6.3). The zoom into the box
   * is no level's view: this level keeps the view it had, and the interior gets its own once it is framed.
   */
  const open = useCallback(
    async (node, to = node?.data?.part?.interior) => {
      if (!to || !onNavigate) return;
      editorStore.getState().setViewport(canvasId, flow.getViewport());
      framedRef.current = null;
      if (!prefersReducedMotion()) {
        // A zoom another framing interrupts never says it ended: the level is shown once the zoom's time is up.
        const zoomed = flow.fitBounds(boundsOf(node), { duration: MOTION.zoom, padding: 0.02 });
        await Promise.race([zoomed, new Promise(done => setTimeout(done, MOTION.zoom + 50))]);
      }
      onNavigate(to);
    },
    [flow, canvasId, onNavigate, framedRef]
  );
  // Presenting, the camera goes where each step is best seen (simulator spec §7.1): down through the box that leads
  // there, which grows into the screen first, or straight there (up, the level zooms out of its box).
  const frames = useFrames();
  const shownIndex = useSimulation(state => (state.stage ? (state.shown ?? state.points.length - 1) : null));
  const played = useSimulation(state => state.played);
  const goal = shownIndex === null ? null : frames[shownIndex]?.level;
  const going = useRef(null);
  useEffect(() => {
    if (!goal || goal === canvasId || placing) {
      going.current = null;
      return;
    }
    if (going.current === goal) return;
    going.current = goal;
    const box = level.nodes.find(
      node => node.data.part?.interior && !node.data.part.within.length && isWithin(doc, goal, node.data.part.interior)
    );
    if (box) open(box, goal);
    else onNavigate?.(goal);
  }, [goal, canvasId, placing, level, doc, open, onNavigate]);
  // What the run's marks do when clicked (simulator spec §6.2, §6.3): a pill goes down to the run inside its box; an
  // edge's label takes its move, or answers the question with its number.
  const markActions = useMemo(
    () => ({
      open: id => open(level.nodes.find(node => node.id === id)),
      edge: (id, mark) => {
        const simulation = simulationStore.getState();
        if (mark.number) return simulation.answer(simulation.asking.question.candidates[mark.number - 1].value);
        const [move, ...more] = mark.moves;
        if (!more.length) return simulation.request(move.do, move.label);
        // Several moves lead through it: the person picks one in the panel.
        document.querySelector(`[data-area="simulation"] [data-opens='${JSON.stringify(move.do)}']`)?.focus();
      }
    }),
    [open, level]
  );
  const onKeyDown = event => {
    if (event.key !== "Enter") return;
    const id = event.target.closest?.(".react-flow__node")?.dataset.id;
    const node = level.nodes.find(item => item.id === id);
    if (!node?.data.part?.interior) return;
    event.preventDefault();
    open(node);
  };

  const empty = !placing && !failed && level.nodes.every(node => node.type === "heading");

  // The context menu opens where the person right-clicks, on what is under the pointer (selected first), or — from
  // the keyboard — under the selection.
  const menu = useEditing(state => (state.editor?.type === "menu" ? state.editor : null));
  const trigger = useEditing(state => (state.editor?.type === "trigger" ? state.editor : null));
  const draft = useEditing(state => (state.editor?.type === "draft" ? state.editor : null));
  const insert = useEditing(state => (state.editor?.type === "insert" ? state.editor : null));
  const editorOpen = useEditing(state => Boolean(state.editor));
  // A keyboard user keeps their place: when what was typed over the level closes (a new box's name, a choice, a trigger)
  // and leaves the focus nowhere, it goes to the one box now selected.
  const wasOpen = useRef(false);
  useEffect(() => {
    const closed = wasOpen.current && !editorOpen;
    wasOpen.current = editorOpen;
    if (!closed) return;
    const frame = requestAnimationFrame(() => {
      if (document.activeElement !== document.body) return;
      const [one, ...more] = editorStore.getState().view.selections[canvasId] ?? [];
      if (one && !more.length) document.querySelector(`.react-flow__node[data-id="${one}"]`)?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [editorOpen, canvasId]);
  const tools = toolsFor(doc.canvases[canvasId].kind);
  const tool = useEditing(state => tools.find(item => item.id === state.tool && item.id !== "select") ?? null);

  const place = (chosen, at) => startTool(t, chosen, at);
  const pointAt = event => flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
  /** Under an edge's label (or the middle of its route): where its trigger editor opens. */
  const below = edgeId => {
    const edge = level.edges.find(item => item.id === edgeId);
    if (!edge) return null;
    const { part, label } = edge.data;
    if (label) return { x: label.x + label.w / 2, y: label.y + label.h, top: label.y };
    const middle = Math.floor((part.points.length - 1) / 2);
    const [[x1, y1], [x2, y2]] = [part.points[middle], part.points[middle + 1]];
    return { x: (x1 + x2) / 2, y: (y1 + y2) / 2, top: (y1 + y2) / 2 };
  };
  const triggerAt = trigger && below(trigger.edgeId);
  const openMenu = (event, id) => {
    event.preventDefault();
    if (simulating) return;
    if (id && !selection.includes(id)) editorStore.getState().select([id]);
    if (id === null) editorStore.getState().select([]);
    const bounds = container.current.getBoundingClientRect();
    editingStore.getState().open({
      type: "menu",
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      point: flow.screenToFlowPosition({ x: event.clientX, y: event.clientY })
    });
  };
  // A paste with the pointer away from the canvas lands in the middle of the view.
  useEffect(() => {
    editingStore.getState().setCentre(() => {
      const bounds = container.current.getBoundingClientRect();
      return flow.screenToFlowPosition({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 });
    });
    return () => editingStore.getState().setCentre(null);
  }, [flow]);

  // ⇧1 fits the level, ⌘+ and ⌘− zoom (spec §7.3), as the zoom island does.
  const request = useEditing(state => state.view);
  useEffect(() => {
    if (!request) return;
    const duration = prefersReducedMotion() ? 0 : 160;
    if (request.action === "fit") flow.fitView({ ...fit, duration: prefersReducedMotion() ? 0 : MOTION.zoom });
    if (request.action === "zoomIn") flow.zoomIn({ duration });
    if (request.action === "zoomOut") flow.zoomOut({ duration });
    editingStore.getState().settle();
  }, [request, flow, fit]);

  // `/` inserts where the pointer is over the canvas, or in the middle of the view.
  useEffect(() => {
    if (!insert || insert.at) return;
    const bounds = container.current.getBoundingClientRect();
    const at =
      editingStore.getState().pointer ??
      flow.screenToFlowPosition({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 });
    editingStore.getState().open({ type: "insert", at });
  }, [insert, flow]);

  useEffect(() => {
    if (!menu?.anchor) return;
    const bounds = container.current.getBoundingClientRect();
    const point = flow.flowToScreenPosition(centreOf(doc, canvasId, selection));
    editingStore.getState().open({ type: "menu", x: point.x - bounds.left, y: point.y - bounds.top });
  }, [menu, flow, doc, canvasId, selection]);

  return (
    <div
      ref={container}
      data-testid="canvas"
      data-canvas={canvasId}
      data-area="canvas"
      className="absolute inset-0"
      onKeyDown={onKeyDown}
      onPointerMove={event =>
        editingStore.getState().point(flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }))
      }
      onPointerLeave={() => editingStore.getState().point(null)}
      onDragOver={event => {
        if (locked || !event.dataTransfer.types.includes(TOOL_TYPE)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={event => {
        const dropped = tools.find(item => item.id === event.dataTransfer.getData(TOOL_TYPE));
        if (!dropped || dropped.id === "select") return;
        event.preventDefault();
        place(dropped, pointAt(event));
      }}
    >
      <DiagramDefs />
      <MarkActions value={markActions}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onChange}
          onEdgesChange={onChange}
          onNodeDoubleClick={(_event, node) => {
            // A box with an interior opens; any other box or note is renamed in place.
            if (node.data.part?.interior) open(node);
            else if (!locked && node.selectable !== false) editingStore.getState().open({ type: "name", id: node.id });
          }}
          onPaneClick={event => {
            if (tool) place(tool, pointAt(event));
            else editorStore.getState().select([]);
          }}
          onNodeDragStop={drag.onDrop}
          onNodeMouseEnter={(_event, node) => setHovered(node.id)}
          onNodeMouseLeave={() => setHovered(null)}
          onConnectStart={connect.onConnectStart}
          onConnect={connect.onConnect}
          onConnectEnd={connect.onConnectEnd}
          isValidConnection={connection => !connectRefusal(doc, canvasId, connection.source, connection.target)}
          connectionLineComponent={ConnectionLine}
          onNodeContextMenu={(event, node) => openMenu(event, node.selectable === false ? null : node.id)}
          onEdgeContextMenu={(event, edge) => openMenu(event, edge.selectable === false ? null : edge.id)}
          onEdgeDoubleClick={(_event, edge) => {
            if (!locked && edge.selectable !== false && hasTrigger(doc, canvasId, edge.id)) {
              editingStore.getState().open({ type: "trigger", edgeId: edge.id });
            }
          }}
          onPaneContextMenu={event => openMenu(event, null)}
          onSelectionContextMenu={event => openMenu(event, undefined)}
          onMoveEnd={(_event, viewport) =>
            framedRef.current === canvasId && editorStore.getState().setViewport(canvasId, viewport)
          }
          nodesDraggable={!locked}
          nodesConnectable={!locked}
          edgesFocusable={false}
          elevateNodesOnSelect={false}
          zIndexMode="manual"
          multiSelectionKeyCode="Shift"
          selectionOnDrag={!locked}
          selectionMode={SelectionMode.Partial}
          panOnDrag={locked || [1]}
          disableKeyboardA11y
          deleteKeyCode={null}
          zoomOnDoubleClick={false}
          panOnScroll
          minZoom={ZOOM.min}
          maxZoom={ZOOM.max}
          fitView
          fitViewOptions={fit}
          attributionPosition="bottom-center"
          aria-label={t("canvas.label", { level: doc.canvases[canvasId].name })}
          className={cn("sw-canvas", tool && "sw-placing")}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1.4} color="var(--dot)" bgColor="var(--canvas)" />
          {presenting && <StageMotion level={level} marks={marks} play={played ?? -1} />}
          {!presenting && <Pointer canvasId={canvasId} />}
          {showMinimap && (
            <MiniMap
              pannable
              zoomable
              position="bottom-right"
              ariaLabel={t("minimap")}
              nodeColor={minimapColor}
              nodeStrokeColor="transparent"
              nodeBorderRadius={3}
              bgColor="var(--surface)"
              maskColor="color-mix(in srgb, var(--canvas) 72%, transparent)"
              className="sw-minimap"
              style={MINIMAP}
            />
          )}
        </ReactFlow>
      </MarkActions>
      {!presenting && <ZoomIsland />}
      {showLegend && (
        <div ref={legendBox} className={cn("absolute right-4 z-10", showMinimap ? "bottom-[216px]" : "bottom-16")}>
          <Legend />
        </div>
      )}
      <Announcer name={doc.canvases[canvasId].name} level={level} selection={selection} />
      <Refusal />
      <FindingPopover container={container} />
      <ProblemPopover container={container} />
      {menu && !menu.anchor && <CanvasMenu at={menu} onClose={() => editingStore.getState().close()} />}
      {tool && !editorOpen && <Ghost tool={tool} />}
      {connect.from && !hovered && (
        <Ghost tool={tools.find(item => item.id === naturalTool(doc.canvases[canvasId].kind))} />
      )}
      {insert?.at && <InsertPalette key={`${insert.at.x}:${insert.at.y}`} at={insert.at} />}
      {draft && <Draft key={`${draft.tool}:${draft.at.x}:${draft.at.y}`} draft={draft} />}
      {triggerAt && (
        <TriggerEditor edgeId={trigger.edgeId} at={triggerAt} onClose={() => editingStore.getState().close()} />
      )}
      {(placing || empty) && (
        <p
          role="status"
          className="pointer-events-none absolute inset-x-0 top-1/2 text-center text-read text-muted motion-safe:animate-[fade-in_160ms_ease-out]"
        >
          {placing ? t("canvas.placing") : t("canvas.empty")}
        </p>
      )}
      {failed && (
        <div
          role="status"
          className="absolute inset-x-0 top-1/2 flex flex-col items-center gap-3 text-read text-muted motion-safe:animate-[fade-in_160ms_ease-out]"
        >
          <p>{t("canvas.placeFailed")}</p>
          <Button size="sm" onClick={retry}>
            {t("canvas.retry")}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * The canvas of the open project's current level.
 * @param {{ onNavigate?: (canvasId: string) => void }} props `onNavigate` shows another level (the page changes the
 *   address; the canvas follows the store).
 */
export function Canvas({ onNavigate }) {
  const open = useEditor(state => Boolean(state.doc));
  return (
    open && (
      <ReactFlowProvider>
        <Flow onNavigate={onNavigate} />
      </ReactFlowProvider>
    )
  );
}
