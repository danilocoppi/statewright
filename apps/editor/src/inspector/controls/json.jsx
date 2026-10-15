import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { useEditor } from "@/store/editor";

import { pickCommands } from "../references";
import { useField } from "../useField";
import { parseJson } from "../values";
import { RefPick } from "./refs";
import { Row } from "./Row";

const AREA =
  "block w-full resize-y rounded-control border border-control-border bg-surface px-2.5 py-1.5 font-mono text-[11.5px] leading-[1.5] text-ink outline-none transition-shadow duration-150 [field-sizing:content] placeholder:font-sans placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] disabled:resize-none disabled:border-transparent disabled:bg-subtle";

/** Whether a value is a plain object (not a list, not null). */
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * JSON typed in place: read when the field is left (Esc puts back what is stored); what is not JSON — or not an
 * object where one is needed — is said, and nothing changes. Empty leaves the value out.
 * @param {{ value: unknown, label: string, readOnly: boolean, object?: boolean, placeholder?: string,
 *   autoFocus?: boolean, onCommit: (value: unknown) => void, onLeave?: () => void }} props `onLeave`: left (or Esc)
 *   without a change.
 */
export function JsonArea({
  value,
  label,
  readOnly,
  object = false,
  placeholder,
  autoFocus = false,
  onCommit,
  onLeave
}) {
  const { t } = useTranslation("inspector");
  const id = useId();
  const [draft, setDraft] = useState(null);
  const [wrong, setWrong] = useState(null);
  const stored = value === undefined ? "" : JSON.stringify(value, null, 2);
  const commit = () => {
    const text = draft?.trim();
    // Left without a change: `onLeave` (a row being added closes).
    if (draft === null || text === stored.trim()) {
      onLeave?.();
      return setDraft(null);
    }
    if (!text) {
      if (onCommit(undefined) !== false) setDraft(null);
      return;
    }
    const read = parseJson(text);
    if (!read.ok) return setWrong({ reason: t("jsonText.invalid"), message: read.message });
    if (object && !isObject(read.value)) return setWrong({ reason: t("jsonText.object"), message: "" });
    // What is refused (`onCommit` returns false) stays as it was written.
    if (onCommit(read.value) !== false) setDraft(null);
  };
  return (
    <div>
      <textarea
        id={id}
        aria-label={label}
        autoFocus={autoFocus}
        rows={2}
        value={draft ?? stored}
        placeholder={placeholder}
        disabled={readOnly}
        spellCheck={false}
        onChange={event => {
          setDraft(event.target.value);
          setWrong(null);
        }}
        onBlur={commit}
        onKeyDown={event => {
          if (event.key !== "Escape") return;
          event.stopPropagation();
          setDraft(null);
          setWrong(null);
          onLeave?.();
        }}
        className={cn(AREA, wrong && "border-danger")}
      />
      {wrong && (
        <p role="alert" className="mt-1 text-label text-danger">
          {wrong.reason}{" "}
          <span lang="en" className="font-mono text-[10.5px] text-muted">
            {wrong.message}
          </span>
        </p>
      )}
    </div>
  );
}

/** Any JSON value (a switch's value, a loop's items, a guard's expression, a case). */
export function JsonControl({ id, field, value, layer }) {
  const edit = useField(id, field);
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      <JsonArea value={value} label={edit.label} readOnly={edit.readOnly} onCommit={next => edit.change(next)} />
    </Row>
  );
}

/** Named JSON values (an action's arguments, a payload, the values a step sets): an object. */
export function JsonMapControl({ id, field, value, layer }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      <JsonArea
        value={value}
        label={edit.label}
        readOnly={edit.readOnly}
        object
        placeholder={t("jsonText.objectHint")}
        onCommit={next => edit.change(next)}
      />
    </Row>
  );
}

/**
 * An endpoint's responses: a status code ("201", "4XX") and the type of what comes back (or nothing), a row each; a
 * code typed with Enter adds one.
 */
export function ResponsesControl({ id, field, value, layer, entry }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const doc = useEditor(state => state.doc);
  const [code, setCode] = useState("");
  const responses = value ?? {};
  const set = next => edit.change(Object.keys(next).length ? next : undefined);
  const type = { key: "responses", collections: ["types"], extra: "null" };
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      <ul className="grid gap-1">
        {Object.entries(responses).map(([status, typeId]) => (
          <li key={status} className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-2">
            <code className="font-mono text-[12px] text-ink">{status}</code>
            <RefPick
              field={type}
              entry={entry}
              value={typeId}
              label={t("responses.type", { status })}
              readOnly={edit.readOnly}
              onChoose={next => set({ ...responses, [status]: next === undefined ? null : next })}
              onCreate={(collection, item) =>
                edit.run(
                  pickCommands(doc, id, field.key, { collection, item }, newId => ({ ...responses, [status]: newId }))
                )
              }
            />
            {!edit.readOnly && (
              <button
                type="button"
                aria-label={t("responses.remove", { status })}
                onClick={() => set(Object.fromEntries(Object.entries(responses).filter(([key]) => key !== status)))}
                className="grid size-6 place-items-center rounded-[6px] text-muted hover:bg-subtle hover:text-ink"
              >
                <Icon name="close" size={12} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {!edit.readOnly && (
        <input
          aria-label={t("responses.add")}
          value={code}
          placeholder={t("responses.add")}
          onChange={event => setCode(event.target.value)}
          onKeyDown={event => {
            if (event.key !== "Enter" || !code.trim()) return;
            event.preventDefault();
            if (edit.change({ ...responses, [code.trim().toUpperCase()]: null })) setCode("");
          }}
          className="mt-1.5 h-7 w-full rounded-control border border-control-border bg-surface px-2.5 font-mono text-[12px] outline-none placeholder:font-sans placeholder:text-muted focus:border-accent"
        />
      )}
    </Row>
  );
}
