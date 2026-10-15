import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { INSPECTOR, inspectorLimits } from "@/canvas/viewport";
import { cn } from "@/lib/cn";
import { inspectorWidthStore, useInspectorWidth, useWindowWidth } from "@/stores/inspector";

/** Widen or narrow the inspector. @param {number} width */
const setWidth = width => inspectorWidthStore.getState().setWidth(width);

/**
 * The inspector's left edge (spec §6.1): dragged left it widens the inspector, dragged right it narrows it, from
 * 340 px up to 720 px or 60 % of the window; a double click puts it back to 340 px. From the keyboard it is a
 * separator: ← and → move it 16 px, Home and End to its limits. A thin accent line shows it under the pointer, with
 * the focus and while it is dragged; while it is, nothing on the page is selected and the pointer stays a resize one.
 */
export function ResizeEdge() {
  const { t } = useTranslation("inspector");
  const width = useInspectorWidth();
  const { min, max } = inspectorLimits(useWindowWidth());
  // Where the drag started: the pointer's x and the width then.
  const drag = useRef(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) return;
    document.documentElement.classList.add("sw-resizing");
    return () => document.documentElement.classList.remove("sw-resizing");
  }, [dragging]);

  const stop = () => {
    drag.current = null;
    setDragging(false);
  };
  const keys = { ArrowLeft: width + INSPECTOR.step, ArrowRight: width - INSPECTOR.step, Home: min, End: max };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={t("resize")}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      data-dragging={dragging || undefined}
      onPointerDown={event => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        drag.current = { x: event.clientX, width };
        setDragging(true);
      }}
      onPointerMove={event => {
        if (drag.current) setWidth(drag.current.width + drag.current.x - event.clientX);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onDoubleClick={() => setWidth(INSPECTOR.width)}
      onKeyDown={event => {
        if (!(event.key in keys) || event.altKey || event.ctrlKey || event.metaKey) return;
        event.preventDefault();
        setWidth(keys[event.key]);
      }}
      className="group absolute inset-y-0 -left-[3px] w-1.5 cursor-col-resize touch-none outline-none"
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-3 left-0.5 w-0.5 rounded-full bg-accent opacity-0 motion-safe:transition-opacity motion-safe:duration-150",
          "group-hover:opacity-100 group-focus-visible:opacity-100 group-data-dragging:opacity-100"
        )}
      />
    </div>
  );
}
