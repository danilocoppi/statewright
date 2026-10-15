import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { useEditor } from "@/store/editor";

import { exportScenario } from "./actions";

/**
 * Scenario page… (simulator spec §7.2: "the Export menu, listing scenarios"): the project's scenarios by the level they
 * run, each saved as a page anyone can open when it is picked.
 * @param {{ open: boolean, onClose: () => void }} props
 */
export function ScenarioPageDialog({ open, onClose }) {
  const { t } = useTranslation("editor");
  const doc = useEditor(state => state.doc);
  const scenarios = Object.entries(doc.annotations?.scenarios ?? {})
    .map(([id, scenario]) => ({ id, scenario, level: doc.canvases[scenario.canvas]?.name ?? scenario.canvas }))
    .sort((a, b) => a.level.localeCompare(b.level) || a.scenario.name.localeCompare(b.scenario.name));
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("export.scenarioPageTitle")}
      description={t("export.scenarioPageDescription")}
      actions={
        <Button variant="ghost" onClick={onClose}>
          {t("common:actions.cancel")}
        </Button>
      }
    >
      <ul className="-mx-2 grid">
        {scenarios.map(({ id, scenario, level }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => {
                onClose();
                exportScenario(id, t);
              }}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-control px-2 py-2 text-left hover:bg-subtle"
            >
              <span className="min-w-0">
                <span className="block truncate text-read font-medium text-ink">{scenario.name}</span>
                <span className="block truncate text-ui text-muted">
                  {t("export.scenarioOf", { level, count: scenario.steps.length })}
                </span>
              </span>
              <Icon name="download" size={15} className="text-muted" />
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
