import { useState } from "react";
import { useTranslation } from "react-i18next";
import { highlightLook } from "statewright";

import { paint } from "@/canvas/palette";
import { Icon } from "@/components/ui/Icon";
import { HighlightEditor } from "@/highlights/HighlightEditor";
import { useEditor } from "@/store/editor";

import { fieldCommands } from "../apply";
import { useField } from "../useField";
import { AddPicker } from "./Picker";
import { useRefOptions } from "./refOptions";
import { Row } from "./Row";

/** How a highlight's chip looks in the inspector: as its tag on the diagram. */
export function highlightChipStyle(highlight) {
  const look = highlightLook(highlight ?? {});
  return {
    background: paint(highlight?.fill === "tint" ? look.tint : "#FFFFFF"),
    borderColor: paint(look.stroke),
    color: paint(look.text)
  };
}

/**
 * A box's or an arrow's highlights (highlights spec §6): chips in their look, in order — the first gives the look, so
 * Alt+← and Alt+→ move one —, a click edits one, × takes it out; "Add highlight" finds one of the project's or makes a
 * new one, applied in the same change.
 */
export function HighlightsControl({ id, field, value, layer, entry }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const highlights = useEditor(state => state.doc.catalog.highlights);
  const [editor, setEditor] = useState(null);
  const list = value ?? [];
  const found = useRefOptions({
    field: { ...field, collections: ["highlights"] },
    entry,
    exclude: list,
    choose: next => edit.change([...list, next]),
    create: () => {}
  });
  const options = query => [
    ...found(query).filter(option => !option.create),
    {
      id: "new-highlight",
      label: t("highlights.new"),
      create: true,
      onPick: () => setEditor({ name: query.trim() })
    }
  ];
  const move = (key, by) => {
    const from = list.indexOf(key);
    const to = from + by;
    if (to < 0 || to >= list.length) return;
    const next = [...list];
    [next[from], next[to]] = [next[to], next[from]];
    edit.change(next);
  };
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      <div className="grid justify-items-start gap-1.5">
        {list.length ?
          <ul className="flex flex-wrap gap-1">
            {list.map(key => {
              const highlight = highlights[key];
              const name = highlight?.name ?? key;
              return (
                <li
                  key={key}
                  style={highlightChipStyle(highlight)}
                  className="inline-flex h-6 max-w-full items-center gap-0.5 rounded-[6px] border pl-2 text-[12px]"
                >
                  <button
                    type="button"
                    disabled={edit.readOnly || !highlight}
                    aria-label={t("highlights.move", { name })}
                    title={t("highlights.move", { name })}
                    onClick={() => setEditor({ id: key })}
                    onKeyDown={event => {
                      if (!event.altKey || edit.readOnly) return;
                      const by = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key];
                      if (!by) return;
                      event.preventDefault();
                      move(key, by);
                    }}
                    className="truncate rounded-[4px] font-medium"
                  >
                    {name}
                  </button>
                  {!edit.readOnly && (
                    <button
                      type="button"
                      aria-label={t("highlights.remove", { name })}
                      onClick={() => edit.change(list.filter(item => item !== key))}
                      className="grid size-5 shrink-0 place-items-center rounded-[5px] opacity-70 hover:opacity-100"
                    >
                      <Icon name="close" size={11} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        : <p className="py-1 text-ui text-muted">{t("refs.none")}</p>}
        {!edit.readOnly && <AddPicker label={t("highlights.add")} placeholder={t("refs.find")} options={options} />}
      </div>
      {editor && (
        <HighlightEditor
          open
          onClose={() => setEditor(null)}
          id={editor.id}
          name={editor.name}
          apply={(doc, highlightId) => fieldCommands(doc, id, field.key, [...list, highlightId])}
        />
      )}
    </Row>
  );
}
