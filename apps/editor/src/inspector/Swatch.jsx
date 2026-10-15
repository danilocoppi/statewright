import { EDGE_STYLES, NODE_STYLES, NOTE_TONES, TONES } from "statewright";

import { paint } from "@/canvas/palette";

/**
 * A choice's look on the diagram, small (see swatches.js): a box in its fill and stroke, an arrow in its stroke and
 * dash, or a tone's colours. Painted with the canvas's own colours, so it follows the theme as the figure does.
 * @param {{ swatch: { node?: string, edge?: string, tone?: string } }} props
 */
export function Swatch({ swatch }) {
  if (swatch.node) {
    const style = NODE_STYLES[swatch.node];
    return (
      <span
        aria-hidden="true"
        className="inline-block h-[10px] w-[14px] shrink-0 rounded-[3px]"
        style={{
          background: paint(style.fill),
          border: `1.25px ${style.dash ? "dashed" : "solid"} ${paint(style.stroke)}`
        }}
      />
    );
  }
  if (swatch.edge) {
    const style = EDGE_STYLES[swatch.edge];
    return (
      <svg aria-hidden="true" width="16" height="10" viewBox="0 0 16 10" className="shrink-0">
        <line
          x1="1"
          y1="5"
          x2="15"
          y2="5"
          stroke={paint(style.stroke)}
          strokeWidth={style.width + 0.4}
          strokeDasharray={style.dash}
          strokeLinecap="round"
        />
      </svg>
    );
  }
  const tone = TONES[swatch.tone] ?? NOTE_TONES[swatch.tone];
  return (
    <span
      aria-hidden="true"
      className="inline-block size-[10px] shrink-0 rounded-full"
      style={{ background: paint(tone.fill), border: `1.25px solid ${paint(tone.color)}` }}
    />
  );
}
