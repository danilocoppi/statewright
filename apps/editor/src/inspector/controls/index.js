// The controls that edit each kind of field (see fields.js), by name. Each takes `{ id, field, value, layer, entry }`.
import { FindingsControl, LanesControl } from "./annotations";
import { HighlightsControl } from "./highlights";
import { ChoiceControl, KindControl, ToggleControl } from "./choice";
import { EvidenceControl, TagsControl } from "./common";
import { ConnectionsControl } from "./connections";
import { RolesControl } from "./roles";
import { EffectsControl } from "./effects";
import { InteriorControl } from "./interior";
import { NodeControl, NodesControl, NoteTargetControl, RegionControl, TargetControl, TargetsControl } from "./elements";
import { JsonControl, JsonMapControl, ResponsesControl } from "./json";
import { DisplayControl, FocusControl, RouteControl, SizeControl } from "./layout";
import { LegendControl, RegionsControl } from "./level";
import { RefControl, RefsControl, TypeControl } from "./refs";
import { ConditionControl, DoneControl, EffectiveControl, RequestControl, RetryControl } from "./structured";
import { JsonSchemaControl, TypeFieldsControl, TypeValuesControl } from "./types";
import { LongTextControl, SummaryControl, TextControl } from "./text";
import { DurationControl, GlobsControl, SignedDurationControl, SignedDurationsControl } from "./values";

export const CONTROLS = {
  text: TextControl,
  longtext: LongTextControl,
  summary: SummaryControl,
  choice: ChoiceControl,
  toggle: ToggleControl,
  kind: KindControl,
  connections: ConnectionsControl,
  roles: RolesControl,
  ref: RefControl,
  refs: RefsControl,
  type: TypeControl,
  node: NodeControl,
  nodes: NodesControl,
  region: RegionControl,
  target: TargetControl,
  targets: TargetsControl,
  noteTarget: NoteTargetControl,
  duration: DurationControl,
  signedDuration: SignedDurationControl,
  signedDurations: SignedDurationsControl,
  globs: GlobsControl,
  condition: ConditionControl,
  effects: EffectsControl,
  retry: RetryControl,
  effective: EffectiveControl,
  json: JsonControl,
  jsonMap: JsonMapControl,
  request: RequestControl,
  responses: ResponsesControl,
  done: DoneControl,
  evidence: EvidenceControl,
  tags: TagsControl,
  highlights: HighlightsControl,
  focus: FocusControl,
  display: DisplayControl,
  size: SizeControl,
  route: RouteControl,
  regions: RegionsControl,
  legend: LegendControl,
  typeFields: TypeFieldsControl,
  typeValues: TypeValuesControl,
  jsonSchema: JsonSchemaControl,
  interior: InteriorControl,
  findings: FindingsControl,
  lanes: LanesControl
};
