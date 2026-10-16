import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { PanelBoundary } from "@/components/PanelBoundary";
import { IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Island } from "@/components/ui/Island";
import { INSPECTOR } from "@/canvas/viewport";
import { cn } from "@/lib/cn";
import { indexOf } from "@/lib/derived";
import { useCopy } from "@/lib/useCopy";
import { instanceCounts, partOf } from "@/reuse/definitions";
import { editorStore, useEditor } from "@/store/editor";
import { useInspectorWidth } from "@/stores/inspector";
import { useView } from "@/stores/view";

import { SeveralHighlights } from "@/highlights/Several";
import { LockControl } from "@/locks/LockControl";

import { TitleControl } from "./controls/text";
import { headingOf } from "./describe";
import { FieldList } from "./FieldList";
import { fieldsFor } from "./fields";
import { elementName } from "./references";
import { ResizeEdge } from "./ResizeEdge";
import { inspectorStore, useInspector, useSubject } from "./state";

const NONE = [];

/** The ID, with a copy button, at the top of Details; the element's JSON at the bottom. */
function DetailsFrame({ entry, children }) {
  const { t } = useTranslation("inspector");
  const { copied, copy } = useCopy();
  const json = JSON.stringify(entry.value, null, 2);
  return (
    <>
      <div className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-x-3">
        <span className="text-label text-muted">{t("id")}</span>
        <span className="flex min-w-0 items-center gap-1">
          <code className="truncate font-mono text-[12px] text-ink">{entry.id}</code>
          <IconButton
            label={copied === "id" ? t("copied") : t("copyId")}
            className="size-6"
            onClick={() => copy("id", entry.id)}
          >
            <Icon name={copied === "id" ? "check" : "copy"} size={13} />
          </IconButton>
        </span>
      </div>
      {children}
      <section aria-label={t("json")} className="border-t border-hairline pt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <h3 className="text-label text-muted">{t("json")}</h3>
          <IconButton
            label={copied === "json" ? t("copied") : t("copyJson")}
            className="size-6"
            onClick={() => copy("json", json)}
          >
            <Icon name={copied === "json" ? "check" : "copy"} size={13} />
          </IconButton>
        </div>
        <pre
          tabIndex={0}
          className="max-h-64 overflow-auto rounded-control bg-subtle px-3 py-2.5 font-mono text-[11px] leading-[1.5] text-sub [scrollbar-color:var(--control-border)_transparent] [scrollbar-width:thin]"
        >
          {json}
        </pre>
      </section>
    </>
  );
}

/**
 * Said over an element of a reusable part's body (spec §7.6: editing an instance's interior edits the definition, and
 * the inspector says so).
 */
function PartNotice({ entry }) {
  const { t } = useTranslation("inspector");
  const doc = useEditor(state => state.doc);
  const level = entry.canvas ?? (entry.type === "canvas" ? entry.id : entry.value.canvas);
  const part = level ? partOf(doc, level) : null;
  if (!part) return null;
  const uses = instanceCounts(doc).get(part) ?? 0;
  return (
    <p className="mx-4 mb-3 flex items-start gap-2 rounded-control bg-accent-soft px-2.5 py-2 text-[12px] leading-[1.45] text-ink">
      <Icon name="duplicate" size={13} className="mt-0.5 shrink-0 text-accent" />
      <span>{t("reuse.notice", { name: doc.definitions[part].name, count: uses })}</span>
    </p>
  );
}

/** Several elements selected: their names, each a way to select it alone. */
function Several({ count }) {
  const { t } = useTranslation("inspector");
  const doc = useEditor(state => state.doc);
  const selection = useEditor(state => state.view.selections[state.canvasId] ?? NONE);
  const unnamed = kind => t(`kinds.node.${kind}`);
  // Boxes and arrows as the diagram names them (an arrow without a name by its ends), notes by their text.
  const names = selection.map(id => {
    const entry = indexOf(doc).get(id);
    const name =
      !entry ? id
      : entry.type === "note" ? entry.value.text
      : elementName(doc, entry, unnamed);
    return { id, name };
  });
  return (
    <div className="px-4 pb-4 pt-4">
      <h2 className="text-title font-semibold tracking-tight">{t("selected", { count })}</h2>
      <p className="mt-1 text-ui text-sub">{t("selectOne")}</p>
      <ul className="mt-3 grid gap-0.5">
        {names.map(item => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => editorStore.getState().select([item.id])}
              className="flex h-8 w-full items-center rounded-control px-2 text-left text-ui text-ink hover:bg-subtle"
            >
              <span className="truncate">{item.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <SeveralHighlights selection={selection} />
    </div>
  );
}

/**
 * The inspector (spec §6.1, §7.4, mockup 09): on the right, with the selection — or the level's, the project's or
 * another element's details when asked for. Two layers: Basics, what a reviewer understands without the format, and
 * Details; the choice is remembered. Every change is one undoable change, typed values one per field. Its left edge
 * widens it; the width is remembered in this browser.
 */
export function Inspector() {
  const subject = useSubject();
  const width = useInspectorWidth();
  return (
    <PanelBoundary
      resetKey={subject && ("id" in subject ? subject.id : subject.count)}
      style={{ right: INSPECTOR.margin, width }}
      className="fixed top-16 z-20 rounded-island border border-island-border bg-island shadow-island"
    >
      <InspectorIsland />
    </PanelBoundary>
  );
}

/** The island itself, inside the inspector's own error boundary (spec §10). */
function InspectorIsland() {
  const { t } = useTranslation("inspector");
  const doc = useEditor(state => state.doc);
  const canvasId = useEditor(state => state.canvasId);
  const selection = useEditor(state => state.view.selections[state.canvasId] ?? NONE);
  const focus = useInspector(state => state.focus);
  const fresh = useInspector(state => state.fresh);
  const remembered = useView(state => state.inspectorDetails);
  // An element shown on request may open on a layer of its own this once (a use in the catalog's Details).
  const once = useInspector(state => (state.focus && state.details !== null ? state.details : null));
  const details = once ?? remembered;
  const subject = useSubject();
  const width = useInspectorWidth();

  // A new selection, or another level, is shown at once — unless the level just opened was asked for with its own
  // details (a use in the catalog).
  const level = useRef(canvasId);
  useEffect(() => {
    const arrived = level.current !== canvasId;
    level.current = canvasId;
    const { focus } = inspectorStore.getState();
    if (arrived && focus === canvasId) return;
    // An element selected and shown on request at once (a finding's "Show in the inspector") keeps its layer.
    if (focus && selection.length === 1 && selection[0] === focus) return;
    inspectorStore.getState().reset();
  }, [selection, canvasId]);

  const id = subject && "id" in subject ? subject.id : null;
  const fields = useMemo(() => (doc && id ? fieldsFor(doc, id) : null), [doc, id]);
  // An element shown on request that is gone (undone, removed elsewhere): back to the selection.
  const gone = Boolean(doc && focus && id === focus && !fields);
  useEffect(() => {
    if (gone) inspectorStore.getState().back();
  }, [gone]);
  if (!doc || !subject) return null;
  if (id && !fields) return null;

  const layer = details ? "details" : "basics";
  const entry = fields?.entry;
  const heading = entry && headingOf(t, doc, entry);
  const title = fields?.basics.find(field => field.control === "title");

  return (
    <Island
      as="section"
      role="dialog"
      aria-modal="false"
      aria-label={t("label")}
      data-testid="inspector"
      data-area="inspector"
      onKeyDown={event => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        inspectorStore.getState().close();
      }}
      style={{ right: INSPECTOR.margin, width }}
      className="fixed top-16 z-20 flex max-h-[min(calc(100vh-80px),max(280px,calc(100vh-64px-var(--sw-bottom-right,16px))))] flex-col motion-safe:animate-[menu-in_160ms_var(--ease-soft)]"
    >
      {subject.count ?
        <Several count={subject.count} />
      : <>
          <header className="flex items-start gap-1 px-4 pb-3 pt-3.5">
            {focus && selection.length > 0 && (
              <IconButton label={t("back")} className="-ml-1.5 size-7" onClick={() => inspectorStore.getState().back()}>
                <Icon name="arrow-left" size={14} />
              </IconButton>
            )}
            <div className="min-w-0 flex-1">
              {title ?
                <TitleControl
                  key={id}
                  id={id}
                  field={title}
                  value={heading.title}
                  stand={heading.stand}
                  autoFocus={fresh === id}
                />
              : <h2 className="truncate text-title font-semibold tracking-tight">{heading.stand}</h2>}
              <p className="truncate text-ui text-muted">{heading.subtitle}</p>
            </div>
            <IconButton label={t("close")} className="-mr-1.5 size-7" onClick={() => inspectorStore.getState().close()}>
              <Icon name="close" size={14} />
            </IconButton>
          </header>
          <PartNotice entry={entry} />
          <div
            className={cn(
              "grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] content-start overflow-y-auto border-t border-hairline px-4 py-3.5 [scrollbar-color:var(--control-border)_transparent] [scrollbar-width:thin]",
              "gap-4"
            )}
          >
            {/* Details adds to the basics, under them: nothing a reviewer sees goes away when they ask for more. */}
            <FieldList id={id} fields={fields.basics} entry={entry} layer="basics" />
            {layer === "details" && (
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2.5 border-t border-hairline pt-3.5">
                <DetailsFrame entry={entry}>
                  <FieldList id={id} fields={fields.details} entry={entry} layer="details" />
                </DetailsFrame>
              </div>
            )}
            {/* Don't let the AI change this: a box, an arrow, a region or the level (collaboration spec §8.2). */}
            {["node", "edge", "region", "canvas"].includes(entry?.type) && <LockControl id={id} />}
          </div>
          <footer className="border-t border-hairline px-2 py-1.5">
            <button
              type="button"
              aria-expanded={details}
              onClick={() => {
                // The person's choice is remembered from what they see now.
                inspectorStore.getState().settle();
                useView.setState({ inspectorDetails: !details });
              }}
              className="flex h-8 w-full items-center justify-between rounded-control px-2 text-ui text-sub hover:bg-subtle hover:text-ink"
            >
              {t(details ? "hideDetails" : "showDetails")}
              <Icon
                name="chevron-down"
                size={14}
                className={cn("transition-transform duration-150", details && "rotate-180")}
              />
            </button>
          </footer>
        </>
      }
      <ResizeEdge />
    </Island>
  );
}
