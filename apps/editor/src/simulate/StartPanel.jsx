import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ownersOf } from "statewright";
import { instancesOf } from "statewright/simulate";

import { Button, IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { indexOf } from "@/lib/derived";
import { useEditor } from "@/store/editor";

import { Failure } from "./Failure";
import { PanelHeader } from "./parts";
import { Scenarios } from "./Scenarios";
import { simulationStore, useSimulation } from "./store";
import { AREA, FIELD, ValueForm } from "./ValueForm";
import { defaultStart, fieldsOf, instantText, parseInstant, readField, readForm } from "./values";

/** The type of a flow's input: what the action, endpoint or webhook it implements receives (Core spec §12.4). */
function inputTypeOf(doc, canvas) {
  for (const owner of ownersOf(doc, canvas)) {
    const entry = owner.type === "inner" ? indexOf(doc).get(owner.id) : null;
    if (entry?.type !== "catalog") continue;
    const item = entry.value;
    const type = { actions: item.input, endpoints: item.request, webhooks: item.payload }[entry.collection];
    if (type) return type;
  }
  return null;
}

/** What the Start panel asks for a top canvas: starting values per machine instance, a flow's input, an entry. */
function startOf(doc, canvas) {
  const level = doc.canvases[canvas];
  if (level.kind === "flow") {
    return { kind: "flow", contexts: [], input: { fields: fieldsOf(doc, inputTypeOf(doc, canvas)) }, entries: [] };
  }
  const instances = instancesOf(doc, canvas);
  return {
    kind: "machine",
    regions: Object.keys(level.regions ?? {}).length,
    inside: instances.length - 1,
    contexts: instances
      .filter(instance => instance.context)
      .map(instance => ({ ...instance, fields: fieldsOf(doc, instance.context) })),
    input: null,
    entries: Object.entries(level.nodes)
      .filter(([, node]) => node.kind === "entry")
      .map(([id, node]) => ({ id, name: node.label ?? node.name ?? id }))
  };
}

/** JSON typed for a value with no fields to show: its value, nothing, or an error. */
const readJson = text => readField({ kind: "json" }, text);

/** A machine's starting context typed as JSON: an object, or nothing. */
function readObject(text) {
  const read = readJson(text);
  if (!read.ok || read.value === undefined) return read;
  const object = read.value !== null && typeof read.value === "object" && !Array.isArray(read.value);
  return object ? read : { ok: false, error: "object" };
}

/**
 * The Start panel (simulator spec §6.2, mockup 02): starting values for each machine instance whose canvas declares a
 * context type, a flow's input, the entry to start from, and when the clock starts; then Start.
 */
export function StartPanel() {
  const { t } = useTranslation("simulate");
  const doc = useEditor(state => state.doc);
  const canvas = useSimulation(state => state.canvas);
  const failure = useSimulation(state => state.failure);
  const asks = useMemo(() => startOf(doc, canvas), [doc, canvas]);
  const [contexts, setContexts] = useState({});
  const [input, setInput] = useState({});
  const [entry, setEntry] = useState("");
  const [clock, setClock] = useState(() => instantText(defaultStart()));

  const read = useMemo(() => {
    const errors = {};
    const context = {};
    for (const instance of asks.contexts) {
      const texts = contexts[instance.key] ?? {};
      const result = instance.fields ? readForm(instance.fields, texts) : readObject(texts.$ ?? "");
      if (instance.fields) Object.assign(errors, prefixed(instance.key, result.errors));
      else if (!result.ok) errors[`${instance.key}:$`] = result.error;
      if (result.value !== undefined && Object.keys(result.value).length) context[instance.key] = result.value;
    }
    let value;
    if (asks.input) {
      const result = asks.input.fields ? readForm(asks.input.fields, input) : readJson(input.$ ?? "");
      if (asks.input.fields) {
        Object.assign(errors, prefixed("input", result.errors));
        if (Object.keys(result.value).length) value = result.value;
      } else if (!result.ok) errors["input:$"] = result.error;
      else value = result.value;
    }
    const at = parseInstant(clock);
    if (!at) errors.clock = "datetime";
    return { errors, context, input: value, at };
  }, [asks, contexts, input, clock]);
  const blocked = Object.keys(read.errors).length > 0;

  const begin = () => {
    if (blocked) return;
    simulationStore.getState().begin({
      at: read.at,
      ...(entry ? { entry } : {}),
      ...(Object.keys(read.context).length ? { context: read.context } : {}),
      ...(read.input !== undefined ? { input: read.input } : {})
    });
  };
  const summary =
    asks.kind === "flow" ? t("start.flow", { name: doc.canvases[canvas].name })
    : asks.regions > 1 ? t("start.machineRegions", { name: doc.canvases[canvas].name, count: asks.regions })
    : t("start.machine", { name: doc.canvases[canvas].name });
  const where =
    asks.kind === "flow" ? t("start.startsFlow")
    : entry ? t("start.startsAtEntry", { entry: asks.entries.find(item => item.id === entry)?.name })
    : t("start.startsAtInitials");

  return (
    <>
      <PanelHeader
        title={t("start.title")}
        subtitle={asks.inside ? t("start.machinesInside", { summary, count: asks.inside }) : summary}
      >
        <IconButton
          label={t("panel.close")}
          className="size-7 shrink-0"
          onClick={() => simulationStore.getState().close()}
        >
          <Icon name="close" size={14} />
        </IconButton>
      </PanelHeader>
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-color:var(--control-border)_transparent] [scrollbar-width:thin]">
        <Scenarios canvas={canvas} />
        <section aria-labelledby="simulate-new" className="grid gap-3 border-t border-hairline px-4 py-3.5">
          <h3 id="simulate-new" className="text-ui text-muted">
            {t("start.newSimulation")}
          </h3>
          {asks.contexts.map(instance => (
            <div key={instance.key} className="grid gap-2">
              <p className="text-label text-muted">{t("start.startingValues", { name: instance.name })}</p>
              {instance.fields ?
                <ValueForm
                  label={t("start.startingValues", { name: instance.name })}
                  fields={instance.fields}
                  texts={contexts[instance.key] ?? {}}
                  errors={unprefixed(instance.key, read.errors)}
                  onChange={(path, text) =>
                    setContexts(current => ({ ...current, [instance.key]: { ...current[instance.key], [path]: text } }))
                  }
                />
              : <JsonValue
                  label={t("start.startingValues", { name: instance.name })}
                  value={contexts[instance.key]?.$ ?? ""}
                  error={read.errors[`${instance.key}:$`]}
                  onChange={text => setContexts(current => ({ ...current, [instance.key]: { $: text } }))}
                />
              }
            </div>
          ))}
          {asks.input && (
            <div className="grid gap-2">
              <p className="text-label text-muted">{t("start.input")}</p>
              {asks.input.fields ?
                <ValueForm
                  label={t("start.input")}
                  fields={asks.input.fields}
                  texts={input}
                  errors={unprefixed("input", read.errors)}
                  onChange={(path, text) => setInput(current => ({ ...current, [path]: text }))}
                />
              : <JsonValue
                  label={t("start.input")}
                  hint={t("start.inputHint")}
                  value={input.$ ?? ""}
                  error={read.errors["input:$"]}
                  onChange={text => setInput({ $: text })}
                />
              }
            </div>
          )}
          {asks.entries.length > 0 && (
            <label className="grid gap-1.5">
              <span className="text-label text-muted">{t("start.entry")}</span>
              <select value={entry} onChange={event => setEntry(event.target.value)} className={FIELD}>
                <option value="">{t("start.initials")}</option>
                {asks.entries.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <ClockField value={clock} error={read.errors.clock} onChange={setClock} />
          <p className="text-ui text-sub">{where}</p>
          {failure && <Failure failure={failure} />}
        </section>
      </div>
      <footer className="border-t border-hairline p-3">
        <Button variant="primary" className="h-9 w-full" disabled={blocked} onClick={begin}>
          <Icon name="play" size={14} />
          {t("start.start")}
        </Button>
      </footer>
    </>
  );
}

/** Errors of one form, keyed `<key>:<path>` among the others. */
const prefixed = (key, errors) =>
  Object.fromEntries(Object.entries(errors).map(([path, error]) => [`${key}:${path}`, error]));
const unprefixed = (key, errors) =>
  Object.fromEntries(
    Object.entries(errors)
      .filter(([path]) => path.startsWith(`${key}:`))
      .map(([path, error]) => [path.slice(key.length + 1), error])
  );

/** A value typed as JSON, with what is wrong with it under it. */
function JsonValue({ label, hint, value, error, onChange }) {
  const { t } = useTranslation("simulate");
  return (
    <div className="grid gap-1">
      <textarea
        aria-label={label}
        aria-invalid={Boolean(error) || undefined}
        rows={2}
        spellCheck={false}
        value={value}
        placeholder={t("start.notSet")}
        onChange={event => onChange(event.target.value)}
        className={AREA}
      />
      {error ?
        <p className="text-label text-danger">{t(`start.errors.${error}`)}</p>
      : hint && <p className="text-label text-muted">{hint}</p>}
    </div>
  );
}

/** When the run's clock starts (spec §6.2: default now, rounded to the hour, UTC). */
function ClockField({ value, error, onChange }) {
  const { t } = useTranslation("simulate");
  const id = useId();
  const errorId = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-label text-muted">
        {t("start.clock")}
      </label>
      <span className="relative flex items-center">
        <Icon name="clock" size={14} className="pointer-events-none absolute left-2.5 text-muted" />
        <input
          id={id}
          value={value}
          spellCheck={false}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={event => onChange(event.target.value)}
          className={`${FIELD} px-8 tabular-nums`}
        />
        <span aria-hidden="true" className="pointer-events-none absolute right-2.5 text-label text-muted">
          {t("start.utc")}
        </span>
      </span>
      {error && (
        <span id={errorId} className="text-label text-danger">
          {t(`start.errors.${error}`)}
        </span>
      )}
    </div>
  );
}
