import { useViewport } from "@xyflow/react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/cn";
import { useEditor } from "@/store/editor";

import { ghostSize } from "./place";
import { useEditing } from "./state";

const ROUND = new Set(["initial", "history", "end"]);

/**
 * Where the tool in hand will place its element (the landing ghost): a dashed outline of its box under the pointer,
 * before anything is added.
 * @param {{ tool: import("./tools").Tool }} props
 */
export function Ghost({ tool }) {
  const { t } = useTranslation("editor");
  const doc = useEditor(state => state.doc);
  const canvasId = useEditor(state => state.canvasId);
  const pointer = useEditing(state => state.pointer);
  const { x, y, zoom } = useViewport();
  const name = tool.named ? t(`tools.defaults.${tool.id}`) : undefined;
  const size = useMemo(() => ghostSize(doc, canvasId, tool, name), [doc, canvasId, tool, name]);
  if (!pointer) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        left: (pointer.x - size.w / 2) * zoom + x,
        top: (pointer.y - size.h / 2) * zoom + y,
        width: size.w * zoom,
        height: size.h * zoom
      }}
      className={cn(
        "sw-ghost pointer-events-none absolute z-20 border-[1.5px] border-dashed border-accent",
        ROUND.has(tool.node?.kind) ? "rounded-full" : "rounded-[10px]"
      )}
    />
  );
}
