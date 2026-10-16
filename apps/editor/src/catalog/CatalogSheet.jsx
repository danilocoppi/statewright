import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { PanelBoundary } from "@/components/PanelBoundary";
import { Icon } from "@/components/ui/Icon";
import { idsFor } from "@/editing/ids";
import { HighlightEditor } from "@/highlights/HighlightEditor";
import { highlightChipStyle } from "@/inspector/controls/highlights";
import { createCommands, newItem } from "@/inspector/references";
import { cn } from "@/lib/cn";
import { instanceCounts } from "@/reuse/definitions";
import { editorStore, useEditor } from "@/store/editor";

import { ItemDetail } from "./ItemDetail";
import { itemsOf, partsOf } from "./items";
import { catalogStore, COLLECTIONS, PARTS, useCatalog } from "./state";

/** One entry of the sheet's navigation: a collection (or the reusable parts) and how many it holds. */
function NavItem({ label, count, current, onClick }) {
  return (
    <li>
      <button
        type="button"
        aria-current={current ? "true" : undefined}
        onClick={onClick}
        className={cn(
          "relative flex h-8 w-full items-center justify-between rounded-control px-2.5 text-ui",
          current ?
            "bg-subtle font-medium text-ink before:absolute before:-left-2 before:top-1.5 before:h-5 before:w-[2px] before:rounded-full before:bg-ink"
          : "text-sub hover:bg-subtle hover:text-ink"
        )}
      >
        {label}
        <span className="text-label tabular-nums text-muted">{count}</span>
      </button>
    </li>
  );
}

/**
 * The catalog sheet (spec §7.5, mockup 10), over the canvas: the nine collections with their counts — and the
 * reusable parts (spec §7.6) —, a list's items found by name with "+ New", and the chosen item: its fields, where it
 * is used, Remove. G or the project menu open it; Esc or a click outside closes it.
 * @param {{ onNavigate: (canvasId: string) => void }} props
 */
export function CatalogSheet({ onNavigate }) {
  const { t } = useTranslation("inspector");
  const open = useCatalog(state => state.open);
  const doc = useEditor(state => state.doc);
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // What is inside has its own error boundary (spec §10): a failure stays in the sheet, which still closes.
  return (
    <dialog
      ref={ref}
      data-testid="catalog-sheet"
      aria-label={t("catalog.label")}
      onCancel={event => {
        event.preventDefault();
        catalogStore.getState().close();
      }}
      onClick={event => event.target === ref.current && catalogStore.getState().close()}
      className="m-auto h-[min(680px,calc(100vh-64px))] w-[min(1080px,calc(100vw-48px))] overflow-hidden rounded-dialog bg-surface p-0 text-ink shadow-dialog backdrop:bg-scrim open:motion-safe:animate-[dialog-in_160ms_var(--ease-soft)] backdrop:motion-safe:animate-[fade-in_160ms_ease-out]"
    >
      {open && doc && (
        <PanelBoundary className="h-full">
          <Sheet onNavigate={onNavigate} />
        </PanelBoundary>
      )}
    </dialog>
  );
}

/**
 * The sheet's three columns (mounted while it is open, so each opening starts with an empty search).
 * @param {{ onNavigate: (canvasId: string) => void }} props
 */
function Sheet({ onNavigate }) {
  const { t } = useTranslation("inspector");
  const collection = useCatalog(state => state.collection);
  const item = useCatalog(state => state.item);
  const doc = useEditor(state => state.doc);
  const readOnly = useEditor(state => state.readOnly);
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [fresh, setFresh] = useState(null);
  const [kinds, setKinds] = useState(false);
  const [making, setMaking] = useState(false);
  const parts = collection === PARTS;

  const items = parts ? partsOf(t, doc, instanceCounts(doc), query) : itemsOf(t, doc, collection, query);
  const known = item && (parts ? doc?.definitions[item] : doc?.catalog[collection]?.[item]);
  const chosen = known ? item : (items[0]?.id ?? null);
  const title = parts ? t("reuse.parts") : t(`catalog.collections.${collection}`);
  const show = name => {
    setQuery("");
    setKinds(false);
    catalogStore.getState().choose({ collection: name });
  };

  const create = () => {
    // A highlight is made in its own editor, where its look is chosen (highlights spec §6).
    if (collection === "highlights") return setMaking(true);
    const made = newItem(collection, t(`catalog.newName.${collection}`));
    const { id, commands } = createCommands(doc, collection, made);
    const kind = t(`kinds.catalog.${collection}`).toLowerCase();
    const { ok } = editorStore.getState().dispatch(commands, { label: t("catalog.created", { kind }) });
    if (!ok) return;
    setQuery("");
    setFresh(id);
    catalogStore.getState().choose({ item: id });
  };
  /** A new reusable part of a kind, with an empty body (spec §7.6, `definition.create`). */
  const createPart = kind => {
    const name = t("reuse.newName");
    const id = idsFor(doc).take("def", name);
    const { ok } = editorStore
      .getState()
      .dispatch([{ type: "definition.create", args: { name, kind, id } }], { label: t("reuse.created") });
    setKinds(false);
    if (!ok) return;
    setQuery("");
    setFresh(id);
    catalogStore.getState().choose({ item: id });
  };

  return (
    <div className="grid h-full grid-cols-[188px_260px_minmax(0,1fr)]">
      <nav aria-labelledby={titleId} className="border-r border-hairline px-2 py-4">
        <h2 id={titleId} className="mb-1.5 px-2.5 text-label text-muted">
          {t("catalog.label")}
        </h2>
        <ul className="grid gap-px">
          {COLLECTIONS.map(name => (
            <NavItem
              key={name}
              label={t(`catalog.collections.${name}`)}
              count={Object.keys(doc.catalog[name]).length}
              current={name === collection}
              onClick={() => show(name)}
            />
          ))}
        </ul>
        <ul className="mt-2 grid gap-px border-t border-hairline pt-2">
          <NavItem
            label={t("reuse.parts")}
            count={Object.keys(doc.definitions).length}
            current={parts}
            onClick={() => show(PARTS)}
          />
        </ul>
      </nav>
      <section aria-label={title} className="flex min-h-0 flex-col border-r border-hairline">
        <div className="px-3 pb-2 pt-4">
          <h3 className="mb-2 px-1 text-label text-muted">{title}</h3>
          <label className="flex h-8 items-center gap-2 rounded-control border border-control-border px-2.5 focus-within:border-accent">
            <Icon name="search" size={13} className="text-muted" />
            <input
              aria-label={t("catalog.search")}
              placeholder={t("catalog.search")}
              value={query}
              onChange={event => setQuery(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-ui outline-none placeholder:text-muted"
            />
          </label>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-1.5 [scrollbar-color:var(--control-border)_transparent] [scrollbar-width:thin]">
          {items.map(entry => (
            <li key={entry.id}>
              <button
                type="button"
                aria-current={entry.id === chosen ? "true" : undefined}
                onClick={() => catalogStore.getState().choose({ item: entry.id })}
                className={cn(
                  "grid w-full rounded-control px-2.5 py-2 text-left",
                  entry.id === chosen ? "bg-accent-soft" : "hover:bg-subtle"
                )}
              >
                <span
                  className={cn(
                    "flex min-w-0 items-center gap-2 text-ui font-medium",
                    collection === "events" && "font-mono text-[12px]"
                  )}
                >
                  {collection === "highlights" && (
                    <span
                      data-testid="highlight-swatch"
                      aria-hidden="true"
                      style={highlightChipStyle(doc.catalog.highlights[entry.id])}
                      className="size-3.5 shrink-0 rounded-[4px] border-2"
                    />
                  )}
                  <span className="truncate">{entry.name}</span>
                </span>
                <span className="truncate text-label text-muted">{entry.line}</span>
              </button>
            </li>
          ))}
          {!items.length && <li className="px-2.5 py-2 text-ui text-muted">{t("catalog.none")}</li>}
        </ul>
        {!readOnly &&
          (kinds ?
            <div role="group" aria-label={t("reuse.newName")} className="m-1.5 grid gap-px">
              {["system", "machine", "flow"].map(kind => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => createPart(kind)}
                  className="inline-flex h-8 items-center gap-2 rounded-control px-2.5 text-ui text-ink hover:bg-subtle"
                >
                  <Icon name={kind} size={14} className="text-muted" />
                  {t(`kinds.canvas.${kind}`)}
                </button>
              ))}
            </div>
          : <button
              type="button"
              onClick={parts ? () => setKinds(true) : create}
              className="m-1.5 inline-flex h-8 items-center gap-1 rounded-control px-2.5 text-ui font-medium text-accent hover:bg-subtle"
            >
              <Icon name="plus" size={13} />
              {parts ? t("reuse.newName") : t(`catalog.newName.${collection}`)}
            </button>)}
      </section>
      <ItemDetail key={chosen} id={chosen} fresh={chosen === fresh} onNavigate={onNavigate} />
      {making && (
        <HighlightEditor
          open
          onClose={() => setMaking(false)}
          onSaved={id => {
            setQuery("");
            catalogStore.getState().choose({ item: id });
          }}
        />
      )}
    </div>
  );
}
