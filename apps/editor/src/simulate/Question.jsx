import { useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { useEditor } from "@/store/editor";

import { Arrived, Card } from "./parts";
import { simulationStore } from "./store";
import { FIELD } from "./ValueForm";
import { answerText, inputLabel, questionText, whyAsked } from "./words";

/** Whether a key press belongs to where the focus is: a field, or a dialog or menu over the page. */
const ownKeys = target =>
  target instanceof Element &&
  (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    target.isContentEditable ||
    Boolean(target.closest("dialog, [role='dialog'][aria-modal='true'], [role='menu']")));

/** What arrived when the question was asked, as the card's heading says it (mockup 03: "payout.completed arrived"). */
function heading(doc, input, t) {
  if (!input) return <Arrived icon="play" words={t("question.starting")} />;
  if (input.event) return <Arrived icon="bolt" name={inputLabel(doc, input, t)} words={t("question.arrived")} />;
  if (input.call) return <Arrived icon="call" name={inputLabel(doc, input, t)} words={t("question.called")} />;
  return <Arrived icon="clock" words={inputLabel(doc, input, t)} />;
}

/** How many items a `forEach` goes through: a whole number, typed. */
function CountAnswer() {
  const { t } = useTranslation("simulate");
  const id = useId();
  const [text, setText] = useState("");
  const count = /^\d+$/.test(text.trim()) ? Number(text.trim()) : null;
  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        if (count !== null) simulationStore.getState().answer(count);
      }}
      className="grid gap-1.5"
    >
      <label htmlFor={id} className="text-label text-muted">
        {t("question.countLabel")}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          value={text}
          inputMode="numeric"
          onChange={event => setText(event.target.value)}
          className={`${FIELD} tabular-nums`}
        />
        <Button type="submit" variant="primary" disabled={count === null}>
          {t("question.goOn")}
        </Button>
      </div>
    </form>
  );
}

/**
 * A question (simulator spec §5.4, §6.2, mockup 03): what arrived, the question in plain words, its answers numbered
 * with where each leads — keys 1–9 answer, as the canvas numbers the edges — and why it was asked. Esc leaves it: the
 * input is not taken.
 * @param {{ asking: { do: object | null, question: object, trace: object[] } }} props
 */
export function Question({ asking }) {
  const { t } = useTranslation("simulate");
  const doc = useEditor(state => state.doc);
  const { question } = asking;
  const candidates = useMemo(() => question.candidates ?? [], [question]);
  const answer = value => simulationStore.getState().answer(value);

  useEffect(() => {
    const onKeyDown = event => {
      if (event.metaKey || event.ctrlKey || event.altKey || ownKeys(event.target)) return;
      const index = Number(event.key) - 1;
      if (!Number.isInteger(index) || index < 0 || index >= Math.min(9, candidates.length)) return;
      event.preventDefault();
      simulationStore.getState().answer(candidates[index].value);
    };
    addEventListener("keydown", onKeyDown);
    return () => removeEventListener("keydown", onKeyDown);
  }, [candidates]);

  return (
    <Card
      testId="simulation-question"
      label={t("question.label")}
      heading={heading(doc, asking.do, t)}
      onKeyDown={event => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        simulationStore.getState().dismiss();
      }}
    >
      <h3 className="-mt-1 text-read font-semibold text-ink">{questionText(question, t)}</h3>
      {question.condition && (question.condition.name || question.condition.text) && (
        <p className="-mt-2 text-ui text-sub">“{question.condition.name ?? question.condition.text}”</p>
      )}
      {question.kind === "count" ?
        <CountAnswer />
      : <ol className="grid gap-1.5">
          {candidates.map((candidate, index) => {
            const said = answerText(question, candidate, t);
            return (
              <li key={String(candidate.value)}>
                <button
                  type="button"
                  onClick={() => answer(candidate.value)}
                  aria-keyshortcuts={index < 9 ? String(index + 1) : undefined}
                  className="grid w-full grid-cols-[20px_minmax(0,1fr)] items-start gap-x-2.5 rounded-control border border-control-border bg-surface px-2.5 py-2 text-left transition-colors duration-150 hover:border-accent"
                >
                  <span
                    aria-hidden="true"
                    className="mt-px grid size-5 place-items-center rounded-[5px] border border-control-border font-mono text-[10.5px] text-sub"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-read text-ink">
                      <span className={said.mono ? "font-mono text-[12.5px]" : "font-medium"}>{said.label}</span>
                      {said.to && <span className="text-sub"> → {said.to}</span>}
                    </span>
                    {said.description && <span className="mt-0.5 block text-ui text-muted">{said.description}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      }
      <p className="text-ui text-muted">{whyAsked(question, asking.trace, t)}</p>
    </Card>
  );
}
