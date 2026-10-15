// The Editor host's exports (AI interface spec §4.2: export): the same files the Export menu makes, as text — or the
// PNG in base64 — for the agent; `export.document` can also save to the project's file or download it. `out` is a
// path the MCP server writes (plan A4): the Editor returns the content.
import { sign, stringify } from "statewright";
import { AgentError } from "statewright/agent";
import i18n from "i18next";

import { sharedRepository } from "@/app/repository";
import { FONT_FILES } from "@/design/fonts";
import { saveProjectToFile } from "@/features/editor/actions";
import { downloadFile } from "@/files/download";
import { exportAIPack, exportContract, exportMarkdown, exportPNG, exportScenarioPage, exportSVG } from "@/files/export";
import { documentFileName } from "@/files/save-file";
import { GENERATOR } from "@/persistence/repository";
import { editorStore } from "@/store/editor";

const docNow = () => editorStore.getState().doc;

/** A level of the open document, or NOT_FOUND. */
function level(id) {
  if (!Object.hasOwn(docNow().canvases, id)) {
    throw new AgentError("NOT_FOUND", `There is no level "${id}"; document.summary lists them`, { id });
  }
  return id;
}

/** A Blob's bytes in base64. */
async function base64Of(blob) {
  let binary = "";
  for (const byte of new Uint8Array(await blob.arrayBuffer())) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export const exportOperations = {
  "export.document": async ({ repository = sharedRepository }, { to = "text" }) => {
    const doc = docNow();
    const name = documentFileName(doc);
    if (to === "file") {
      await saveProjectToFile(await repository(), i18n.t);
      return { name };
    }
    const text = stringify(await sign(doc, GENERATOR));
    if (to === "download") {
      downloadFile(name, text, "application/json");
      return { name };
    }
    return { name, text };
  },
  "export.svg": async (_context, { canvas }) => {
    const file = await exportSVG(docNow(), level(canvas));
    return { name: file.name, text: file.data };
  },
  "export.png": async ({ fonts = FONT_FILES }, { canvas }) => {
    const file = await exportPNG(docNow(), level(canvas), fonts);
    return { name: file.name, base64: await base64Of(file.data) };
  },
  "export.markdown": () => {
    const file = exportMarkdown(docNow());
    return { name: file.name, text: file.data };
  },
  "export.aiPack": () => {
    const file = exportAIPack(docNow());
    return { name: file.name, text: file.data };
  },
  "export.contract": async () => {
    const file = await exportContract(docNow());
    return { name: file.name, text: file.data, problems: file.problems };
  },
  "export.scenarioPage": async ({ fonts = FONT_FILES }, { id }) => {
    const doc = docNow();
    if (!Object.hasOwn(doc.annotations?.scenarios ?? {}, id)) {
      throw new AgentError("NOT_FOUND", `There is no scenario "${id}"; document.summary counts them`, { id });
    }
    const file = await exportScenarioPage(doc, id, fonts);
    return { name: file.name, text: file.data };
  }
};
