import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { pathTo } from "statewright";

import { Icon } from "@/components/ui/Icon";
import { Island } from "@/components/ui/Island";
import { cn } from "@/lib/cn";
import { useEditor } from "@/store/editor";

import { levelUrl } from "./levels";

/**
 * The path of levels from the top to the one shown (spec §6.3); every level is a link, and ← goes up one. Drawn between
 * the project and the actions islands: where it lacks room, the levels above give way first.
 */
export function Breadcrumb() {
  const { t } = useTranslation("editor");
  const doc = useEditor(state => state.doc);
  const canvasId = useEditor(state => state.canvasId);
  const path = pathTo(doc, canvasId) ?? [{ canvas: canvasId }];
  const parent = path.at(-2);
  return (
    <Island
      as="nav"
      aria-label={t("breadcrumb")}
      data-testid="levels-breadcrumb"
      data-area="levels"
      className="flex h-10 min-w-0 max-w-full items-center gap-0.5 justify-self-center px-1.5 max-[900px]:hidden"
    >
      {parent && (
        <Link
          to={levelUrl(doc, parent.canvas)}
          aria-label={t("back")}
          className="grid size-7 place-items-center rounded-control text-muted hover:bg-subtle hover:text-ink"
        >
          <Icon name="arrow-left" size={14} />
        </Link>
      )}
      {path.map(({ canvas }, index) => (
        <Fragment key={canvas}>
          {index > 0 && (
            <span className="text-control-border" aria-hidden="true">
              /
            </span>
          )}
          <Link
            to={levelUrl(doc, canvas)}
            aria-current={canvas === canvasId ? "page" : undefined}
            className={cn(
              "truncate rounded-control px-2.5 py-1.5 hover:bg-subtle",
              canvas === canvasId && "max-w-full shrink-0 bg-subtle font-medium"
            )}
          >
            {doc.canvases[canvas]?.name ?? canvas}
          </Link>
        </Fragment>
      ))}
    </Island>
  );
}
