import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { indexOf } from "@/lib/derived";
import { useEditor } from "@/store/editor";

import { kindWords, nodeName } from "../describe";
import { elementName, findElements } from "../references";
import { useField } from "../useField";
import { AddPicker, Chips } from "./Picker";
import { Row } from "./Row";

const SELECT =
  "h-8 w-full rounded-control border border-control-border bg-surface px-2 text-ui text-ink outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] disabled:border-transparent disabled:bg-transparent disabled:px-0 disabled:opacity-100";

/** The level a field's choices come from: the element's own (a note's is its `canvas`). */
const levelOf = entry => entry.canvas ?? entry.value.canvas;

/** Words for an element found by name: what it is, and on which level when it is on another one. */
function useMeta(entry) {
  const { t } = useTranslation("inspector");
  const doc = useEditor(state => state.doc);
  return item => {
    const index = indexOf(doc).get(item.id);
    const kind = kindWords(t, doc, index);
    return item.canvas && item.canvas !== levelOf(entry) ?
        t("in", { kind, level: doc.canvases[item.canvas].name })
      : kind;
  };
}

/** A select of the level's boxes (an edge's ends). */
export function NodeControl({ id, field, value, layer, entry }) {
  const { t } = useTranslation("inspector");
  const selectId = useId();
  const edit = useField(id, field);
  const doc = useEditor(state => state.doc);
  const nodes = Object.entries(doc.canvases[levelOf(entry)].nodes);
  return (
    <Row label={edit.label} layer={layer} htmlFor={selectId} error={edit.error}>
      <select
        id={selectId}
        value={value}
        disabled={edit.readOnly}
        onChange={event => edit.change(event.target.value)}
        className={SELECT}
      >
        {nodes.map(([nodeId, node]) => (
          <option key={nodeId} value={nodeId}>
            {nodeName(t, node)}
          </option>
        ))}
      </select>
    </Row>
  );
}

/** The box's region, on a machine with regions (none to choose otherwise). */
export function RegionControl({ id, field, value, layer, entry }) {
  const selectId = useId();
  const edit = useField(id, field);
  const doc = useEditor(state => state.doc);
  const regions = Object.entries(doc.canvases[levelOf(entry)].regions ?? {});
  if (!regions.length) return null;
  return (
    <Row label={edit.label} layer={layer} htmlFor={selectId} error={edit.error}>
      <select
        id={selectId}
        value={value}
        disabled={edit.readOnly}
        onChange={event => edit.change(event.target.value)}
        className={SELECT}
      >
        {regions.map(([regionId, region]) => (
          <option key={regionId} value={regionId}>
            {region.name}
          </option>
        ))}
      </select>
    </Row>
  );
}

/** What a note is attached to: a box or an arrow of its level, or nothing (it floats). */
export function NoteTargetControl({ id, field, value, layer, entry }) {
  const { t } = useTranslation("inspector");
  const selectId = useId();
  const edit = useField(id, field);
  const doc = useEditor(state => state.doc);
  const canvas = doc.canvases[levelOf(entry)];
  const unnamed = kind => t(`kinds.node.${kind}`);
  const options = [...Object.keys(canvas.nodes), ...Object.keys(canvas.edges)].map(elementId => ({
    id: elementId,
    name: elementName(doc, indexOf(doc).get(elementId), unnamed)
  }));
  return (
    <Row label={edit.label} layer={layer} htmlFor={selectId} error={edit.error}>
      <select
        id={selectId}
        value={value ?? ""}
        disabled={edit.readOnly}
        onChange={event => edit.change(event.target.value || undefined)}
        className={SELECT}
      >
        <option value="">{t("elements.floating")}</option>
        {options.map(option => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </Row>
  );
}

/**
 * A list of elements as chips with "+ Add" that finds one by name: the level's boxes ("except from", a lane's boxes)
 * or, for a finding, any box, arrow or level of the project.
 */
function ElementsControl({ id, field, value, layer, entry, types, own }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const doc = useEditor(state => state.doc);
  const meta = useMeta(entry);
  const list = value ?? [];
  const unnamed = kind => t(`kinds.node.${kind}`);
  const items = list.map(elementId => {
    const index = indexOf(doc).get(elementId);
    return { key: elementId, label: index ? elementName(doc, index, unnamed) : elementId };
  });
  const options = query =>
    findElements(doc, types, query, { canvas: own ? levelOf(entry) : undefined, unnamed })
      .filter(item => !list.includes(item.id) && item.id !== id)
      .map(item => ({
        id: item.id,
        label: item.name,
        meta: meta(item),
        onPick: () => edit.change([...list, item.id])
      }));
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      <div className="grid justify-items-start gap-1.5">
        <Chips
          items={items}
          removeLabel={name => t("refs.remove", { name })}
          onRemove={edit.readOnly ? undefined : key => edit.change(list.filter(item => item !== key))}
        />
        {!edit.readOnly && <AddPicker label={t("elements.add")} placeholder={t("elements.find")} options={options} />}
      </div>
    </Row>
  );
}

/** Boxes of the element's own level. */
export const NodesControl = props => <ElementsControl {...props} types={["node"]} own />;

/** What a finding is about: boxes, arrows and levels anywhere in the project. */
export const TargetsControl = props => <ElementsControl {...props} types={["node", "edge", "canvas"]} />;

/**
 * Where a shortcut points: a level, a box (of any level), a reusable part or a catalog item — shown by name and what
 * it is; a click finds another.
 */
export function TargetControl({ id, field, value, layer, entry }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const doc = useEditor(state => state.doc);
  const meta = useMeta(entry);
  const [picking, setPicking] = useState(false);
  const unnamed = kind => t(`kinds.node.${kind}`);
  const index = value && indexOf(doc).get(value);
  const options = query =>
    findElements(doc, ["canvas", "node", "definition", "catalog"], query, { unnamed })
      .filter(item => item.id !== id)
      .map(item => ({ id: item.id, label: item.name, meta: meta(item), onPick: () => edit.change(item.id) }));
  return (
    <Row label={edit.label} layer={layer} error={edit.error}>
      {picking ?
        <AddPicker
          open
          onOpenChange={setPicking}
          label={edit.label}
          placeholder={t("elements.find")}
          options={options}
        />
      : <button
          type="button"
          disabled={edit.readOnly}
          onClick={() => setPicking(true)}
          className="flex min-h-8 w-full min-w-0 items-baseline gap-2 rounded-[6px] text-left enabled:hover:bg-subtle"
        >
          <span className={cn("truncate text-ui", index ? "text-ink" : "text-muted")}>
            {index ? elementName(doc, index, unnamed) : t("refs.choose")}
          </span>
          {index && <span className="shrink-0 text-label text-muted">{kindWords(t, doc, index)}</span>}
          <Icon name="chevron-down" size={12} className="ml-auto shrink-0 self-center text-muted" />
        </button>
      }
    </Row>
  );
}
