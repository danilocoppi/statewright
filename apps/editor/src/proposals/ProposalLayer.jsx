import { ViewportPortal, useReactFlow } from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import { applyBatch } from "statewright";

import { geometryOf } from "@/marks/payload";
import { useEditor } from "@/store/editor";
import { layoutClient } from "@/workers";

import { diffOf } from "./diff";
import { proposalsStore, useProposals } from "./store";

const empty = { boxes: [], regions: [], lines: [] };
const points = line => line.points.map(point => point.join(",")).join(" ");

/**
 * The proposal shown, drawn on the level shown (collaboration spec §7): what it adds as ghosts where they would stand
 * (the layout worker places new boxes first), what it removes red, dashed and faded, what it changes with an amber
 * "~". Nothing for a proposal not shown, or on another level.
 * @param {{ canvasId: string }} props
 */
export function ProposalLayer({ canvasId }) {
  const doc = useEditor(state => state.doc);
  const proposal = useProposals(state => state.list.find(item => item.id === state.shown && item.state === "waiting"));
  const focus = useProposals(state => state.focus);
  const flow = useReactFlow();
  // Against the document as it is now: where the new parts would stand, what would go, what would change.
  const live = useMemo(() => (proposal && doc ? diffOf(doc, proposal.commands) : null), [proposal, doc]);
  const diff = live?.ok ? live : null;
  const [ghosts, setGhosts] = useState({ key: null, geometry: empty });
  const here = item => item.level === canvasId;
  const added = new Set((diff?.added ?? []).filter(here).map(item => item.id));
  const key = proposal && added.size ? `${proposal.id}:${canvasId}` : null;

  // Where the new parts would stand: the preview, its new boxes placed.
  useEffect(() => {
    if (!key || !diff) return undefined;
    let current = true;
    const { preview } = diff;
    layoutClient()
      .request("layout", { doc: preview, canvasId, scope: "missing" })
      .then(commands => {
        if (!current) return;
        const placed = commands.length ? applyBatch(preview, commands).doc : preview;
        setGhosts({ key, geometry: geometryOf(placed, canvasId) });
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [key, diff]); // eslint-disable-line react-hooks/exhaustive-deps

  // A new part asked for (‹ › on the card): into view once its ghost is drawn.
  useEffect(() => {
    if (!focus || focus.level !== canvasId || ghosts.key !== key) return;
    const part = ghosts.geometry.boxes.find(box => box.id === focus.id);
    if (!part) return;
    flow.setCenter(part.x + part.width / 2, part.y + part.height / 2, { zoom: flow.getZoom(), duration: 200 });
    proposalsStore.getState().setFocus(null);
  }, [focus, ghosts, key, canvasId, flow]);

  if (!proposal || !diff || !doc?.canvases[canvasId]) return null;
  const removed = new Set(diff.removed.filter(here).map(item => item.id));
  const changed = new Set(diff.changed.filter(here).map(item => item.id));
  if (!added.size && !removed.size && !changed.size) return null;
  const now = removed.size || changed.size ? geometryOf(doc, canvasId) : empty;
  const ghost = ghosts.key === key ? ghosts.geometry : empty;
  const box = list => list.filter(item => item.width !== undefined);

  return (
    <ViewportPortal>
      <svg
        data-testid="proposal-layer"
        width={1}
        height={1}
        className="pointer-events-none absolute left-0 top-0 overflow-visible"
        aria-hidden="true"
      >
        {ghost.lines
          .filter(line => added.has(line.id))
          .map(line => (
            <polyline
              key={line.id}
              data-proposed="add"
              data-id={line.id}
              points={points(line)}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={2}
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        {box(ghost.boxes)
          .filter(part => added.has(part.id))
          .map(part => (
            <g key={part.id}>
              <rect
                data-proposed="add"
                data-id={part.id}
                x={part.x}
                y={part.y}
                width={part.width}
                height={part.height}
                rx={9}
                fill="var(--accent-soft)"
                fillOpacity={0.6}
                stroke="var(--accent)"
                strokeWidth={2}
                strokeDasharray="6 4"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={part.x + 10}
                y={part.y + part.height / 2 + 5}
                fill="var(--accent)"
                fontSize={13}
                fontWeight={600}
              >
                {`+ ${part.name}`}
              </text>
            </g>
          ))}
        {now.lines
          .filter(line => removed.has(line.id))
          .map(line => (
            <polyline
              key={line.id}
              data-proposed="remove"
              data-id={line.id}
              points={points(line)}
              fill="none"
              stroke="var(--danger)"
              strokeWidth={3}
              strokeDasharray="4 4"
              strokeOpacity={0.8}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        {[...now.boxes, ...now.regions]
          .filter(part => removed.has(part.id))
          .map(part => (
            <rect
              key={part.id}
              data-proposed="remove"
              data-id={part.id}
              x={part.x - 3}
              y={part.y - 3}
              width={part.width + 6}
              height={part.height + 6}
              rx={10}
              fill="var(--canvas)"
              fillOpacity={0.55}
              stroke="var(--danger)"
              strokeWidth={2}
              strokeDasharray="5 4"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        {[...now.boxes, ...now.regions]
          .filter(part => changed.has(part.id))
          .map(part => (
            <g key={part.id} data-proposed="change" data-id={part.id}>
              <rect
                x={part.x - 4}
                y={part.y - 4}
                width={part.width + 8}
                height={part.height + 8}
                rx={11}
                fill="none"
                stroke="var(--warning)"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={part.x + part.width} cy={part.y} r={9} fill="var(--warning)" />
              <text
                x={part.x + part.width}
                y={part.y + 4}
                textAnchor="middle"
                fill="#fff"
                fontSize={13}
                fontWeight={700}
              >
                ~
              </text>
            </g>
          ))}
      </svg>
    </ViewportPortal>
  );
}
