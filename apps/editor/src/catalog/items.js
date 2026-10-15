// What the catalog sheet lists (spec §7.5): a collection's items with a line about each, and where an item is used.
import { usagesOf } from "statewright";

import { indexOf, usageCount } from "@/lib/derived";

/** A type in a few words (mockup 10): "object · 5 fields", "enum · USD, EUR, BRL", "alias of string". */
export function typeLine(t, doc, type) {
  if (type.kind === "object") return t("inspector:catalog.object", { count: type.fields?.length ?? 0 });
  if (type.kind === "enum")
    return t("inspector:catalog.enum", { values: (type.values ?? []).map(value => value.value).join(", ") });
  const of = doc.catalog.types[type.of]?.name ?? type.of ?? "—";
  return t("inspector:catalog.alias", { of });
}

/**
 * A collection's items whose names match what is typed, by name, each with a line about it (a type's shape, how often
 * the others are used).
 * @returns {Array<{ id: string, name: string, line: string }>}
 */
export function itemsOf(t, doc, collection, query = "") {
  const text = query.trim().toLowerCase();
  return Object.entries(doc.catalog[collection])
    .filter(([, item]) => item.name.toLowerCase().includes(text))
    .sort(([, a], [, b]) => a.name.localeCompare(b.name))
    .map(([id, item]) => ({
      id,
      name: item.name,
      line: collection === "types" ? typeLine(t, doc, item) : t("inspector:refs.uses", { count: usageCount(doc, id) })
    }));
}

/**
 * The reusable parts whose names match what is typed, by name, each with its kind and how many boxes use it.
 * @param {Map<string, number>} uses From `instanceCounts`.
 * @returns {Array<{ id: string, name: string, line: string }>}
 */
export function partsOf(t, doc, uses, query = "") {
  const text = query.trim().toLowerCase();
  return Object.entries(doc.definitions)
    .filter(([, part]) => part.name.toLowerCase().includes(text))
    .sort(([, a], [, b]) => a.name.localeCompare(b.name))
    .map(([id, part]) => ({
      id,
      name: part.name,
      line: `${t(`inspector:kinds.canvas.${part.kind}`)} · ${t("inspector:refs.uses", { count: uses.get(id) ?? 0 })}`
    }));
}

/**
 * Where an item is used: by which element (named, with what it is and its level) and in which of its fields.
 * @param {(entry: object) => string} name What an element is called.
 * @param {(entry: object) => string} kind What it is ("State", "Event").
 * @returns {Array<{ source: string, name: string, kind: string, level?: string, canvas?: string, key: string, field: string }>}
 */
export function usageRows(t, doc, id, { name, kind }) {
  const index = indexOf(doc);
  return usagesOf(doc, id).map(usage => {
    const entry = index.get(usage.source);
    const key = usage.field.split(".")[0];
    // A scenario is on the level it runs, as a note or a lane is on theirs.
    const on = entry?.canvas ?? entry?.value?.canvas;
    const canvas = on ?? (entry?.type === "canvas" ? entry.id : undefined);
    return {
      source: usage.source,
      name: entry ? name(entry) : usage.source,
      kind: entry ? kind(entry) : "",
      level: on ? doc.canvases[on]?.name : undefined,
      canvas,
      key,
      field: t(`inspector:fields.${key === "of" ? "aliasOf" : key}`, { defaultValue: key })
    };
  });
}
