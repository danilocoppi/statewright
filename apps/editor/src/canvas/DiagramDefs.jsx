import { useMemo } from "react";
import { EDGE_STYLES, edgeMarkers } from "statewright";

import { useEditor } from "@/store/editor";

import { diagramStyles, highlightMarkers, highlightStyles, paint } from "./palette";
import { MARKER_PREFIX } from "./project";

const STYLES = diagramStyles();
const MARKERS = edgeMarkers(Object.keys(EDGE_STYLES), { idPrefix: MARKER_PREFIX, paint });
/** The arrowhead of an edge the run can take now (simulator spec §6.3), in the run's colour; as Core's are. */
const RUN_MARKER = `<marker id="${MARKER_PREFIX}-run" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto" markerUnits="userSpaceOnUse"><polygon points="0 0, 9 3.5, 0 7" fill="var(--accent)"/></marker>`;

/**
 * What every drawn part refers to: the diagram's colour variables (light and dark) and the arrowheads of each edge
 * style. Rendered once, beside the canvas.
 */
export function DiagramDefs() {
  // The open document's highlights: their hex colours and their arrowheads (highlights spec §4).
  const highlights = useEditor(state => state.doc?.catalog?.highlights);
  const { styles, markers } = useMemo(() => {
    const doc = { catalog: { highlights } };
    return {
      styles: highlightStyles(doc),
      markers: edgeMarkers(highlightMarkers(doc), { idPrefix: MARKER_PREFIX, paint })
    };
  }, [highlights]);
  return (
    <>
      <style>{STYLES + styles}</style>
      <svg aria-hidden="true" className="absolute size-0">
        <defs dangerouslySetInnerHTML={{ __html: MARKERS + markers + RUN_MARKER }} />
      </svg>
    </>
  );
}
