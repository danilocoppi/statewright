import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";

const SHOWN = 12;
const SECTIONS = ["content", "layout", "annotations"];
const STATE_DOT = { ok: "bg-success", changed: "bg-warning", missing: "bg-muted" };
const CHANGE = {
  added: { glyph: "+", tone: "text-success" },
  changed: { glyph: "~", tone: "text-warning" },
  removed: { glyph: "−", tone: "text-danger" }
};

function Warning() {
  return (
    <span
      aria-hidden="true"
      className="grid size-[22px] shrink-0 place-items-center rounded-full bg-warning-soft text-[13px] font-bold text-warning"
    >
      !
    </span>
  );
}

function Errors({ plan }) {
  const { t } = useTranslation("files");
  const rest = plan.errors.length - SHOWN;
  return (
    <ul tabIndex={0} className="max-h-64 overflow-auto rounded-control border border-hairline">
      {plan.errors.slice(0, SHOWN).map((error, index) => (
        <li key={index} className="grid gap-0.5 border-t border-hairline px-3 py-2 first:border-t-0">
          {error.path && <span className="font-mono text-label text-sub">{error.path}</span>}
          <span lang="en">{error.message}</span>
        </li>
      ))}
      {rest > 0 && (
        <li className="border-t border-hairline px-3 py-2 text-muted">{t("import.moreErrors", { count: rest })}</li>
      )}
    </ul>
  );
}

function Review({ plan }) {
  const { t, i18n } = useTranslation("files");
  const changes = plan.diff?.changes ?? [];
  const rest = changes.length - SHOWN;
  const signedAt = plan.local?.signature?.signedAt;
  const typeOf = change =>
    change.type === "catalog" ? t(`import.types.catalog.${change.collection}`) : t(`import.types.${change.type}`);
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-3 rounded-[10px] border border-hairline">
        {SECTIONS.map(section => (
          <div key={section} className="border-l border-hairline px-3 py-2.5 first:border-l-0">
            <div className="text-label text-muted">{t(`import.sections.${section}`)}</div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className={cn("size-[7px] rounded-full", STATE_DOT[plan.sections[section]])} aria-hidden="true" />
              {t(`import.state.${plan.sections[section]}`)}
            </div>
          </div>
        ))}
      </div>
      {plan.diff && (
        <div>
          {signedAt && (
            <h3 className="mb-1.5 text-label font-medium text-muted">
              {t("import.compared", {
                date: new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" }).format(
                  new Date(signedAt)
                )
              })}
            </h3>
          )}
          <ul tabIndex={0} className="max-h-56 overflow-auto">
            {changes.slice(0, SHOWN).map(change => (
              <li
                key={`${change.change}:${change.id}`}
                className="grid grid-cols-[18px_1fr] border-t border-subtle py-1.5"
              >
                <span className={cn("font-mono font-semibold", CHANGE[change.change].tone)} aria-hidden="true">
                  {CHANGE[change.change].glyph}
                </span>
                <span>
                  <span className="sr-only">{change.change} </span>
                  {typeOf(change)} <b className="font-semibold">{change.name}</b>
                  {change.canvasName && (
                    <span className="text-sub"> {t("import.in", { name: change.canvasName })}</span>
                  )}
                </span>
              </li>
            ))}
            {rest > 0 && (
              <li className="border-t border-subtle py-1.5 pl-[18px] text-muted">
                {t("import.moreChanges", { count: rest })}
              </li>
            )}
            {plan.diff.layout > 0 && (
              <li className="border-t border-subtle py-1.5 pl-[18px] text-sub">
                {t("import.layoutChanges", { count: plan.diff.layout })}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Explains an import that cannot go straight in (spec §4.5, mockup 06): the errors of an invalid file, or the review
 * of a file changed outside Statewright or of a project this browser already has.
 * @param {{ plan: import("@/files/import").ImportPlan | null, onAccept: (as: "replace" | "copy") => void,
 *   onClose: () => void }} props
 */
export function ImportDialog({ plan, onAccept, onClose }) {
  const { t } = useTranslation("files");
  if (!plan) return <Dialog open={false} onClose={onClose} title="" />;

  if (plan.status === "invalid") {
    return (
      <Dialog
        open
        onClose={onClose}
        icon={<Warning />}
        title={t("import.invalidTitle")}
        description={t("import.invalidDescription", { file: plan.fileName })}
        actions={
          <Button variant="primary" onClick={onClose}>
            {t("import.close")}
          </Button>
        }
      >
        <Errors plan={plan} />
      </Dialog>
    );
  }

  const states = Object.values(plan.sections);
  const kind =
    states.includes("missing") ? "unsigned"
    : states.includes("changed") ? "changed"
    : "exists";
  return (
    <Dialog
      open
      onClose={onClose}
      icon={<Warning />}
      title={t(`import.${kind}Title`)}
      description={t(`import.${kind}Description`, { file: plan.fileName, name: plan.doc.project.name })}
      actions={
        <>
          <Button onClick={onClose}>{t("import.cancel")}</Button>
          <Button onClick={() => onAccept("copy")}>{t("import.asCopy")}</Button>
          <Button variant="primary" onClick={() => onAccept("replace")}>
            {t("import.importAndSign")}
          </Button>
        </>
      }
    >
      <Review plan={plan} />
    </Dialog>
  );
}
