import { useTranslation } from "react-i18next";

import { ContextMenu } from "@/components/ui/ContextMenu";
import { commentsStore } from "@/comments/store";
import { Icon } from "@/components/ui/Icon";
import { isMac } from "@/features/editor/shortcuts";
import { inspectorStore } from "@/inspector/state";
import { editorStore } from "@/store/editor";

import {
  alignSelection,
  copySelection,
  deleteSelection,
  distributeSelection,
  duplicateSelection,
  lastClip,
  paste,
  focusSelection,
  laneSelection,
  regionSelection,
  selectAll
} from "./actions";
import { boxesOf } from "./changes";
import { clipText } from "./clipboard";
import { editingStore } from "./state";
import { hasTrigger } from "./triggers";

const ALIGN = [
  ["left", "alignLeft", "align-left"],
  ["centre", "alignCentre", "align-centre"],
  ["right", "alignRight", "align-right"],
  ["top", "alignTop", "align-top"],
  ["middle", "alignMiddle", "align-middle"],
  ["bottom", "alignBottom", "align-bottom"]
];

/**
 * The canvas's context menu (spec §7.3): what can be done to the selection — duplicate, copy, paste, delete; align
 * two boxes or more, distribute three or more; make a region on machines — or, on the empty canvas, paste, select all
 * and show the level's details. It reads the level as it is when opened.
 * @param {{ at: { x: number, y: number }, onClose: () => void }} props `at` in the canvas's own coordinates on screen.
 */
export function CanvasMenu({ at, onClose }) {
  const { t } = useTranslation("editor");
  const { doc, canvasId, view, readOnly } = editorStore.getState();
  const selection = view.selections[canvasId] ?? [];
  const boxes = boxesOf(doc, canvasId);
  const chosen = selection.filter(id => boxes.has(id));
  const command = key => (isMac() ? `⌘${key}` : `Ctrl+${key}`);
  const item = (id, label, onSelect, extra = {}) => ({ id, label, onSelect, ...extra });

  const copy = () => {
    const clip = copySelection();
    if (clip) globalThis.navigator?.clipboard?.writeText?.(clipText(clip)).catch(() => {});
  };
  // Where the menu was opened (a right click), not where the pointer is when Paste is chosen.
  const pasteItem = item("paste", t("editing.paste"), () => paste(t, lastClip(), at.point), {
    icon: <Icon name="paste" />,
    shortcut: command("V"),
    disabled: readOnly || !lastClip()
  });

  const sections =
    selection.length ?
      [
        {
          items: [
            ...(selection.length === 1 && hasTrigger(doc, canvasId, selection[0]) ?
              [
                item(
                  "trigger",
                  t("trigger.edit"),
                  () => editingStore.getState().open({ type: "trigger", edgeId: selection[0] }),
                  { icon: <Icon name="pencil" />, shortcut: "↵", disabled: readOnly }
                )
              ]
            : []),
            ...(chosen.length === 1 ?
              [
                item(
                  "rename",
                  t("editing.rename"),
                  () => editingStore.getState().open({ type: "name", id: chosen[0] }),
                  {
                    icon: <Icon name="pencil" />,
                    shortcut: "F2",
                    disabled: readOnly
                  }
                )
              ]
            : []),
            ...(chosen.length === 1 && doc.canvases[canvasId].nodes[chosen[0]]?.inner?.canvas ?
              [
                item(
                  "make-reusable",
                  t("inspector:reuse.make"),
                  () =>
                    editorStore.getState().dispatch(
                      [
                        {
                          type: "definition.extract",
                          args: { owner: chosen[0], name: doc.canvases[canvasId].nodes[chosen[0]].name ?? chosen[0] }
                        }
                      ],
                      { label: t("inspector:reuse.made") }
                    ),
                  { icon: <Icon name="duplicate" />, disabled: readOnly }
                )
              ]
            : []),
            item("duplicate", t("editing.duplicate"), () => duplicateSelection(t), {
              icon: <Icon name="duplicate" />,
              shortcut: command("D"),
              disabled: readOnly || !chosen.length
            }),
            item("copy", t("editing.copy"), copy, {
              icon: <Icon name="copy" />,
              shortcut: command("C"),
              disabled: !chosen.length
            }),
            pasteItem,
            // A comment on the one element right-clicked (collaboration spec §8.1).
            ...(selection.length === 1 ?
              [
                item(
                  "comment",
                  t("comments.comment"),
                  () => commentsStore.getState().startDraft({ canvas: canvasId, target: selection[0] }),
                  { icon: <Icon name="note" />, disabled: readOnly }
                )
              ]
            : []),
            item("delete", t("editing.delete"), () => deleteSelection(t), {
              icon: <Icon name="trash" />,
              shortcut: isMac() ? "⌫" : "Del",
              disabled: readOnly
            })
          ]
        },
        ...(chosen.length >= 2 ?
          [
            {
              title: t("editing.align"),
              items: ALIGN.map(([how, label, icon]) =>
                item(`align-${how}`, t(`editing.${label}`), () => alignSelection(t, how), {
                  icon: <Icon name={icon} />,
                  disabled: readOnly
                })
              )
            }
          ]
        : []),
        ...(chosen.length >= 3 ?
          [
            {
              title: t("editing.distribute"),
              items: [
                ["horizontal", "distributeHorizontal", "distribute-across"],
                ["vertical", "distributeVertical", "distribute-down"]
              ].map(([axis, label, icon]) =>
                item(`distribute-${axis}`, t(`editing.${label}`), () => distributeSelection(t, axis), {
                  icon: <Icon name={icon} />,
                  disabled: readOnly
                })
              )
            }
          ]
        : []),
        {
          items: [
            item(
              "focus",
              selection.every(id => doc.annotations?.focus?.includes(id)) ? t("editing.unfocus") : t("editing.focus"),
              () => focusSelection(t),
              { icon: <Icon name="pointer" />, disabled: readOnly }
            ),
            ...(chosen.some(id => doc.canvases[canvasId].nodes[id]) ?
              [
                item(
                  "lane",
                  t("editing.lane"),
                  () => {
                    const lane = laneSelection(t);
                    if (lane) inspectorStore.getState().show(lane, { fresh: true });
                  },
                  { icon: <Icon name="align-top" />, disabled: readOnly }
                )
              ]
            : [])
          ]
        },
        ...(["machine", "mixed"].includes(doc.canvases[canvasId].kind) ?
          [
            {
              items: [
                item("region", t("editing.region"), () => regionSelection(t), {
                  icon: <Icon name="region" />,
                  shortcut: "R",
                  disabled: readOnly || !selection.some(id => doc.canvases[canvasId].nodes[id])
                })
              ]
            }
          ]
        : [])
      ]
    : [
        {
          items: [
            pasteItem,
            // A comment at the point right-clicked.
            item(
              "comment",
              t("comments.comment"),
              () => commentsStore.getState().startDraft({ canvas: canvasId, at: { x: at.point.x, y: at.point.y } }),
              { icon: <Icon name="note" />, disabled: readOnly || !at.point }
            ),
            item("select-all", t("editing.selectAll"), selectAll, {
              icon: <Icon name="select-all" />,
              shortcut: command("A")
            })
          ]
        },
        {
          items: [
            item("level-details", t("editing.levelDetails"), () => inspectorStore.getState().show(canvasId), {
              icon: <Icon name="doc" />,
              shortcut: "⇧I"
            })
          ]
        }
      ];

  return <ContextMenu label={t("editing.menu")} sections={sections} at={at} onClose={onClose} />;
}
