import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { connection } from "@/agent/connection";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { indexOf } from "@/lib/derived";
import { marksStore, useMarksState } from "@/marks/store";
import { editorStore } from "@/store/editor";

import { itemOf } from "./context";

import { conversationStore } from "./store";

/**
 * The agent's question (collaboration spec §6.1), open above the field: the options as buttons — one click answers,
 * or, with several allowed, chosen ones and Answer — hovering one rings the elements it means; another answer in the
 * person's words; and, when the agent asks for elements, Mark on the canvas: the Mark tool comes in hand for the
 * question alone, then Confirm.
 * @param {{ line: import("./store").QuestionLine, agent: string }} props
 */
export function Question({ line, agent }) {
  const { t } = useTranslation("agent");
  const [chosen, setChosen] = useState(() => new Set());
  const [text, setText] = useState("");
  const [failed, setFailed] = useState(false);
  const picking = useMarksState(state => (state.picking?.question === line.id ? state.picking : null));
  const { id, question, options = [], multiple = false, pick } = line;

  // Gone from the field (answered, closed, the pairing ended): no marking for it, no rings for its options.
  useEffect(
    () => () => {
      if (marksStore.getState().picking?.question === id) marksStore.getState().stopPicking();
      conversationStore.getState().setHover([]);
    },
    [id]
  );

  const answer = async body => {
    // Answered another way while marking for it: the marking ends.
    if (marksStore.getState().picking?.question === id) marksStore.getState().stopPicking();
    const status = await connection.answer(id, body);
    // The bridge no longer waits for it (the pairing changed): it leaves the field.
    if (status === 404) return conversationStore.getState().closeQuestion(id);
    if (status !== 204) return setFailed(true);
    conversationStore.getState().answerQuestion(id, body);
  };
  const confirm = () => {
    const { doc } = editorStore.getState();
    const index = indexOf(doc);
    const elements = picking.items.map(({ id: element, level }) => ({
      id: element,
      name: itemOf(doc, index, element)?.name ?? element,
      level
    }));
    marksStore.getState().stopPicking();
    if (elements.length) answer({ elements });
  };
  const hover = point => conversationStore.getState().setHover(point ?? []);

  return (
    <section
      data-testid="conversation-question"
      data-question={id}
      aria-label={t("question.label", { agent })}
      className="mb-1.5 grid gap-2 rounded-control border border-accent/40 bg-accent-soft/40 px-3 py-2.5"
    >
      <p className="text-read font-medium text-ink">{question}</p>
      {options.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              aria-pressed={multiple ? chosen.has(option.value) : undefined}
              title={option.description}
              onPointerEnter={() => hover(option.point)}
              onPointerLeave={() => hover([])}
              onFocus={() => hover(option.point)}
              onBlur={() => hover([])}
              onClick={() => {
                if (!multiple) return answer({ values: [option.value] });
                setChosen(before => {
                  const after = new Set(before);
                  if (!after.delete(option.value)) after.add(option.value);
                  return after;
                });
              }}
              className={cn(
                "rounded-control border border-control-border bg-surface px-2.5 py-1 text-ui text-ink hover:border-accent",
                multiple && chosen.has(option.value) && "border-accent bg-accent-soft text-accent"
              )}
            >
              {option.label}
            </button>
          ))}
          {multiple && (
            <Button
              size="sm"
              variant="primary"
              disabled={!chosen.size}
              onClick={() => answer({ values: options.map(option => option.value).filter(value => chosen.has(value)) })}
            >
              {t("question.answer")}
            </Button>
          )}
        </div>
      )}
      {pick === "elements" &&
        (picking ?
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-label text-sub">{t("question.picking")}</span>
            <Button size="sm" variant="primary" disabled={!picking.items.length} onClick={confirm}>
              {t("question.confirm", { count: picking.items.length })}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => marksStore.getState().stopPicking()}>
              {t("question.cancel")}
            </Button>
          </div>
        : <div>
            <Button size="sm" onClick={() => marksStore.getState().startPicking(id)}>
              {t("question.markOnCanvas")}
            </Button>
          </div>)}
      <input
        aria-label={t("question.another")}
        placeholder={t("question.anotherPlaceholder")}
        value={text}
        onChange={event => setText(event.target.value)}
        onKeyDown={event => {
          event.stopPropagation();
          if (event.key !== "Enter" || event.nativeEvent.isComposing || !text.trim()) return;
          answer({ text: text.trim() });
        }}
        className="h-8 rounded-control border border-control-border bg-surface px-2.5 text-ui text-ink outline-none placeholder:text-muted focus:border-accent"
      />
      {failed && <p className="text-label text-danger">{t("question.failed", { agent })}</p>}
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={() => conversationStore.getState().closeQuestion(id)}>
          {t("question.dismiss")}
        </Button>
      </div>
    </section>
  );
}
