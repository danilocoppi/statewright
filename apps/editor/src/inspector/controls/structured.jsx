import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { Segmented } from "@/components/ui/Segmented";
import { Icon } from "@/components/ui/Icon";
import { useEditor } from "@/store/editor";

import { pickCommands } from "../references";
import { useField } from "../useField";
import { compact, parseDuration } from "../values";
import { JsonArea } from "./json";
import { INPUT, ParsedPart, Part, TextPart } from "./parts";
import { RefPick } from "./refs";
import { Row } from "./Row";

const positiveInteger = text => (/^\d+$/.test(text) && Number(text) > 0 ? Number(text) : undefined);
const positiveNumber = text => (Number(text) > 0 ? Number(text) : undefined);
const duration = text => parseDuration(text) ?? undefined;

/**
 * A condition (format §9.4): in plain words, a guard of the catalog (found or created), and — on request — an
 * executable expression (JSON Logic). Emptied, it is left out.
 */
export function ConditionControl({ id, field, value, layer, entry }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const doc = useEditor(state => state.doc);
  const [expression, setExpression] = useState(false);
  const condition = value ?? {};
  const set = (part, next, options) => edit.change(compact({ ...condition, [part]: next }), options);
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      <div className="grid gap-2 border-l-2 border-hairline pl-3">
        <TextPart
          label={t("structured.plainWords")}
          value={condition.text}
          readOnly={edit.readOnly}
          onType={text => set("text", text, { typing: true })}
          onDone={edit.done}
        />
        <Part label={t("structured.guard")}>
          <RefPick
            field={{ key: "guard", collections: ["guards"] }}
            entry={entry}
            value={condition.guard}
            label={t("structured.guard")}
            readOnly={edit.readOnly}
            onChoose={next => set("guard", next)}
            onCreate={(collection, item) =>
              edit.run(
                pickCommands(doc, id, field.key, { collection, item }, guard => compact({ ...condition, guard }))
              )
            }
          />
        </Part>
        {condition.expr !== undefined || expression || layer === "details" ?
          <Part label={t("structured.expression")}>
            <JsonArea
              value={condition.expr}
              label={t("structured.expression")}
              readOnly={edit.readOnly}
              onCommit={next => set("expr", next)}
            />
          </Part>
        : !edit.readOnly && (
            <button
              type="button"
              onClick={() => setExpression(true)}
              className="inline-flex h-6 items-center gap-1 justify-self-start text-[12px] text-accent hover:underline"
            >
              <Icon name="plus" size={12} />
              {t("structured.addExpression")}
            </button>
          )
        }
      </div>
    </Row>
  );
}

/** Retries (format §9.6): how many attempts, the first wait and how it grows, at most how long, and a note. */
export function RetryControl({ id, field, value, layer }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const retry = value ?? {};
  const backoff = retry.backoff ?? {};
  const set = next => edit.change(compact({ ...retry, ...next, backoff: compact({ ...backoff, ...next.backoff }) }));
  const parts = { readOnly: edit.readOnly };
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      <div className="grid grid-cols-2 gap-2 border-l-2 border-hairline pl-3">
        <ParsedPart
          {...parts}
          label={t("structured.attempts")}
          value={retry.maxAttempts}
          parse={positiveInteger}
          hint="3"
          onCommit={maxAttempts => set({ maxAttempts })}
        />
        <ParsedPart
          {...parts}
          label={t("structured.initial")}
          value={backoff.initial}
          parse={duration}
          hint={t("values.durationHint")}
          mono
          onCommit={initial => set({ backoff: { initial } })}
        />
        <ParsedPart
          {...parts}
          label={t("structured.factor")}
          value={backoff.factor}
          parse={positiveNumber}
          hint="2"
          onCommit={factor => set({ backoff: { factor } })}
        />
        <ParsedPart
          {...parts}
          label={t("structured.max")}
          value={backoff.max}
          parse={duration}
          hint={t("values.durationHint")}
          mono
          onCommit={max => set({ backoff: { max } })}
        />
        <TextPart
          label={t("structured.note")}
          value={retry.note}
          readOnly={edit.readOnly}
          onType={note => edit.change(compact({ ...retry, note }), { typing: true })}
          onDone={edit.done}
          className="col-span-2"
        />
      </div>
    </Row>
  );
}

/** When something is in effect (format §9.7): from and until a date (or a moment), and a note. */
export function EffectiveControl({ id, field, value, layer }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const period = value ?? {};
  const set = next => edit.change(compact({ ...period, ...next }));
  const asTyped = text => text;
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      <div className="grid grid-cols-2 gap-2 border-l-2 border-hairline pl-3">
        <ParsedPart
          label={t("structured.from")}
          value={period.from}
          parse={asTyped}
          hint={t("structured.dateHint")}
          readOnly={edit.readOnly}
          mono
          onCommit={from => set({ from })}
        />
        <ParsedPart
          label={t("structured.until")}
          value={period.until}
          parse={asTyped}
          hint={t("structured.dateHint")}
          readOnly={edit.readOnly}
          mono
          onCommit={until => set({ until })}
        />
        <TextPart
          label={t("structured.note")}
          value={period.note}
          readOnly={edit.readOnly}
          onType={note => edit.change(compact({ ...period, note }), { typing: true })}
          onDone={edit.done}
          className="col-span-2"
        />
      </div>
    </Row>
  );
}

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

/** A call step's own request: its method and URL (without a URL there is no request). */
export function RequestControl({ id, field, value, layer }) {
  const { t } = useTranslation("inspector");
  const selectId = useId();
  const edit = useField(id, field);
  const request = value ?? {};
  const set = next => {
    const merged = { method: "GET", ...request, ...next };
    edit.change(merged.url ? merged : undefined);
  };
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-2 border-l-2 border-hairline pl-3">
        <Part label={t("structured.method")} htmlFor={selectId}>
          <select
            id={selectId}
            value={request.method ?? "GET"}
            disabled={edit.readOnly}
            onChange={event => set({ method: event.target.value })}
            className={INPUT}
          >
            {METHODS.map(method => (
              <option key={method}>{method}</option>
            ))}
          </select>
        </Part>
        <ParsedPart
          label={t("structured.url")}
          value={request.url}
          parse={text => text}
          hint="https://…"
          readOnly={edit.readOnly}
          mono
          onCommit={url => set({ url })}
        />
      </div>
    </Row>
  );
}

/**
 * When a transition happens once the state it leaves is done (format §12.3 `done`): not on that, when everything inside
 * it is done, or when one region of its interior is.
 */
export function DoneControl({ id, field, value, layer, entry }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const doc = useEditor(state => state.doc);
  const source = doc.canvases[entry.canvas].nodes[entry.value.from];
  const inner = source?.inner?.canvas ?? doc.definitions[source?.inner?.definition]?.canvas;
  const regions = Object.entries(doc.canvases[inner]?.regions ?? {});
  const options = [
    { value: "no", label: t("structured.done.no") },
    { value: "all", label: t("structured.done.all") },
    ...regions.map(([regionId, region]) => ({
      value: regionId,
      label: t("structured.done.region", { name: region.name })
    }))
  ];
  const current =
    value === undefined ? "no"
    : value === true ? "all"
    : value;
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      <Segmented
        label={edit.label}
        value={current}
        options={options}
        disabled={edit.readOnly}
        pills
        onChange={next =>
          edit.change(
            next === "no" ? undefined
            : next === "all" ? true
            : next
          )
        }
      />
    </Row>
  );
}
