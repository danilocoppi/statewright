import { GENERATOR_NAME, PACKAGE_VERSION } from "./constants.js";
import { canonicalize } from "./serialize/canonical.js";

/** Keys hashed into `signature.content` (spec §17); top-level x- keys belong here too. */
const CONTENT_KEYS = ["statewright", "project", "root", "catalog", "definitions", "canvases"];

/**
 * Lowercase hex SHA-256 of a UTF-8 string (Web Crypto: browsers and Node ≥ 22).
 * @param {string} text
 */
export async function sha256Hex(text) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

/** The part of a document covered by the content hash. */
export function contentOf(doc) {
  const out = {};
  for (const key of CONTENT_KEYS) if (doc[key] !== undefined) out[key] = doc[key];
  for (const key of Object.keys(doc)) if (key.startsWith("x-")) out[key] = doc[key];
  return out;
}

/**
 * The three section hashes of a document.
 * @param {object} doc
 * @returns {Promise<{ content: string, annotations: string, layout: string }>}
 */
export async function computeHashes(doc) {
  const [content, annotations, layout] = await Promise.all([
    sha256Hex(canonicalize(contentOf(doc))),
    sha256Hex(canonicalize(doc.annotations ?? {})),
    sha256Hex(canonicalize(doc.layout ?? {}))
  ]);
  return { content, annotations, layout };
}

/**
 * A copy of `doc` with fresh `generator` and `signature`.
 * @param {object} doc
 * @param {{ channel: "editor" | "cli" | "api", agent?: string, name?: string, version?: string }} generator
 * @param {{ now?: Date }} [options]
 */
export async function sign(doc, generator, { now = new Date() } = {}) {
  const hashes = await computeHashes(doc);
  return {
    ...doc,
    generator: { name: GENERATOR_NAME, version: PACKAGE_VERSION, ...generator },
    signature: {
      algorithm: "sha256",
      ...hashes,
      signedAt: now.toISOString().replace(/\.\d{3}Z$/, "Z")
    }
  };
}

/**
 * Compare stored hashes with recomputed ones. Never throws.
 * @param {object} doc
 * @returns {Promise<Record<"content" | "annotations" | "layout", "ok" | "changed" | "missing">>}
 */
export async function verify(doc) {
  if (!doc.signature) return { content: "missing", annotations: "missing", layout: "missing" };
  const hashes = await computeHashes(doc);
  const status = key => (hashes[key] === doc.signature[key] ? "ok" : "changed");
  return { content: status("content"), annotations: status("annotations"), layout: status("layout") };
}
