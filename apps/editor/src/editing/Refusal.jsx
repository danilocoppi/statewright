import { useViewport } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { refusalKey } from "./refusals";
import { editingStore, useEditing } from "./state";
import { useAbovePoint } from "./useInside";

/** How long a refusal stays unless the person reads more. */
export const REFUSAL_MS = 6000;

/**
 * A refused gesture, said in plain words where it happened (spec §10), with Core's own message under "More". It goes
 * at the next click elsewhere, or after a few seconds unless "More" is open.
 */
export function Refusal() {
  const refusal = useEditing(state => state.refusal);
  return refusal && <Callout key={refusal.id} refusal={refusal} />;
}

function Callout({ refusal }) {
  const { t } = useTranslation("editor");
  const { x, y, zoom } = useViewport();
  const [more, setMore] = useState(false);
  const ref = useRef(null);
  // Above the gesture, or below it near the top of the canvas; never past an edge.
  useAbovePoint(ref);

  useEffect(() => {
    const dismiss = () => editingStore.getState().dismiss();
    const onPointerDown = event => !ref.current?.contains(event.target) && dismiss();
    document.addEventListener("pointerdown", onPointerDown, true);
    const timer = more ? null : setTimeout(dismiss, REFUSAL_MS);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      clearTimeout(timer);
    };
  }, [more]);

  return (
    <div
      ref={ref}
      role="alert"
      style={{ left: refusal.at.x * zoom + x, top: refusal.at.y * zoom + y }}
      className="absolute z-30 w-max max-w-[300px] -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-control data-[side=below]:translate-y-[14px] border border-island-border bg-island px-3 py-2 text-ui text-ink shadow-island backdrop-blur-md motion-safe:animate-[fade-in_160ms_ease-out]"
    >
      <p className="flex items-baseline gap-2">
        <span aria-hidden="true" className="size-1.5 shrink-0 translate-y-[-1px] rounded-full bg-danger" />
        <span>{t(refusalKey(refusal.reason))}</span>
      </p>
      {refusal.message && (
        <>
          <button
            type="button"
            aria-expanded={more}
            onClick={() => setMore(open => !open)}
            className="ml-3.5 mt-1 text-label font-medium text-accent hover:underline"
          >
            {more ? t("refusals.less") : t("refusals.more")}
          </button>
          {more && (
            <p lang="en" className="ml-3.5 mt-1 break-words font-mono text-[11px] text-sub">
              {refusal.message}
            </p>
          )}
        </>
      )}
    </div>
  );
}
