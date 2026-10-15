import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { connection } from "@/agent/connection";
import { markChanged } from "@/agent/notice";
import { usePairing } from "@/agent/pairing";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Island } from "@/components/ui/Island";
import { cn } from "@/lib/cn";
import { indexOf } from "@/lib/derived";
import { isSimulating } from "@/simulate/store";
import { editorStore, useEditor } from "@/store/editor";

import { chipsOf, contextOf } from "./context";
import { statusOf, useConversation, conversationStore } from "./store";

/** The bar's widest, and the narrowest it takes beside the zoom island before it moves above it. */
const WIDEST = 560;
const NARROWEST = 320;
/** Room kept between the bar and the islands beside it. */
const GAP = 12;

/**
 * Where the bar stands: centred between the zoom island and the Support pill, at most 560 px; where that leaves under
 * 320 px, above the zoom island's row instead, as wide as the window lets it.
 * @returns {{ width: number, raised: boolean }}
 */
function usePlace() {
  const [place, setPlace] = useState({ width: WIDEST, raised: false });
  useLayoutEffect(() => {
    const measure = () => {
      const room = window.innerWidth;
      const zoom = document.querySelector('[data-testid="zoom-island"]')?.getBoundingClientRect();
      const support = document.querySelector("[data-support]")?.getBoundingClientRect();
      const left = zoom?.width ? zoom.right + GAP : GAP;
      const right = support?.width ? support.left - GAP : room - GAP;
      const half = Math.min(room / 2 - left, right - room / 2);
      const beside = Math.min(WIDEST, Math.floor(half * 2));
      setPlace(
        beside >= NARROWEST ?
          { width: beside, raised: false }
        : { width: Math.min(WIDEST, room - 2 * 16), raised: true }
      );
    };
    measure();
    window.addEventListener("resize", measure);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    for (const selector of ['[data-testid="zoom-island"]', "[data-support]"]) {
      const element = document.querySelector(selector);
      if (element) observer?.observe(element);
    }
    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, []);
  return place;
}

/** Re-render every second while the agent works, so "working" ends when its last call is 5 s old. */
function useNow(active) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
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
        </span>
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
  const historyOpen = useConversation(state => state.historyOpen);
  const listening = useConversation(state => state.listening);
  const channel = useConversation(state => state.channel);
  const lastCall = useConversation(state => state.lastCall);
  const now = useNow(Boolean(lastCall));
  const status = statusOf({ listening, channel, lastCall }, now);
  const [leave, setLeave] = useState(() => new Set());
  const place = usePlace();
  const field = useRef(null);
  const history = useRef(null);

  const context = useMemo(
    () => (doc ? contextOf(doc, canvasId, selection ?? [], { leave }) : null),
    [doc, canvasId, selection, leave]
  );
  const chips = context ? chipsOf(context, t) : [];
  const last = [...lines].reverse().find(line => line.kind === "agent" || line.kind === "change");
  const stopping = status === "working" && !draft.trim();

  // The newest line in view as the history grows.
  useEffect(() => {
    if (historyOpen) history.current?.scrollTo?.({ top: history.current.scrollHeight });
  }, [historyOpen, lines.length]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !context) return;
    const talk = conversationStore.getState();
    const key = talk.add({ kind: "person", text, chips, state: "sending" });
    talk.setDraft("");
    setLeave(new Set());
    const answer = await connection.send({ text, context });
    conversationStore.getState().update(key, answer.id ? { id: answer.id, state: "sent" } : { state: "failed" });
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
      style={{ width: place.width }}
      className={cn(
        "fixed left-1/2 z-20 flex -translate-x-1/2 flex-col p-1.5",
        place.raised ? "bottom-16" : "bottom-4"
      )}
    >
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
      {!historyOpen && last && (
        <ol aria-live="polite" className="px-2.5">
          <Line line={last} agent={agent} status={status} onNavigate={onNavigate} />
        </ol>
      )}
      <div className="flex items-end gap-1.5">
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
                    onClick={() => setLeave(before => new Set(before).add(chip.key))}
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
