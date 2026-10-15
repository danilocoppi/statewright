import { ViewportPortal, useStore as useFlow } from "@xyflow/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { geometryOf } from "@/marks/payload";
import { editorStore, useEditor } from "@/store/editor";

import { commentsStore, useComments } from "./store";

/**
 * Where a comment stands on its level: its point, its box's or region's top-right corner, its arrow's middle, or — on
 * the level itself — the top-left corner of what the level shows.
 */
function anchorOf(comment, { boxes, regions, lines }) {
  if (comment.at) return [comment.at.x, comment.at.y];
  const box = comment.target && [...boxes, ...regions].find(part => part.id === comment.target);
  if (box) return [box.x + box.width, box.y];
  const line = comment.target && lines.find(part => part.id === comment.target);
  if (line) {
    const [a, b] = [
      line.points[Math.floor((line.points.length - 1) / 2)],
      line.points[Math.ceil((line.points.length - 1) / 2)]
    ];
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  }
  const all = [...boxes, ...regions];
  return all.length ? [Math.min(...all.map(part => part.x)), Math.min(...all.map(part => part.y))] : [0, 0];
}

/** Pins that stand at the same place, spread side by side (a step on the screen each). */
function spread(placed, zoom) {
  const seen = new Map();
  return placed.map(([id, comment, [x, y]]) => {
    const key = `${x},${y}`;
    const nth = seen.get(key) ?? 0;
    seen.set(key, nth + 1);
    return [id, comment, [x + (nth * PIN_STEP) / zoom, y]];
  });
}

const PIN_STEP = 26;

/** Why a comment was not saved, as the person reads it. */
function refusalOf(error, t) {
  if (error.code === "SIMULATING") return t("comments.refused", { reason: t("comments.simulating") });
  if (error.code === "READ_ONLY") return t("comments.refused", { reason: t("comments.readOnly") });
  return t("comments.refused", { reason: error.message });
}

/** A short time, as the thread shows it. */
const when = at => new Date(at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });

/**
 * A comment's thread, or a new comment being written (collaboration spec §8.1): who said what, a reply, Resolve or
 * Reopen, Remove. The person's words are the person's; the agent's carry its name.
 */
function Thread({ id, comment, draft, canvasId }) {
  const { t } = useTranslation("editor");
  const [text, setText] = useState("");
  const [refused, setRefused] = useState(null);
  const readOnly = useEditor(state => state.readOnly);
  // A change refused (simulating, or what it names is gone) says why, and what was written stays.
  const dispatch = (commands, label) => {
    const result = editorStore.getState().dispatch(commands, { label });
    setRefused(result.ok ? null : refusalOf(result.error, t));
    return result;
  };
  const say = () => {
    const words = text.trim();
    if (!words) return;
    if (draft) {
      const result = dispatch(
        [{ type: "comment.add", args: { canvas: canvasId, ...draft, text: words } }],
        t("comments.added")
      );
      if (!result.ok) return;
      commentsStore.getState().show(result.created[0]);
    } else if (!dispatch([{ type: "comment.reply", args: { id, text: words } }], t("comments.replied")).ok) return;
    setText("");
  };
  const field = draft ? t("comments.comment") : t("comments.reply");
  return (
    <div
      data-testid="comment-thread"
      role="dialog"
      aria-label={t("comments.thread")}
      onKeyDown={event => {
        event.stopPropagation();
        if (event.key === "Escape") commentsStore.getState().close();
      }}
      className="sw-comment-thread nodrag nopan nowheel pointer-events-auto grid w-72 gap-2 rounded-island border border-island-border bg-surface p-3 text-ink shadow-dialog"
    >
      <div className="flex items-center gap-2">
        <span className="text-label font-medium text-muted">{t("comments.thread")}</span>
        <button
          type="button"
          aria-label={t("comments.close")}
          onClick={() => commentsStore.getState().close()}
          className="ml-auto grid size-6 place-items-center rounded-control text-muted hover:bg-subtle hover:text-ink"
        >
          <Icon name="close" size={12} />
        </button>
      </div>
      {comment && (
        <ol className="grid max-h-60 gap-2 overflow-y-auto">
          {comment.thread.map((entry, index) => (
            <li key={index} className="grid gap-0.5">
              <span className="flex items-baseline gap-2 text-label">
                <span className={entry.author === "agent" ? "font-medium text-accent" : "font-medium text-sub"}>
                  {entry.author === "agent" ? (entry.name ?? t("comments.agent")) : t("comments.you")}
                </span>
                <span className="text-muted">{when(entry.at)}</span>
              </span>
              <span className="whitespace-pre-wrap text-read">{entry.text}</span>
            </li>
          ))}
        </ol>
      )}
      {!readOnly && (
        <>
          <textarea
            aria-label={field}
            placeholder={draft ? t("comments.commentPlaceholder") : t("comments.replyPlaceholder")}
            value={text}
            rows={2}
            onChange={event => setText(event.target.value)}
            className="resize-none rounded-control border border-control-border bg-surface px-2.5 py-1.5 text-read outline-none placeholder:text-muted focus:border-accent"
          />
          <div className="flex items-center gap-1.5">
            {comment && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  dispatch(
                    [{ type: comment.status === "open" ? "comment.resolve" : "comment.reopen", args: { id } }],
                    comment.status === "open" ? t("comments.resolved") : t("comments.reopened")
                  )
                }
              >
                {comment.status === "open" ? t("comments.resolve") : t("comments.reopen")}
              </Button>
            )}
            {comment && (
              <button
                type="button"
                aria-label={t("comments.remove")}
                title={t("comments.remove")}
                onClick={() => {
                  if (dispatch([{ type: "comment.remove", args: { id } }], t("comments.removed")).ok) {
                    commentsStore.getState().close();
                  }
                }}
                className="grid size-7 place-items-center rounded-control text-muted hover:bg-subtle hover:text-danger"
              >
                <Icon name="trash" size={14} />
              </button>
            )}
            <Button size="sm" variant="primary" className="ml-auto" disabled={!text.trim()} onClick={say}>
              {field}
            </Button>
          </div>
          {refused && (
            <p role="alert" className="text-label text-danger">
              {refused}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * The comments of the level shown (collaboration spec §8.1): a pin for each open one at its element or point, and the
 * thread of the one open — or a new one being written — beside it. Constant in size at any zoom.
 * @param {{ canvasId: string }} props
 */
export function CommentsLayer({ canvasId }) {
  const { t } = useTranslation("editor");
  const doc = useEditor(state => state.doc);
  const open = useComments(state => state.open);
  const draft = useComments(state => state.draft);
  const showResolved = useComments(state => state.showResolved);
  const zoom = useFlow(state => state.transform[2]);
  const comments = useMemo(
    () => Object.entries(doc?.annotations?.comments ?? {}).filter(([, comment]) => comment.canvas === canvasId),
    [doc, canvasId]
  );
  const here = draft?.canvas === canvasId ? draft : null;
  const boxes = useMemo(
    () => (comments.length || here ? geometryOf(doc, canvasId) : { boxes: [], regions: [], lines: [] }),
    [comments.length, here, doc, canvasId]
  );
  if (!comments.length && !here) return null;
  const scale = { transform: `scale(${1 / zoom})`, transformOrigin: "0 0" };
  const opened = comments.find(([id]) => id === open);
  const threadAt =
    here ? anchorOf(here, boxes)
    : opened ? anchorOf(opened[1], boxes)
    : null;
  return (
    <ViewportPortal>
      {spread(
        comments
          .filter(([, comment]) => comment.status === "open" || showResolved)
          .map(([id, comment]) => [id, comment, anchorOf(comment, boxes)]),
        zoom
      ).map(([id, comment, [x, y]]) => {
        const resolved = comment.status !== "open";
        return (
          <div key={id} className="pointer-events-auto absolute" style={{ left: x, top: y, ...scale }}>
            <button
              type="button"
              data-testid="comment-pin"
              data-comment={id}
              data-resolved={resolved}
              aria-label={t(resolved ? "comments.pinResolved" : "comments.pin", { text: comment.thread[0].text })}
              title={comment.thread[0].text}
              onClick={() => commentsStore.getState().show(open === id ? null : id)}
              className={`-translate-x-1/2 -translate-y-1/2 grid size-6 place-items-center rounded-full rounded-bl-none shadow-island ${
                resolved ? "bg-subtle text-muted opacity-80" : "bg-warning text-white"
              }`}
            >
              <Icon name="note" size={13} />
            </button>
          </div>
        );
      })}
      {threadAt && (
        <div className="absolute z-10" style={{ left: threadAt[0], top: threadAt[1], ...scale }}>
          <div className="translate-x-4 translate-y-2">
            <Thread
              key={open ?? "draft"}
              id={open}
              comment={here ? null : opened?.[1]}
              draft={here ? { target: here.target, at: here.at } : null}
              canvasId={canvasId}
            />
          </div>
        </div>
      )}
    </ViewportPortal>
  );
}
