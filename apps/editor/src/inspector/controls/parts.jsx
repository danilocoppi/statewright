// Small parts of composite values (a condition, a retry, a piece of evidence): a label over an input, applied as it is
// typed or read when it is left.
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

export const INPUT =
  "h-8 w-full rounded-control border border-control-border bg-surface px-2.5 text-ui text-ink outline-none transition-shadow duration-150 placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] disabled:border-transparent disabled:bg-transparent disabled:px-0";

/** One part of a composite value: a small label over its input. */
export function Part({ label, htmlFor, className, children }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-[11px] text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * A part read when it is left (a number, a duration, a date): what cannot be read is said, and nothing changes.
 * @param {{ label: string, value: unknown, parse: (text: string) => unknown, hint?: string, readOnly: boolean,
 *   mono?: boolean, onCommit: (value: unknown) => void, className?: string }} props `parse` returns undefined for what
 *   it cannot read.
 */
export function ParsedPart({ label, value, parse, hint, readOnly, mono = false, onCommit, className }) {
  const { t } = useTranslation("inspector");
  const id = useId();
  const [draft, setDraft] = useState(null);
  const [wrong, setWrong] = useState(false);
  // What cannot be read, or what is refused (`onCommit` returns false), stays in the field.
  const commit = () => {
    if (draft === null) return;
    const text = draft.trim();
    const read = text ? parse(text) : null;
    if (text && read === undefined) return setWrong(true);
    if (String(read ?? "") === String(value ?? "") || onCommit(read ?? undefined) !== false) setDraft(null);
  };
  return (
    <Part label={label} htmlFor={id} className={className}>
      <input
        id={id}
        value={draft ?? value ?? ""}
        placeholder={hint}
        disabled={readOnly}
        onFocus={() => setDraft(current => current ?? (value === undefined ? "" : String(value)))}
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
          }
        }}
        className={`${INPUT} ${mono ? "font-mono text-[12px]" : ""}`}
      />
      {wrong && (
        <p role="alert" className="mt-1 text-label text-danger">
          {t("values.unreadable")} <span className="text-muted">{hint}</span>
        </p>
      )}
    </Part>
  );
}

/** Plain text part, applied as it is typed (one change until it is left); `bare` shows no label over it. */
export function TextPart({ label, value, readOnly, onType, onDone, className, bare = false, inputClassName }) {
  const id = useId();
  const [draft, setDraft] = useState(null);
  const input = (
    <input
      id={id}
      aria-label={bare ? label : undefined}
      placeholder={bare ? label : undefined}
      value={draft ?? value ?? ""}
      disabled={readOnly}
      onFocus={() => setDraft(value ?? "")}
      onChange={event => {
        setDraft(event.target.value);
        onType(event.target.value);
      }}
      onBlur={() => {
        setDraft(null);
        onDone();
      }}
      className={`${INPUT} ${inputClassName ?? ""}`}
    />
  );
  // Bare: the label is the field's name and placeholder only, where a row of parts says enough.
  if (bare) return <div className={className}>{input}</div>;
  return (
    <Part label={label} htmlFor={id} className={className}>
      {input}
    </Part>
  );
}
