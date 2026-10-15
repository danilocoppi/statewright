/** Path data of a polyline. */
const pathOf = points => points.map(([x, y], index) => `${index ? "L" : "M"} ${x} ${y}`).join(" ");

/**
 * A role's connector (mixed levels spec §3, §7): Core's line, dot and words (markup made by Core, safe to insert), a
 * wider invisible path that takes the pointer, and the selection halo. Selected, Delete clears what it stands for.
 */
export function AssociationEdge({ data, selected }) {
  const { part } = data;
  const d = pathOf(part.points);
  return (
    <>
      {selected && <path d={d} fill="none" className="sw-edge-halo stroke-accent" strokeWidth={6} />}
      <g dangerouslySetInnerHTML={{ __html: part.svg }} />
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        className="react-flow__edge-interaction"
        data-testid="canvas-association"
        data-role={part.role}
      />
    </>
  );
}
