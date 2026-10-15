import { useState } from "react";
import { useTranslation } from "react-i18next";
import { typeSchema } from "statewright";

import { IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useCopy } from "@/lib/useCopy";
import { useEditor } from "@/store/editor";

import { pickCommands } from "../references";
import { useField } from "../useField";
import { JsonArea } from "./json";
import { INPUT, TextPart } from "./parts";
import { RefPick } from "./refs";
import { Row } from "./Row";

/** A small icon button of a row. */
function RowButton({ label, icon, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-6 shrink-0 place-items-center rounded-[6px] text-muted hover:bg-subtle hover:text-ink"
    >
      <Icon name={icon} size={12} />
    </button>
  );
}

/** A yes-or-no part of a row (a field required, a list). */
function Check({ label, checked, readOnly, onChange }) {
  return (
    <label className="inline-flex shrink-0 items-center gap-1 text-[11.5px] text-sub">
      <input
        type="checkbox"
        checked={checked}
        disabled={readOnly}
        onChange={event => onChange(event.target.checked)}
        className="size-3.5 accent-[var(--accent)]"
      />
      {label}
    </label>
  );
}

/** A name typed in a row: applied when it is left, kept when it would be empty. */
function NamePart({ label, value, readOnly, onCommit }) {
  const [draft, setDraft] = useState(null);
  return (
    <input
      aria-label={label}
      value={draft ?? value}
      disabled={readOnly}
      onFocus={() => setDraft(value)}
      onChange={event => setDraft(event.target.value)}
      onBlur={() => {
        if (draft?.trim() && draft.trim() !== value) onCommit(draft.trim());
        setDraft(null);
      }}
      onKeyDown={event => event.key === "Enter" && event.currentTarget.blur()}
      className={`${INPUT} h-7 font-mono text-[12px]`}
    />
  );
}

/**
 * An object type's fields (spec §7.5, mockup 10): a row each — its name, its type (a built-in type or one of the
 * catalog, found or created), required, a list — with its description under it; moved up, taken out, added.
 */
export function TypeFieldsControl({ id, field, value, layer, entry }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const doc = useEditor(state => state.doc);
  const list = value ?? [];
  const set = next => edit.change(next.length ? next : undefined);
  const replace = (index, change) => set(list.map((item, at) => (at === index ? { ...item, ...change } : item)));
  const tidy = item =>
    Object.fromEntries(Object.entries(item).filter(([, part]) => part !== undefined && part !== false && part !== ""));
  const add = () => {
    const taken = new Set(list.map(item => item.name));
    let number = list.length + 1;
    while (taken.has(`field${number}`)) number += 1;
    set([...list, { name: `field${number}`, type: "string" }]);
  };
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      <ol className="grid gap-2">
        {list.map((item, index) => (
          <li key={index} className="grid gap-1 border-l-2 border-hairline pl-3">
            <div className="flex items-center gap-2">
              <div className="w-[34%] min-w-0">
                <NamePart
                  label={t("types.fieldName")}
                  value={item.name}
                  readOnly={edit.readOnly}
                  onCommit={name => replace(index, { name })}
                />
              </div>
              <div className="min-w-0 flex-1">
                <RefPick
                  field={{ key: "fields", collections: ["types"], primitives: true, required: true }}
                  entry={entry}
                  value={item.type}
                  label={t("types.fieldType", { name: item.name })}
                  readOnly={edit.readOnly}
                  onChoose={type => replace(index, { type })}
                  onCreate={(collection, made) =>
                    edit.run(
                      pickCommands(doc, id, field.key, { collection, item: made }, type =>
                        list.map((other, at) => (at === index ? { ...other, type } : other))
                      )
                    )
                  }
                />
              </div>
              <Check
                label={t("types.required")}
                checked={Boolean(item.required)}
                readOnly={edit.readOnly}
                onChange={required =>
                  set(list.map((other, at) => (at === index ? tidy({ ...other, required }) : other)))
                }
              />
              <Check
                label={t("types.list")}
                checked={Boolean(item.list)}
                readOnly={edit.readOnly}
                onChange={many => set(list.map((other, at) => (at === index ? tidy({ ...other, list: many }) : other)))}
              />
              {!edit.readOnly && index > 0 && (
                <RowButton
                  label={t("effects.moveUp")}
                  icon="arrow-up"
                  onClick={() => set(list.toSpliced(index - 1, 2, item, list[index - 1]))}
                />
              )}
              {!edit.readOnly && (
                <RowButton
                  label={t("refs.remove", { name: item.name })}
                  icon="close"
                  onClick={() => set(list.toSpliced(index, 1))}
                />
              )}
            </div>
            <TextPart
              bare
              label={t("types.description", { name: item.name })}
              value={item.description}
              readOnly={edit.readOnly}
              onType={text =>
                edit.change(
                  list.map((other, at) => (at === index ? tidy({ ...other, description: text }) : other)),
                  { typing: true }
                )
              }
              onDone={edit.done}
              inputClassName="h-7 text-[12px]"
            />
          </li>
        ))}
      </ol>
      {!edit.readOnly && (
        <button
          type="button"
          onClick={add}
          className="mt-1.5 inline-flex h-7 items-center gap-1 text-[12px] font-medium text-accent hover:underline"
        >
          <Icon name="plus" size={12} />
          {t("types.addField")}
        </button>
      )}
    </Row>
  );
}

/** An enum's values: a row each, its value (as code uses it) and what it means; moved up, taken out, added. */
export function TypeValuesControl({ id, field, value, layer }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const list = value ?? [];
  const set = next => edit.change(next.length ? next : undefined);
  const add = () => {
    const taken = new Set(list.map(item => item.value));
    let number = list.length + 1;
    while (taken.has(`VALUE_${number}`)) number += 1;
    set([...list, { value: `VALUE_${number}` }]);
  };
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      <ol className="grid gap-1.5">
        {list.map((item, index) => (
          <li key={index} className="grid grid-cols-[34%_minmax(0,1fr)_auto_auto] items-center gap-2">
            <NamePart
              label={t("types.value")}
              value={item.value}
              readOnly={edit.readOnly}
              onCommit={next => set(list.map((other, at) => (at === index ? { ...other, value: next } : other)))}
            />
            <TextPart
              bare
              label={t("types.meaning", { value: item.value })}
              value={item.description}
              readOnly={edit.readOnly}
              onType={text =>
                edit.change(
                  list.map((other, at) =>
                    at === index ? { value: other.value, ...(text && { description: text }) } : other
                  ),
                  { typing: true }
                )
              }
              onDone={edit.done}
              inputClassName="h-7 text-[12px]"
            />
            {!edit.readOnly && index > 0 ?
              <RowButton
                label={t("effects.moveUp")}
                icon="arrow-up"
                onClick={() => set(list.toSpliced(index - 1, 2, item, list[index - 1]))}
              />
            : <span className="w-6" />}
            {!edit.readOnly && (
              <RowButton
                label={t("refs.remove", { name: item.value })}
                icon="close"
                onClick={() => set(list.toSpliced(index, 1))}
              />
            )}
          </li>
        ))}
      </ol>
      {!edit.readOnly && (
        <button
          type="button"
          onClick={add}
          className="mt-1.5 inline-flex h-7 items-center gap-1 text-[12px] font-medium text-accent hover:underline"
        >
          <Icon name="plus" size={12} />
          {t("types.addValue")}
        </button>
      )}
    </Row>
  );
}

/**
 * The type's JSON Schema (spec §7.5): the schema exported from its fields, to read and copy — or the person's own
 * (Core spec D3's escape hatch), which then is what is exported; "Use the fields" goes back.
 */
export function JsonSchemaControl({ id, field, value, layer, hideLabel = false }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const doc = useEditor(state => state.doc);
  const [writing, setWriting] = useState(false);
  const { copied, copy } = useCopy();
  const exported = typeSchema(doc, id);
  const own = value !== undefined;
  const text = JSON.stringify(exported, null, 2);
  return (
    <Row label={edit.label} layer={layer} wide hideLabel={hideLabel} error={edit.error}>
      {own || writing ?
        <div className="grid gap-1.5">
          <p className="text-[12px] text-sub">{t("types.ownSchema")}</p>
          <JsonArea
            value={own ? value : exported}
            label={edit.label}
            readOnly={edit.readOnly}
            object
            onCommit={next => {
              if (edit.change(next)) setWriting(false);
            }}
          />
          {!edit.readOnly && (
            <button
              type="button"
              onClick={() => {
                setWriting(false);
                if (own) edit.change(undefined);
              }}
              className="justify-self-start text-[12px] font-medium text-accent hover:underline"
            >
              {t("types.useFields")}
            </button>
          )}
        </div>
      : <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-sub">{t("types.exported")}</p>
            <IconButton
              label={copied ? t("copied") : t("types.copySchema")}
              className="size-6"
              onClick={() => copy("schema", text)}
            >
              <Icon name={copied ? "check" : "copy"} size={12} />
            </IconButton>
          </div>
          <pre
            role="region"
            aria-label={t("types.exported")}
            className="max-h-80 overflow-auto rounded-control bg-subtle px-3 py-2.5 font-mono text-[11px] leading-[1.5] text-sub [scrollbar-color:var(--control-border)_transparent] [scrollbar-width:thin]"
          >
            {text}
          </pre>
          {!edit.readOnly && (
            <button
              type="button"
              onClick={() => setWriting(true)}
              className="justify-self-start text-[12px] font-medium text-accent hover:underline"
            >
              {t("types.useOwn")}
            </button>
          )}
        </div>
      }
    </Row>
  );
}
