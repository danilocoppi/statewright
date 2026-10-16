import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Icon } from "@/components/ui/Icon";
import { highlightChipStyle } from "@/inspector/controls/highlights";
import { AddPicker } from "@/inspector/controls/Picker";
import { findItems } from "@/inspector/references";
import { editorStore, useEditor } from "@/store/editor";

import { addHighlightCommands, carriedBy, drawnAmong, removeHighlightCommands } from "./apply";
import { HighlightEditor } from "./HighlightEditor";

/**
 * The highlights of several selected boxes and arrows (highlights spec §6): each one any of them carries, with how
 * many; × takes it off all of them, "Add highlight" puts one on all of them — each one change.
 * @param {{ selection: string[] }} props
 */
export function SeveralHighlights({ selection }) {
  const { t } = useTranslation("inspector");
  const doc = useEditor(state => state.doc);
  const readOnly = useEditor(state => state.readOnly);
  const [making, setMaking] = useState(null);
  const drawn = drawnAmong(doc, selection);
  if (!drawn.length) return null;
  const carried = carriedBy(doc, drawn);
  const run = (commands, label) => {
    if (commands.length) editorStore.getState().dispatch(commands, { label });
  };
  const options = query => [
    ...findItems(doc, ["highlights"], query)
      .filter(item => carried.find(entry => entry.id === item.id)?.count !== drawn.length)
      .map(item => ({
        id: item.id,
        label: item.name,
        onPick: () =>
          run(
            addHighlightCommands(editorStore.getState().doc, drawn, item.id),
            t("palette.commands.applyHighlight", { name: item.name })
          )
      })),
    { id: "new-highlight", label: t("highlights.new"), create: true, onPick: () => setMaking(query.trim()) }
  ];
  return (
    <div role="group" aria-label={t("fields.highlights")} className="mt-4 grid gap-1.5">
      <h3 className="text-label text-sub">{t("fields.highlights")}</h3>
      {carried.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {carried.map(({ id, count }) => {
            const highlight = doc.catalog.highlights[id];
            return (
              <li
                key={id}
                style={highlightChipStyle(highlight)}
                className="inline-flex h-6 items-center gap-1 rounded-[6px] border pl-2 text-[12px]"
              >
                <span className="font-medium">{highlight.name}</span>
                <span className="opacity-70">{t("highlights.count", { count, total: drawn.length })}</span>
                {!readOnly && (
                  <button
                    type="button"
                    aria-label={t("highlights.remove", { name: highlight.name })}
                    onClick={() =>
                      run(
                        removeHighlightCommands(editorStore.getState().doc, drawn, id),
                        t("palette.commands.removeHighlight", { name: highlight.name })
                      )
                    }
                    className="grid size-5 shrink-0 place-items-center rounded-[5px] opacity-70 hover:opacity-100"
                  >
                    <Icon name="close" size={11} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {!readOnly && <AddPicker label={t("highlights.add")} placeholder={t("refs.find")} options={options} />}
      {making !== null && (
        <HighlightEditor
          open
          onClose={() => setMaking(null)}
          name={making}
          apply={(current, highlightId) => addHighlightCommands(current, drawn, highlightId)}
        />
      )}
    </div>
  );
}
