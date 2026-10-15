/** The connection being dragged from a box (spec §7.2, mockup 07): a dashed accent line with its arrowhead. */
export function ConnectionLine({ fromX, fromY, toX, toY }) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const point = (length, turn) => [toX - length * Math.cos(angle + turn), toY - length * Math.sin(angle + turn)];
  const head = [point(0, 0), point(9, 0.42), point(9, -0.42)].map(pair => pair.join(",")).join(" ");
  return (
    <g>
      <path d={`M ${fromX} ${fromY} L ${toX} ${toY}`} fill="none" strokeWidth={1.5} className="sw-connection" />
      <polygon points={head} className="fill-accent" />
    </g>
  );
}
