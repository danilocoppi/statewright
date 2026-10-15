import { buildIndex } from "statewright";
import { useTranslation } from "react-i18next";

import { editorStore } from "@/store/editor";

import { renameCommands } from "./changes";
import { NameEditor } from "./NameEditor";
import { change, editingStore } from "./state";

/** Give the focus back to a box of the canvas once its name is no longer being typed. */
const focusBox = id => document.querySelector(`.react-flow__node[data-id="${id}"]`)?.focus();

/**
 * Renaming a box, or rewriting a note, where it is drawn (spec §7.3: F2, a double-click, or the canvas menu): the
 * field covers the box in the box's own type; the new name is one undoable change.
 * @param {{ part: { id: string, x: number, y: number, w: number }, note?: boolean }} props
 */
export function Rename({ part, note = false }) {
  const { t } = useTranslation("editor");
  const { doc } = editorStore.getState();
  const entry = buildIndex(doc).get(part.id);
  const value = (note ? entry?.value.text : entry?.value.name) ?? "";
  const close = () => {
    editingStore.getState().close();
    focusBox(part.id);
  };
  return (
    <div
      className={
        note ?
          "absolute inset-0 rounded-[6px] border-[1.5px] border-accent bg-surface p-2"
        : "absolute inset-0 flex items-center rounded-[10px] border-[1.5px] border-accent bg-surface px-3"
      }
    >
      <NameEditor
        value={value}
        multiline={note}
        label={note ? t("editing.noteText") : t("editing.name")}
        className={note ? "h-full text-[11px] leading-[15px]" : "text-center text-[12px] font-semibold"}
        onCancel={close}
        onCommit={text => {
          const { doc: current } = editorStore.getState();
          change(renameCommands(current, part.id, text), {
            label: t("editing.rename"),
            at: { x: part.x + part.w / 2, y: part.y }
          });
          close();
        }}
      />
    </div>
  );
}
