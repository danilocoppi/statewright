import { ViewportPortal, useStore as useFlow } from "@xyflow/react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Icon } from "@/components/ui/Icon";
import { geometryOf } from "@/marks/payload";
import { useEditor } from "@/store/editor";

/**
 * A small lock on each box, region or arrow of the level shown that the person locked against the AI (collaboration
 * spec §8.2), at its top-left corner, constant in size at any zoom.
 * @param {{ canvasId: string }} props
 */
export function LocksLayer({ canvasId }) {
  const { t } = useTranslation("inspector");
  const doc = useEditor(state => state.doc);
  const zoom = useFlow(state => state.transform[2]);
  const targets = useMemo(() => new Set(Object.values(doc?.annotations?.locks ?? {}).map(lock => lock.target)), [doc]);
  const here = useMemo(() => {
    if (!targets.size || !doc?.canvases[canvasId]) return [];
    const { boxes, regions, lines } = geometryOf(doc, canvasId);
    return [
      ...[...boxes, ...regions].filter(box => targets.has(box.id)).map(box => ({ id: box.id, x: box.x, y: box.y })),
      ...lines
        .filter(line => targets.has(line.id))
        .map(line => {
          const [x, y] = line.points[Math.floor(line.points.length / 2)];
          return { id: line.id, x, y };
        })
    ];
  }, [targets, doc, canvasId]);
  if (!here.length) return null;
  return (
    <ViewportPortal>
      {here.map(({ id, x, y }) => (
        <div
          key={id}
          data-testid="lock-badge"
          data-target={id}
          title={t("lock.label")}
          className="pointer-events-none absolute"
          style={{ left: x, top: y, transform: `scale(${1 / zoom})`, transformOrigin: "0 0" }}
        >
          <span className="-translate-x-1/2 -translate-y-1/2 grid size-5 place-items-center rounded-full bg-ink text-surface shadow-island">
            <Icon name="lock" size={11} />
          </span>
        </div>
      ))}
    </ViewportPortal>
  );
}
