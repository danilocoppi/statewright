/**
 * A safe file-name stem from a name: ASCII letters and digits in lowercase, words joined by hyphens, at most 60
 * characters; "project" when nothing is left ("Get paid / v2 – ü" → "get-paid-v2-u").
 * @param {string} name
 */
export function slug(name) {
  const stem = String(name ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");
  return stem || "project";
}
