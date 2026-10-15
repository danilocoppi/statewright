// The completion every reference field shares (spec §7.4): what matches what is typed, the values a field takes besides
// catalog items, "Create …" — and the words for a chosen value.
import { useTranslation } from "react-i18next";
import { PRIMITIVE_TYPES } from "statewright";

import { useEditor } from "@/store/editor";

import { findItems, newItem } from "../references";

/** Collections whose items are shown in the monospace face, as the diagram shows them. */
export const MONO = ["events", "types", "endpoints"];

/**
 * What a reference field offers for what is typed: the items that match (with how often each is used), the values it
 * takes besides items (no type, raised inside, the built-in types), and "Create …" for a name no item has.
 * @param {(value: unknown) => void} choose Sets the field to an item's ID or another value.
 * @param {(collection: string, item: object) => void} create Creates an item and sets the field to it.
 */
export function useRefOptions({ field, entry, exclude = [], choose, create }) {
  const { t } = useTranslation("inspector");
  const doc = useEditor(state => state.doc);
  const outgoing = field.key === "webhook" && entry.type === "node";
  return query => {
    const text = query.trim().toLowerCase();
    const found = findItems(doc, field.collections, query)
      .filter(item => !exclude.includes(item.id))
      .map(item => ({
        id: item.id,
        label: item.name,
        meta:
          field.collections.length > 1 ? t(`kinds.catalog.${item.collection}`) : t("refs.uses", { count: item.uses }),
        onPick: () => choose(item.id)
      }));
    const extras = [
      ...(field.extra === "null" ? [{ id: "null", label: t("refs.nothing"), value: null }] : []),
      ...(field.extra === "internal" ? [{ id: "internal", label: t("refs.internal"), value: "internal" }] : []),
      ...(field.primitives ?
        PRIMITIVE_TYPES.map(type => ({ id: type, label: type, meta: t("refs.builtIn"), value: type }))
      : [])
    ]
      .filter(option => !text || option.label.toLowerCase().includes(text))
      .map(({ value, ...option }) => ({ ...option, onPick: () => choose(value) }));
    // No "Create …" for a name an item or a built-in value already has.
    const exact = [...found, ...extras].some(item => item.label.toLowerCase() === text);
    const creates =
      text && !exact ?
        field.collections
          .map(collection => ({ collection, item: newItem(collection, query, { outgoing }) }))
          .filter(({ item }) => item)
          .map(({ collection, item }) => ({
            id: `create-${collection}`,
            label: t("refs.create", { kind: t(`kinds.catalog.${collection}`).toLowerCase(), name: item.name }),
            create: true,
            onPick: () => create(collection, item)
          }))
      : [];
    return [...extras, ...found, ...creates];
  };
}

/** The words for a reference's value: an item's name, a built-in type, no type, or raised inside. */
export function useWords(field) {
  const { t } = useTranslation("inspector");
  const doc = useEditor(state => state.doc);
  return value => {
    if (value === null) return { label: t("refs.nothing") };
    if (value === "internal" && field.extra === "internal") return { label: t("refs.internal") };
    if (PRIMITIVE_TYPES.includes(value)) return { label: value, mono: true };
    const collection = field.collections.find(name => doc.catalog[name][value]);
    return { label: collection ? doc.catalog[collection][value].name : value, mono: MONO.includes(collection) };
  };
}
