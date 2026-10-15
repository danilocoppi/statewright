import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { typing } from "@/agent/busy";
import { Icon } from "@/components/ui/Icon";
import { guideHref } from "@/guide/links";

/** The guide's section on simulating (spec §8: the panel links to it). */
export const GUIDE_SECTION = "simulating-and-scenarios";

/** The panel's header: its title, what it simulates, the guide, then its own actions (`children`). */
export function PanelHeader({ title, subtitle, children }) {
  const { t } = useTranslation("simulate");
  return (
    <header className="flex items-start gap-1 px-4 pb-3 pt-3.5">
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-title font-semibold tracking-tight">{title}</h2>
        <p className="text-ui text-muted">{subtitle}</p>
      </div>
      <a
        href={guideHref(GUIDE_SECTION)}
        target="_blank"
        rel="noreferrer"
        aria-label={t("panel.guide")}
        title={t("panel.guide")}
        className="grid size-7 shrink-0 place-items-center rounded-control text-sub hover:bg-subtle hover:text-ink"
      >
        <Icon name="book" size={14} />
      </a>
      {children}
    </header>
  );
}

/** A section of the panel: its title, then what it holds. */
export function Section({ title, id, children }) {
  return (
    <section aria-labelledby={id} className="grid gap-2 border-t border-hairline px-4 py-3.5">
      <h3 id={id} className="text-ui text-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** The dot that means "here, now": on the canvas, in the actions island and in Now. */
export function HereDot() {
  return (
    <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-accent shadow-[0_0_0_3px_var(--accent-soft)]" />
  );
}

/**
 * What the run waits on before it goes on (spec §6.2, mockup 03): a question, a payload, a time to wait — in the run's
 * colour, above where it is now. `heading` is what arrived.
 * @param {{ label: string, heading: import("react").ReactNode, children: import("react").ReactNode,
 *   onKeyDown?: (event: KeyboardEvent) => void }} props
 */
export function Card({ label, heading, children, onKeyDown, testId }) {
  // It takes the place of what was clicked: the focus goes into it, to its first control — unless the person is typing
  // in a field (an agent's step asked it: AI interface spec §7.3).
  const ref = useRef(null);
  useEffect(() => {
    if (typing()) return;
    ref.current?.querySelector("input, select, textarea, button:not(:disabled)")?.focus();
  }, []);
  return (
    <div className="px-3 py-3">
      <section
        ref={ref}
        aria-label={label}
        data-testid={testId}
        onKeyDown={onKeyDown}
        className="grid gap-3 rounded-[10px] border border-accent/30 bg-accent-soft/60 px-3.5 py-3"
      >
        <p className="flex min-w-0 items-center gap-2 text-read">{heading}</p>
        {children}
      </section>
    </div>
  );
}

/** What arrived, as a card's heading says it: the input's icon, its name in the run's colour, then the words. */
export function Arrived({ icon, name, words }) {
  return (
    <>
      <Icon name={icon} size={15} className="shrink-0 text-accent" />
      {name && <span className="truncate font-mono text-[13px] text-accent">{name}</span>}
      <span className="shrink-0 text-sub">{words}</span>
    </>
  );
}
