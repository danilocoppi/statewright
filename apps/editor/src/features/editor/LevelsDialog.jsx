import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { isSimulating } from "@/simulate/store";
import { editorStore, useEditor } from "@/store/editor";

import { filterMap, projectMap } from "./map";

/** How far each level in is drawn from the one that holds it. */
const STEP = 16;

/**
 * One level: a toggle for its elements, its name (picked, it is shown), its kind and how many elements it has; a
 * definition's uses, an implementation's item; then, open, its elements with the levels inside them, or, closed, only
 * those levels.
 * @param {{ level: import("./map").Level, depth: number, opened: Set<string>, toggle: (key: string) => void,
 *   searching: boolean, onLevel: (canvasId: string) => void, onElement: (canvasId: string, id: string) => void }} props
 */
function LevelRow({ level, depth, opened, toggle, searching, onLevel, onElement }) {
  const { t } = useTranslation(["editor", "projects", "inspector"]);
  const current = useEditor(state => state.canvasId);
  const open = searching ? level.open : opened.has(level.key);
  const here = level.canvas === current;
  const indent = { paddingLeft: 8 + depth * STEP };
  const below = open ? level.elements : level.elements.filter(element => element.level);
  return (
    <li>
      <div
        data-level={level.canvas}
        style={indent}
        className={cn("flex items-center gap-1.5 pr-2.5", here && "bg-subtle")}
      >
        {level.count > 0 && !level.cycle ?
          <button
            type="button"
            aria-expanded={open}
            aria-label={t("levels.showElements", { name: level.name })}
            onClick={() => toggle(level.key)}
            className="grid size-6 shrink-0 place-items-center rounded-control text-muted hover:bg-surface hover:text-ink"
          >
            <Icon
              name="chevron-down"
              size={14}
              className={cn("transition-transform duration-150 motion-reduce:transition-none", !open && "-rotate-90")}
            />
          </button>
        : <span aria-hidden="true" className="size-6 shrink-0" />}
        <Icon name={level.kind} size={14} className="shrink-0 text-muted" />
        <button
          type="button"
          aria-current={here ? "page" : undefined}
          onClick={() => onLevel(level.canvas)}
          className={cn("min-w-0 truncate rounded-control py-1.5 text-left hover:underline", here && "font-medium")}
        >
          {level.name}
        </button>
        <span className="ml-auto flex shrink-0 gap-3 text-label text-muted">
          {level.cycle ?
            <span>{t("levels.shownAbove")}</span>
          : <>
              <span>{t(`projects:start.${level.kind}`)}</span>
              <span className="w-[72px] text-right tabular-nums">{t("levels.elements", { count: level.count })}</span>
            </>
          }
        </span>
      </div>
      {level.item && (
        <p style={{ paddingLeft: indent.paddingLeft + 50 }} className="-mt-1 pb-1 text-label text-muted">
          {t("levels.implements", { name: level.item.name })}
        </p>
      )}
      {level.uses && (
        <div
          style={{ paddingLeft: indent.paddingLeft + 50 }}
          className="-mt-1.5 flex flex-wrap gap-x-3 pb-0.5 text-label"
        >
          {level.uses.length === 0 ?
            <span className="text-warning">{t("levels.unused")}</span>
          : level.uses.map(use => (
              <button
                key={use.id}
                type="button"
                onClick={() => onElement(use.canvas, use.id)}
                className="inline-flex min-h-6 items-center text-sub underline-offset-2 hover:text-ink hover:underline"
              >
                {t("levels.usedBy", { name: use.name, level: use.level })}
              </button>
            ))
          }
        </div>
      )}
      {below.length > 0 && (
        <ul>
          {below.map(element =>
            open ?
              <li key={element.id}>
                <button
                  type="button"
                  onClick={() => onElement(level.canvas, element.id)}
                  style={{ paddingLeft: 8 + (depth + 1) * STEP + 30 }}
                  className="flex w-full items-baseline gap-2 py-1 pr-2.5 text-left hover:bg-subtle"
                >
                  <span className="min-w-0 truncate text-ink">{element.name}</span>
                  <span className="ml-auto shrink-0 text-label text-muted">
                    {t(`inspector:kinds.node.${element.kind}`)}
                  </span>
                </button>
                {element.level && (
                  <ul>
                    <LevelRow
                      level={element.level}
                      depth={depth + 3}
                      opened={opened}
                      toggle={toggle}
                      searching={searching}
                      onLevel={onLevel}
                      onElement={onElement}
                    />
                  </ul>
                )}
              </li>
            : <LevelRow
                key={element.id}
                level={element.level}
                depth={depth + 1}
                opened={opened}
                toggle={toggle}
                searching={searching}
                onLevel={onLevel}
                onElement={onElement}
              />
          )}
        </ul>
      )}
    </li>
  );
}

/**
 * The map's search and sections (mounted while the dialog is open, so each opening starts afresh).
 * @param {{ onLevel: (canvasId: string) => void, onElement: (canvasId: string, id: string) => void }} props
 */
function ProjectMap({ onLevel, onElement }) {
  const { t } = useTranslation("editor");
  const doc = useEditor(state => state.doc);
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState(() => new Set());
  const sections = useMemo(() => projectMap(t, doc), [t, doc]);
  const shown = useMemo(() => filterMap(sections, query), [sections, query]);
  const searching = query.trim() !== "";
  const toggle = key =>
    setOpened(before => {
      const after = new Set(before);
      if (!after.delete(key)) after.add(key);
      return after;
    });
  return (
    <>
      <label className="mb-3 flex h-8 items-center gap-2 rounded-control border border-control-border px-2.5 focus-within:border-accent">
        <Icon name="search" size={13} className="text-muted" />
        <input
          type="search"
          // The dialog opens to find something: the search has the focus.
          autoFocus
          aria-label={t("levels.search")}
          placeholder={t("levels.search")}
          value={query}
          onChange={event => setQuery(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-ui outline-none placeholder:text-muted"
        />
      </label>
      <nav
        aria-label={t("levels.title")}
        className="-mx-6 max-h-[60vh] overflow-y-auto border-t border-hairline text-read"
      >
        {shown.length === 0 && <p className="px-6 py-6 text-center text-muted">{t("levels.nothing")}</p>}
        {shown.map(section => (
          <section key={section.key} className="pb-2">
            {section.key !== "levels" && (
              <h3 className="px-6 pb-1 pt-3 text-label text-muted">{t(`levels.${section.key}`)}</h3>
            )}
            {section.key === "unattached" && (
              <p className="-mt-0.5 px-6 pb-1 text-label text-muted">{t("levels.unattachedHint")}</p>
            )}
            <ul className={cn(section.key === "levels" && "pt-2")}>
              {section.levels.map(level => (
                <LevelRow
                  key={level.key}
                  level={level}
                  depth={1}
                  opened={opened}
                  toggle={toggle}
                  searching={searching}
                  onLevel={onLevel}
                  onElement={onElement}
                />
              ))}
            </ul>
          </section>
        ))}
      </nav>
    </>
  );
}

/**
 * The project's map (spec §6.3, `hierarchy`): every level from the top, then the flows that implement catalog items,
 * the bodies of definitions with where each is used, and the levels nothing reaches. A level opens to its elements;
 * picking a level shows it, picking an element shows its level with it selected. What is typed keeps what matches.
 * @param {{ open: boolean, onClose: () => void, onNavigate: (canvasId: string) => void }} props
 */
export function LevelsDialog({ open, onClose, onNavigate }) {
  const { t } = useTranslation("editor");
  const onLevel = canvasId => {
    onClose();
    onNavigate(canvasId);
  };
  const onElement = (canvasId, id) => {
    const editor = editorStore.getState();
    // While simulating nothing is selected (simulator spec §6.1): the element is only brought into view.
    if (!isSimulating()) editor.select([id], canvasId);
    editor.reveal(canvasId, id);
    onLevel(canvasId);
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("levels.title")}
      className="w-[min(640px,calc(100vw-32px))]"
      testId="levels-dialog"
    >
      <ProjectMap onLevel={onLevel} onElement={onElement} />
    </Dialog>
  );
}
