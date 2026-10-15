import { z } from "zod";
import { FORMAT_VERSION } from "../constants.js";
import { documentSchema } from "./document.js";
import { EXTENSIBLE } from "./helpers.js";

/** Replace the EXTENSIBLE marker with "strict, but x- keys allowed". */
function applyExtensionRule(node) {
  if (Array.isArray(node)) {
    node.forEach(applyExtensionRule);
    return;
  }
  if (!node || typeof node !== "object") return;
  if (node[EXTENSIBLE]) {
    delete node[EXTENSIBLE];
    node.additionalProperties = false;
    node.patternProperties = { "^x-": {} };
  }
  Object.values(node).forEach(applyExtensionRule);
}

/**
 * JSON Schema (draft 2020-12) of the document format — the cross-language contract.
 * @param {{ baseUrl?: string }} [options] When given, sets `$id` to `<baseUrl>/schema/<version>.json`.
 */
export function toJSONSchema({ baseUrl } = {}) {
  const schema = z.toJSONSchema(documentSchema, { target: "draft-2020-12", unrepresentable: "any" });
  applyExtensionRule(schema);
  schema.title = `Statewright document (format ${FORMAT_VERSION})`;
  if (baseUrl) schema.$id = `${baseUrl.replace(/\/$/, "")}/schema/${FORMAT_VERSION}.json`;
  return schema;
}
