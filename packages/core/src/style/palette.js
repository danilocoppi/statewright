/**
 * The visual vocabulary of Statewright (spec §15). Colours come from the reference diagrams; there is no free colour
 * field in documents — the look is derived from semantics.
 */

/** Text colours and fonts shared by every rendering. */
export const INK = "#05060F";
export const SUB = "#464849";
export const MUTED = "#878E91";
export const RULE = "#E6E7EE";
export const SANS = "'Inter',-apple-system,'Segoe UI',sans-serif";
export const MONO = "'Geist Mono','SF Mono','Fira Code',Consolas,monospace";

/**
 * Node styles by style key: fill, stroke, optional dash and chip, and the legend's default wording.
 * @type {Record<string, { fill: string, stroke: string, dash?: string, chip?: string, label: string }>}
 */
export const NODE_STYLES = {
  "state.plain": { fill: "#FFFFFF", stroke: "#3B3F4A", label: "State" },
  "state.focus": { fill: "#EEF4FB", stroke: "#0A66C2", label: "Look here" },
  "outcome.success": { fill: "#ECFDF5", stroke: "#059669", label: "Outcome · success" },
  "outcome.failure": { fill: "#FEF3F2", stroke: "#B42318", label: "Outcome · failure" },
  "outcome.stopped": { fill: "#F3F4F6", stroke: "#6B7280", label: "Outcome · stopped" },
  "state.waiting": { fill: "#F6F7FA", stroke: "#878E91", chip: "WAITS", label: "Waiting on another party" },
  "state.hold": { fill: "#FFFBEB", stroke: "#B45309", chip: "HOLD", label: "Hold · manual review" },
  "state.processing": { fill: "#FFFFFF", stroke: "#3B3F4A", chip: "LIVE", label: "Processing" },
  "prov.proposed": {
    fill: "#FFFFFF",
    stroke: "#0A66C2",
    dash: "4,3",
    chip: "NEW",
    label: "Proposed (not in code yet)"
  },
  "prov.fix": { fill: "#FFFFFF", stroke: "#0A66C2", dash: "4,3", chip: "FIX", label: "Proposed fix" },
  "prov.legacy": {
    fill: "#FAFBFD",
    stroke: "#B9BDC9",
    dash: "6,4",
    chip: "LEGACY",
    label: "Legacy · nothing writes it"
  },
  "prov.defect": { fill: "#FFF1F2", stroke: "#BE123C", dash: "3,2", chip: "DEFECT", label: "Defect" },
  "prov.implied": {
    fill: "#FFFFFF",
    stroke: "#B9BDC9",
    dash: "2,3",
    chip: "IMPLIED",
    label: "Implied · not documented"
  },
  "node.external": { fill: "#FAFAFC", stroke: "#878E91", dash: "4,3", chip: "EXTERNAL", label: "External system" },
  "node.actor": { fill: "#FAFAFC", stroke: "#878E91", dash: "4,3", chip: "ACTOR", label: "Actor" },
  "node.store": { fill: "#F3F5F9", stroke: "#5B6170", chip: "STORE", label: "Data store" },
  "node.plain": { fill: "#FFFFFF", stroke: "#3B3F4A", label: "Component" },
  "step.plain": { fill: "#FFFFFF", stroke: "#3B3F4A", label: "Step" },
  "node.ref": { fill: "#FFFFFF", stroke: "#878E91", dash: "3,2", label: "Shortcut to another element" },
  frame: { fill: "#FAFBFD", stroke: "#B9BDC9", dash: "6,4", label: "Group (expanded interior)" }
};

/**
 * Edge styles by style key.
 * @type {Record<string, { stroke: string, width: number, dash?: string, label: string }>}
 */
export const EDGE_STYLES = {
  "edge.default": { stroke: "#5B6170", width: 1.2, label: "Transition" },
  "edge.happy": { stroke: "#0A66C2", width: 1.6, label: "Happy path" },
  "edge.failure": { stroke: "#B42318", width: 1.2, dash: "5,4", label: "Failure · reversal" },
  "edge.ops": { stroke: "#B45309", width: 1.2, dash: "6,3", label: "Ops action" },
  "edge.timer": { stroke: "#878E91", width: 1.2, dash: "2,3", label: "Timer" },
  "edge.defect": { stroke: "#BE123C", width: 1.4, dash: "2,2", label: "Defect" },
  "edge.proposed": { stroke: "#0A66C2", width: 1.2, dash: "4,3", label: "Proposed" },
  "edge.implied": { stroke: "#E11D48", width: 1.2, dash: "4,3", label: "Implied · not documented" },
  "edge.link": { stroke: "#878E91", width: 1, dash: "3,2", label: "Link (not executable)" }
};

/**
 * Colours of chips, tags and status pills by tone: text/border colour and background.
 * @type {Record<string, { color: string, fill: string }>}
 */
export const TONES = {
  neutral: { color: "#4B5563", fill: "#F3F4F6" },
  info: { color: "#0A66C2", fill: "#E8F0FB" },
  success: { color: "#047857", fill: "#ECFDF5" },
  warning: { color: "#92400E", fill: "#FEF3C7" },
  danger: { color: "#B42318", fill: "#FEE4E2" },
  ops: { color: "#B45309", fill: "#FFFBEB" },
  defect: { color: "#BE123C", fill: "#FFF1F2" }
};

/** Finding badges (bottom-right of their targets). */
export const BADGE = { fill: "#BE123C", color: "#FFFFFF" };

/** Notes by tone. */
export const NOTE_TONES = {
  info: { color: "#0A66C2", fill: "#EEF4FB" },
  warning: { color: "#B45309", fill: "#FFFBEB" },
  defect: { color: "#BE123C", fill: "#FFF1F2" }
};

/** Legend wording of the derived chips that are not a node style of their own. */
export const CHIP_LABELS = { FINAL: "Terminal · no exits" };
