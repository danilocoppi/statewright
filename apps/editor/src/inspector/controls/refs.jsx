import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TONES } from "statewright";

import { paint } from "@/canvas/palette";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { useEditor } from "@/store/editor";

import { pickCommands } from "../references";
import { useField } from "../useField";
import { AddPicker, Chips } from "./Picker";
import { MONO, useRefOptions, useWords } from "./refOptions";
import { Row } from "./Row";

/**
 * One catalog item (or a value the field also takes), chosen by name: shown by name; a click finds another or creates
 * it, the same completion as the trigger editor's; × leaves it out. Used alone (RefControl) and inside composite values
 * (a condition's guard, an effect's action), which build their value from the choice.
 * @param {{ field: { key: string, collections: string[], extra?: string, primitives?: boolean, required?: boolean },
 *   entry: object, value: unknown, label: string, readOnly: boolean, onChoose: (value: unknown) => void,
 *   onCreate: (collection: string, item: object) => void }} props `onChoose(undefined)`: × was pressed.
 */
export function RefPick({ field, entry, value, label, readOnly, onChoose, onCreate }) {
  const { t } = useTranslation("inspector");
  const [picking, setPicking] = useState(false);
  const words = useWords(field);
  const options = useRefOptions({ field, entry, choose: onChoose, create: onCreate });
  const shown = value !== undefined ? words(value) : null;
  if (picking) {
    return (
      <AddPicker
        open
        onOpenChange={setPicking}
        label={label}
        placeholder={t("refs.find")}
        mono={field.collections.includes("events")}
        options={options}
      />
    );
  }
  return (
    <div className="flex min-h-8 items-center gap-1">
      <button
        type="button"
        disabled={readOnly}
        aria-label={shown ? `${label}: ${shown.label}` : label}
        onClick={() => setPicking(true)}
        className={cn(
          "min-w-0 truncate rounded-[6px] py-1 text-left text-ui enabled:hover:-mx-1.5 enabled:hover:bg-subtle enabled:hover:px-1.5",
          shown ? "text-ink" : "text-muted",
          shown?.mono && "font-mono text-[12px]"
        )}
      >
        {shown ? shown.label : t("refs.choose")}
      </button>
      {shown && !field.required && !readOnly && (
        <button
          type="button"
          aria-label={t("refs.clear", { field: label })}
          onClick={() => onChoose(undefined)}
          className="grid size-6 shrink-0 place-items-center rounded-[6px] text-muted hover:bg-subtle hover:text-ink"
        >
          <Icon name="close" size={12} />
        </button>
      )}
    </div>
  );
}

/** One catalog item for a field of the element. */
export function RefControl({ id, field, value, layer, entry }) {
  const edit = useField(id, field);
  const doc = useEditor(state => state.doc);
  return (
    <Row label={edit.label} layer={layer} error={edit.error}>
      <RefPick
        field={field}
        entry={entry}
        value={value}
        label={edit.label}
        readOnly={edit.readOnly}
        onChoose={next => edit.change(next)}
        onCreate={(collection, item) => edit.run(pickCommands(doc, id, field.key, { collection, item }))}
      />
    </Row>
  );
}

/** A type: one of the format's built-in types (where the field takes them) or a type of the catalog. */
export function TypeControl(props) {
  return <RefControl {...props} field={{ ...props.field, collections: ["types"] }} />;
}

/**
 * A list of catalog items (events, statuses, emitted events) as chips — statuses in their tones, as their pills look on
 * the diagram — with "+ Add" that finds or creates one.
 */
export function RefsControl({ id, field, value, layer, entry }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const doc = useEditor(state => state.doc);
  const [collection] = field.collections;
  const list = value ?? [];
  const options = useRefOptions({
    field,
    entry,
    exclude: list,
    choose: next => edit.change([...list, next]),
    create: (from, item) =>
      edit.run(pickCommands(doc, id, field.key, { collection: from, item }, next => [...list, next]))
  });
  const toned = item => {
    const tone = TONES[item?.tone ?? "neutral"];
    return { background: paint(tone.fill), borderColor: paint(tone.color), color: paint(tone.color) };
  };
  const items = list.map(itemId => {
    const item = doc.catalog[collection][itemId];
    return {
      key: itemId,
      label: item?.name ?? itemId,
      mono: collection !== "statuses" ? MONO.includes(collection) : true,
      style: collection === "statuses" ? toned(item) : undefined
    };
  });
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      <div className="grid justify-items-start gap-1.5">
        <Chips
          items={items}
          removeLabel={name => t("refs.remove", { name })}
          onRemove={edit.readOnly ? undefined : key => edit.change(list.filter(item => item !== key))}
        />
        {!edit.readOnly && (
          <AddPicker
            label={t("refs.add", { kind: t(`kinds.catalog.${collection}`).toLowerCase() })}
            placeholder={t("refs.find")}
            mono={collection === "events"}
            options={options}
          />
        )}
      </div>
    </Row>
  );
}
