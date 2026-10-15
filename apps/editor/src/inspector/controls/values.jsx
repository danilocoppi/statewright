import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/cn";

import { useField } from "../useField";
import { parseDuration, parseGlob, parseSigned } from "../values";
import { Chips } from "./Picker";
import { Row } from "./Row";

const INPUT =
  "h-8 w-full rounded-control border border-control-border bg-surface px-2.5 font-mono text-[12px] text-ink outline-none transition-shadow duration-150 placeholder:font-sans placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] disabled:border-transparent disabled:bg-transparent disabled:px-0";

/**
 * A value typed in plain words and kept in the format's form ("30 min" → PT30M): applied with Enter or when the field
 * is left, said back as it will be stored while it is typed; what cannot be read is said, and nothing changes.
 * @param {{ parse: (text: string) => string | null, hint: string }} props
 */
function ParsedControl({ id, field, value, layer, parse, hint }) {
  const { t } = useTranslation("inspector");
  const inputId = useId();
  const edit = useField(id, field);
  const [draft, setDraft] = useState(null);
  const [wrong, setWrong] = useState(false);
  const read = draft === null ? null : parse(draft);
  // What cannot be read, or what Core refuses, stays in the field with the reason under it.
  const commit = () => {
    if (draft === null) return;
    const text = draft.trim();
    if (text && !read) return setWrong(true);
    if (edit.change(text ? read : undefined)) setDraft(null);
  };
  return (
    <Row
      label={edit.label}
      layer={layer}
      htmlFor={inputId}
      error={wrong ? { reason: t("values.unreadable"), message: hint } : edit.error}
    >
      <input
        id={inputId}
        value={draft ?? value ?? ""}
        placeholder={hint}
        disabled={edit.readOnly}
        onFocus={() => setDraft(current => current ?? value ?? "")}
        onChange={event => {
          setDraft(event.target.value);
          setWrong(false);
        }}
        onBlur={commit}
        onKeyDown={event => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") {
            event.stopPropagation();
            setDraft(null);
            event.currentTarget.blur();
          }
        }}
        className={INPUT}
      />
      {draft !== null && read && read !== draft.trim() && (
        <p className="mt-1 font-mono text-[11px] text-muted">= {read}</p>
      )}
    </Row>
  );
}

/** A duration: "30 min", "2 hours", "3 dias" or P10D. */
export function DurationControl(props) {
  const { t } = useTranslation("inspector");
  return <ParsedControl {...props} parse={parseDuration} hint={t("values.durationHint")} />;
}

/** A duration before (−) or after a moment: "-7 days", "+2 hours", -P7D. */
export function SignedDurationControl(props) {
  const { t } = useTranslation("inspector");
  return <ParsedControl {...props} parse={parseSigned} hint={t("values.signedHint")} />;
}

/**
 * A list of values typed one by one (a timer's reminders, event patterns): chips that can be taken out, and a field
 * that adds what is typed with Enter, read the same way as one value.
 */
function TypedListControl({ id, field, value, layer, parse, hint }) {
  const { t } = useTranslation("inspector");
  const inputId = useId();
  const edit = useField(id, field);
  const [text, setText] = useState("");
  const [wrong, setWrong] = useState(false);
  const list = value ?? [];
  const add = () => {
    const read = parse(text);
    if (!read) return setWrong(Boolean(text.trim()));
    if (!list.includes(read)) edit.change([...list, read]);
    setText("");
  };
  return (
    <Row
      label={edit.label}
      layer={layer}
      wide
      htmlFor={inputId}
      error={wrong ? { reason: t("values.unreadable"), message: hint } : edit.error}
    >
      <div className="grid gap-1.5">
        <Chips
          items={list.map(item => ({ key: item, label: item, mono: true }))}
          removeLabel={name => t("refs.remove", { name })}
          onRemove={edit.readOnly ? undefined : key => edit.change(list.filter(item => item !== key))}
        />
        {!edit.readOnly && (
          <input
            id={inputId}
            value={text}
            placeholder={hint}
            onChange={event => {
              setText(event.target.value);
              setWrong(false);
            }}
            onKeyDown={event => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              add();
            }}
            className={cn(INPUT, "h-7")}
          />
        )}
      </div>
    </Row>
  );
}

/** A timer's reminders: durations before or after its moment. */
export function SignedDurationsControl(props) {
  const { t } = useTranslation("inspector");
  return <TypedListControl {...props} parse={parseSigned} hint={t("values.signedHint")} />;
}

/** Event-name patterns a transition reacts to ("leg.*"). */
export function GlobsControl(props) {
  const { t } = useTranslation("inspector");
  return <TypedListControl {...props} parse={parseGlob} hint={t("values.globHint")} />;
}
