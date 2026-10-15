import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import guide from "virtual:statewright-guide";

import { DiagramDefs } from "@/canvas/DiagramDefs";
import { SupportBadge } from "@/components/SupportBadge";
import { Button } from "@/components/ui/Button";
import { buttonClass } from "@/components/ui/buttonClass";
import { Icon } from "@/components/ui/Icon";
import { useCopy } from "@/lib/useCopy";

import { Blocks } from "./Blocks";
import { asset } from "./links";
import { useSection } from "./useSection";

/**
 * The platform guide (spec §8.4, mockup 14): Core's README, rendered at build time, with an index of its sections,
 * the raw Markdown and a copy of the whole guide for an AI agent. Its text is English in every interface language.
 */
export default function GuidePage() {
  const { t, i18n } = useTranslation();
  const { hash } = useLocation();
  const target = decodeURIComponent(hash.slice(1));
  const { section, sub } = useSection(guide.sections);
  const { copied, copy } = useCopy();

  // The page is drawn after the address is read, so the browser could not go to what it points at: go there once
  // drawn, and again once the fonts are in (they move everything). Later links are the browser's own.
  const arrival = useRef(target);
  useEffect(() => {
    const id = arrival.current;
    if (!id) return;
    const go = () => document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" });
    go();
    document.fonts?.ready.then(go);
  }, []);

  return (
    <div className="sw-guide min-h-screen bg-canvas text-read leading-relaxed text-sub">
      <DiagramDefs />
      <nav
        aria-label={t("guide.sections")}
        className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-hairline bg-canvas md:flex"
      >
        <div className="px-5 pb-3 pt-6">
          <p className="text-ui font-semibold text-ink">{t("guide.title")}</p>
          {i18n.resolvedLanguage !== "en" && <p className="mt-1 text-label text-muted">{t("guide.inEnglish")}</p>}
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto pb-4">
          {guide.sections.map(item => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={item.id === section ? "location" : undefined}
                className="block border-l-2 border-transparent py-1.5 pl-[18px] pr-4 text-ui text-sub hover:text-ink aria-[current]:border-ink aria-[current]:bg-subtle aria-[current]:font-medium aria-[current]:text-ink"
              >
                {item.text}
              </a>
              {item.id === section && item.children.length > 0 && (
                <ul className="pb-1">
                  {item.children.map(child => (
                    <li key={child.id}>
                      <a
                        href={`#${child.id}`}
                        aria-current={child.id === sub ? "location" : undefined}
                        className="block py-1 pl-8 pr-4 text-[12px] text-muted hover:text-ink aria-[current]:text-ink"
                      >
                        {child.text}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        <Link
          to="/"
          className="flex items-center gap-2 border-t border-hairline px-5 py-3.5 text-ui text-sub hover:text-ink"
        >
          <Icon name="arrow-left" size={14} />
          {t("actions.goHome")}
        </Link>
      </nav>

      <main className="md:pl-60">
        <div className="mx-auto max-w-[960px] px-6 pb-24 pt-6 sm:px-12">
          <div className="flex items-center justify-end gap-2">
            <Link to="/" className="mr-auto flex items-center gap-2 text-ui text-sub hover:text-ink md:hidden">
              <Icon name="arrow-left" size={14} />
              {t("actions.goHome")}
            </Link>
            <a href={asset("README.md")} target="_blank" rel="noreferrer" className={buttonClass()}>
              {t("guide.raw")} <span className="sr-only">({t("guide.newTab")})</span>
            </a>
            <Button onClick={() => copy("guide", guide.markdown)}>
              {copied && <Icon name="check" size={14} />}
              {copied ? t("guide.copied") : t("guide.copyAll")}
            </Button>
          </div>
          <article lang="en" className="mt-2">
            <Blocks blocks={guide.blocks} target={target} />
          </article>
        </div>
      </main>
      <SupportBadge />
    </div>
  );
}
