// What the editor shell's menus and shortcuts do with the open project: save, export, copy.
import { FONT_FILES } from "@/design/fonts";
import { downloadFile } from "@/files/download";
import {
  copyImage,
  exportAIPack,
  exportContract,
  exportDocumentPage,
  exportMarkdown,
  exportPNG,
  exportScenarioPage,
  exportSVG
} from "@/files/export";
import { documentFileName, saveToFile } from "@/files/save-file";
import { editorStore } from "@/store/editor";
import { toast } from "@/stores/toast";

/**
 * Save the open project to its file, remembering the file for next time; or, with `askLocation` (Save a copy…), write a
 * copy where the person chooses — the project stays on its own file, and takes the copy's only when it has none yet.
 * @param {import("@/persistence/repository").Repository} repository
 * @param {(key: string, values?: object) => string} t
 */
export async function saveProjectToFile(repository, t, { askLocation = false } = {}) {
  const { doc } = editorStore.getState();
  const handle = await repository.getHandle(doc.project.id);
  try {
    const result = await saveToFile(doc, { handle, askLocation });
    const file = result.handle?.name ?? documentFileName(doc);
    if (result.method === "file" && askLocation && handle) {
      toast.success(t("files:save.copied", { file }));
    } else if (result.method === "file") {
      await repository.setHandle(doc.project.id, result.handle);
      toast.success(t("files:save.saved", { file }));
    } else if (result.method === "download") {
      toast.info(t(result.reason === "permission" ? "files:save.permission" : "files:save.downloaded", { file }));
    }
  } catch {
    toast.error(t("files:save.failed"));
  }
}

const EXPORTS = {
  svg: ({ doc, canvasId }) => exportSVG(doc, canvasId),
  png: ({ doc, canvasId }) => exportPNG(doc, canvasId, FONT_FILES),
  markdown: ({ doc }) => exportMarkdown(doc),
  documentPage: ({ doc }) => exportDocumentPage(doc, FONT_FILES),
  aiPack: ({ doc }) => exportAIPack(doc),
  contract: ({ doc }) => exportContract(doc)
};

/**
 * Export the open project as a file.
 * @param {"svg" | "png" | "markdown" | "documentPage" | "aiPack" | "contract"} kind
 * @param {(key: string, values?: object) => string} t
 */
export async function exportProject(kind, t) {
  try {
    const file = await EXPORTS[kind](editorStore.getState());
    downloadFile(file.name, file.data, file.type);
    toast.success(t("editor:export.exported", { file: file.name }));
  } catch {
    toast.error(t("editor:export.failed"));
  }
}

/**
 * Export a scenario as a page (simulator spec §7.2), with the bundled fonts in it. A page that could not be made says
 * so, with Try again (simulator spec §9).
 * @param {string} scenarioId
 * @param {(key: string, values?: object) => string} t
 */
export async function exportScenario(scenarioId, t) {
  const { doc } = editorStore.getState();
  try {
    const file = await exportScenarioPage(doc, scenarioId, FONT_FILES);
    downloadFile(file.name, file.data, file.type);
    toast.success(t("editor:export.exported", { file: file.name }));
  } catch {
    toast.error(t("editor:export.pageFailed", { name: doc.annotations?.scenarios?.[scenarioId]?.name ?? scenarioId }), {
      action: { label: t("editor:export.tryAgain"), onClick: () => exportScenario(scenarioId, t) }
    });
  }
}

/** Copy the current level as a PNG; the image is produced while the clipboard write is already under way. */
export async function copyLevelImage(t) {
  const { doc, canvasId } = editorStore.getState();
  try {
    await copyImage(exportPNG(doc, canvasId, FONT_FILES).then(file => file.data));
    toast.success(t("editor:export.copied"));
  } catch {
    toast.error(t("editor:export.failed"));
  }
}
