import { useTranslation } from "react-i18next";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

import { EXAMPLES } from "./examples";

function Tile({ icon, title, hint, onClick, dashed }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-[74px] items-center gap-3 rounded-island border px-3.5 text-left transition-colors duration-150",
        dashed ?
          "border-[1.5px] border-dashed border-control-border bg-surface/60 text-sub hover:border-accent"
        : "border-hairline bg-surface hover:border-control-border"
      )}
    >
      <span
        className={cn(
          "grid size-[34px] shrink-0 place-items-center rounded-control",
          dashed ? "border border-dashed border-control-border" : "bg-subtle text-ink"
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-ink">{title}</span>
        <span className="block truncate text-muted">{hint}</span>
      </span>
    </button>
  );
}

/**
 * "Start something new" and the examples (mockup 03).
 * @param {{ onStart: (kind: string) => void, onOpenFile: () => void, onExample: (example: object) => void }} props
 */
export function StartTiles({ onStart, onOpenFile, onExample }) {
  const { t } = useTranslation("projects");
  return (
    <div className="grid gap-8">
      <section>
        <h2 className="mb-2.5 text-[12px] font-medium text-muted">{t("start.title")}</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-[18px]">
          {["system", "machine", "flow"].map(kind => (
            <Tile
              key={kind}
              icon={<Icon name={kind} />}
              title={t(`start.${kind}`)}
              hint={t(`start.${kind}Hint`)}
              onClick={() => onStart(kind)}
            />
          ))}
          <Tile
            dashed
            icon={<Icon name="upload" size={14} />}
            title={t("start.drop")}
            hint={t("start.dropHint")}
            onClick={onOpenFile}
          />
        </div>
      </section>
      <section>
        <h2 className="mb-2.5 text-[12px] font-medium text-muted">{t("examples.title")}</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-[18px]">
          {EXAMPLES.map(example => (
            <Tile
              key={example.id}
              icon={<Icon name="sparkle" />}
              title={t(`examples.${example.id}`)}
              hint={t(`examples.${example.id}Hint`)}
              onClick={() => onExample(example)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
