import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { IconButton } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { Menu } from "@/components/ui/Menu";
import { describeTime } from "@/lib/time";

const svgUrl = svg => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/**
 * A project on the Projects screen (mockup 03): a preview of its top level cropped from the left, its name, stage and
 * last edit, and a menu.
 * @param {{ summary: import("@/persistence/repository").Summary, now: number, onRename: () => void,
 *   onSaveToFile: () => void, onDuplicate: () => void, onDelete: () => void }} props
 */
export function ProjectCard({ summary, now, onRename, onSaveToFile, onDuplicate, onDelete }) {
  const { t, i18n } = useTranslation("projects");
  return (
    <article
      data-testid="projects-card"
      className="group relative rounded-island border border-hairline bg-surface transition-shadow duration-150 hover:shadow-island has-[[aria-expanded=true]]:z-10"
    >
      <Link
        to={`/p/${summary.id}`}
        className="block outline-offset-[-2px]"
        aria-label={`${t("actions.open")} ${summary.name}`}
      >
        <div className="h-[132px] overflow-hidden rounded-t-[calc(var(--radius-island)-1px)] border-b border-hairline bg-surface pl-3 pt-3.5 dark:bg-white">
          {summary.thumbnail && (
            <img src={svgUrl(summary.thumbnail)} alt="" className="h-[108px] w-auto max-w-none" draggable="false" />
          )}
        </div>
        <div className="px-3 pb-3 pt-2.5">
          <h3 className="truncate pr-8 text-[13px] font-medium">{summary.name}</h3>
          <p className="mt-1 flex items-center gap-2 text-muted">
            {summary.stage && <Chip>{t(`stage.${summary.stage}`)}</Chip>}
            <span className="truncate">
              {t("edited", { when: describeTime(summary.updatedAt, now, i18n.language) })}
            </span>
          </p>
        </div>
      </Link>
      <Menu
        label={summary.name}
        className="absolute bottom-2 right-2"
        sections={[
          {
            items: [
              { id: "rename", label: t("actions.rename"), icon: <Icon name="pencil" />, onSelect: onRename },
              { id: "save", label: t("actions.saveToFile"), icon: <Icon name="download" />, onSelect: onSaveToFile },
              { id: "duplicate", label: t("actions.duplicate"), icon: <Icon name="duplicate" />, onSelect: onDuplicate }
            ]
          },
          { items: [{ id: "delete", label: t("actions.delete"), icon: <Icon name="trash" />, onSelect: onDelete }] }
        ]}
        trigger={props => (
          <IconButton label={t("actions.more", { name: summary.name })} {...props}>
            <Icon name="more" />
          </IconButton>
        )}
      />
    </article>
  );
}
