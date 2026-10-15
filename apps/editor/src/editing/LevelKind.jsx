import { useTranslation } from "react-i18next";

import { Icon } from "@/components/ui/Icon";
import { Menu } from "@/components/ui/Menu";
import { cn } from "@/lib/cn";
import { interiorCommands, interiorKinds } from "@/reuse/definitions";
import { useSimulation } from "@/simulate/store";
import { editorStore, useEditor } from "@/store/editor";
import { toast } from "@/stores/toast";

import { mixLevel } from "./actions";
import { refusalKey } from "./refusals";

/** The kinds of level a box may hold, in the order the menu offers them. */
const KINDS = ["flow", "machine", "system", "mixed"];

/** The level inside a box: its own, or the body of the reusable part it uses; null when there is none. */
function levelInside(doc, node) {
  const id = node.inner?.canvas ?? doc.definitions[node.inner?.definition]?.canvas;
  return id && doc.canvases[id] ? id : null;
}

/**
 * Give a box a new level of a kind, as the inspector's "Add a … inside" does (the same command, the same change), and
 * open it, so the dock shows its tools.
 */
function createInside(t, id, kind) {
  const editor = editorStore.getState();
  const node = editor.doc.canvases[editor.canvasId].nodes[id];
  const { id: level, commands } = interiorCommands(editor.doc, id, kind, node.name ?? id);
  const result = editor.dispatch(commands, { label: t("inspector:reuse.added") });
  if (result.ok) editorStore.getState().setCanvas(level);
  else toast.error(t(`editor:${refusalKey(result.error.code)}`));
}

/** What the menu offers for the level itself: to change it to mixed, when it is not. */
function levelSection(t, doc, canvasId, locked) {
  if (doc.canvases[canvasId].kind === "mixed") return [];
  return [
    {
      title: t("tools.kind.thisLevel"),
      items: [
        {
          id: "toMixed",
          label: t("tools.kind.toMixed"),
          hint: t("tools.kind.toMixedHint"),
          icon: <Icon name="mixed" />,
          disabled: locked,
          onSelect: () => mixLevel(t)
        }
      ]
    }
  ];
}

/**
 * What the menu offers for the selection: the kinds of level the one box selected can hold, when it has nothing
 * inside; its level, when it has one; otherwise, a word on what to select.
 * @returns {import("@/components/ui/Menu").MenuSection[]}
 */
function sectionsFor(t, doc, canvasId, selection, locked) {
  const id = selection.length === 1 ? selection[0] : null;
  const node = id ? doc.canvases[canvasId].nodes[id] : null;
  const kinds = node ? interiorKinds(doc, { type: "node", value: node, canvas: canvasId }) : [];
  if (!kinds.length) return [{ items: [{ id: "pick", label: t("tools.kind.pick"), disabled: true, onSelect() {} }] }];

  const name = node.name ?? t(`inspector:kinds.node.${node.kind}`);
  if (node.inner) {
    const level = levelInside(doc, node);
    const inside = level && doc.canvases[level];
    return [
      {
        title: t("tools.kind.inside", { name }),
        items: [
          {
            id: "open",
            label: t("tools.kind.open", { name: inside?.name ?? name }),
            hint: inside && t(`tools.kind.${inside.kind}`),
            icon: inside && <Icon name={inside.kind} />,
            disabled: !inside,
            onSelect: () => editorStore.getState().setCanvas(level)
          }
        ]
      }
    ];
  }
  return [
    {
      title: t("tools.kind.create", { name }),
      items: KINDS.filter(kind => kinds.includes(kind)).map(kind => ({
        id: kind,
        label: t(`tools.kind.${kind}`),
        hint: t(`tools.kind.hint.${kind}`),
        icon: <Icon name={kind} />,
        disabled: locked,
        onSelect: () => createInside(t, id, kind)
      }))
    }
  ];
}

/**
 * The kind of the level shown, under the dock's tools: its icon and its name, read down the dock. A level holds one
 * kind (Core spec §9.8), so its tools cannot change; the menu leads to a level of another kind instead — it creates one
 * inside the box selected and opens it, or opens the one it has. Up and Down move along the dock, as on its tools;
 * Enter, Space or a click opens the menu. Read-only or while simulating (where the editor shows no dock), it creates
 * nothing.
 * @param {{ kind: "system" | "machine" | "flow", buttonRef: (element: HTMLElement | null) => void,
 *   onKeyDown: (event: KeyboardEvent) => void, tip: boolean, onTip: (shown: boolean) => void }} props `tip`: its
 *   tooltip is shown (the dock shows one at a time).
 */
export function LevelKind({ kind, buttonRef, onKeyDown, tip, onTip }) {
  const { t } = useTranslation(["editor", "inspector"]);
  const doc = useEditor(state => state.doc);
  const canvasId = useEditor(state => state.canvasId);
  const selection = useEditor(state => state.view.selections[state.canvasId]) ?? [];
  const readOnly = useEditor(state => state.readOnly);
  const simulating = useSimulation(state => state.mode !== null);

  return (
    <Menu
      label={t("tools.kind.menu")}
      side="right"
      sections={[
        ...sectionsFor(t, doc, canvasId, selection, readOnly || simulating),
        ...levelSection(t, doc, canvasId, readOnly || simulating)
      ]}
      menuClassName="w-80"
      trigger={({ ref, onKeyDown: _opens, ...props }) => (
        <div className="relative">
          <button
            {...props}
            ref={element => {
              ref.current = element;
              buttonRef(element);
            }}
            type="button"
            aria-label={t("tools.kind.name", { kind: t(`tools.kind.${kind}`) })}
            onKeyDown={onKeyDown}
            onPointerEnter={() => onTip(true)}
            onPointerLeave={() => onTip(false)}
            onFocus={() => onTip(true)}
            onBlur={() => onTip(false)}
            className={cn(
              "flex w-8 flex-col items-center gap-1.5 rounded-control py-2 text-sub hover:bg-subtle hover:text-ink",
              props["aria-expanded"] && "bg-subtle text-ink"
            )}
          >
            <Icon name={kind} />
            {/* In a short window, only the icon: the dock stays clear of the islands at the top. */}
            <span className="text-[11px] font-medium leading-none tracking-[0.01em] [writing-mode:vertical-rl] [@media(max-height:640px)]:hidden">
              {t(`tools.kind.${kind}`)}
            </span>
          </button>
          {tip && !props["aria-expanded"] && (
            <span
              role="tooltip"
              className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-control bg-primary px-2 py-1 text-ui font-medium text-primary-foreground shadow-island motion-safe:animate-[fade-in_120ms_ease-out]"
            >
              {t(`tools.kind.tip.${kind}`)}
            </span>
          )}
        </div>
      )}
    />
  );
}
