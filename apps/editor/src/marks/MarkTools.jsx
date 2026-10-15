import { useTranslation } from "react-i18next";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

import { COLOURS, DRAWING, MARK_TOOLS, marksStore, useMarksState } from "./store";

/** Each tool's icon. */
const ICONS = { mark: "mark-ai", pencil: "pencil", rectangle: "rectangle", ellipse: "ellipse", eraser: "eraser" };
/** Each colour's swatch. */
const SWATCH = { red: "bg-danger", amber: "bg-warning", green: "bg-success", neutral: "bg-ink" };

/**
 * The marking tools at the conversation bar's left (collaboration spec §5.1): Mark for the AI, Pencil, Rectangle,
 * Ellipse, Eraser — one in hand at a time, a second click puts it down; Shift+click on the eraser erases everything.
 * While a drawing tool is in hand, the colours and what each means.
 */
export function MarkTools() {
  const { t } = useTranslation("agent");
  const tool = useMarksState(state => state.tool);
  const colour = useMarksState(state => state.colour);
  return (
    <div className="flex shrink-0 items-center gap-1">
      <div role="toolbar" aria-label={t("marks.tools")} className="flex items-center gap-0.5">
        {MARK_TOOLS.map(name => (
          <button
            key={name}
            type="button"
            data-testid="conversation-tool"
            data-tool={name}
            aria-pressed={tool === name}
            aria-label={t(`marks.${name}`)}
            title={t(`marks.${name}`)}
            onClick={event => {
              const marks = marksStore.getState();
              if (name === "eraser" && event.shiftKey) return marks.clear();
              marks.setTool(tool === name ? null : name);
            }}
            className={cn(
              "grid size-8 place-items-center rounded-control text-sub transition-colors duration-150 hover:bg-subtle hover:text-ink",
              tool === name && "bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent"
            )}
          >
            <Icon name={ICONS[name]} />
          </button>
        ))}
      </div>
      {DRAWING.has(tool) && (
        <div
          role="radiogroup"
          aria-label={t("marks.colour")}
          data-testid="marks-colour"
          className="flex items-center gap-1 border-l border-hairline pl-1.5"
        >
          {COLOURS.map(name => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={colour === name}
              aria-label={t(`marks.colours.${name}`)}
              title={t(`marks.colours.${name}`)}
              onClick={() => marksStore.getState().setColour(name)}
              className={cn(
                "grid size-6 place-items-center rounded-full",
                colour === name && "ring-2 ring-accent ring-offset-1 ring-offset-surface"
              )}
            >
              <span className={cn("size-3.5 rounded-full", SWATCH[name])} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
