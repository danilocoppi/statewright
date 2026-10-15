import { Fragment, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Kbd } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { Island } from "@/components/ui/Island";
import { cn } from "@/lib/cn";
import { useEditor } from "@/store/editor";

import { LevelKind } from "./LevelKind";
import { TOOL_TYPE } from "./place";
import { editingStore, useEditing } from "./state";
import { DOCK_TABS, toolsFor } from "./tools";

/** A tooltip beside the dock: the tool's name and, when it has one, its key. */
function Tip({ text, shortcut }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-control bg-primary py-1 pl-2 pr-1 text-ui font-medium text-primary-foreground shadow-island motion-safe:animate-[fade-in_120ms_ease-out]"
    >
      {text}
      {shortcut ?
        <Kbd className="border-primary-foreground/30 bg-transparent text-primary-foreground">{shortcut}</Kbd>
      : <span className="w-1" />}
    </span>
  );
}

/**
 * The tool dock (spec §6.1, §7.1, mockups 07–08; mixed levels spec §6): three tabs, one per kind of element — the
 * level's own selected when it opens, and marked — then the tools of the tab, each with its key, and under them the
 * level's kind, which leads to a level of another kind. The other kinds' tabs hold guests: elements of that kind drawn
 * here in a role. Click a tool, then the canvas — or drag the tool onto it. Up and Down move along the dock; 1, 2 and
 * 3 pick a tab.
 */
export function ToolDock() {
  const { t } = useTranslation("editor");
  const kind = useEditor(state => state.doc?.canvases[state.canvasId]?.kind);
  const current = useEditing(state => state.tool);
  const chosen = useEditing(state => state.tab);
  const [tip, setTip] = useState(null);
  const buttons = useRef([]);
  if (!kind) return null;
  const tab = chosen ?? kind;
  const tools = toolsFor(kind, tab);

  // The tabs, the tools, then the level's kind.
  const first = DOCK_TABS.length;
  const count = first + tools.length + 1;
  const onKeyDown = (event, index) => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    buttons.current[(index + step + count) % count]?.focus();
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
      <div role="tablist" aria-label={t("tools.tabs.label")} aria-orientation="vertical" className="grid gap-0.5">
        {DOCK_TABS.map((item, index) => (
          <div key={item} className="relative">
            <button
              ref={element => (buttons.current[index] = element)}
              type="button"
              role="tab"
              data-testid="tools-tab"
              data-kind={item}
              aria-selected={tab === item}
              aria-label={t(`tools.tabs.${item}`)}
              aria-keyshortcuts={String(index + 1)}
              onClick={() => editingStore.getState().setTab(item)}
              onKeyDown={event => onKeyDown(event, index)}
              onPointerEnter={() => setTip(`tab-${item}`)}
              onPointerLeave={() => setTip(null)}
              onFocus={() => setTip(`tab-${item}`)}
              onBlur={() => setTip(null)}
              className={cn(
                "relative grid h-6 w-8 place-items-center rounded-[6px] text-muted hover:bg-subtle hover:text-ink",
                tab === item && "bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent"
              )}
            >
              <Icon name={item} size={14} />
              {item === kind && (
                <span aria-hidden="true" className="absolute right-0.5 top-0.5 size-1 rounded-full bg-accent" />
              )}
            </button>
            {tip === `tab-${item}` && (
              <Tip
                text={item === kind ? t("tools.tabs.own", { kind: t(`tools.tabs.${item}`) }) : t(`tools.tabs.${item}`)}
                shortcut={String(index + 1)}
              />
            )}
          </div>
        ))}
      </div>
      <div className="mx-1.5 my-0.5 border-t border-hairline" />
      {tools.map((tool, index) => (
        <Fragment key={tool.id}>
          {tool.id === "note" && <div className="mx-1.5 my-0.5 border-t border-hairline" />}
          <div className="relative">
            <button
              ref={element => (buttons.current[first + index] = element)}
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
              onKeyDown={event => onKeyDown(event, first + index)}
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
            {tip === tool.id && <Tip text={t(`tools.${tool.id}`)} shortcut={tool.key} />}
          </div>
        </Fragment>
      ))}
      <div className="mx-1.5 my-0.5 border-t border-hairline" />
      <LevelKind
        kind={kind}
        buttonRef={element => (buttons.current[first + tools.length] = element)}
        onKeyDown={event => onKeyDown(event, first + tools.length)}
        tip={tip === "kind"}
        onTip={shown => setTip(shown ? "kind" : null)}
      />
    </Island>
  );
}
