import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BADGE, legendFor, MUTED } from "statewright";

import { Island } from "@/components/ui/Island";
import { guideHref } from "@/guide/links";
import { useEditor } from "@/store/editor";

import { EdgeSwatch, NodeSwatch } from "./LegendSwatch";
import { paint } from "./palette";

/** One entry: a swatch drawn as the figure draws it, and its wording. */
function Entry({ swatch, children }) {
  return (
    <li className="flex items-center gap-2">
      {swatch}
      <span className="text-ui text-sub">{children}</span>
    </li>
  );
}

/** A swatch of the legend's own (a chip, a finding's badge). */
const Drawn = ({ children }) => (
  <svg aria-hidden="true" width="28" height="14" viewBox="0 0 28 14" className="shrink-0 overflow-visible">
    {children}
  </svg>
);

/**
 * The legend of the level (spec §6.1, `legendFor`): the node styles, edge styles, chips and findings the figure uses,
 * in the document's own wording — as in the exported figure.
 */
export function Legend() {
  const { t } = useTranslation("editor");
  const doc = useEditor(state => state.doc);
  const canvasId = useEditor(state => state.canvasId);
  const legend = useMemo(() => legendFor(doc, canvasId), [doc, canvasId]);
  const count = legend.nodes.length + legend.edges.length + legend.chips.length + (legend.findings ? 1 : 0);
  // As wide as what it lists: up to three columns as wide as its longest entry, within 540 px.
  return (
    <Island
      as="section"
      aria-label={t("legend.title")}
      className="w-max max-w-[min(540px,calc(100vw-32px))] px-3.5 py-3"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-label text-muted">{t("legend.title")}</h2>
        <a
          href={guideHref("reading-a-diagram")}
          target="_blank"
          rel="noreferrer"
          className="text-label text-accent hover:underline"
        >
          {t("legend.howToRead")} <span className="sr-only">({t("common:guide.newTab")})</span>
        </a>
      </div>
      {!count ?
        <p className="mt-1.5 text-ui text-sub">{t("legend.empty")}</p>
      : <ul
          className="mt-2 grid gap-x-5 gap-y-1.5"
          style={{ gridTemplateColumns: `repeat(${Math.min(count, 3)}, minmax(0, 1fr))` }}
        >
          {legend.nodes.map(item => (
            <Entry key={item.key} swatch={<NodeSwatch fill={item.fill} stroke={item.stroke} dash={item.dash} />}>
              {item.label}
            </Entry>
          ))}
          {legend.edges.map(item => (
            <Entry
              key={item.key}
              swatch={<EdgeSwatch styleKey={item.key} stroke={item.stroke} width={item.width} dash={item.dash} />}
            >
              {item.label}
            </Entry>
          ))}
          {legend.chips.map(item => (
            <Entry
              key={item.text}
              swatch={
                <Drawn>
                  <rect
                    x="0.5"
                    y="0.5"
                    width="27"
                    height="13"
                    rx="2"
                    fill="none"
                    stroke={paint(MUTED)}
                    strokeOpacity="0.45"
                  />
                  <text
                    x="14"
                    y="10"
                    textAnchor="middle"
                    fontSize="7"
                    fontFamily="var(--font-mono)"
                    fill={paint(MUTED)}
                  >
                    {item.text}
                  </text>
                </Drawn>
              }
            >
              {item.label}
            </Entry>
          ))}
          {legend.findings && (
            <Entry
              swatch={
                <Drawn>
                  <rect x="2" y="0" width="24" height="14" rx="3" fill={paint(BADGE.fill)} />
                  <text
                    x="14"
                    y="10"
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="600"
                    fontFamily="var(--font-mono)"
                    fill={paint(BADGE.color)}
                  >
                    F
                  </text>
                </Drawn>
              }
            >
              {t("legend.finding")}
            </Entry>
          )}
        </ul>
      }
    </Island>
  );
}
