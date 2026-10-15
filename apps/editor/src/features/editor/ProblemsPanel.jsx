import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildIndex } from "statewright";

import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/Button";
import { Island } from "@/components/ui/Island";
import { INSPECTOR, DOCK_SPACE } from "@/canvas/viewport";
import { Segmented } from "@/components/ui/Segmented";
import { catalogStore } from "@/catalog/state";
import { guideHref, ruleAnchor } from "@/guide/links";
import { cn } from "@/lib/cn";
import { catalogPlace, problemRows } from "@/problems/rows";
import { problemsStore, SEVERITIES, SEVERITY_DOT, summarize, useProblems } from "@/problems/store";
import { isSimulating, openScenario } from "@/simulate/store";
import { editorStore, useEditor } from "@/store/editor";
import { useInspectorWidth } from "@/stores/inspector";

/** The least width the panel keeps, however narrow the window. */
const MIN_WIDTH = 280;

/** Up to three names, then how many more. */
function names(t, list) {
  return list.length <= 3 ?
      list.join(", ")
    : t("problems.andMore", { names: list.slice(0, 3).join(", "), count: list.length - 3 });
}

/** Where a line's Problem is, in words. */
function where(t, row) {
  if (row.kind === "group") return names(t, row.names);
  const { location } = row;
  if (location.kind === "level") return location.path.join(" / ");
  if (location.kind === "catalog")
    return t("problems.catalog", { collection: t(`problems.collections.${location.collection}`) });
  return t(`problems.${location.kind}`);
}

/**
 * The Problems panel (spec §8.1, mockup 12): the project's Problems by severity, with filters. A line on a level
 * highlights its element while the pointer rests on it and, when picked, shows that level with the element selected.
 * It stays open beside the canvas (a non-modal dialog), left of the inspector when that is open; Esc inside it closes it.
 * Opened on an element ("Show in Problems", from a marker's details), it shows every severity and marks that element's
 * lines, scrolled into view. A line on a catalog item or a reusable part opens the catalog on it; a line that groups
 * catalog items opens to list each, so they can be fixed one by one (the panel stays open behind the catalog).
 * @param {{ onClose: () => void, onNavigate: (canvasId: string) => void, beside?: boolean }} props `beside`: the
 *   inspector is open.
 */
export function ProblemsPanel({ onClose, onNavigate, beside = false }) {
  const { t } = useTranslation("editor");
  const doc = useEditor(state => state.doc);
  const list = useProblems(state => state.list);
  const focus = useProblems(state => state.focus);
  const [filter, setFilter] = useState("all");
  const [focused, setFocused] = useState(focus);
  /** The groups opened to list their items. */
  const [opened, setOpened] = useState(() => new Set());
  const lines = useRef(null);
  const rows = useMemo(() => problemRows(doc, list), [doc, list]);
  const counts = useMemo(() => summarize(list), [list]);
  const inspector = useInspectorWidth();
  const right = beside ? inspector + INSPECTOR.margin + 12 : INSPECTOR.margin;
  const shown = filter === "all" ? rows : rows.filter(row => row.severity === filter);

  // Opened on another element: every severity again, so its lines are there.
  if (focus !== focused) {
    setFocused(focus);
    if (focus) setFilter("all");
  }

  // Nothing stays highlighted once the panel is gone.
  useEffect(() => () => problemsStore.getState().setHighlight(null), []);

  // The element's first line in view.
  useEffect(() => {
    if (focus) lines.current?.querySelector('[aria-current="true"]')?.scrollIntoView?.({ block: "nearest" });
  }, [focus]);

  const toggle = row =>
    setOpened(before => {
      const after = new Set(before);
      if (!after.delete(row.key)) after.add(row.key);
      return after;
    });

  const pick = row => {
    const place = catalogPlace(row);
    if (place) return catalogStore.getState().show(place);
    const { canvas } = row.location;
    const editor = editorStore.getState();
    // A scenario that now goes elsewhere opens at that step (simulator spec §6.4).
    if (row.code === "scenario.diverged") {
      openScenario(row.target, row.data?.step ?? 0);
      if (canvas !== editor.canvasId) onNavigate(canvas);
      return;
    }
    const entry = buildIndex(editor.doc).get(row.target);
    if (entry?.canvas === canvas && (entry.type === "node" || entry.type === "edge")) {
      // While simulating nothing is selected (simulator spec §6.1): the element is only brought into view.
      if (!isSimulating()) editor.select([row.target], canvas);
      editor.reveal(canvas, row.target);
    }
    if (canvas !== editor.canvasId) onNavigate(canvas);
  };

  return (
    <Island
      as="section"
      id="problems-panel"
      data-testid="problems-panel"
      data-area="problems"
      role="dialog"
      aria-modal="false"
      aria-label={t("problems.title")}
      onKeyDown={event => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        onClose();
      }}
      // Beside the inspector, 12 px apart, as wide as the room the tool dock leaves (at most 400 px). Where that is under
      // 280 px, the panel keeps 280 and moves left, over the inspector: still readable, never off the screen.
      style={{
        right: `max(${INSPECTOR.margin}px, min(${right}px, calc(100vw - ${MIN_WIDTH + DOCK_SPACE}px)))`,
        width: `max(${MIN_WIDTH}px, min(400px, calc(100vw - ${right + DOCK_SPACE}px)))`
      }}
      className="fixed top-16 z-30 flex max-h-[min(calc(100vh-88px),max(280px,calc(100vh-64px-var(--sw-bottom-right,24px))))] flex-col motion-safe:animate-[menu-in_140ms_var(--ease-soft)]"
    >
      <header className="flex items-center gap-2 px-4 pb-2 pt-3.5">
        <h2 className="text-title font-semibold">{t("problems.title")}</h2>
        <span className="text-label text-muted">{t("problems.scope")}</span>
        <IconButton label={t("common:actions.close")} onClick={onClose} className="-mr-1.5 ml-auto">
          <Icon name="close" />
        </IconButton>
      </header>
      <div className="px-4 pb-2.5">
        <Segmented
          label={t("problems.filter")}
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: t("problems.filters.all", { count: counts.total }) },
            ...SEVERITIES.map(severity => ({
              value: severity,
              label: t(`problems.filters.${severity}`, { count: counts[severity] })
            }))
          ]}
        />
      </div>
      <div ref={lines} className="min-h-0 overflow-y-auto border-t border-hairline pb-1.5">
        {shown.length === 0 && (
          <p className="px-4 py-6 text-center text-read text-muted">
            {t(list.length ? "problems.noneHere" : "problems.none")}
          </p>
        )}
        {SEVERITIES.map(severity => {
          const group = shown.filter(row => row.severity === severity);
          if (!group.length) return null;
          return (
            <section key={severity} aria-label={t(`problems.severities.${severity}`)}>
              <h3 className="flex items-center gap-2 px-4 pb-1 pt-3 text-label text-muted">
                <span aria-hidden="true" className={cn("size-1.5 rounded-full", SEVERITY_DOT[severity])} />
                {t(`problems.severities.${severity}`)}
              </h3>
              <ul>
                {group.map(row => {
                  const grouped = row.kind === "group";
                  const reachable = !grouped && (row.location.kind === "level" || catalogPlace(row) !== null);
                  const open = grouped && opened.has(row.key);
                  const headline =
                    grouped ?
                      t(`problems.groups.${row.code}`, {
                        count: row.names.length,
                        collection: t(`problems.items.${row.collection}`),
                        fields: row.fields.join(", ")
                      })
                    : row.message;
                  const body = (
                    <>
                      {/* Core's message is English in every interface language (spec §8.1); a group is the editor's. */}
                      <span lang={grouped ? undefined : "en"} className="block text-read text-ink">
                        {headline}
                        {grouped && (
                          <Icon
                            name="chevron-down"
                            size={14}
                            className={cn(
                              "ml-1 inline-block align-[-2px] text-muted transition-transform duration-150 motion-reduce:transition-none",
                              !open && "-rotate-90"
                            )}
                          />
                        )}
                      </span>
                      <span className="mt-0.5 flex gap-2 text-label">
                        <code className="font-mono text-sub">{row.code}</code>
                        {/* An open group lists its items below. */}
                        {!open && <span className="truncate text-muted">{where(t, row)}</span>}
                      </span>
                    </>
                  );
                  const explain = t("problems.explain", { code: row.code });
                  const current = !grouped && focus !== null && row.target === focus;
                  const highlight = target => ({
                    onPointerEnter: () => problemsStore.getState().setHighlight(target),
                    onPointerLeave: () => problemsStore.getState().setHighlight(null),
                    onFocus: () => problemsStore.getState().setHighlight(target),
                    onBlur: () => problemsStore.getState().setHighlight(null)
                  });
                  const listId = `problems-group-${row.key.replace(/[^\w-]/g, "-")}`;
                  return (
                    <li key={row.key} data-testid="problems-row" aria-current={current ? "true" : undefined}>
                      <div
                        className={cn(
                          "group flex items-start",
                          current && "bg-accent-soft",
                          (reachable || grouped) && !current && "hover:bg-subtle"
                        )}
                      >
                        {grouped ?
                          <button
                            type="button"
                            aria-expanded={open}
                            aria-controls={open ? listId : undefined}
                            onClick={() => toggle(row)}
                            className="block min-w-0 flex-1 py-2 pl-4 text-left focus-visible:bg-subtle"
                          >
                            {body}
                          </button>
                        : reachable ?
                          <button
                            type="button"
                            onClick={() => pick(row)}
                            {...(row.location.kind === "level" ? highlight(row.target) : {})}
                            className="block min-w-0 flex-1 py-2 pl-4 text-left focus-visible:bg-subtle"
                          >
                            {body}
                          </button>
                        : <div className="min-w-0 flex-1 py-2 pl-4">{body}</div>}
                        {/* What the rule means, in the guide (spec §8.1); the editor stays where it is. */}
                        <a
                          href={guideHref(ruleAnchor(row.code))}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`${explain} (${t("common:guide.newTab")})`}
                          title={explain}
                          className="mx-1.5 mt-1.5 grid size-7 shrink-0 place-items-center rounded-control text-muted opacity-0 transition-opacity duration-150 hover:bg-surface hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                        >
                          <Icon name="book" size={14} />
                        </a>
                      </div>
                      {open && (
                        <ul id={listId} aria-label={headline} className="mb-1.5 ml-4 mr-3 border-l border-hairline">
                          {row.items.map(item => (
                            <li key={item.target}>
                              <button
                                type="button"
                                data-testid="problems-item"
                                onClick={() =>
                                  catalogStore.getState().show({ collection: row.collection, item: item.target })
                                }
                                className={cn(
                                  "flex w-full items-baseline gap-2 rounded-r-control py-1 pl-3 pr-2 text-left hover:bg-subtle focus-visible:bg-subtle"
                                )}
                              >
                                <span
                                  className={cn(
                                    "min-w-0 truncate text-read text-ink",
                                    row.collection === "events" && "font-mono text-[12.5px]"
                                  )}
                                >
                                  {item.name}
                                </span>
                                {item.name !== item.target && (
                                  <code className="ml-auto shrink-0 font-mono text-label text-muted">
                                    {item.target}
                                  </code>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </Island>
  );
}
