import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { useEditor } from "@/store/editor";

/** Every event and call of the catalog, in the order a person looks for them: events by name, then calls. */
function inputsOf(doc) {
  const byName = (a, b) => a.label.localeCompare(b.label);
  const events = Object.entries(doc.catalog.events)
    .map(([id, event]) => ({ id, input: { event: id }, label: event.name, meta: event.description ?? "" }))
    .sort(byName);
  const endpoints = Object.entries(doc.catalog.endpoints).map(([id, endpoint]) => ({
    id,
    input: { call: id },
    label: `${endpoint.method} ${endpoint.path}`,
    meta: endpoint.name
  }));
  const webhooks = Object.entries(doc.catalog.webhooks).map(([id, webhook]) => ({
    id,
    input: { call: id },
    label: webhook.name,
    meta: webhook.direction === "in" ? (doc.catalog.events[webhook.event]?.name ?? "") : ""
  }));
  return [
    { group: "events", icon: "bolt", items: events },
    { group: "calls", icon: "call", items: [...endpoints, ...webhooks].sort(byName) }
  ];
}

/**
 * Other event… (simulator spec §6.2): every event and call of the catalog, in the style of search and commands (⌘K):
 * type to narrow, ↑↓ to move, Enter to send. One that enables nothing makes a step where nothing happens.
 * @param {{ open: boolean, onClose: () => void, onPick: (input: object, label: string) => void }} props
 */
export function EventPicker({ open, onClose, onPick }) {
  const { t } = useTranslation("simulate");
  const ref = useRef(null);
  const field = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      field.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={t("picker.label")}
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      onClick={event => event.target === ref.current && onClose()}
      className="mx-auto mt-[12vh] w-[min(560px,calc(100vw-32px))] overflow-hidden rounded-dialog bg-surface p-0 text-ink shadow-dialog backdrop:bg-scrim open:motion-safe:animate-[dialog-in_160ms_var(--ease-soft)] backdrop:motion-safe:animate-[fade-in_160ms_ease-out]"
    >
      {open && <Search field={field} onPick={onPick} />}
    </dialog>
  );
}

function Search({ field, onPick }) {
  const { t } = useTranslation("simulate");
  const doc = useEditor(state => state.doc);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const groups = useMemo(() => inputsOf(doc), [doc]);
  const words = query.trim().toLowerCase();
  const shown = groups
    .map(group => ({
      ...group,
      items: group.items.filter(item => `${item.label} ${item.meta}`.toLowerCase().includes(words))
    }))
    .filter(group => group.items.length);
  const flat = shown.flatMap(group => group.items);
  const current = Math.min(active, Math.max(0, flat.length - 1));
  const onKeyDown = event => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (flat.length) setActive((current + (event.key === "ArrowDown" ? 1 : -1) + flat.length) % flat.length);
    } else if (event.key === "Enter" && flat[current]) {
      event.preventDefault();
      onPick(flat[current].input, flat[current].label);
    }
  };
  // Where each group's first item is in the whole list (↑↓ move through every group).
  const offsets = shown.map((_, at) => shown.slice(0, at).reduce((sum, group) => sum + group.items.length, 0));
  return (
    <>
      <label className="flex h-14 items-center gap-3 border-b border-hairline px-5">
        <Icon name="search" size={16} className="text-muted" />
        <input
          ref={field}
          role="combobox"
          aria-label={t("picker.label")}
          aria-expanded={flat.length > 0}
          aria-controls={listId}
          aria-activedescendant={flat.length ? `${listId}-${current}` : undefined}
          value={query}
          placeholder={t("picker.placeholder")}
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
        aria-label={t("picker.label")}
        className="max-h-[min(400px,56vh)] overflow-y-auto py-2 [scrollbar-color:var(--control-border)_transparent] [scrollbar-width:thin]"
      >
        {shown.map((group, groupIndex) => (
          <div key={group.group} role="group" aria-label={t(`picker.${group.group}`)} className="pb-1">
            <p className="px-5 pb-1 pt-2 text-label text-muted">{t(`picker.${group.group}`)}</p>
            {group.items.map((item, itemIndex) => {
              const at = offsets[groupIndex] + itemIndex;
              return (
                <div
                  key={item.id}
                  id={`${listId}-${at}`}
                  role="option"
                  aria-selected={at === current}
                  onPointerMove={() => setActive(at)}
                  onClick={() => onPick(item.input, item.label)}
                  className={cn(
                    "mx-2 flex h-9 cursor-pointer items-center gap-3 rounded-control px-3",
                    at === current && "bg-accent-soft"
                  )}
                >
                  <Icon name={group.icon} size={14} className="shrink-0 text-accent" />
                  <span className="min-w-0 truncate font-mono text-[12.5px] text-ink">{item.label}</span>
                  <span className="ml-auto max-w-[240px] shrink-0 truncate text-label text-muted">{item.meta}</span>
                </div>
              );
            })}
          </div>
        ))}
        {!flat.length && <p className="px-5 py-3 text-ui text-muted">{t("picker.none")}</p>}
      </div>
      <p className="flex gap-4 border-t border-hairline px-5 py-2.5 text-label text-muted">
        <span>↑↓ {t("picker.move")}</span>
        <span>↵ {t("picker.send")}</span>
        <span>Esc {t("picker.close")}</span>
      </p>
    </>
  );
}
