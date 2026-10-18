import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { beacon } from "@/canvas/beacon";
import { catalogStore } from "@/catalog/state";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { indexOf } from "@/lib/derived";
import { isSimulating } from "@/simulate/store";
import { editorStore, useEditor } from "@/store/editor";

import { diffOf, summaryOf, whereToShow } from "./diff";
import { proposalsStore, useProposals } from "./store";
import { whereIs } from "./where";

/** A value as a change shows it: short. */
const shortly = value => {
  if (value === undefined) return "—";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 40 ? `${text.slice(0, 39)}…` : text;
};

/** Whether the document has this element. */
const indexHas = (doc, id) => indexOf(doc).has(id);

/** The changes, in order, to step through: new, removed, changed. */
function stepsOf(diff) {
  return [
    ...diff.added.map(item => ({ ...item, mark: "+" })),
    ...diff.removed.map(item => ({ ...item, mark: "−" })),
    ...diff.changed.map(item => ({ ...item, mark: "~" }))
  ];
}

/**
 * A proposal of the agent's in the conversation (collaboration spec §7): its title, why, what it would do — counted,
 * then each change before → after —, Show where (drawn on the canvas, the first change's level shown and what it
 * touches ringing), ‹ › through the changes across levels, Accept, and
 * Reject with an optional reason. A removal says it was proposed for that, and offers to let the agent delete without
 * asking for the session. One that no longer applies says why, and can be dismissed.
 * @param {{ proposal: import("./store").Proposal, agent: string, onNavigate: (canvasId: string) => void }} props
 */
export function ProposalCard({ proposal, agent, onNavigate }) {
  const { t } = useTranslation("agent");
  const shown = useProposals(state => state.shown === proposal.id);
  const allowDeletes = useProposals(state => state.allowDeletes);
  const [step, setStep] = useState(-1);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [refused, setRefused] = useState(null);
  const { id, title, why, forced, state } = proposal;
  // What it would do to the document as it is now, which is what Accept applies it to.
  const doc = useEditor(store => store.doc);
  const live = useMemo(() => diffOf(doc, proposal.commands), [doc, proposal.commands]);
  const diff = live.ok ? live : proposal.diff;
  const [where, setWhere] = useState(null);
  const steps = stepsOf(diff);
  const summary = summaryOf(diff);
  // Where each change is seen: in the document as it is, or — for what the proposal adds — as it would leave it.
  const places = useMemo(
    () => stepsOf(diff).map(item => whereIs(indexHas(doc, item.id) ? doc : diff.preview, item.id)),
    [doc, diff]
  );
  const levels = new Set(places.map(place => place.level).filter(Boolean)).size;
  const counts = [
    ...(summary.added ? [t("proposal.new", { count: summary.added })] : []),
    ...(summary.removed ? [t("proposal.removed", { count: summary.removed })] : []),
    ...(summary.changed ? [t("proposal.changed", { count: summary.changed })] : [])
  ].join(", ");

  /**
   * Go to a change: its level — for a level the batch makes, the level of the box that would hold it — brought into
   * view with what it touches ringing (a new box once its ghost is drawn); the proposal drawn. A catalog item nothing
   * uses opens in the catalog.
   */
  const go = index => {
    setStep(index);
    const target = steps[index];
    const place = places[index];
    proposalsStore.getState().show(id);
    if (place?.catalog) {
      setWhere(null);
      return catalogStore.getState().show(place.catalog);
    }
    if (!target || !place?.level) return setWhere(null);
    const editor = editorStore.getState();
    const shown = whereToShow(editor.doc, diff.preview, place.level);
    setWhere(shown);
    if (!shown.level) return;
    if (shown.level !== editor.canvasId) onNavigate(shown.level);
    const level = editor.doc.canvases[shown.level];
    if (shown.fresh) {
      if (shown.owner && level?.nodes[shown.owner]) {
        editor.reveal(shown.level, shown.owner);
        beacon(shown.level, [shown.owner]);
      }
      return;
    }
    if (target.mark === "+" && !indexHas(editor.doc, target.id)) {
      proposalsStore.getState().setFocus({ level: place.level, id: target.id });
    }
    const ring = place.ids.filter(
      item => level?.nodes[item] || level?.edges[item] || editor.doc.annotations?.notes?.[item]
    );
    if (!ring.length) return;
    if (!isSimulating()) editor.reveal(shown.level, ring[0]);
    beacon(shown.level, ring);
  };

  if (state === "stale" || !live.ok) {
    return (
      <section
        data-testid="conversation-proposal"
        data-proposal={id}
        aria-label={t("proposal.label", { agent })}
        className="mb-1.5 grid gap-2 rounded-control border border-warning/50 bg-warning-soft px-3 py-2.5"
      >
        <p className="text-read font-medium text-ink">{title}</p>
        <p className="text-label text-warning">
          {t("proposal.stale", { reason: proposal.stale ?? live.error?.message })}
        </p>
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={() => proposalsStore.getState().dismiss(id)}>
            {t("proposal.dismiss")}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="conversation-proposal"
      data-proposal={id}
      aria-label={t("proposal.label", { agent })}
      className="mb-1.5 grid gap-2 rounded-control border border-accent/40 bg-accent-soft/40 px-3 py-2.5"
    >
      <div className="grid gap-0.5">
        <p className="text-read font-medium text-ink">{title}</p>
        {why && <p className="text-label text-sub">{why}</p>}
        {forced === "deletes" && (
          <p className="text-label text-warning">
            {t("proposal.forced", { names: diff.removed.map(item => item.name).join(", ") })}
          </p>
        )}
        {forced === "locked" && (
          <p className="text-label text-warning">
            {t("proposal.forcedLocked", {
              names: [...diff.added, ...diff.changed, ...diff.removed].map(item => item.name).join(", ")
            })}
          </p>
        )}
        <p className="text-label text-muted">
          {[counts, t("proposal.levels", { count: levels })].filter(Boolean).join(", ")}
        </p>
      </div>
      {diff.changed.length > 0 && (
        <ul className="grid gap-0.5 text-label text-sub">
          {diff.changed.flatMap(item =>
            item.fields.map(field => (
              <li key={`${item.id}.${field.path}`} className="truncate">
                {`${item.name}: ${field.path} ${shortly(field.before)} → ${shortly(field.after)}`}
              </li>
            ))
          )}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" onClick={() => (shown ? proposalsStore.getState().show(null) : go(Math.max(step, 0)))}>
          {shown ? t("proposal.hide") : t("proposal.show")}
        </Button>
        {steps.length > 0 && (
          <span className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label={t("proposal.previous")}
              disabled={step <= 0}
              onClick={() => go(step - 1)}
              className="grid size-7 place-items-center rounded-control text-sub hover:bg-subtle disabled:opacity-40"
            >
              <Icon name="arrow-left" size={14} />
            </button>
            <span className="min-w-12 text-center text-label tabular-nums text-muted">
              {step >= 0 ? t("proposal.step", { index: step + 1, count: steps.length }) : `${steps.length}`}
            </span>
            <button
              type="button"
              aria-label={t("proposal.next")}
              disabled={step >= steps.length - 1}
              onClick={() => go(step + 1)}
              className="grid size-7 place-items-center rounded-control text-sub hover:bg-subtle disabled:opacity-40"
            >
              <Icon name="arrow-right" size={14} />
            </button>
          </span>
        )}
        <span className="ml-auto flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setRejecting(true)}>
            {t("proposal.reject")}
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={async () => {
              const result = await proposalsStore.getState().accept(id);
              if (result && !result.ok && !result.stale) setRefused(result.reason);
            }}
          >
            {t("proposal.accept")}
          </Button>
        </span>
      </div>
      {step >= 0 && steps[step] && (
        <button
          type="button"
          onClick={() => go(step)}
          className="justify-self-start truncate rounded-control text-left text-label text-sub hover:text-accent"
        >
          {`${steps[step].mark} ${steps[step].name} (${steps[step].kind})`}
          {where?.fresh ? ` ${t("proposal.newLevel")}` : ""}
        </button>
      )}
      {rejecting && (
        <div className="flex items-center gap-1.5">
          <input
            aria-label={t("proposal.reason")}
            placeholder={t("proposal.reason")}
            value={reason}
            onChange={event => setReason(event.target.value)}
            onKeyDown={event => event.stopPropagation()}
            className="h-8 min-w-0 flex-1 rounded-control border border-control-border bg-surface px-2.5 text-ui text-ink outline-none placeholder:text-muted focus:border-accent"
          />
          <Button size="sm" onClick={() => proposalsStore.getState().reject(id, reason.trim() || undefined)}>
            {t("proposal.rejectIt")}
          </Button>
        </div>
      )}
      {forced === "deletes" && (
        <label className="flex items-center gap-2 text-label text-sub">
          <input
            type="checkbox"
            checked={allowDeletes}
            onChange={event => proposalsStore.getState().setAllowDeletes(event.target.checked)}
          />
          {t("proposal.allowDeletes", { agent })}
        </label>
      )}
      {refused && <p className="text-label text-danger">{t("proposal.refused", { reason: refused })}</p>}
    </section>
  );
}
