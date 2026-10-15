// The canvas's nodes: each draws its part of Core's figure (markup made by Core from the document, with every value
// escaped and no links, styles or scripts — safe to insert) in canvas coordinates, through a viewBox at its own box.
import { Handle, Position } from "@xyflow/react";
import { use } from "react";
import { Trans, useTranslation } from "react-i18next";

import { Kbd } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { Rename } from "@/editing/Rename";
import { useEditing } from "@/editing/state";
import { cn } from "@/lib/cn";
import { useProblems } from "@/problems/store";
import { useSimulation } from "@/simulate/store";
import { pathName } from "@/simulate/words";
import { useEditor } from "@/store/editor";

import { FarContext, farLook } from "./far";
import { followRef } from "./follow";
import { MarkActions } from "./marks";
import { ProblemMarker } from "./ProblemMarker";

/** Core's markup of one part, drawn where Core draws it. */
function PartSvg({ part }) {
  return (
    <svg
      aria-hidden="true"
      width={part.w}
      height={part.h}
      viewBox={`${part.x} ${part.y} ${part.w} ${part.h}`}
      className="pointer-events-none absolute inset-0 overflow-visible"
      dangerouslySetInnerHTML={{ __html: part.svg }}
    />
  );
}

/** Regions and lane captions: drawn, never selected. */
export function DecorationNode({ data }) {
  return <PartSvg part={data.part} />;
}

/** A note of the level: drawn as Core draws it, selected and moved like a box. */
export function NoteNode({ data, selected }) {
  const renaming = useEditing(state => state.editor?.type === "name" && state.editor.id === data.part.id);
  return (
    <>
      <PartSvg part={data.part} />
      {renaming && <Rename part={data.part} note />}
      {data.beacon && <Beacon key={data.beacon} ring="rounded-[6px]" />}
      {selected && (
        <span
          aria-hidden="true"
          className="sw-selection pointer-events-none absolute -inset-[3px] rounded-[6px] border-[1.5px] border-accent"
        />
      )}
    </>
  );
}

const ROUND = new Set(["dot", "end", "history"]);

/** A box far out: its outline and fill where Core draws it, without its text and markup (far.js). */
function FarBox({ part }) {
  const { fill, stroke, radius } = farLook(part);
  return (
    <span
      aria-hidden="true"
      data-far-box=""
      className="pointer-events-none absolute inset-0 border"
      style={{
        backgroundColor: fill ?? "var(--surface)",
        borderColor: stroke ?? "var(--hairline)",
        borderRadius: ROUND.has(part.shape) ? "9999px" : `${radius ?? 8}px`
      }}
    />
  );
}

/** A box of the level (or a frame showing an interior), selectable and focusable; edges attach to it. */
export function FigureNode({ data, selected }) {
  const { part } = data;
  const highlighted = useProblems(state => state.highlight === part.id);
  const alone = useEditor(state => state.view.selections[state.canvasId]?.length === 1);
  const renaming = useEditing(state => state.editor?.type === "name" && state.editor.id === part.id);
  const ring = ROUND.has(part.shape) ? "rounded-full" : "rounded-[10px]";
  const far = use(FarContext);
  return (
    <>
      {far ?
        <FarBox part={part} />
      : <PartSvg part={part} />}
      <Handle type="target" position={Position.Left} isConnectableStart={false} className="sw-handle" />
      <Handle
        type="source"
        position={Position.Right}
        isConnectableStart={Boolean(data.canStart)}
        isConnectableEnd={false}
        className={cn("sw-handle", data.canStart && "sw-start")}
      />
      {data.target === "valid" && (
        <span
          aria-hidden="true"
          className={cn("sw-selection pointer-events-none absolute -inset-[3px] border-[1.5px] border-accent", ring)}
        />
      )}
      {highlighted && !selected && (
        <span aria-hidden="true" className={cn("sw-highlight pointer-events-none absolute -inset-[5px]", ring)} />
      )}
      {selected && (
        <span
          aria-hidden="true"
          className={cn("sw-selection pointer-events-none absolute -inset-[3px] border-[1.5px] border-accent", ring)}
        />
      )}
      {data.mark && <RunMark mark={data.mark} id={part.id} ring={ring} round={ROUND.has(part.shape)} />}
      {data.beacon && <Beacon key={data.beacon} ring={ring} />}
      <ProblemMarker element={part.id} className="-right-2 -top-2" />
      {data.uses !== undefined && <InstanceBadge uses={data.uses} />}
      {data.follow && <FollowMark id={part.id} name={data.follow.name} />}
      {selected && alone && part.interior && !part.within.length && !renaming && <OpenHint />}
      {renaming && <Rename part={part} />}
    </>
  );
}

/**
 * The run on a box (simulator spec §6.3, mockups 01 and 04): where it is — the selection ring with its halo and a small
 * dot, with how many tokens when several — or that it is inside, with a pill naming the active state (or how many) that
 * goes down to it. On the stage (spec §7.1), where it was before the step shown, in a faint dashed ring; each mark
 * shows when the step's motion reaches it (`at`). Drawn over Core's figure, which stays as it is.
 */
function RunMark({ mark, id, ring, round }) {
  const { t } = useTranslation("simulate");
  const doc = useEditor(state => state.doc);
  const top = useSimulation(state => state.canvas);
  const actions = use(MarkActions);
  const timed = mark.at !== undefined;
  const delay = timed ? { animationDelay: `${mark.at}ms` } : undefined;
  if (mark.kind === "left") {
    return (
      <span
        aria-hidden="true"
        style={delay}
        className={cn(
          "sw-left sw-appear pointer-events-none absolute -inset-[3px] border-[1.5px] border-dashed border-accent opacity-45",
          ring
        )}
      />
    );
  }
  if (mark.kind === "active") {
    return (
      <>
        <span
          aria-hidden="true"
          style={delay}
          className={cn(
            "sw-run pointer-events-none absolute -inset-[3px] border-2 border-accent",
            timed && "sw-appear",
            ring
          )}
        />
        {!round && (
          <span
            aria-hidden="true"
            style={delay}
            className={cn(
              "pointer-events-none absolute right-2 top-2 size-[7px] rounded-full bg-accent",
              timed && "sw-appear"
            )}
          />
        )}
        {mark.tokens > 1 && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-2 -top-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 font-mono text-[10px] font-semibold text-surface"
          >
            {mark.tokens}
          </span>
        )}
      </>
    );
  }
  const names = [...new Set(mark.leaves.map(leaf => pathName(doc, top, leaf, t)))];
  return (
    <>
      <span
        aria-hidden="true"
        className={cn("sw-run pointer-events-none absolute -inset-[3px] border-[1.5px] border-accent", ring)}
      />
      {/* A box can be opened from the keyboard (Enter): the pill is the pointer's way down, so it is not a stop of its own. */}
      <span
        aria-hidden="true"
        onClick={event => {
          event.stopPropagation();
          if (mark.open) actions.open(id);
        }}
        className="nodrag nopan absolute left-1/2 top-full z-10 flex h-[22px] -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-accent bg-surface px-2.5 font-mono text-[11px] text-accent shadow-sm hover:bg-accent-soft"
      >
        <span className="size-1.5 rounded-full bg-accent" />
        {names.length === 1 ? names[0] : t("marks.active", { count: mark.leaves.length })}
      </span>
    </>
  );
}

/** Around what a link led to, or an agent shows: the beacon's ring (beacon.js; globals.css pulses it). */
function Beacon({ ring }) {
  return <span aria-hidden="true" className={cn("sw-beacon-ring pointer-events-none absolute -inset-[3px]", ring)} />;
}

/**
 * On a link: that it can be followed, and where it leads. A link is followed from the keyboard (Enter) and with a
 * double-click, so the mark is the pointer's way there, not a stop of its own. On the top edge, left of where a
 * Problem's marker sits.
 */
function FollowMark({ id, name }) {
  const { t } = useTranslation("editor");
  return (
    <span
      aria-hidden="true"
      data-follow
      title={name === null ? t("canvas.refMissing") : t("canvas.goTo", { name })}
      onClick={event => {
        event.stopPropagation();
        followRef(id);
      }}
      onDoubleClick={event => event.stopPropagation()}
      className="nodrag nopan absolute -top-2 right-5 z-10 grid size-[18px] cursor-pointer place-items-center rounded-full border border-island-border bg-surface text-sub shadow-sm hover:border-accent hover:bg-accent-soft hover:text-accent"
    >
      <Icon name="arrow-up-right" size={12} />
    </span>
  );
}

/** On a box that uses a reusable part: how many boxes use it (spec §7.6). */
function InstanceBadge({ uses }) {
  const { t } = useTranslation("inspector");
  return (
    <span
      title={t("reuse.instance", { count: uses })}
      className="pointer-events-none absolute -top-2 left-2 inline-flex h-4 items-center gap-0.5 rounded-full border border-island-border bg-surface px-1.5 font-mono text-[9.5px] font-medium text-sub shadow-sm"
    >
      ×{uses}
    </span>
  );
}

/** Under a selected box that has an interior: how to open it (mockup 04). */
function OpenHint() {
  return (
    <p
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-[calc(100%+12px)] flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-control bg-primary px-2.5 py-1.5 text-ui font-medium text-primary-foreground shadow-island motion-safe:animate-[fade-in_160ms_ease-out]"
    >
      <Trans
        i18nKey="editor:canvas.openHint"
        components={{ key: <Kbd className="border-primary-foreground/30 bg-transparent text-primary-foreground" /> }}
      />
    </p>
  );
}

/** The level's heading (spec §6.1): kicker, title and caption, printed above the figure and moving with it. */
export function HeadingNode({ data }) {
  return (
    <header className="pointer-events-none w-max max-w-[min(72ch,90vw)] pb-1 select-text">
      {data.kicker && <p className="font-mono text-[10.5px] tracking-[0.14em] text-muted">{data.kicker}</p>}
      <h1 className="mt-1 text-heading font-semibold tracking-tight text-ink">{data.title}</h1>
      {data.caption && <p className="mt-1 text-read text-sub">{data.caption}</p>}
    </header>
  );
}
