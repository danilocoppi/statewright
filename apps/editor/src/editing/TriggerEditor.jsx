import { useViewport } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { useEditor } from "@/store/editor";

import { CatalogPicker } from "./CatalogPicker";
import { change } from "./state";
import { useInside } from "./useInside";
import {
  eventName,
  guardCommands,
  kindCommands,
  matches,
  parseDuration,
  SYSTEM_KINDS,
  triggerCommands
} from "./triggers";

const Mono = ({ children }) => <span className="font-mono text-[12px]">{children}</span>;

/** How often a catalog item is used, in words. */
const usesOf = (t, uses) => t("trigger.uses", { count: uses });

/** A small button of the editor's footer. */
function Choice({ pressed, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "h-8 grow whitespace-nowrap rounded-control px-2.5 text-ui text-sub hover:bg-subtle hover:text-ink",
        pressed ? "bg-accent-soft text-accent" : "bg-subtle/60"
      )}
    >
      {children}
    </button>
  );
}

/** What makes a transition happen (spec §7.2): an event (found or created), a guard, a timer, or nothing. */
function MachineTrigger({ doc, edgeId, edge, apply }) {
  const { t } = useTranslation("editor");
  // Open on what the transition has: its timer, or its events.
  const [mode, setMode] = useState(edge.after ? "timer" : "event");
  const current = [
    ...(edge.on ?? []).map(id => ({
      id,
      name: doc.catalog.events[id]?.name ?? id,
      mono: true,
      takeOut: () => apply(triggerCommands(doc, edgeId, { without: id }), t("trigger.label"))
    })),
    ...(edge.after ?
      [
        {
          id: edge.after,
          name: doc.catalog.timers[edge.after]?.name ?? edge.after,
          takeOut: () => apply(triggerCommands(doc, edgeId, { none: true }), t("trigger.label"))
        }
      ]
    : [])
  ];
  const known = (collection, name) => Object.values(doc.catalog[collection]).some(item => item.name === name);

  const pickers = {
    event: {
      label: t("trigger.event"),
      placeholder: t("trigger.eventPlaceholder"),
      mono: true,
      options: query => {
        const typed = query.trim();
        const name = typed && eventName(typed);
        const create =
          !typed ? []
          : !name ? [{ id: "hint", label: t("trigger.eventHint"), disabled: true, onPick: () => {} }]
          : known("events", name) ? []
          : [
              {
                id: "create",
                create: true,
                label: <Trans t={t} i18nKey="trigger.createEvent" values={{ name }} components={{ name: <Mono /> }} />,
                onPick: () => apply(triggerCommands(doc, edgeId, { on: { name } }), t("trigger.label"))
              }
            ];
        const found = matches(doc, "events", typed, 5 + (edge.on?.length ?? 0))
          .filter(item => !edge.on?.includes(item.id))
          .slice(0, 5)
          .map(item => ({
            id: item.id,
            label: <Mono>{item.name}</Mono>,
            meta: usesOf(t, item.uses),
            onPick: () => apply(triggerCommands(doc, edgeId, { on: { id: item.id } }), t("trigger.label"))
          }));
        return [...create, ...found];
      }
    },
    guard: {
      label: t("trigger.guard"),
      placeholder: t("trigger.guardPlaceholder"),
      options: query => {
        const typed = query.trim();
        const found = matches(doc, "guards", typed, 4).map(item => ({
          id: item.id,
          label: item.name,
          meta: usesOf(t, item.uses),
          onPick: () => apply(guardCommands(doc, edgeId, { guard: { id: item.id } }), t("trigger.guardLabel"))
        }));
        const typedOptions =
          typed ?
            [
              ...(known("guards", typed) ?
                []
              : [
                  {
                    id: "create",
                    create: true,
                    label: t("trigger.createGuard", { name: typed }),
                    onPick: () => apply(guardCommands(doc, edgeId, { guard: { name: typed } }), t("trigger.guardLabel"))
                  }
                ]),
              {
                id: "text",
                create: true,
                label: t("trigger.useCondition", { text: typed }),
                onPick: () => apply(guardCommands(doc, edgeId, { text: typed }), t("trigger.guardLabel"))
              }
            ]
          : [];
        const remove =
          edge.guard && !typed ?
            [
              {
                id: "remove",
                label: t("trigger.removeGuard"),
                onPick: () => apply(guardCommands(doc, edgeId, null), t("trigger.guardLabel"))
              }
            ]
          : [];
        return [...typedOptions, ...found, ...remove];
      }
    },
    timer: {
      label: t("trigger.timer"),
      placeholder: t("trigger.timerPlaceholder"),
      options: query => {
        const typed = query.trim();
        const duration = typed && parseDuration(typed);
        const found = matches(doc, "timers", typed, 4).map(item => ({
          id: item.id,
          label: item.name,
          meta: doc.catalog.timers[item.id].duration ?? usesOf(t, item.uses),
          onPick: () => apply(triggerCommands(doc, edgeId, { after: { id: item.id } }), t("trigger.label"))
        }));
        const create =
          typed && !known("timers", typed) ?
            [
              {
                id: "create",
                create: true,
                label: t("trigger.createTimer", { name: typed }),
                meta: duration || t("trigger.noDuration"),
                onPick: () => apply(triggerCommands(doc, edgeId, { after: { name: typed } }), t("trigger.label"))
              }
            ]
          : [];
        return [...create, ...found];
      }
    }
  };
  const picker = pickers[mode];
  const others = [
    ["event", t("trigger.onEvent")],
    ["guard", t("trigger.addGuard")],
    ["timer", t("trigger.afterTimer")]
  ].filter(([key]) => key !== mode);

  return (
    <>
      {current.length > 0 && (
        <ul aria-label={t("trigger.current")} className="mb-2.5 flex flex-wrap gap-1.5">
          {current.map(item => (
            <li
              key={item.id}
              className="inline-flex h-6 items-center rounded-chip border border-control-border pl-2 text-ui text-ink"
            >
              <span className={cn(item.mono && "font-mono text-[12px]")}>{item.name}</span>
              <button
                type="button"
                aria-label={t("trigger.takeOut", { name: item.name })}
                title={t("trigger.takeOut", { name: item.name })}
                onClick={item.takeOut}
                className="grid size-6 place-items-center text-muted hover:text-ink"
              >
                <Icon name="close" size={10} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <CatalogPicker key={mode} {...picker} />
      <div className="mt-2.5 flex gap-1.5 border-t border-hairline pt-2.5">
        {others.map(([key, text]) => (
          <Choice key={key} onClick={() => setMode(key)}>
            {text}
          </Choice>
        ))}
        <Choice onClick={() => apply(triggerCommands(doc, edgeId, { none: true }), t("trigger.label"))}>
          {t("trigger.none")}
        </Choice>
      </div>
    </>
  );
}

/** What a system connection carries (spec §7.2): command, event, webhook, stream or data. */
function SystemKind({ doc, edgeId, edge, apply }) {
  const { t } = useTranslation("editor");
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {SYSTEM_KINDS.map(kind => (
        <Choice
          key={kind}
          pressed={edge.kind === kind}
          onClick={() => apply(kindCommands(doc, edgeId, kind), t("trigger.kindLabel"))}
        >
          {t(`trigger.kinds.${kind}`)}
        </Choice>
      ))}
    </div>
  );
}

/** Which branch a flow edge is (spec §7.2): true or false out of an if, a case or the default out of a switch. */
function FlowBranch({ doc, canvas, edgeId, edge, apply }) {
  const { t } = useTranslation("editor");
  const [value, setValue] = useState(edge.kind === "case" ? String(edge.case) : "");
  const source = canvas.nodes[edge.from].kind;
  const set = (kind, caseValue) => apply(kindCommands(doc, edgeId, kind, caseValue), t("trigger.branchLabel"));
  if (source === "switch") {
    return (
      <form
        className="grid grid-cols-[1fr_auto] gap-1.5"
        onSubmit={event => {
          event.preventDefault();
          if (value.trim()) set("case", value);
        }}
      >
        <input
          aria-label={t("trigger.case")}
          // The field is the editor's first step: it takes the focus as the editor opens.
          autoFocus
          value={value}
          placeholder={t("trigger.casePlaceholder")}
          onChange={event => setValue(event.target.value)}
          className="h-8 rounded-control border border-accent bg-surface px-2.5 font-mono text-[12px] text-ink outline-none ring-4 ring-accent/12"
        />
        <Choice pressed={edge.kind === "default"} onClick={() => set("default")}>
          {t("trigger.kinds.default")}
        </Choice>
      </form>
    );
  }
  const kinds = source === "if" ? ["true", "false"] : ["next", "error"];
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {kinds.map(kind => (
        <Choice key={kind} pressed={(edge.kind ?? "next") === kind} onClick={() => set(kind)}>
          {t(`trigger.kinds.${kind}`)}
        </Choice>
      ))}
    </div>
  );
}

/**
 * The trigger editor (spec §7.2, mockup 07), beside an edge: on a machine, what makes the transition happen; on a
 * system, what the connection carries; on a flow, which branch the edge is. Each choice is one change, and closes it.
 * @param {{ edgeId: string, at: { x: number, y: number, top: number }, onClose: () => void }} props `at`: under the
 *   edge's label, whose top is `top`, in canvas coordinates.
 */
export function TriggerEditor({ edgeId, at, onClose }) {
  const { t } = useTranslation("editor");
  const doc = useEditor(state => state.doc);
  const canvasId = useEditor(state => state.canvasId);
  const { x, y, zoom } = useViewport();
  const ref = useRef(null);
  useInside(ref);
  const before = useRef(document.activeElement);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const focused = before.current;
    const editor = ref.current;
    const onPointerDown = event => !editor.contains(event.target) && close.current();
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      const left = document.activeElement;
      if (focused?.isConnected && (left === document.body || editor.contains(left))) focused.focus();
    };
  }, []);

  const canvas = doc.canvases[canvasId];
  const edge = canvas.edges[edgeId];
  if (!edge) return null;
  const nameOf = id => canvas.nodes[id]?.name ?? t(`trigger.unnamed.${canvas.nodes[id]?.kind}`, { defaultValue: id });
  const names = { from: nameOf(edge.from), to: nameOf(edge.to) };
  const question = t(`trigger.question.${canvas.kind}`, names);
  const apply = (commands, label) => {
    change(commands, { label, at });
    onClose();
  };
  const Body = { machine: MachineTrigger, system: SystemKind, flow: FlowBranch }[canvas.kind];

  return (
    <section
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-label={question}
      onKeyDown={event => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        onClose();
      }}
      style={{ left: at.x * zoom + x, top: at.y * zoom + y + 10 }}
      data-above={at.top * zoom + y - 10}
      className="nodrag nopan nowheel absolute z-40 w-[312px] -translate-x-1/2 rounded-island border border-island-border bg-island p-3 shadow-island backdrop-blur-md motion-safe:animate-[menu-in_160ms_var(--ease-soft)]"
    >
      <p className="mb-2 text-ui text-sub">{question}</p>
      <Body doc={doc} canvas={canvas} edgeId={edgeId} edge={edge} apply={apply} />
    </section>
  );
}
