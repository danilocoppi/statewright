import { paint } from "./palette";
import { MARKER_PREFIX } from "./project";

const markerOf = key => `url(#${MARKER_PREFIX}-m-${key.replace(/\./g, "-")})`;

/** A node style's look, small: a box in its fill, stroke and dash, painted with the theme's diagram colours. */
export function NodeSwatch({ fill, stroke, dash, width }) {
  return (
    <svg aria-hidden="true" width="28" height="14" viewBox="0 0 28 14" className="shrink-0 overflow-visible">
      <rect
        x="5"
        y="0.5"
        width="18"
        height="13"
        rx="3"
        fill={paint(fill)}
        stroke={paint(stroke)}
        strokeWidth={width}
        strokeDasharray={dash}
      />
    </svg>
  );
}

/**
 * An edge style's look, small: a line in its stroke, width and dash, ending in the style's arrowhead (the markers
 * `DiagramDefs` defines).
 */
export function EdgeSwatch({ styleKey, stroke, width, dash }) {
  return (
    <svg aria-hidden="true" width="28" height="14" viewBox="0 0 28 14" className="shrink-0 overflow-visible">
      <line
        x1="0"
        y1="7"
        x2="24"
        y2="7"
        stroke={paint(stroke)}
        strokeWidth={width}
        strokeDasharray={dash}
        markerEnd={markerOf(styleKey)}
      />
    </svg>
  );
}
