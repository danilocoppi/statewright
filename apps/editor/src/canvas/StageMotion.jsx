import { ViewportPortal } from "@xyflow/react";
import { useEffect, useRef } from "react";

import { prefersReducedMotion } from "./useLevelView";

/** How the ring and the pulse move: they set off and arrive gently, together, by four fifths of the edge's turn. */
const TRAVEL = { easing: "cubic-bezier(0.4, 0, 0.2, 1)", arrives: 0.8 };

/** The box a ring around a part takes, in the level's coordinates (the selection ring's: 3 px out). */
const ringOf = part => ({
  transform: `translate(${part.x - 3}px, ${part.y - 3}px)`,
  width: `${part.w + 6}px`,
  height: `${part.h + 6}px`
});

/** A ring that moves from one box to another while the edge between them pulses. */
function Travel({ from, to, at, each }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.animate?.(
      [
        { ...ringOf(from), opacity: 1, easing: TRAVEL.easing },
        { ...ringOf(to), opacity: 1, offset: TRAVEL.arrives },
        { ...ringOf(to), opacity: 0 }
      ],
      { duration: each, delay: at }
    );
  }, [from, to, at, each]);
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className="sw-travel pointer-events-none absolute left-0 top-0 rounded-[10px] border-2 border-accent opacity-0"
    />
  );
}

/**
 * The stage's motion on a level (simulator spec §7.1: "every fired edge pulses along its path (about 600 ms) while the
 * ring moves from source to target"): for each edge the step played took from one box to another, a ring that
 * travels between them. Nothing moves with reduced motion: the marks cross-fade.
 * @param {{ level: { nodes: object[], edges: object[] }, marks: import("@/simulate/marks").Marks | null,
 *   play: number }} props `play`: the point played, so each step moves afresh.
 */
export function StageMotion({ level, marks, play }) {
  if (!marks || prefersReducedMotion()) return null;
  const parts = new Map(level.nodes.map(node => [node.id, node.data.part]));
  const travels = level.edges.flatMap(edge => {
    const fired = marks.edges.get(edge.id)?.fired;
    const [from, to] = [parts.get(edge.source), parts.get(edge.target)];
    if (!fired?.each || !from || !to || from === to || marks.nodes.get(edge.source)?.kind !== "left") return [];
    return [{ id: edge.id, from, to, ...fired }];
  });
  return (
    <ViewportPortal>
      {travels.map(travel => (
        <Travel key={`${play}:${travel.id}`} {...travel} />
      ))}
    </ViewportPortal>
  );
}
