import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { useEditor } from "@/store/editor";

import { EventPicker } from "./EventPicker";
import { useMoves } from "./hooks";
import { PayloadCard, WaitCard } from "./Inputs";
import { Section } from "./parts";
import { simulationStore, useSimulation } from "./store";
import { outcomeOf, secondsBetween, spanText } from "./words";

const ICON = { event: "bolt", call: "call", timer: "clock" };

/** One move: what arrives (an event, a call, a timer with when it falls due), and where it leads. */
function MoveRow({ move, onTake }) {
  const { t } = useTranslation("simulate");
  const doc = useEditor(state => state.doc);
  const canvas = useSimulation(state => state.canvas);
  const clock = useSimulation(state => state.points.at(-1)?.session.clock);
  const outcome = outcomeOf(doc, canvas, move, t);
  return (
    <li>
      <button
        type="button"
        data-testid="simulation-move"
        data-opens={JSON.stringify(move.do)}
        onClick={() => onTake(move.do, move.label, JSON.stringify(move.do))}
        className="-mx-2 grid min-h-8 w-[calc(100%+16px)] grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-x-2.5 rounded-control px-2 py-1 text-left hover:bg-subtle"
      >
        <Icon name={ICON[move.kind]} size={15} className="text-accent" />
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate font-mono text-[13px] text-accent">{move.label}</span>
          {move.due && clock && (
            <span className="shrink-0 text-ui text-muted">
              {t("moves.in", { span: spanText(secondsBetween(clock, move.due)) })}
            </span>
          )}
        </span>
        <span
          className={cn(
            "max-w-[150px] truncate pl-2 text-right text-ui",
            outcome.kind === "error" ? "text-danger" : "text-sub"
          )}
        >
          {outcome.kind === "to" ? `→ ${outcome.names.join(", ")}` : outcome.text}
        </span>
      </button>
    </li>
  );
}

/** Where the focus goes in the panel: something of the moves, by what it opens. */
const focusIn = selector => document.querySelector(`[data-area="simulation"] ${selector}`)?.focus();

/**
 * What can happen (spec §6.2, mockups 01 and 04): each move with where it leads, grouped by region when there are
 * several; then Other event… and Let time pass…. A move that carries a typed value asks for it first, in a card in
 * the moves' place; a card left without its input gives the focus back to what opened it, and after a step the focus
 * stays in the moves when what had it is gone.
 * @param {{ session: object }} props The last point's session.
 */
export function Moves({ session }) {
  const { t } = useTranslation("simulate");
  const card = useSimulation(state => state.card);
  const setCard = simulationStore.getState().setCard;
  const [picking, setPicking] = useState(false);
  const moves = useMoves(session);
  const opener = useRef(null);
  useEffect(() => {
    if (card || !opener.current) return;
    focusIn(`[data-opens='${opener.current}']`);
    opener.current = null;
  }, [card]);
  useEffect(() => {
    if (document.activeElement === document.body) focusIn("[data-opens]");
  }, [session]);
  const open = (opens, next) => {
    opener.current = opens;
    setCard(next);
  };
  /** Take an input: at once, or through its payload card when it carries a typed value; Esc there comes back here. */
  const take = (input, label, opens) => {
    opener.current = opens;
    simulationStore.getState().request(input, label);
  };
  if (card?.kind === "payload") {
    return <PayloadCard input={card.input} label={card.label} onClose={() => setCard(null)} />;
  }
  if (card?.kind === "wait") {
    return <WaitCard clock={session.clock} hasTimer={session.timers.length > 0} onClose={() => setCard(null)} />;
  }

  const list = moves.list ?? [];
  const regions = [...new Set(list.map(move => move.region.key))];
  const grouped = regions.length > 1;
  return (
    <Section title={t("moves.title")} id="simulate-moves">
      {moves.error && <p className="text-ui text-danger">{t("moves.stale")}</p>}
      {!moves.error && list.length === 0 && (
        <p className="text-ui text-muted">{session.ended ? t("moves.ended") : t("moves.none")}</p>
      )}
      {regions.map(key => {
        const inRegion = list.filter(move => move.region.key === key);
        return (
          <div
            key={key || "level"}
            role={grouped ? "group" : undefined}
            aria-label={grouped ? inRegion[0].region.name : undefined}
          >
            {grouped && <p className="pb-0.5 pt-1 text-label text-muted">{inRegion[0].region.name}</p>}
            <ul className="grid">
              {inRegion.map(move => (
                <MoveRow key={JSON.stringify(move.do)} move={move} onTake={take} />
              ))}
            </ul>
          </div>
        );
      })}
      <div className="mt-1 grid grid-cols-2 gap-2">
        <Button data-opens="other" onClick={() => setPicking(true)}>
          <Icon name="plus" size={14} />
          {t("moves.other")}
        </Button>
        <Button data-opens="time" onClick={() => open("time", { kind: "wait" })}>
          <Icon name="clock" size={14} />
          {t("time.label")}
        </Button>
      </div>
      <EventPicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(input, label) => {
          setPicking(false);
          take(input, label, "other");
        }}
      />
    </Section>
  );
}
