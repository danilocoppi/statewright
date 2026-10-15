import { useState } from "react";
import { useTranslation } from "react-i18next";

import { IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { relayout } from "@/editing/actions";
import { editorStore, useEditor } from "@/store/editor";

/**
 * Undo, redo and Auto-layout in the actions island (spec §6.1, §8.2, mockup 07): each says what it will undo or redo;
 * Auto-layout lays the level out again as one undoable change.
 * @param {{ mac: boolean }} props
 */
export function EditActions({ mac }) {
  const { t } = useTranslation(["editor", "agent"]);
  // An agent's change says so (AI interface spec §7.3).
  const labelOf = entry =>
    entry && (entry.origin === "ai" ? t("agent:change.change", { label: entry.label }) : entry.label);
  const undoing = useEditor(state => labelOf(state.history.past.at(-1)));
  const redoing = useEditor(state => labelOf(state.history.future[0]));
  const [arranging, setArranging] = useState(false);
  const key = letter => (mac ? `⌘${letter}` : `Ctrl+${letter}`);

  const arrange = async () => {
    setArranging(true);
    try {
      await relayout(t);
    } finally {
      setArranging(false);
    }
  };

  return (
    <>
      <IconButton
        data-testid="actions-undo"
        label={undoing ? t("history.undo", { label: undoing, key: key("Z") }) : t("history.nothingToUndo")}
        disabled={!undoing}
        onClick={() => editorStore.getState().undo()}
      >
        <Icon name="undo" />
      </IconButton>
      <IconButton
        data-testid="actions-redo"
        label={
          redoing ? t("history.redo", { label: redoing, key: mac ? "⇧⌘Z" : "Ctrl+Y" }) : t("history.nothingToRedo")
        }
        disabled={!redoing}
        onClick={() => editorStore.getState().redo()}
      >
        <Icon name="redo" />
      </IconButton>
      <button
        type="button"
        data-testid="actions-layout"
        aria-busy={arranging}
        disabled={arranging}
        title={t("history.relayoutHint")}
        onClick={arrange}
        className="h-8 whitespace-nowrap rounded-control px-2.5 text-ui text-ink hover:bg-subtle disabled:text-muted"
      >
        {arranging ? t("history.arranging") : t("history.relayout")}
      </button>
    </>
  );
}
