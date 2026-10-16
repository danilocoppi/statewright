import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { applyBatch } from "statewright";

import { Button, IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { HighlightEditor } from "@/highlights/HighlightEditor";
import { highlightChipStyle } from "@/inspector/controls/highlights";
import { cn } from "@/lib/cn";
import { indexOf, usageCount } from "@/lib/derived";
import { kindWords } from "@/inspector/describe";
import { FieldList } from "@/inspector/FieldList";
import { fieldsFor } from "@/inspector/fields";
import { TitleControl } from "@/inspector/controls/text";
import { JsonSchemaControl } from "@/inspector/controls/types";
import { elementName } from "@/inspector/references";
import { inspectorStore } from "@/inspector/state";
import { editorStore, useEditor } from "@/store/editor";

import { usageRows } from "./items";
import { catalogStore } from "./state";

/**
 * Where an item is used (spec §7.5: Used by, `usagesOf`): each use names the element and the field, and goes to it —
 * on its level, selected, or to another item of the catalog.
 */
function UsedBy({ id, onNavigate }) {
  const { t } = useTranslation("inspector");
  const doc = useEditor(state => state.doc);
  const rows = usageRows(t, doc, id, {
    name: entry => elementName(doc, entry, kind => t(`kinds.node.${kind}`)),
    kind: entry => kindWords(t, doc, entry)
  });
  const go = row => {
    const entry = indexOf(editorStore.getState().doc).get(row.source);
    if (entry?.type === "catalog")
      return catalogStore.getState().choose({ collection: entry.collection, item: entry.id });
    catalogStore.getState().close();
    if (!row.canvas) return;
    onNavigate(row.canvas);
    if (entry?.type === "node" || entry?.type === "edge") {
      editorStore.getState().select([row.source], row.canvas);
      editorStore.getState().reveal(row.canvas, row.source);
    }
    // A level that uses the item (a type as its context): its details, on the layer where the item is named.
    if (entry?.type === "canvas") {
      const fields = fieldsFor(editorStore.getState().doc, row.source);
      inspectorStore.getState().show(row.source, { details: fields.details.some(field => field.key === row.key) });
    }
  };
  return (
    <section aria-label={t("catalog.usedBy")} className="border-t border-hairline pt-4">
      <h4 className="mb-2 text-label text-muted">{t("catalog.usedBy")}</h4>
      {rows.length ?
        <ul className="grid gap-0.5">
          {rows.map((row, index) => (
            <li key={`${row.source}-${index}`}>
              <button
                type="button"
                onClick={() => go(row)}
                className="flex w-full items-baseline gap-1.5 rounded-control px-2 py-1 text-left text-ui text-sub hover:bg-subtle hover:text-ink"
              >
                <span>{row.kind}</span>
                <span className="truncate font-mono text-[12px] text-ink">{row.name}</span>
                <span className="shrink-0 text-muted">· {row.field}</span>
                {row.level && (
                  <span className="ml-auto shrink-0 text-label text-muted">
                    {t("catalog.in", { level: row.level })}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      : <p className="text-ui text-muted">{t("catalog.unused")}</p>}
    </section>
  );
}

/**
 * Remove an item: at once when nothing uses it; otherwise after saying how many uses it has, removing them with it
 * (spec §7.5: remove offers to show the uses first).
 */
/**
 * What removing an item with its uses takes with it besides the uses: the boxes and arrows that cannot be without it
 * (a step whose action it is), as Core would remove them — tried on the document, which is not changed. The item's
 * own body is not counted.
 * @returns {string | null} In words, or null when nothing else goes.
 */
function alsoRemoved(t, doc, command, item) {
  let after;
  try {
    ({ doc: after } = applyBatch(doc, [command]));
  } catch {
    return null;
  }
  // The item's own body (a reusable part's levels, an action's flow), at any depth, goes with it: that is expected.
  const own = new Set();
  const take = canvasId => {
    if (!canvasId || own.has(canvasId)) return;
    own.add(canvasId);
    for (const node of Object.values(doc.canvases[canvasId]?.nodes ?? {})) take(node.inner?.canvas);
  };
  take(item.type === "definition" ? item.value.canvas : item.value.inner?.canvas);
  const kept = indexOf(after);
  const gone = [...indexOf(doc).entries.values()].filter(
    entry => !kept.get(entry.id) && !own.has(entry.canvas) && !own.has(entry.id)
  );
  const boxes = gone.filter(entry => entry.type === "node");
  const arrows = gone.filter(entry => entry.type === "edge");
  const names = boxes.map(entry => entry.value.name).filter(Boolean);
  const parts = [
    ...(boxes.length ?
      [
        t("catalog.boxes", { count: boxes.length }) +
          (names.length ? ` (${names.slice(0, 3).join(", ")}${names.length > 3 ? ", …" : ""})` : "")
      ]
    : []),
    ...(arrows.length ? [t("catalog.arrows", { count: arrows.length })] : [])
  ];
  if (!parts.length) return null;
  const what = parts.length === 2 ? t("catalog.both", { first: parts[0], second: parts[1] }) : parts[0];
  return t("catalog.alsoRemoves", { what });
}

function Remove({ id, uses }) {
  const { t } = useTranslation("inspector");
  const doc = useEditor(state => state.doc);
  const [asking, setAsking] = useState(false);
  const entry = fieldsFor(doc, id).entry;
  // A reusable part is removed with definition.remove (its uses lose their interior); a catalog item with
  // catalog.remove.
  const part = entry.type === "definition";
  const command = cascade => ({
    type: part ? "definition.remove" : "catalog.remove",
    args: { id, ...(cascade && { cascade: true }) }
  });
  const remove = cascade => {
    const kind = (part ? t("kinds.definition") : t(`kinds.catalog.${entry.collection}`)).toLowerCase();
    const { ok } = editorStore.getState().dispatch([command(cascade)], { label: t("catalog.removed", { kind }) });
    if (ok) catalogStore.getState().choose({ item: null });
  };
  if (asking) {
    const more = alsoRemoved(t, doc, command(true), entry);
    return (
      <div role="alert" className="grid gap-2 rounded-control bg-danger-soft px-3 py-2.5 text-ui text-ink">
        <p>{t("catalog.removeUsed", { count: uses })}</p>
        {more && <p>{more}</p>}
        <div className="flex gap-2">
          <Button size="sm" variant="danger" onClick={() => remove(true)}>
            {t("catalog.removeAnyway")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>
            {t("catalog.keep")}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => (uses ? setAsking(true) : remove(false))}
      className="inline-flex h-8 items-center gap-1.5 justify-self-start text-ui text-danger hover:underline"
    >
      <Icon name="trash" size={14} />
      {t("catalog.remove")}
    </button>
  );
}

/** A highlight's look, as its tag, and the way to its editor (highlights spec §6). */
function EditLook({ id, highlight }) {
  const { t } = useTranslation("inspector");
  const readOnly = useEditor(state => state.readOnly);
  const [editing, setEditing] = useState(false);
  return (
    <div className="mt-2 flex items-center gap-2">
      <span
        style={highlightChipStyle(highlight)}
        className="inline-flex h-6 items-center rounded-[6px] border px-2 text-[12px] font-medium"
      >
        {highlight.name}
      </span>
      {!readOnly && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-[12px] font-medium text-accent hover:underline"
        >
          {t("highlights.editLook")}
        </button>
      )}
      {editing && <HighlightEditor open id={id} onClose={() => setEditing(false)} />}
    </div>
  );
}

const TABS = ["fields", "schema"];

/**
 * A type's two tabs (mockup 10): its fields, and its JSON Schema — ← and → move between them, Home and End to the first
 * and the last (WAI-ARIA tabs); only the chosen one is in the Tab order, and each names its own panel.
 * @param {{ value: string, onChange: (tab: string) => void,
 *   ids: { tab: (tab: string) => string, panel: (tab: string) => string } }} props
 */
function Tabs({ value, onChange, ids }) {
  const { t } = useTranslation("inspector");
  const onKeyDown = event => {
    const at = TABS.indexOf(value);
    const to = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: TABS.length - 1 }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    const next = TABS[(to + TABS.length) % TABS.length];
    onChange(next);
    document.getElementById(ids.tab(next))?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={t("types.tabs.label")}
      onKeyDown={onKeyDown}
      className="-mb-1 flex gap-5 border-b border-hairline"
    >
      {TABS.map(tab => (
        <button
          key={tab}
          id={ids.tab(tab)}
          type="button"
          role="tab"
          aria-selected={value === tab}
          aria-controls={ids.panel(tab)}
          tabIndex={value === tab ? 0 : -1}
          onClick={() => onChange(tab)}
          className={cn(
            "-mb-px h-8 border-b-2 text-ui",
            value === tab ? "border-ink font-medium text-ink" : "border-transparent text-muted hover:text-ink"
          )}
        >
          {t(`types.tabs.${tab}`)}
        </button>
      ))}
    </div>
  );
}

/**
 * One item of the catalog (mockup 10): its name, its fields in Basics and Details (the inspector's controls), where it
 * is used, and Remove.
 * @param {{ id: string | null, fresh?: boolean, onNavigate: (canvasId: string) => void }} props `fresh`: just created
 *   — its name has the focus.
 */
export function ItemDetail({ id, fresh = false, onNavigate }) {
  const { t } = useTranslation("inspector");
  const doc = useEditor(state => state.doc);
  const readOnly = useEditor(state => state.readOnly);
  const fields = useMemo(() => (id ? fieldsFor(doc, id) : null), [doc, id]);
  const [tab, setTab] = useState("fields");
  const base = useId();
  const ids = { tab: name => `${base}-tab-${name}`, panel: name => `${base}-panel-${name}` };
  const uses = id ? usageCount(doc, id) : 0;
  if (!fields) {
    return <p className="p-6 text-ui text-muted">{t("catalog.empty")}</p>;
  }
  const { entry } = fields;
  const title = fields.basics.find(field => field.control === "title");
  // A type's JSON Schema has its own tab (mockup 10); the other fields are on the first.
  const isType = entry.collection === "types";
  const schema = fields.details.find(field => field.key === "jsonSchema");
  const details = isType ? fields.details.filter(field => field !== schema) : fields.details;
  return (
    <section aria-label={entry.value.name} className="flex min-h-0 flex-col">
      <header className="flex items-start gap-2 px-6 pb-3 pt-5">
        <div className="min-w-0 flex-1">
          <TitleControl
            key={id}
            id={id}
            field={title}
            value={entry.value.name}
            stand=""
            autoFocus={fresh}
            mono={entry.collection === "events"}
          />
          <p className="text-ui text-muted">
            {entry.type === "definition" ?
              `${kindWords(t, doc, entry)} · ${t(`kinds.canvas.${entry.value.kind}`)}`
            : kindWords(t, doc, entry)}
          </p>
          {entry.collection === "highlights" && <EditLook id={id} highlight={entry.value} />}
          {entry.type === "definition" && (
            <button
              type="button"
              onClick={() => {
                catalogStore.getState().close();
                onNavigate(entry.value.canvas);
              }}
              className="mt-1 text-[12px] font-medium text-accent hover:underline"
            >
              {t("reuse.openBody")}
            </button>
          )}
        </div>
        <IconButton label={t("catalog.close")} className="-mr-2 size-7" onClick={() => catalogStore.getState().close()}>
          <Icon name="close" size={14} />
        </IconButton>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] content-start gap-4 overflow-y-auto px-6 pb-6 [scrollbar-color:var(--control-border)_transparent] [scrollbar-width:thin]">
        {isType ?
          <>
            <Tabs value={tab} onChange={setTab} ids={ids} />
            <div role="tabpanel" id={ids.panel(tab)} aria-labelledby={ids.tab(tab)} className="grid gap-4">
              {tab === "schema" ?
                <JsonSchemaControl
                  id={id}
                  field={schema}
                  value={entry.value.jsonSchema}
                  layer="basics"
                  entry={entry}
                  hideLabel
                />
              : <FieldList id={id} fields={fields.basics} entry={entry} layer="basics" />}
            </div>
          </>
        : <FieldList id={id} fields={fields.basics} entry={entry} layer="basics" />}
        <section aria-label={t("catalog.details")} className="grid gap-2.5 border-t border-hairline pt-4">
          <h4 className="text-label text-muted">{t("catalog.details")}</h4>
          <FieldList id={id} fields={details} entry={entry} layer="details" />
        </section>
        <UsedBy id={id} onNavigate={onNavigate} />
        {!readOnly && <Remove id={id} uses={uses} />}
      </div>
    </section>
  );
}
