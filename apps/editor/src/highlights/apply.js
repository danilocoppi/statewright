// Highlights on several elements at once (highlights spec §6): each command adds a highlight where it is missing, or
// takes it off where it is, and the caller runs them as one change.
import { fieldCommands } from "@/inspector/apply";
import { indexOf } from "@/lib/derived";

/** The boxes and arrows among some IDs: what carries highlights. */
export const drawnAmong = (doc, ids) =>
  ids.filter(id => {
    const type = indexOf(doc).get(id)?.type;
    return type === "node" || type === "edge";
  });

const highlightsOf = (doc, id) => indexOf(doc).get(id)?.value.highlights ?? [];

/** Add a highlight, last, to each element that does not carry it. */
export const addHighlightCommands = (doc, ids, highlightId) =>
  drawnAmong(doc, ids)
    .filter(id => !highlightsOf(doc, id).includes(highlightId))
    .flatMap(id => fieldCommands(doc, id, "highlights", [...highlightsOf(doc, id), highlightId]));

/** Take a highlight off each element that carries it. */
export const removeHighlightCommands = (doc, ids, highlightId) =>
  drawnAmong(doc, ids)
    .filter(id => highlightsOf(doc, id).includes(highlightId))
    .flatMap(id =>
      fieldCommands(
        doc,
        id,
        "highlights",
        highlightsOf(doc, id).filter(item => item !== highlightId)
      )
    );

/** The highlights some elements carry, in catalog order, with how many of them carry each. */
export function carriedBy(doc, ids) {
  const drawn = drawnAmong(doc, ids);
  return Object.keys(doc.catalog.highlights ?? {})
    .map(id => ({ id, count: drawn.filter(element => highlightsOf(doc, element).includes(id)).length }))
    .filter(item => item.count);
}
