import { PanelBoundary } from "@/components/PanelBoundary";

import { CONTROLS } from "./controls";

/**
 * An element's fields of one layer, each edited by its control (the title is the heading's, not listed here). A control
 * that fails stays inside the list (spec §10): the rest of the inspector or of the sheet, and the document, are kept.
 * @param {{ id: string, fields: import("./fields").Field[], entry: object, layer: "basics" | "details" }} props
 */
export function FieldList({ id, fields, entry, layer }) {
  return (
    <PanelBoundary key={`${id}:${layer}`} className="py-4">
      {fields.map(field => {
        const Control = CONTROLS[field.control];
        if (!Control) return null;
        return (
          <Control key={field.key} id={id} field={field} value={entry.value[field.key]} layer={layer} entry={entry} />
        );
      })}
    </PanelBoundary>
  );
}
