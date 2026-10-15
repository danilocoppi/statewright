import { use } from "react";

import { useProblems } from "@/problems/store";
import { useSimulation } from "@/simulate/store";

import { MarkActions } from "./marks";
import { MARKER_PREFIX } from "./project";
import { useMarker } from "./useMarker";

/** Path data of a polyline. */
const pathOf = points => points.map(([x, y], index) => `${index ? "L" : "M"} ${x} ${y}`).join(" ");

/** Where an edge's marker sits: on its label, or at the start of its middle segment. */
function markerAt(part, label) {
  if (label) return [label.x + label.w, label.y];
  const [x1, y1] = part.points[Math.floor((part.points.length - 1) / 2)];
  const [x2, y2] = part.points[Math.floor((part.points.length - 1) / 2) + 1];
  return [(x1 + x2) / 2, (y1 + y2) / 2];
}

const TONE = { error: "fill-danger", warning: "fill-warning", incomplete: "fill-muted" };

/** The dashes Core draws an edge with (a timer's dots, a failure's dashes): the run's colour keeps them. */
const dashOf = svg => /stroke-dasharray="([^"]+)"/.exec(svg)?.[1];

/** The length of a polyline. */
const lengthOf = points =>
  points.slice(1).reduce((sum, [x, y], index) => sum + Math.hypot(x - points[index][0], y - points[index][1]), 0);

/**
 * An edge the step on the stage took (simulator spec §7.1, mockup 05): its route in the run's colour, keeping Core's
 * dashes, and its label as a pill in that colour; when the step plays, a pulse runs along it in its turn.
 */
function FiredMark({ mark, d, part, label }) {
  const { at, each } = mark.fired;
  const length = lengthOf(part.points);
  const delay = { animationDelay: `${at}ms` };
  return (
    <g className="sw-fired sw-appear" style={delay} pointerEvents="none">
      <path
        d={d}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.6}
        strokeDasharray={dashOf(part.svg)}
        markerEnd={`url(#${MARKER_PREFIX}-run)`}
      />
      {each > 0 && (
        <path
          d={d}
          className="sw-pulse"
          strokeDasharray={`28 ${length + 28}`}
          style={{ "--len": `${length}px`, animationDelay: `${at}ms`, animationDuration: `${each}ms` }}
        />
      )}
      {label && (
        <>
          <rect
            x={label.x - 6}
            y={label.y - 3}
            width={label.w + 12}
            height={label.h + 6}
            rx={(label.h + 6) / 2}
            className="fill-accent"
          />
          <text
            x={label.x + label.w / 2}
            y={label.y + label.h / 2 + 3.5}
            textAnchor="middle"
            fontSize="10"
            fontWeight="500"
            fontFamily="'Geist Mono','SF Mono','Fira Code',Consolas,monospace"
            className="fill-surface"
          >
            {part.label}
          </text>
        </>
      )}
    </g>
  );
}

/**
 * An edge that can fire now (simulator spec §6.3): its route in the run's colour, its label as a pill that takes its
 * move — numbered when a question chooses between it and others, then the pill answers the question.
 */
function EdgeMark({ id, mark, d, part, label }) {
  const actions = use(MarkActions);
  const badge = mark.number ? 18 : 0;
  // The pill sits on the label, or on the middle of the route when the edge has none.
  const [cx, cy] = markerAt(part, null);
  const box =
    label ?
      { x: label.x - 6 - badge, y: label.y - 3, w: label.w + 12 + badge, h: label.h + 6 }
    : { x: cx - 10 - badge / 2, y: cy - 9, w: 20 + badge / 2, h: 18 };
  return (
    <>
      <path
        d={d}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.6}
        strokeDasharray={dashOf(part.svg)}
        markerEnd={`url(#${MARKER_PREFIX}-run)`}
        pointerEvents="none"
      />
      <g
        className="sw-pill"
        pointerEvents="all"
        onClick={event => {
          event.stopPropagation();
          actions.edge(id, mark);
        }}
      >
        <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={box.h / 2} className="fill-surface stroke-accent" />
        {mark.number && (
          <>
            <circle cx={box.x + 9 + 1} cy={box.y + box.h / 2} r={7} className="fill-accent" />
            <text
              x={box.x + 10}
              y={box.y + box.h / 2 + 3.4}
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="600"
              fontFamily="var(--font-mono)"
              className="fill-surface"
            >
              {mark.number}
            </text>
          </>
        )}
        {label ?
          <text
            x={box.x + badge + (box.w - badge) / 2}
            y={label.y + label.h / 2 + 3.5}
            textAnchor="middle"
            fontSize="10"
            fontFamily="'Geist Mono','SF Mono','Fira Code',Consolas,monospace"
            className="fill-accent"
          >
            {part.label}
          </text>
        : !mark.number && (
            <path
              d={`M ${cx - 2.5} ${cy - 3.5} L ${cx + 3} ${cy} L ${cx - 2.5} ${cy + 3.5} Z`}
              className="fill-accent"
            />
          )
        }
      </g>
    </>
  );
}

/** While a box it touches is being dragged: a plain stepped line between React Flow's ends, until Core routes it. */
function Preview({ sourceX, sourceY, targetX, targetY }) {
  const middle = (sourceX + targetX) / 2;
  const d = `M ${sourceX} ${sourceY} H ${middle} V ${targetY} H ${targetX}`;
  return <path d={d} fill="none" strokeWidth={1.4} className="sw-preview-edge" />;
}

/**
 * An edge of the figure: Core's route, arrowhead and label (markup made by Core, safe to insert), a wider invisible
 * path that takes the pointer, the selection halo and the Problems marker. React Flow's own endpoints are used only
 * while an end is being dragged: the route is Core's.
 */
export function FigureEdge({ data, selected, sourceX, sourceY, targetX, targetY }) {
  const { part, label } = data;
  const marker = useMarker(part.id);
  const running = useSimulation(state => state.mode === "run");
  const severity = running ? null : marker;
  const highlighted = useProblems(state => state.highlight === part.id);
  if (data.moving) return <Preview sourceX={sourceX} sourceY={sourceY} targetX={targetX} targetY={targetY} />;
  const d = pathOf(part.points);
  const [x, y] = markerAt(part, label);
  return (
    <>
      {(selected || highlighted) && <path d={d} fill="none" className="sw-edge-halo stroke-accent" strokeWidth={6} />}
      <g dangerouslySetInnerHTML={{ __html: part.svg + (label?.svg ?? "") }} />
      <path d={d} fill="none" stroke="transparent" strokeWidth={14} className="react-flow__edge-interaction" />
      {data.mark?.fired && <FiredMark mark={data.mark} d={d} part={part} label={label} />}
      {data.mark && !data.mark.fired && <EdgeMark id={part.id} mark={data.mark} d={d} part={part} label={label} />}
      {severity && (
        <g aria-hidden="true" data-severity={severity} transform={`translate(${x} ${y})`}>
          <circle r="8" className="fill-canvas" />
          <circle r="6.5" className={TONE[severity]} />
          <text
            y="3.2"
            textAnchor="middle"
            fontSize="9"
            fontWeight="600"
            fontFamily="var(--font-mono)"
            className="fill-canvas"
          >
            {severity === "incomplete" ? "i" : "!"}
          </text>
        </g>
      )}
    </>
  );
}
