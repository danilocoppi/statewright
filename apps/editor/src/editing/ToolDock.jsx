import { Fragment, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Kbd } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { Island } from "@/components/ui/Island";
import { cn } from "@/lib/cn";
import { useEditor } from "@/store/editor";

import { TOOL_TYPE } from "./place";
import { editingStore, useEditing } from "./state";
import { toolsFor } from "./tools";

/**
 * The tool dock (spec §6.1, §7.1, mockups 07–08): the tools of the level's kind, each with its key. Click a tool,
 * then the canvas — or drag the tool onto it. Up and Down move along the dock.
 */
export function ToolDock() {
  const { t } = useTranslation("editor");
  const kind = useEditor(state => state.doc?.canvases[state.canvasId]?.kind);
  const current = useEditing(state => state.tool);
  const [tip, setTip] = useState(null);
  const buttons = useRef([]);
  if (!kind) return null;
  const tools = toolsFor(kind);

  const onKeyDown = (event, index) => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    buttons.current[(index + step + tools.length) % tools.length]?.focus();
  };

  return (
    <Island
      role="toolbar"
      aria-label={t("tools.dock")}
      data-testid="tools-dock"
      data-area="tools"
      aria-orientation="vertical"
      className="fixed left-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1 p-1"
    >
      {tools.map((tool, index) => (
        <Fragment key={tool.id}>
          {tool.id === "note" && <div className="mx-1.5 my-0.5 border-t border-hairline" />}
          <div className="relative">
            <button
              ref={element => (buttons.current[index] = element)}
              type="button"
              aria-label={t(`tools.${tool.id}`)}
              aria-pressed={current === tool.id}
              aria-keyshortcuts={tool.key}
              draggable={tool.id !== "select"}
              onDragStart={event => {
                event.dataTransfer.setData(TOOL_TYPE, tool.id);
                event.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => editingStore.getState().setTool(tool.id)}
              onKeyDown={event => onKeyDown(event, index)}
              onPointerEnter={() => setTip(tool.id)}
              onPointerLeave={() => setTip(null)}
              onFocus={() => setTip(tool.id)}
              onBlur={() => setTip(null)}
              className={cn(
                "grid size-8 place-items-center rounded-control text-sub hover:bg-subtle hover:text-ink",
                current === tool.id &&
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
              )}
            >
              <Icon name={tool.icon} />
            </button>
            {tip === tool.id && (
              <span
                role="tooltip"
                className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-control bg-primary py-1 pl-2 pr-1 text-ui font-medium text-primary-foreground shadow-island motion-safe:animate-[fade-in_120ms_ease-out]"
              >
                {t(`tools.${tool.id}`)}
                <Kbd className="border-primary-foreground/30 bg-transparent text-primary-foreground">{tool.key}</Kbd>
              </span>
            )}
          </div>
        </Fragment>
      ))}
    </Island>
  );
}
