import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Icon } from "@/components/ui/Icon";
import { useEditor } from "@/store/editor";

import { pickCommands } from "../references";
import { useField } from "../useField";
import { JsonArea } from "./json";
import { AddPicker } from "./Picker";
import { useRefOptions } from "./refOptions";
import { RefPick } from "./refs";
import { Row } from "./Row";

/** What an effect does: call an action, emit an event or set values (format §9.5). */
const kindOf = effect =>
  "action" in effect ? "action"
  : "emit" in effect ? "emit"
  : "assign";

/** The catalog collection and the JSON part of each kind of effect. */
const KINDS = {
  action: { key: "action", collection: "actions", json: "args" },
  emit: { key: "emit", collection: "events", json: "payload" }
};

/** A small icon button of an effect's row. */
function RowButton({ label, icon, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-6 place-items-center rounded-[6px] text-muted hover:bg-subtle hover:text-ink"
    >
      <Icon name={icon} size={12} />
    </button>
  );
}

/**
 * Effects in order (on entry, on exit, a transition's actions): each calls an action of the catalog with arguments,
 * emits an event with a payload, or sets values of the context — found or created by name, moved up, taken out.
 */
export function EffectsControl({ id, field, value, layer, entry }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const doc = useEditor(state => state.doc);
  const [adding, setAdding] = useState(null);
  const list = value ?? [];
  const set = next => edit.change(next.length ? next : undefined);
  const replace = (index, effect) => set(list.map((item, at) => (at === index ? effect : item)));
  const create = (collection, item, build) => edit.run(pickCommands(doc, id, field.key, { collection, item }, build));
  // What "+ Do an action" or "+ Emit an event" finds (values to set are written, not found).
  const picking = KINDS[adding] ?? KINDS.action;
  const addOptions = useRefOptions({
    field: { key: field.key, collections: [picking.collection] },
    entry,
    choose: itemId => set([...list, { [picking.key]: itemId }]),
    create: (collection, item) => create(collection, item, itemId => [...list, { [picking.key]: itemId }])
  });

  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      {list.length > 0 && (
        <ol className="grid gap-2.5">
          {list.map((effect, index) => {
            const kind = kindOf(effect);
            const own = KINDS[kind];
            return (
              <li key={index} className="grid gap-1.5 border-l-2 border-hairline pl-3">
                <div className="flex items-center gap-1">
                  <span className="w-11 shrink-0 text-[11px] text-muted">{t(`effects.${kind}`)}</span>
                  <div className="min-w-0 flex-1">
                    {own && (
                      <RefPick
                        field={{ key: own.key, collections: [own.collection], required: true }}
                        entry={entry}
                        value={effect[own.key]}
                        label={t(`effects.${kind}`)}
                        readOnly={edit.readOnly}
                        onChoose={itemId => replace(index, { ...effect, [own.key]: itemId })}
                        onCreate={(collection, item) =>
                          create(collection, item, itemId =>
                            list.map((other, at) => (at === index ? { ...effect, [own.key]: itemId } : other))
                          )
                        }
                      />
                    )}
                  </div>
                  {!edit.readOnly && index > 0 && (
                    <RowButton
                      label={t("effects.moveUp")}
                      icon="arrow-up"
                      onClick={() => set(list.toSpliced(index - 1, 2, effect, list[index - 1]))}
                    />
                  )}
                  {!edit.readOnly && (
                    <RowButton label={t("effects.remove")} icon="close" onClick={() => set(list.toSpliced(index, 1))} />
                  )}
                </div>
                <JsonArea
                  value={own ? effect[own.json] : effect.assign}
                  label={t(`effects.${own ? own.json : "values"}`)}
                  readOnly={edit.readOnly}
                  object
                  placeholder={t(own ? `effects.${own.json}Hint` : "effects.valuesHint")}
                  onCommit={next =>
                    own ?
                      replace(
                        index,
                        next === undefined ? { [own.key]: effect[own.key] } : { ...effect, [own.json]: next }
                      )
                    : replace(index, { assign: next ?? {} })
                  }
                />
              </li>
            );
          })}
        </ol>
      )}
      {!edit.readOnly &&
        (adding === "assign" ?
          // Values to set are written first, and only then added: an empty one adds nothing.
          <div className="mt-1.5 grid gap-1.5 border-l-2 border-hairline pl-3">
            <span className="flex items-center justify-between text-[11px] text-muted">
              {t("effects.assign")}
              {/* A way out that stays once the field is left, whatever was typed. */}
              <button
                type="button"
                aria-label={t("effects.discard")}
                title={t("effects.discard")}
                onClick={() => setAdding(null)}
                className="grid size-6 place-items-center rounded-control text-muted hover:bg-subtle hover:text-ink"
              >
                <Icon name="close" size={10} />
              </button>
            </span>
            <JsonArea
              label={t("effects.values")}
              readOnly={false}
              object
              autoFocus
              placeholder={t("effects.valuesHint")}
              onCommit={next => {
                if (!next || !Object.keys(next).length) return void setAdding(null);
                // Refused, the values stay in the row with the reason.
                if (!set([...list, { assign: next }])) return false;
                setAdding(null);
              }}
              onLeave={() => setAdding(null)}
            />
          </div>
        : adding ?
          <div className="mt-1.5">
            <AddPicker
              open
              onOpenChange={open => !open && setAdding(null)}
              label={t(`effects.add.${adding}`)}
              placeholder={t("refs.find")}
              mono={adding === "emit"}
              options={addOptions}
            />
          </div>
        : <div className="mt-1 flex flex-wrap gap-x-3">
            {["action", "emit"].map(kind => (
              <button
                key={kind}
                type="button"
                onClick={() => setAdding(kind)}
                className="inline-flex h-7 items-center gap-1 text-[12px] font-medium text-accent hover:underline"
              >
                <Icon name="plus" size={12} />
                {t(`effects.add.${kind}`)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAdding("assign")}
              className="inline-flex h-7 items-center gap-1 text-[12px] font-medium text-accent hover:underline"
            >
              <Icon name="plus" size={12} />
              {t("effects.add.assign")}
            </button>
          </div>)}
    </Row>
  );
}
