import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/cn";

import { useField } from "../useField";
import { Row } from "./Row";

const FIELD =
  "w-full rounded-control border border-control-border bg-surface px-2.5 text-ui text-ink outline-none transition-shadow duration-150 placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] disabled:border-transparent disabled:bg-transparent disabled:px-0";

/**
 * What is being typed into a field: the stored value until the field has the focus, then the person's text. Each
 * keystroke is applied (one change per field until it loses the focus); a refused text stays in the field, said under
 * it, and leaving the field brings back what is stored.
 */
function useDraft(id, field, value) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const [draft, setDraft] = useState(null);
  const [empty, setEmpty] = useState(false);
  const text = draft ?? value ?? "";
  const type = next => {
    setDraft(next);
    // A required field is not emptied: it says so and waits for text.
    if (field.required && !next.trim()) return setEmpty(true);
    setEmpty(false);
    edit.change(next, { typing: true });
  };
  return {
    ...edit,
    text,
    error: empty ? { reason: t("required"), message: "" } : edit.error,
    props: {
      value: text,
      disabled: edit.readOnly,
      onFocus: () => setDraft(value ?? ""),
      onChange: event => type(event.target.value),
      onBlur: () => {
        setDraft(null);
        setEmpty(false);
        edit.done();
      },
      onKeyDown: event => {
        if (event.key !== "Escape") return;
        // Esc puts back what is stored, and leaves the inspector open.
        event.stopPropagation();
        setDraft(null);
        event.currentTarget.blur();
      }
    }
  };
}

/** A single line of text (a title, a code, a path). */
export function TextControl({ id, field, value, layer }) {
  const inputId = useId();
  const draft = useDraft(id, field, value);
  return (
    <Row label={draft.label} layer={layer} htmlFor={inputId} error={draft.error}>
      <input id={inputId} {...draft.props} className={cn(FIELD, "h-8", field.mono && "font-mono text-[12px]")} />
    </Row>
  );
}

/** Text over several lines (a description, a caption, a note). */
export function LongTextControl({ id, field, value, layer }) {
  const inputId = useId();
  const draft = useDraft(id, field, value);
  return (
    <Row label={draft.label} layer={layer} htmlFor={inputId} error={draft.error}>
      <textarea
        id={inputId}
        rows={3}
        {...draft.props}
        className={cn(FIELD, "block min-h-16 resize-y py-1.5 leading-[1.45] [field-sizing:content]")}
      />
    </Row>
  );
}

/** A box's summary: the monospace subtitle drawn under its name, up to three lines. */
export function SummaryControl({ id, field, value, layer }) {
  const inputId = useId();
  const draft = useDraft(id, field, value);
  return (
    <Row label={draft.label} layer={layer} htmlFor={inputId} error={draft.error}>
      <textarea
        id={inputId}
        rows={2}
        {...draft.props}
        className={cn(FIELD, "block resize-none py-1.5 font-mono text-[11.5px] leading-[1.45] [field-sizing:content]")}
      />
    </Row>
  );
}

/**
 * The element's name as the inspector's title: typed in place, with what stands for it when it has none.
 * @param {{ id: string, field: import("../fields").Field, value?: string, stand: string, autoFocus?: boolean,
 *   mono?: boolean }} props `autoFocus`: the element was just made, and is named first; `mono`: an event's name.
 */
export function TitleControl({ id, field, value, stand, autoFocus = false, mono = false }) {
  const draft = useDraft(id, field, value);
  const input = useRef(null);
  // The element was just made: its name is typed first, over the one it was given.
  useEffect(() => {
    if (autoFocus) input.current?.select();
  }, [autoFocus]);
  return (
    <div className="min-w-0 flex-1">
      <input
        ref={input}
        aria-label={draft.label}
        autoFocus={autoFocus}
        placeholder={stand}
        {...draft.props}
        className={cn(
          "-mx-1 w-full rounded-[6px] bg-transparent px-1 text-title font-semibold tracking-tight text-ink outline-none placeholder:font-semibold placeholder:text-sub hover:bg-subtle focus:bg-surface focus:shadow-[0_0_0_2px_var(--accent-soft)] disabled:hover:bg-transparent",
          mono && "font-mono text-[14px] tracking-normal"
        )}
      />
      {draft.error && (
        <p role="alert" className="mt-0.5 text-label text-danger">
          {draft.error.reason}{" "}
          <span lang="en" className="font-mono text-[10.5px] text-muted">
            {draft.error.message}
          </span>
        </p>
      )}
    </div>
  );
}
