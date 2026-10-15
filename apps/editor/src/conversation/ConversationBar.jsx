import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { connection } from "@/agent/connection";
import { markChanged } from "@/agent/notice";
import { usePairing } from "@/agent/pairing";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Island } from "@/components/ui/Island";
import { cn } from "@/lib/cn";
import { imageOf } from "@/marks/image";
import { MarkTools } from "@/marks/MarkTools";
import { marksOf, summaryOf } from "@/marks/payload";
import { marksStore, useMarksState } from "@/marks/store";
import { indexOf } from "@/lib/derived";
import { isSimulating } from "@/simulate/store";
import { editorStore, useEditor } from "@/store/editor";

import { chipsOf, contextOf } from "./context";
import { answerWords } from "./answers";
import { QUICK } from "./quick";
import { ProposalCard } from "@/proposals/ProposalCard";
import { useProposals } from "@/proposals/store";

import { Question } from "./Question";
import { WORKING_MS, conversationStore, statusOf, useConversation } from "./store";

/** The bar's widest, and the narrowest it takes in a row before it moves up a row. */
const WIDEST = 680;
const NARROWEST = 420;
/** Room kept between the bar and what is beside it, and from the window's edges. */
const GAP = 12;
const EDGE = 16;
/** What the bar keeps clear of: the zoom island and the tools at the left, Support and the panels at the right. */
const AROUND = [
  '[data-testid="zoom-island"]',
  '[data-area="tools"]',
  "[data-support]",
  '[data-area="inspector"]',
  '[data-area="simulation"]',
  '[data-area="problems"]'
];

/**
 * The room in a row (`bottom` px above the window's bottom, `height` tall): between what stands beside it, left and
 * right of the window's middle.
 */
function roomIn(bottom, height) {
  const width = window.innerWidth;
  const top = window.innerHeight - bottom - height;
  const below = window.innerHeight - bottom;
  let left = EDGE;
  let right = width - EDGE;
  for (const selector of AROUND) {
    for (const element of document.querySelectorAll(selector)) {
      const box = element.getBoundingClientRect();
      if (!box.width || box.bottom <= top || box.top >= below) continue;
      if (box.left + box.width / 2 < width / 2) left = Math.max(left, box.right + GAP);
      else right = Math.min(right, box.left - GAP);
    }
  }
  return { left, right };
}

/**
 * Where the bar stands (collaboration spec §4): in the bottom row, centred in the room the zoom island, the tools,
 * Support and the panels on the right leave, at most 560 px; short of 320 px there, a row up, above the zoom island;
 * short there too, over the panels, as wide as the window lets it.
 * @param {import("react").RefObject<HTMLElement>} bar
 * @returns {{ left: number, width: number, bottom: number, over: boolean }}
 */
function usePlace(bar) {
  const [place, setPlace] = useState({ left: 0, width: WIDEST, bottom: EDGE, over: false, ready: false });
  useLayoutEffect(() => {
    const measure = () => {
      const height = bar.current?.getBoundingClientRect().height || 48;
      let next = null;
      for (const bottom of [EDGE, 64]) {
        const { left, right } = roomIn(bottom, height);
        if (right - left >= NARROWEST) {
          const width = Math.min(WIDEST, right - left);
          next = { left: Math.round(left + (right - left - width) / 2), width, bottom, over: false };
          break;
        }
      }
      if (!next) {
        const width = Math.min(WIDEST, window.innerWidth - 2 * EDGE);
        next = { left: Math.round((window.innerWidth - width) / 2), width, bottom: 64, over: true };
      }
      setPlace(before =>
        (
          before.ready &&
          before.left === next.left &&
          before.width === next.width &&
          before.bottom === next.bottom &&
          before.over === next.over
        ) ?
          before
        : { ...next, ready: true }
      );
    };
    measure();
    // The panels open and close with the selection and the run: the room is looked at again a few times a second.
    const timer = setInterval(measure, 300);
    window.addEventListener("resize", measure);
    return () => {
      clearInterval(timer);
      window.removeEventListener("resize", measure);
    };
  }, [bar]);
  return place;
}

/** Re-render every second while the agent works, so "working" ends when its last call is 30 s old. */
function useNow(lastCall, listening) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!lastCall || listening) return undefined;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (Date.now() - lastCall >= WORKING_MS) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [lastCall, listening]);
  return now;
}

/** Show an element the agent named: its level, with it selected (only brought into view while simulating). */
function showElement(id, onNavigate) {
  const editor = editorStore.getState();
  const entry = indexOf(editor.doc).get(id);
  if (!entry?.canvas) return;
  if (!isSimulating()) editor.select([id], entry.canvas);
  editor.reveal(entry.canvas, id);
  if (entry.canvas !== editor.canvasId) onNavigate(entry.canvas);
}

/** The agent's status: a dot and its word. */
function Status({ status }) {
  const { t } = useTranslation("agent");
  return (
    <span
      className="flex shrink-0 items-center gap-1.5 text-label text-muted"
      data-status={status}
      title={status === "away" ? t("conversation.status.awayHint") : undefined}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          status === "working" && "bg-accent motion-safe:animate-pulse",
          status === "listening" && "bg-success",
          status === "away" && "bg-muted"
        )}
      />
      {t(`conversation.status.${status}`)}
    </span>
  );
}

/** A proposal in the history: its title and what became of it. */
function ProposalLine({ id, agent }) {
  const { t } = useTranslation("agent");
  const proposal = useProposals(state => state.list.find(item => item.id === id));
  if (!proposal) return null;
  return (
    <li data-testid="conversation-line" data-kind="proposal" className="grid gap-0.5 py-1.5">
      <span className="text-label font-medium text-accent">{agent}</span>
      <span className="text-read text-ink">{proposal.title}</span>
      <span className="text-label text-sub">{t(`proposal.state.${proposal.state}`)}</span>
    </li>
  );
}

/** One line of the conversation. */
function Line({ line, agent, status, onNavigate }) {
  const { t } = useTranslation("agent");
  const doc = useEditor(state => state.doc);
  const index = useMemo(() => (doc ? indexOf(doc) : null), [doc]);
  const lastEntry = useEditor(state => state.history.past.at(-1));
  if (line.kind === "person" || line.kind === "stop") {
    const state = line.state === "sent" && status === "away" ? "unread" : line.state;
    return (
      <li data-testid="conversation-line" data-kind={line.kind} className="grid gap-0.5 py-1.5">
        <span className="text-label text-muted">{t("conversation.you")}</span>
        <span className="whitespace-pre-wrap text-read text-ink">
          {line.kind === "stop" ? t("conversation.stopAsked", { agent }) : line.text}
        </span>
        <span className="flex flex-wrap items-center gap-1.5 text-label text-muted">
          {line.chips?.map(chip => (
            <span key={chip.key} className="rounded-chip bg-subtle px-1.5">
              {chip.label}
            </span>
          ))}
          <span>{t(`conversation.state.${state}`)}</span>
          {(line.drawn?.marks.length > 0 || line.drawn?.forAI.length > 0) && (
            <button
              type="button"
              onClick={() => marksStore.getState().show(line.drawn)}
              className="font-medium text-accent hover:underline"
            >
              {t("marks.show")}
            </button>
          )}
        </span>
      </li>
    );
  }
  if (line.kind === "proposal") return <ProposalLine id={line.id} agent={agent} />;
  if (line.kind === "question") {
    return (
      <li data-testid="conversation-line" data-kind="question" className="grid gap-0.5 py-1.5">
        <span className="text-label font-medium text-accent">{agent}</span>
        <span className="text-read text-ink">{line.question}</span>
        {line.state === "answered" && (
          <span className="text-label text-sub">{t("question.answered", { answer: answerWords(line) })}</span>
        )}
      </li>
    );
  }
  if (line.kind === "agent") {
    return (
      <li data-testid="conversation-line" data-kind="agent" className="grid gap-0.5 py-1.5">
        <span className="text-label font-medium text-accent">{agent}</span>
        <span className="whitespace-pre-wrap text-read text-ink">{line.text}</span>
        {line.point?.length > 0 && (
          <span className="flex flex-wrap gap-1.5">
            {line.point.map(id => {
              const value = index?.get(id)?.value;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => showElement(id, onNavigate)}
                  className="rounded-chip bg-accent-soft px-1.5 text-label text-accent hover:underline"
                >
                  {value?.name ?? value?.label ?? id}
                </button>
              );
            })}
          </span>
        )}
      </li>
    );
  }
  const levels = Object.keys(line.canvases);
  return (
    <li data-testid="conversation-line" data-kind="change" className="flex items-baseline gap-2 py-1.5">
      <span className="min-w-0 flex-1 text-read text-sub">
        <span className="font-medium text-accent">{line.agent ?? agent}</span> ·{" "}
        {t("conversation.change", { label: line.label })}
      </span>
      {lastEntry === line.entry && (
        <button
          type="button"
          onClick={() => editorStore.getState().undo()}
          className="shrink-0 text-label font-medium text-accent hover:underline"
        >
          {t("conversation.undo")}
        </button>
      )}
      {levels.length > 0 && (
        <button
          type="button"
          onClick={() => {
            editorStore.getState().setCanvas(levels[0]);
            markChanged(line.canvases);
          }}
          className="shrink-0 text-label font-medium text-accent hover:underline"
        >
          {t("conversation.show")}
        </button>
      )}
    </li>
  );
}

/**
 * The conversation with the paired agent (collaboration spec §4): at the bottom centre, the field — Enter sends,
 * Shift+Enter breaks the line, Esc leaves it keeping the draft — with chips for what goes with the message, Send (Stop
 * while the agent works and nothing is written), the agent's last line above it, and the history, which opens upwards.
 * @param {{ onNavigate: (canvasId: string) => void }} props
 */
export function ConversationBar({ onNavigate }) {
  const { t } = useTranslation("agent");
  const agent = usePairing(connection, state => state.agent) ?? t("change.anAgent");
  const doc = useEditor(state => state.doc);
  const canvasId = useEditor(state => state.canvasId);
  const selection = useEditor(state => state.view.selections[state.canvasId]);
  const lines = useConversation(state => state.lines);
  const draft = useConversation(state => state.draft);
  const proposals = useProposals(state => state.list);
  const action = useConversation(state => state.action);
  const historyOpen = useConversation(state => state.historyOpen);
  const listening = useConversation(state => state.listening);
  const channel = useConversation(state => state.channel);
  const lastCall = useConversation(state => state.lastCall);
  const now = useNow(lastCall, listening);
  const status = statusOf({ listening, channel, lastCall }, now);
  // What the person left out of this message; the selection left out comes back once another is selected.
  const selectionKey = `${canvasId}:${(selection ?? []).join(",")}`;
  const [left, setLeft] = useState(() => ({ key: selectionKey, set: new Set() }));
  const leave = useMemo(() => {
    const set = new Set(left.set);
    if (left.key !== selectionKey) set.delete("selection");
    return set;
  }, [left, selectionKey]);
  const self = useRef(null);
  const place = usePlace(self);
  const field = useRef(null);
  const history = useRef(null);

  const context = useMemo(
    () => (doc ? contextOf(doc, canvasId, selection ?? [], { leave }) : null),
    [doc, canvasId, selection, leave]
  );
  const drawnMarks = useMarksState(state => state.marks);
  const drawnForAI = useMarksState(state => state.forAI);
  // What is marked goes with the message too, unless the person leaves it out (collaboration spec §5.3).
  const summary = summaryOf({ marks: drawnMarks, forAI: drawnForAI });
  const chips = [
    ...(context ? chipsOf(context, t) : []),
    ...(summary.elements && !leave.has("elements") ?
      [
        {
          key: "elements",
          label: t("marks.chips.elements", { count: summary.elements, levels: summary.levels })
        }
      ]
    : []),
    ...(summary.marks && !leave.has("marks") ?
      [{ key: "marks", label: t("marks.chips.marks", { count: summary.marks }) }]
    : [])
  ];
  const last = [...lines].reverse().find(line => line.kind === "agent" || line.kind === "change");
  // What the agent said last, read out: a reply, or a question it asks.
  const lastSaid = [...lines].reverse().find(line => line.kind === "agent" || line.kind === "question");
  const stopping = status === "working" && !draft.trim();
  // Quick requests while something is selected or marked, and the field is empty or holds a request's words.
  const offerQuick =
    (Boolean(selection?.length) || drawnMarks.length > 0 || drawnForAI.length > 0) &&
    (!draft.trim() || QUICK.some(name => draft === t(`quick.${name}.words`)));

  // The newest line in view as the history grows.
  useEffect(() => {
    if (historyOpen) history.current?.scrollTo?.({ top: history.current.scrollHeight });
  }, [historyOpen, lines.length]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !context) return;
    const drawn = {
      marks: leave.has("marks") ? [] : drawnMarks,
      forAI: leave.has("elements") ? [] : drawnForAI
    };
    const marks = marksOf(drawn, doc);
    const talk = conversationStore.getState();
    const key = talk.add({ kind: "person", text, chips, state: "sending", drawn });
    talk.setDraft("");
    setLeft({ key: selectionKey, set: new Set() });
    // The image is of the level shown; marks on other levels travel in words (collaboration spec §5.4).
    const image = marks.length ? await imageOf(doc, canvasId, drawn).catch(() => null) : null;
    const answer = await connection.send({
      text,
      ...(action ? { action } : {}),
      context,
      ...(marks.length ? { marks } : {}),
      ...(image ? { image } : {})
    });
    const after = conversationStore.getState();
    after.update(key, answer.id ? { id: answer.id, state: "sent" } : { state: "failed" });
    // Sent, its marks are cleared from the canvas; not sent, they stay, and the text comes back to the field.
    if (answer.id) marksStore.getState().forget(drawn);
    // Not sent: the text comes back, a quick request's action with it.
    else if (!after.draft) after.request(action, text);
  };

  const stop = async () => {
    const key = conversationStore.getState().add({ kind: "stop", state: "sending" });
    const answer = await connection.send({ stop: true });
    conversationStore.getState().update(key, answer.id ? { id: answer.id, state: "sent" } : { state: "failed" });
  };

  return (
    <Island
      as="section"
      role="region"
      aria-label={t("conversation.label", { agent })}
      data-testid="conversation-bar"
      data-area="conversation"
      ref={self}
      style={{ left: place.left, width: place.width, bottom: place.bottom }}
      className={cn("fixed flex flex-col p-1.5", place.over ? "z-40" : "z-20", !place.ready && "invisible")}
    >
      {/* Each new answer is read out, the history open or not (collaboration spec §4: "announced politely"). */}
      <p role="status" aria-live="polite" className="sr-only">
        {lastSaid?.kind === "question" ?
          t("question.announced", { agent, question: lastSaid.question })
        : lastSaid ?
          `${agent}: ${lastSaid.text}`
        : ""}
      </p>
      {historyOpen && (
        <ol
          ref={history}
          data-testid="conversation-history"
          aria-label={t("conversation.history")}
          className="max-h-[50vh] overflow-y-auto border-b border-hairline px-2.5 pb-1.5"
        >
          {lines.length === 0 && <li className="py-3 text-read text-muted">{t("conversation.empty", { agent })}</li>}
          {lines.map(line => (
            <Line key={line.key} line={line} agent={agent} status={status} onNavigate={onNavigate} />
          ))}
        </ol>
      )}
      {/* The agent's proposals waiting, and those that no longer apply, stand above the field (spec §7). */}
      {proposals
        .filter(proposal => proposal.state === "waiting" || proposal.state === "stale")
        .map(proposal => (
          <ProposalCard key={proposal.id} proposal={proposal} agent={agent} onNavigate={onNavigate} />
        ))}
      {/* The agent's open questions stand above the field (collaboration spec §6.1). */}
      {lines
        .filter(line => line.kind === "question" && line.state === "open")
        .map(line => (
          <Question key={line.key} line={line} agent={agent} />
        ))}
      {/* On what is selected or marked, the usual asks in one click (collaboration spec §6.2). */}
      {offerQuick && (
        <div role="group" aria-label={t("quick.label")} className="flex flex-wrap gap-1 px-1 pb-1.5">
          {QUICK.map(name => (
            <button
              key={name}
              type="button"
              data-testid="conversation-quick"
              data-action={name}
              onClick={() => {
                conversationStore.getState().request(name, t(`quick.${name}.words`));
                field.current?.focus();
              }}
              className={cn(
                "rounded-full border border-control-border px-2.5 py-0.5 text-label text-sub hover:border-accent hover:text-accent",
                action === name && "border-accent bg-accent-soft text-accent"
              )}
            >
              {t(`quick.${name}.label`)}
            </button>
          ))}
        </div>
      )}
      {!historyOpen && last && (
        <ol className="px-2.5">
          <Line line={last} agent={agent} status={status} onNavigate={onNavigate} />
        </ol>
      )}
      <div className="flex items-end gap-1.5">
        <span className="mb-0.5">
          <MarkTools />
        </span>
        <button
          type="button"
          aria-expanded={historyOpen}
          aria-label={t("conversation.history")}
          title={t("conversation.history")}
          onClick={() => conversationStore.getState().toggleHistory()}
          className="grid size-8 shrink-0 place-items-center rounded-control text-sub hover:bg-subtle hover:text-ink"
        >
          <Icon
            name="chevron-down"
            className={cn(
              "transition-transform duration-150 motion-reduce:transition-none",
              !historyOpen && "rotate-180"
            )}
          />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-control border border-control-border px-2 py-1 focus-within:border-accent">
          {chips.length > 0 && (
            <span className="flex flex-wrap gap-1">
              {chips.map(chip => (
                <span
                  key={chip.key}
                  className="flex items-center gap-0.5 rounded-chip bg-accent-soft pl-1.5 text-label text-accent"
                >
                  {chip.label}
                  <button
                    type="button"
                    aria-label={t("conversation.chips.leave", { label: chip.label })}
                    onClick={() => setLeft({ key: selectionKey, set: new Set(leave).add(chip.key) })}
                    className="grid size-4 place-items-center rounded-chip hover:bg-surface"
                  >
                    <Icon name="close" size={10} />
                  </button>
                </span>
              ))}
            </span>
          )}
          <textarea
            ref={field}
            data-testid="conversation-field"
            rows={1}
            aria-label={t("conversation.field", { agent })}
            placeholder={t("conversation.placeholder", { agent })}
            value={draft}
            onChange={event => conversationStore.getState().setDraft(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Escape") {
                event.stopPropagation();
                event.currentTarget.blur();
                return;
              }
              if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || event.isComposing) {
                return;
              }
              event.preventDefault();
              send();
            }}
            className="max-h-[9lh] [field-sizing:content] min-h-[1lh] resize-none bg-transparent text-read text-ink outline-none placeholder:text-muted"
          />
        </div>
        <span className="mb-2 hidden sm:flex">
          <Status status={status} />
        </span>
        <Button
          variant={stopping ? "secondary" : "primary"}
          size="sm"
          data-testid="conversation-send"
          onClick={stopping ? stop : send}
          disabled={!stopping && !draft.trim()}
          className="mb-0.5 shrink-0"
        >
          {stopping ? t("conversation.stop") : t("conversation.send")}
        </Button>
      </div>
    </Island>
  );
}
