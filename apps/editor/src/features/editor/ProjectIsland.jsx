import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { BrandMark } from "@/components/BrandMark";
import { languageItems, themeItems } from "@/components/preferences";
import { Icon } from "@/components/ui/Icon";
import { Island } from "@/components/ui/Island";
import { Menu } from "@/components/ui/Menu";
import { LANGUAGES } from "@/config/app";
import { catalogStore } from "@/catalog/state";
import { openGuide } from "@/guide/links";
import { inspectorStore } from "@/inspector/state";
import { useSimulation } from "@/simulate/store";
import { editorStore, useEditor } from "@/store/editor";
import { THEMES, useTheme } from "@/stores/theme";
import { useView } from "@/stores/view";

/**
 * The project island (spec §6.1): back to the projects, the project's name and stage, its menu, and whether the last
 * change is saved.
 * @param {{ mac: boolean, onRename: () => void, onLevels: () => void, onSave: () => void, onSaveCopy: () => void,
 *   onConnect: () => void }} props `onConnect`: Connect an AI… (AI interface spec §7.4).
 */
export function ProjectIsland({ mac, onRename, onLevels, onSave, onSaveCopy, onConnect }) {
  const { t, i18n } = useTranslation(["editor", "projects", "common", "agent"]);
  const navigate = useNavigate();
  const doc = useEditor(state => state.doc);
  const readOnly = useEditor(state => state.readOnly);
  const history = useEditor(state => state.history);
  const status = useEditor(state => state.status);
  const version = useEditor(state => state.version);
  // While simulating, the menu edits nothing (simulator spec §6.1).
  const simulating = useSimulation(state => state.mode !== null);
  const view = useView();
  const theme = useTheme(state => state.theme);
  const setTheme = useTheme(state => state.setTheme);
  const stage = doc.canvases[doc.root]?.stage;
  const command = mac ? "⌘" : "Ctrl+";
  const shift = mac ? "⇧⌘" : "Ctrl+Shift+";

  return (
    <Island
      role="group"
      aria-label={t("islands.project")}
      data-testid="project-island"
      data-area="project"
      className="flex h-10 min-w-0 max-w-[min(260px,100%)] items-center gap-0.5 justify-self-start pl-1 pr-1"
    >
      <Link
        to="/"
        aria-label={t("menu.close")}
        title={t("menu.close")}
        className="grid size-8 shrink-0 place-items-center rounded-control hover:bg-subtle"
      >
        <BrandMark />
      </Link>
      <Menu
        label={t("menu.label")}
        testId="project-menu"
        align="start"
        className="min-w-0"
        sections={[
          {
            items: [
              { id: "rename", label: t("menu.rename"), disabled: readOnly || simulating, onSelect: onRename },
              {
                id: "details",
                label: t("menu.projectDetails"),
                disabled: simulating,
                onSelect: () => inspectorStore.getState().show(doc.project.id)
              },
              { id: "levels", label: t("menu.levels"), onSelect: onLevels },
              {
                id: "catalog",
                label: t("menu.catalog"),
                shortcut: "G",
                disabled: simulating,
                onSelect: () => catalogStore.getState().show()
              },
              { id: "save", label: t("menu.saveToFile"), shortcut: `${command}S`, onSelect: onSave },
              { id: "saveCopy", label: t("menu.saveCopy"), shortcut: `${shift}S`, onSelect: onSaveCopy }
            ]
          },
          {
            title: t("menu.edit"),
            items: [
              {
                id: "undo",
                // An agent's change says so (AI interface spec §7.3: "Undo <label> (AI)").
                label:
                  history.past.at(-1)?.origin === "ai" ?
                    t("agent:change.undoChange", { label: history.past.at(-1).label })
                  : t("menu.undo"),
                shortcut: `${command}Z`,
                disabled: readOnly || simulating || history.past.length === 0,
                onSelect: () => editorStore.getState().undo()
              },
              {
                id: "redo",
                label:
                  history.future[0]?.origin === "ai" ?
                    t("agent:change.redoChange", { label: history.future[0].label })
                  : t("menu.redo"),
                shortcut: `${shift}Z`,
                disabled: readOnly || simulating || history.future.length === 0,
                onSelect: () => editorStore.getState().redo()
              }
            ]
          },
          {
            title: t("menu.view"),
            items: ["findings", "notes", "focus", "lanes", "legend", "minimap", "incomplete"].map(key => ({
              id: key,
              label: t(`menu.${key}`),
              toggle: true,
              checked: view[key],
              onSelect: () => view.toggle(key)
            }))
          },
          { title: t("common:theme.label"), items: themeItems({ t, theme, setTheme, themes: THEMES }) },
          {
            title: t("common:language.label"),
            items: languageItems({ t, current: i18n.resolvedLanguage ?? LANGUAGES[0] })
          },
          {
            items: [
              { id: "connect", label: t("agent:pairing.menu"), onSelect: onConnect },
              { id: "guide", label: t("menu.guide"), onSelect: () => openGuide() },
              { id: "close", label: t("menu.close"), onSelect: () => navigate("/") }
            ]
          }
        ]}
        trigger={props => (
          <button
            type="button"
            {...props}
            className="flex h-8 min-w-0 max-w-full items-center gap-2 rounded-control px-2 hover:bg-subtle"
          >
            <span className="truncate font-medium">{doc.project.name}</span>
            {stage && <span className="shrink-0 text-muted max-[720px]:hidden">{t(`projects:stage.${stage}`)}</span>}
            <Icon name="chevron-down" size={14} className="shrink-0 text-muted" />
          </button>
        )}
      />
      {version > 0 && !status.error && (
        <span className="shrink-0 pr-1.5 text-label text-muted max-[720px]:hidden" aria-live="polite">
          {status.dirty ? t("status.unsaved") : t("status.saved")}
        </span>
      )}
    </Island>
  );
}
