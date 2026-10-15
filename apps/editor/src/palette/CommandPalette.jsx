import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { catalogStore } from "@/catalog/state";
import { Chip, Kbd } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { PanelBoundary } from "@/components/PanelBoundary";
import { cn } from "@/lib/cn";
import { editorStore, useEditor } from "@/store/editor";

import { entriesOf, search } from "./search";

/** Open what a found entry is: a box or an arrow on its level, selected; a catalog item in the sheet; a level. */
function go(entry) {
  if (entry.group === "commands") return entry.run();
  if (entry.group === "catalog") return catalogStore.getState().show({ collection: entry.collection, item: entry.id });
  editorStore.getState().setCanvas(entry.canvas);
  if (entry.group === "elements") {
    editorStore.getState().select([entry.id], entry.canvas);
    editorStore.getState().reveal(entry.canvas, entry.id);
  }
}

/**
 * A command's keys: each its own, "/" between them (any of them does it).
 * @param {{ keys?: string | string[] }} props
 */
function Keys({ keys }) {
  return [keys ?? []].flat().map((key, index) => (
    <span key={key} className="flex items-center gap-1">
      {index > 0 && <span aria-hidden="true">/</span>}
      <Kbd>{key}</Kbd>
    </span>
  ));
}

/**
 * Search and commands (spec §7.8, mockup 11): ⌘K finds elements on any level (with their path), catalog items, levels
 * and commands (with their keys), grouped; ↑↓ move, Enter opens or runs, Esc closes. What is inside has its own error
 * boundary (spec §10): a failure stays in the dialog, which still closes.
 * @param {{ open: boolean, onClose: () => void, commands: import("@/features/editor/commands").Command[] }} props
 */
export function CommandPalette({ open, onClose, commands }) {
  const { t } = useTranslation("inspector");
  const ref = useRef(null);
  const field = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // What is typed goes to the search at once.
      field.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      data-testid="palette"
      aria-label={t("palette.label")}
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      onClick={event => event.target === ref.current && onClose()}
      className="mx-auto mt-[12vh] w-[min(620px,calc(100vw-32px))] overflow-hidden rounded-dialog bg-surface p-0 text-ink shadow-dialog backdrop:bg-scrim open:motion-safe:animate-[dialog-in_160ms_var(--ease-soft)] backdrop:motion-safe:animate-[fade-in_160ms_ease-out]"
    >
      {open && (
        <PanelBoundary>
          <Search field={field} commands={commands} onClose={onClose} />
        </PanelBoundary>
      )}
    </dialog>
  );
}

/**
 * The search field and its grouped results (mounted while the palette is open, so each opening starts empty).
 * @param {{ field: import("react").RefObject<HTMLInputElement>, onClose: () => void,
 *   commands: import("@/features/editor/commands").Command[] }} props
 */
function Search({ field, commands, onClose }) {
  const { t } = useTranslation("inspector");
  const doc = useEditor(state => state.doc);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const groups = useMemo(() => (doc ? entriesOf(t, doc) : null), [doc, t]);
  const results = groups ? search({ ...groups, commands }, query) : [];
  const flat = results.flatMap(result => result.items.map(item => ({ ...item, group: result.group })));
  const current = Math.min(active, Math.max(0, flat.length - 1));

  const run = entry => {
    onClose();
    go(entry);
  };
  const onKeyDown = event => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (flat.length) setActive((current + (event.key === "ArrowDown" ? 1 : -1) + flat.length) % flat.length);
    } else if (event.key === "Enter" && flat[current]) {
      event.preventDefault();
      run(flat[current]);
    }
  };

  // Where each group's first entry is in the whole list (↑↓ move through every group).
  const offsets = results.map((_, at) => results.slice(0, at).reduce((sum, result) => sum + result.items.length, 0));
  return (
    <>
      <label className="flex h-14 items-center gap-3 border-b border-hairline px-5">
        <Icon name="search" size={16} className="text-muted" />
        <input
          ref={field}
          role="combobox"
          aria-label={t("palette.label")}
          aria-expanded={flat.length > 0}
          aria-controls={listId}
          aria-activedescendant={flat.length ? `${listId}-${current}` : undefined}
          value={query}
          placeholder={t("palette.placeholder")}
          onChange={event => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-read outline-none placeholder:text-muted"
        />
      </label>
      <div
        id={listId}
        role="listbox"
        aria-label={t("palette.label")}
        className="max-h-[min(440px,60vh)] overflow-y-auto py-2 [scrollbar-color:var(--control-border)_transparent] [scrollbar-width:thin]"
      >
        {results.map((result, groupIndex) => (
          <div key={result.group} role="group" aria-label={t(`palette.groups.${result.group}`)} className="pb-1">
            <p className="px-5 pb-1 pt-2 text-label text-muted">{t(`palette.groups.${result.group}`)}</p>
            {result.items.map((item, itemIndex) => {
              const index = offsets[groupIndex] + itemIndex;
              return (
                <div
                  key={`${result.group}-${item.id}`}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === current}
                  onPointerMove={() => setActive(index)}
                  onClick={() => run({ ...item, group: result.group })}
                  className={cn(
                    "mx-2 flex h-9 cursor-pointer items-center gap-3 rounded-control px-3",
                    index === current && "bg-accent-soft"
                  )}
                >
                  {result.group !== "commands" && (
                    // One width for most chips, so the names line up (a long kind takes more).
                    <Chip className="min-w-[68px] shrink-0 justify-center">{item.kind}</Chip>
                  )}
                  <span className={cn("min-w-0 truncate text-ui", item.mono && "font-mono text-[12.5px]")}>
                    {item.name}
                  </span>
                  <span className="ml-auto flex shrink-0 items-center gap-1 text-label text-muted">
                    {result.group === "commands" ?
                      <Keys keys={item.keys} />
                    : <span className="max-w-[260px] truncate">{item.meta}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
        {!flat.length && <p className="px-5 py-3 text-ui text-muted">{t("palette.none")}</p>}
      </div>
      <p className="flex gap-4 border-t border-hairline px-5 py-2.5 text-label text-muted">
        <span>↑↓ {t("palette.move")}</span>
        <span>↵ {t("palette.open")}</span>
        <span>Esc {t("palette.close")}</span>
      </p>
    </>
  );
}
