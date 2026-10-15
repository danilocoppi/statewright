import { useTranslation } from "react-i18next";

import { Icon } from "@/components/ui/Icon";
import { Menu } from "@/components/ui/Menu";
import { exportScenario } from "@/features/editor/actions";
import { useProblems } from "@/problems/store";
import { useEditor } from "@/store/editor";

import { enterFullScreen } from "./stage";
import { simulationStore } from "./store";

/**
 * The scenarios of the machine or flow about to be simulated (simulator spec §6.2, mockup 02): each with its last
 * result — the same as recorded, or where it now goes elsewhere, as Problems found it — Run, which follows it one
 * step at a time, Present, which shows it on the stage (spec §7.1), and its menu: Export as page… (spec §7.2).
 * @param {{ canvas: string }} props
 */
export function Scenarios({ canvas }) {
  const { t } = useTranslation("simulate");
  const doc = useEditor(state => state.doc);
  const checked = useProblems(state => state.version !== null);
  const problems = useProblems(state => state.list);
  const diverged = problems.filter(problem => problem.code === "scenario.diverged");
  const scenarios = Object.entries(doc.annotations?.scenarios ?? {})
    .filter(([, scenario]) => scenario.canvas === canvas)
    .sort(([, a], [, b]) => a.name.localeCompare(b.name));
  if (!scenarios.length) return null;
  return (
    <section aria-labelledby="simulate-scenarios" className="grid gap-2 border-t border-hairline px-4 py-3.5">
      <h3 id="simulate-scenarios" className="text-ui text-muted">
        {t("scenarios.title")}
      </h3>
      <ul className="-mx-2 grid">
        {scenarios.map(([id, scenario]) => {
          const problem = diverged.find(item => item.target === id);
          const steps = scenario.steps.length;
          const result =
            !checked ? t("scenarios.checking", { count: steps })
            : !problem ? t("scenarios.same", { count: steps })
            : problem.data?.step === 0 ? t("scenarios.changedAtStart")
            : t("scenarios.changedAt", { step: problem.data?.step, count: steps });
          return (
            <li
              key={id}
              className="grid grid-cols-[18px_minmax(0,1fr)_auto_auto_auto] items-start gap-x-1 rounded-control px-2 py-1.5"
            >
              <span className="mr-1.5 pt-0.5">
                {checked && (
                  <Icon
                    name={problem ? "alert" : "check"}
                    size={15}
                    label={problem ? t("scenarios.changedLabel") : t("scenarios.sameLabel")}
                    className={problem ? "text-warning" : "text-success"}
                  />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-read text-ink">{scenario.name}</span>
                <span className="block text-ui text-muted">{result}</span>
              </span>
              <button
                type="button"
                aria-label={t("scenarios.run", { name: scenario.name })}
                title={t("scenarios.run", { name: scenario.name })}
                onClick={() => simulationStore.getState().follow(id)}
                className="grid size-7 place-items-center rounded-control text-sub hover:bg-subtle hover:text-ink"
              >
                <Icon name="play" size={14} />
              </button>
              <button
                type="button"
                aria-label={t("scenarios.present", { name: scenario.name })}
                title={t("scenarios.present", { name: scenario.name })}
                onClick={() => {
                  simulationStore.getState().present(id);
                  enterFullScreen();
                }}
                className="grid size-7 place-items-center rounded-control text-sub hover:bg-subtle hover:text-ink"
              >
                <Icon name="present" size={15} />
              </button>
              <Menu
                label={t("scenarios.more", { name: scenario.name })}
                sections={[
                  {
                    items: [
                      {
                        id: "page",
                        label: t("scenarios.exportPage"),
                        icon: <Icon name="file" />,
                        onSelect: () => exportScenario(id, t)
                      }
                    ]
                  }
                ]}
                menuClassName="w-56"
                trigger={props => (
                  <button
                    type="button"
                    {...props}
                    aria-label={t("scenarios.more", { name: scenario.name })}
                    title={t("scenarios.more", { name: scenario.name })}
                    className="grid size-7 place-items-center rounded-control text-sub hover:bg-subtle hover:text-ink"
                  >
                    <Icon name="more" size={14} />
                  </button>
                )}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
