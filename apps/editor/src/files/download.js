/**
 * Hand a file to the browser as a download (the fallback when files cannot be written directly).
 * @param {string} name
 * @param {string | Blob} data
 * @param {string} type MIME type of string data.
 * @param {{ document?: Document, URL?: typeof URL }} [env]
 */
export function downloadFile(
  name,
  data,
  type,
  { document: doc = globalThis.document, URL: urls = globalThis.URL } = {}
) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const href = urls.createObjectURL(blob);
  const link = doc.createElement("a");
  link.href = href;
  link.download = name;
  link.rel = "noopener";
  doc.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => urls.revokeObjectURL(href), 1000);
}
