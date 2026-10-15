import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { instancesOf } from "statewright/simulate";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { useEditor } from "@/store/editor";

import { useSimulation } from "./store";

/** A value as a read-only tree: objects and lists open into their parts, the rest as JSON. */
function Tree({ value }) {
  const entries = Array.isArray(value) ? value.map((item, index) => [String(index), item]) : Object.entries(value);
  return (
    <dl className="grid gap-0.5">
      {entries.map(([key, part]) => {
        const nested = part !== null && typeof part === "object" && Object.keys(part).length > 0;
        return (
          <div key={key} className={cn(nested ? "grid gap-0.5" : "flex min-w-0 items-baseline gap-2")}>
            <dt className="shrink-0 font-mono text-[11.5px] text-muted">{key}</dt>
            <dd
              className={cn(
                "min-w-0 font-mono text-[11.5px] text-ink",
                nested ? "border-l border-hairline pl-3" : "truncate"
              )}
            >
              {nested ?
                <Tree value={part} />
              : JSON.stringify(part)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * Data (spec §6.2): the context of each machine instance and a flow's variables, as read-only trees — collapsed until
 * asked for, like the inspector's details.
 * @param {{ session: object }} props
 */
export function Data({ session }) {
  const { t } = useTranslation("simulate");
  const doc = useEditor(state => state.doc);
  const canvas = useSimulation(state => state.canvas);
  const [open, setOpen] = useState(false);
  const id = useId();
  const names = new Map(instancesOf(doc, canvas).map(instance => [instance.key, instance.name]));
  const groups =
    doc.canvases[canvas]?.kind === "flow" ?
      [
        { key: "vars", name: t("data.vars"), value: session.vars ?? {} },
        { key: "context", name: t("data.context"), value: session.context?.[canvas] ?? {} }
      ]
    : Object.entries(session.context ?? {}).map(([key, value]) => ({ key, name: names.get(key) ?? key, value }));
  const shown = groups.filter(group => Object.keys(group.value).length > 0);
  return (
    <section className="border-t border-hairline px-2 py-1.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className="flex h-8 w-full items-center justify-between rounded-control px-2 text-ui text-sub hover:bg-subtle hover:text-ink"
      >
        {t("data.title")}
        <Icon name="chevron-down" size={14} className={cn("transition-transform duration-150", open && "rotate-180")} />
      </button>
      {open && (
        <div id={id} className="grid gap-3 px-2 pb-2 pt-1.5">
          {shown.map(group => (
            <div key={group.key} className="grid gap-1">
              <p className="text-label text-muted">{group.name}</p>
              <Tree value={group.value} />
            </div>
          ))}
          {!shown.length && <p className="text-ui text-muted">{t("data.none")}</p>}
        </div>
      )}
    </section>
  );
}
