import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { REPOSITORY, WALLETS } from "@/config/app";
import { useCopy } from "@/lib/useCopy";

import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";

/**
 * Support the project: a heart and "Support", a small pill always at the bottom right of every screen (hidden on the
 * stage and in print), that opens the wallets that take donations above it — each with its networks, its address in
 * full and a Copy button — and the source on GitHub. Esc closes it and gives the focus back to the pill; a click
 * outside closes it and leaves the focus where the person clicked. Nothing is requested and nothing is counted.
 *
 * The Editor stacks its islands at the bottom right (the minimap, the legend) above the pill, and stops the panels on
 * the right above it (Canvas.jsx): it measures the pill by its `data-support` hook.
 */
export function SupportBadge() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const badge = useRef(null);
  const popover = useRef(null);
  const titleId = useId();
  const ledeId = useId();
  const popoverId = useId();
  const { copied, copy } = useCopy();

  useEffect(() => {
    if (!open) return;
    popover.current?.focus();
    const onPointerDown = event => {
      if (!popover.current?.contains(event.target) && !badge.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    badge.current?.focus();
  };

  return (
    <>
      <button
        ref={badge}
        type="button"
        data-support=""
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => setOpen(current => !current)}
        className="fixed bottom-4 right-4 z-10 flex h-8 items-center gap-1.5 rounded-full border border-island-border bg-island pl-2.5 pr-3 text-ui font-medium text-ink shadow-island backdrop-blur-md backdrop-saturate-150 transition-colors duration-150 hover:bg-surface aria-expanded:bg-surface print:hidden"
      >
        <Icon name="heart" size={14} className="text-heart" />
        {t("support.badge")}
      </button>
      {open && (
        <section
          ref={popover}
          id={popoverId}
          role="dialog"
          aria-labelledby={titleId}
          aria-describedby={ledeId}
          tabIndex={-1}
          onKeyDown={event => {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            close();
          }}
          onBlur={event => {
            // The focus leaving for elsewhere on the page (Tab past the last link) closes it.
            const to = event.relatedTarget;
            if (to && !popover.current?.contains(to) && !badge.current?.contains(to)) setOpen(false);
          }}
          className="fixed bottom-14 right-4 z-50 w-[min(376px,calc(100vw-32px))] rounded-island border border-island-border bg-surface p-4 text-ink shadow-dialog outline-none motion-safe:animate-[fade-in_160ms_var(--ease-soft)] print:hidden"
        >
          <h2 id={titleId} className="text-title font-semibold tracking-tight">
            {t("support.title")}
          </h2>
          <p id={ledeId} className="mt-1 text-ui leading-relaxed text-sub">
            {t("support.lede")}
          </p>
          <ul aria-label={t("support.wallets")} className="mt-3.5 grid gap-2">
            {WALLETS.map(wallet => (
              <li key={wallet.id} className="rounded-control border border-hairline bg-subtle/60 py-2 pl-3 pr-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-label font-medium text-ink">{wallet.network}</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={
                      copied === wallet.id ? t("support.copied") : t("support.copyAddress", { network: wallet.network })
                    }
                    onClick={() => copy(wallet.id, wallet.address)}
                    className="-my-0.5 h-6 px-2 text-label"
                  >
                    <Icon name={copied === wallet.id ? "check" : "copy"} size={12} />
                    {copied === wallet.id ? t("support.copied") : t("support.copy")}
                  </Button>
                </div>
                <code className="mt-1 block select-all break-all pr-1 font-mono text-[11.5px] leading-snug text-sub">
                  {wallet.address}
                </code>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-label text-muted">{t("support.note")}</p>
          <p role="status" className="sr-only">
            {copied && t("support.copied")}
          </p>
          <div className="mt-3 border-t border-hairline pt-2.5">
            <a
              href={REPOSITORY}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-control text-ui text-sub hover:text-ink"
            >
              <Icon name="github" size={14} />
              {t("support.source")}
              <span className="sr-only">({t("guide.newTab")})</span>
            </a>
          </div>
        </section>
      )}
    </>
  );
}
