import { useId } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/cn";

/** A field's input, in the inspector's look: mono, since what is typed is data. */
export const FIELD =
  "h-8 w-full min-w-0 rounded-control border border-control-border bg-surface px-2.5 font-mono text-[12px] text-ink outline-none transition-shadow duration-150 placeholder:font-sans placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] aria-[invalid=true]:border-danger";

/** JSON typed in place: as tall as what it holds. */
export const AREA =
  "block min-h-8 w-full min-w-0 resize-none rounded-control border border-control-border bg-surface px-2.5 py-1.5 font-mono text-[11.5px] leading-[1.5] text-ink outline-none transition-shadow duration-150 [field-sizing:content] placeholder:font-sans placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] aria-[invalid=true]:border-danger";

/** One value: a choice, JSON, or a line of text. */
function Control({ field, id, value, invalid, describedBy, onChange }) {
  const { t } = useTranslation("simulate");
  const common = {
    id,
    "aria-required": field.required || undefined,
    "aria-invalid": invalid || undefined,
    "aria-describedby": describedBy
  };
  if (field.kind === "choice" || field.kind === "boolean") {
    const options = field.kind === "boolean" ? ["true", "false"] : field.options;
    return (
      <select {...common} value={value} onChange={event => onChange(event.target.value)} className={cn(FIELD, "pr-1")}>
        <option value="">{t("start.notSet")}</option>
        {options.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }
  if (field.kind === "json") {
    return (
      <textarea
        {...common}
        rows={1}
        spellCheck={false}
        value={value}
        placeholder={t("start.notSet")}
        onChange={event => onChange(event.target.value)}
        className={AREA}
      />
    );
  }
  return (
    <input
      {...common}
      value={value}
      spellCheck={false}
      inputMode={field.kind === "number" || field.kind === "integer" ? "decimal" : undefined}
      placeholder={t("start.notSet")}
      onChange={event => onChange(event.target.value)}
      className={FIELD}
    />
  );
}

/** A field: its name (mono, as the type writes it; marked when required), then its value; what is wrong, under it. */
function FieldRow({ field, path, texts, errors, onChange }) {
  const { t } = useTranslation("simulate");
  const id = useId();
  const errorId = useId();
  if (field.kind === "group") {
    return (
      <fieldset className="grid gap-2 border-l border-hairline pl-3">
        <legend className="mb-1 font-mono text-[12px] text-sub">
          {field.name}
          {field.required && <Required />}
        </legend>
        {field.fields.map(inner => (
          <FieldRow
            key={inner.name}
            field={inner}
            path={`${path}.${inner.name}`}
            texts={texts}
            errors={errors}
            onChange={onChange}
          />
        ))}
      </fieldset>
    );
  }
  const error = errors[path];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] items-start gap-x-3">
      <label
        htmlFor={id}
        title={field.description}
        className={cn("truncate pt-[7px] font-mono text-[12px]", field.required ? "text-ink" : "text-sub")}
      >
        {field.name}
        {field.required && <Required />}
      </label>
      <div className="min-w-0">
        <Control
          field={field}
          id={id}
          value={texts[path] ?? ""}
          invalid={Boolean(error)}
          describedBy={error ? errorId : undefined}
          onChange={text => onChange(path, text)}
        />
        {error && (
          <p id={errorId} className="mt-1 text-label text-danger">
            {t(`start.errors.${error}`)}
          </p>
        )}
      </div>
    </div>
  );
}

/** The mark of a required field: seen, and said as "Required". */
function Required() {
  const { t } = useTranslation("simulate");
  return (
    <>
      <span aria-hidden="true" className="ml-1 text-danger">
        *
      </span>
      <span className="sr-only">{t("start.required")}</span>
    </>
  );
}

/**
 * A value typed by its catalog type (simulator spec §6.2): one row per field of an object type, nested objects as
 * groups, required fields marked. What was typed is kept as text by its path; `readForm` makes the value of it.
 * @param {{ fields: import("./values").Field[], texts: Record<string, string>, errors: Record<string, string>,
 *   onChange: (path: string, text: string) => void, label: string }} props
 */
export function ValueForm({ fields, texts, errors, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="grid gap-2">
      {fields.map(field => (
        <FieldRow key={field.name} field={field} path={field.name} texts={texts} errors={errors} onChange={onChange} />
      ))}
    </div>
  );
}
