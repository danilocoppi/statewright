import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Menu } from "@/components/ui/Menu";
import { useEditor } from "@/store/editor";

import { copyLevelImage, exportProject } from "./actions";
import { ScenarioPageDialog } from "./ScenarioPageDialog";

/**
 * Export (spec §4.5, mockup 13): the current level as an image, the whole project as documentation or as a contract
 * for code (source-of-truth spec §5), a scenario as a page (simulator spec §7.2).
 */
export function ExportMenu() {
  const { t } = useTranslation(["editor", "files"]);
  const scenarios = useEditor(state => Object.keys(state.doc.annotations?.scenarios ?? {}).length);
  const [choosing, setChoosing] = useState(false);
  return (
    <>
      <Menu
        label={t("export.label")}
        testId="actions-export"
        menuClassName="w-80"
        sections={[
          {
            title: t("export.thisLevel"),
            items: [
              {
                id: "svg",
                label: t("export.svg"),
                hint: t("export.svgHint"),
                shortcut: "⇧E",
                icon: <Icon name="image" />,
                onSelect: () => exportProject("svg", t)
              },
              {
                id: "png",
                label: t("export.png"),
                hint: t("export.pngHint"),
                icon: <Icon name="image" />,
                onSelect: () => exportProject("png", t)
              },
              {
                id: "copy",
                label: t("export.copy"),
                hint: t("export.copyHint"),
                icon: <Icon name="copy" />,
                onSelect: () => copyLevelImage(t)
              }
            ]
          },
          {
            title: t("export.wholeProject"),
            items: [
              {
                id: "markdown",
                label: t("export.markdown"),
                hint: t("export.markdownHint"),
                icon: <Icon name="doc" />,
                onSelect: () => exportProject("markdown", t)
              },
              {
                id: "documentPage",
                label: t("export.documentPage"),
                hint: t("export.documentPageHint"),
                icon: <Icon name="file" />,
                onSelect: () => exportProject("documentPage", t)
              },
              {
                id: "aiPack",
                label: t("export.aiPack"),
                hint: t("export.aiPackHint"),
                icon: <Icon name="sparkle" />,
                onSelect: () => exportProject("aiPack", t)
              },
              {
                id: "contract",
                label: t("export.contract"),
                hint: t("export.contractHint"),
                icon: <Icon name="machine" />,
                onSelect: () => exportProject("contract", t)
              }
            ]
          },
          {
            title: t("export.scenario"),
            items: [
              {
                id: "scenarioPage",
                label: t("export.scenarioPage"),
                hint: scenarios ? t("export.scenarioPageHint") : t("export.noScenario"),
                icon: <Icon name="file" />,
                disabled: !scenarios,
                onSelect: () => setChoosing(true)
              }
            ]
          }
        ]}
        trigger={props => (
          <Button variant="primary" size="sm" {...props}>
            {t("export.label")}
            <Icon name="chevron-down" size={14} />
          </Button>
        )}
      />
      <ScenarioPageDialog open={choosing} onClose={() => setChoosing(false)} />
    </>
  );
}
