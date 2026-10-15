import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { useEditor } from "@/store/editor";

import { Arrived, Card } from "./parts";
import { simulationStore } from "./store";
import { AREA, FIELD, ValueForm } from "./ValueForm";
import { fieldsOf, readField, readForm } from "./values";
import { clockText, durationText, payloadTypeOf, waitOf } from "./words";

/** Esc in a card leaves it, as it leaves any field. */
const closeOnEscape = onClose => event => {
  if (event.key !== "Escape") return;
  event.stopPropagation();
  onClose();
};

/**
 * The value an event or a call carries (spec §6.2: "a small form generated from the type; an empty payload is
 * allowed"), then Send; Cancel or Esc leaves the input untaken.
 * @param {{ input: object, label: string, onClose: () => void }} props
 */
export function PayloadCard({ input, label, onClose }) {
  const { t } = useTranslation("simulate");
  const doc = useEditor(state => state.doc);
  const fields = useMemo(() => fieldsOf(doc, payloadTypeOf(doc, input)), [doc, input]);
  const [texts, setTexts] = useState({});
  const read = useMemo(() => {
    if (fields) {
      const form = readForm(fields, texts);
      return { errors: form.errors, value: Object.keys(form.value).length ? form.value : undefined };
    }
    const json = readField({ kind: "json" }, texts.$ ?? "");
    return json.ok ? { errors: {}, value: json.value } : { errors: { $: json.error }, value: undefined };
  }, [fields, texts]);
  const blocked = Object.keys(read.errors).length > 0;
  const send = event => {
    event.preventDefault();
    if (blocked) return;
    simulationStore.getState().take({ ...input, ...(read.value !== undefined ? { payload: read.value } : {}) });
    onClose();
  };
  return (
    <Card
      label={t("payload.label", { name: label })}
      heading={<Arrived icon={input.event ? "bolt" : "call"} name={label} words={t("payload.carries")} />}
      onKeyDown={closeOnEscape(onClose)}
    >
      <form onSubmit={send} className="grid gap-3">
        {fields ?
          <ValueForm
            label={t("payload.label", { name: label })}
            fields={fields}
            texts={texts}
            errors={read.errors}
            onChange={(path, text) => setTexts(current => ({ ...current, [path]: text }))}
          />
        : <textarea
            aria-label={t("payload.label", { name: label })}
            aria-invalid={Boolean(read.errors.$) || undefined}
            rows={2}
            spellCheck={false}
            value={texts.$ ?? ""}
            placeholder={t("start.notSet")}
            onChange={event => setTexts({ $: event.target.value })}
            className={AREA}
          />
        }
        {read.errors.$ && <p className="text-label text-danger">{t(`start.errors.${read.errors.$}`)}</p>}
        <p className="text-label text-muted">{t("payload.empty")}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("payload.cancel")}
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={blocked}>
            {t("payload.send")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/**
 * Let time pass… (spec §6.2): an hour, a day, until the next timer, or any duration or date.
 * @param {{ clock: string, hasTimer: boolean, onClose: () => void }} props
 */
export function WaitCard({ clock, hasTimer, onClose }) {
  const { t, i18n } = useTranslation("simulate");
  const id = useId();
  const hintId = useId();
  const [text, setText] = useState("");
  const read = text.trim() ? waitOf(text, clock) : null;
  const wrong = Boolean(text.trim()) && !read;
  const take = wait => {
    simulationStore.getState().take({ wait });
    onClose();
  };
  const wait = event => {
    event.preventDefault();
    if (read) take(read.wait);
  };
  return (
    <Card
      label={t("time.title")}
      heading={<Arrived icon="clock" words={t("time.title")} />}
      onKeyDown={closeOnEscape(onClose)}
    >
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" onClick={() => take("PT1H")}>
          {t("time.hour")}
        </Button>
        <Button size="sm" onClick={() => take("P1D")}>
          {t("time.day")}
        </Button>
        <Button
          size="sm"
          disabled={!hasTimer}
          title={hasTimer ? undefined : t("time.noTimer")}
          onClick={() => take("next")}
        >
          {t("time.next")}
        </Button>
      </div>
      <form onSubmit={wait} className="grid gap-2">
        <label htmlFor={id} className="text-label text-muted">
          {t("time.anyLabel")}
        </label>
        <input
          id={id}
          value={text}
          spellCheck={false}
          aria-invalid={wrong || undefined}
          aria-describedby={hintId}
          placeholder={t("time.placeholder")}
          onChange={event => setText(event.target.value)}
          className={FIELD}
        />
        <p id={hintId} className={wrong ? "text-label text-danger" : "text-label text-muted"}>
          {wrong ?
            t("time.unreadable")
          : read?.until ?
            t("time.until", { moment: clockText(read.until, i18n.language) })
          : read ?
            t("time.for", { span: durationText(read.wait, t) })
          : t("time.hint", { clock: clockText(clock, i18n.language) })}
        </p>
        <div className="mt-1 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("payload.cancel")}
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={!read}>
            {t("time.wait")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
