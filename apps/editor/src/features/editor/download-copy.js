import { sign, stringify } from "statewright";

import { downloadFile } from "@/files/download";
import { documentFileName } from "@/files/save-file";
import { GENERATOR } from "@/persistence/repository";
import { editorStore } from "@/store/editor";

/**
 * Download the open document, signed, so no work is lost when part of the interface fails (spec §10).
 * @returns {Promise<boolean>} false when no document is open.
 */
export async function downloadDocumentCopy(doc = editorStore.getState().doc) {
  if (!doc) return false;
  downloadFile(documentFileName(doc), stringify(await sign(doc, GENERATOR)), "application/json");
  return true;
}
