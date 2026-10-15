// Opening and saving files (spec §4.5). With the File System Access API (Chromium browsers) the Editor keeps a handle
// and later saves write to the same file; elsewhere, or when permission is lost, saving downloads the file instead.
import { sign, stringify } from "statewright";

import { GENERATOR } from "@/persistence/repository";

import { downloadFile } from "./download";
import { slug } from "./names";

// Chrome's pickers refuse an extension longer than 16 characters, and a key that is not a MIME type. Files saved before
// 0.1.5 end in `.statewright.json`, which is 17: `.json` opens them.
/** File types the open picker offers: a .sttw, and a .json (a .statewright.json saved before 0.1.5 among them). */
export const OPEN_TYPES = [{ description: "Statewright document", accept: { "application/json": [".sttw", ".json"] } }];

/** File types the save picker offers: a .sttw. */
export const SAVE_TYPES = [{ description: "Statewright document", accept: { "application/json": [".sttw"] } }];

/** What the browser's own file input accepts, where there is no picker: the open picker's types. */
export const OPEN_ACCEPT = [...OPEN_TYPES[0].accept["application/json"], "application/json"].join(",");

/** The document's file name: "get-paid-as-built.sttw". */
export const documentFileName = doc => `${slug(doc.project.name)}.sttw`;

/** Whether this browser can pick files with a handle (and so save back to them). */
export const canPickFiles = (env = globalThis) => typeof env.showOpenFilePicker === "function";

/**
 * Ask for a file with the system picker.
 * @returns {Promise<{ file: File, handle: object } | null>} null when the person cancelled.
 */
export async function pickFile(env = globalThis) {
  try {
    const [handle] = await env.showOpenFilePicker({ types: OPEN_TYPES, multiple: false });
    return { file: await handle.getFile(), handle };
  } catch (error) {
    if (error?.name === "AbortError") return null;
    throw error;
  }
}

async function mayWrite(handle) {
  if (typeof handle.queryPermission !== "function") return true;
  let permission = await handle.queryPermission({ mode: "readwrite" });
  if (permission !== "granted" && typeof handle.requestPermission === "function") {
    permission = await handle.requestPermission({ mode: "readwrite" });
  }
  return permission === "granted";
}

async function write(handle, text) {
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

/**
 * Sign the document and write it: to `handle` when given (unless `askLocation`), to a picked location when the
 * browser can, or as a download.
 * @param {object} doc
 * @param {{ handle?: object, askLocation?: boolean, env?: object, download?: typeof downloadFile }} [options]
 * @returns {Promise<{ method: "file", handle: object } | { method: "download", reason: "unsupported" | "permission" |
 *   "failed" } | { method: "cancelled" }>}
 */
export async function saveToFile(doc, { handle, askLocation = false, env = globalThis, download = downloadFile } = {}) {
  const text = stringify(await sign(doc, GENERATOR));
  const name = documentFileName(doc);
  const fallback = reason => {
    download(name, text, "application/json");
    return { method: "download", reason };
  };

  if (handle && !askLocation) {
    try {
      if (await mayWrite(handle)) {
        await write(handle, text);
        return { method: "file", handle };
      }
    } catch {
      // The file moved or the permission was revoked: fall through to the download.
    }
    return fallback("permission");
  }
  if (typeof env.showSaveFilePicker === "function") {
    try {
      const picked = await env.showSaveFilePicker({ suggestedName: name, types: SAVE_TYPES });
      await write(picked, text);
      return { method: "file", handle: picked };
    } catch (error) {
      if (error?.name === "AbortError") return { method: "cancelled" };
      return fallback("failed");
    }
  }
  return fallback("unsupported");
}
