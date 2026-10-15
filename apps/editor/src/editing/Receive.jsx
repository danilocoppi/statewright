import { useViewport } from "@xyflow/react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

import { useEditor } from "@/store/editor";

import { receiveWith } from "./actions";
import { CatalogPicker } from "./CatalogPicker";
import { editingStore } from "./state";
import { useInside } from "./useInside";

/**
 * What a role's connector needs before it is drawn, asked where it was dropped (mixed levels spec §4.1, §4.3): which of
 * a place's actions a participant receives, or whom a system box acts for (a party of the catalog, or a new one named
 * as typed).
 * @param {{ editor: { from: string, to: string, at: { x: number, y: number }, needs: "action" | "party",
 *   options: string[] } }} props
 */
export function Receive({ editor }) {
  const { t } = useTranslation("editor");
  const doc = useEditor(state => state.doc);
  const canvasId = useEditor(state => state.canvasId);
  const { x, y, zoom } = useViewport();
  const section = useRef(null);
  useInside(section);
  const party = editor.needs === "party";
  const event = editor.needs === "event";
  const box = doc.canvases[canvasId].nodes[party ? editor.from : editor.to];
  const who = box?.label ?? box?.name ?? doc.catalog.parties[box?.party]?.name ?? editor.to;
  const options = query => {
    const typed = query.trim();
    const named = editor.options
      .map(id => ({
        id,
        name:
          (party ? doc.catalog.parties
          : event ? doc.catalog.events
          : doc.catalog.actions)[id]?.name ?? id
      }))
      .filter(item => item.name.toLowerCase().includes(typed.toLowerCase()))
      .map(item => ({
        id: item.id,
        label: item.name,
        onPick: () =>
          receiveWith(
            t,
            party ? { party: { id: item.id } }
            : event ? { event: item.id }
            : item.id
          )
      }));
    const known = Object.values(doc.catalog.parties).some(item => item.name === typed);
    const create =
      party && typed && !known ?
        [
          {
            id: "create",
            create: true,
            label: t("tools.createParty", { name: typed }),
            onPick: () => receiveWith(t, { party: { name: typed } })
          }
        ]
      : [];
    return [...create, ...named];
  };
  const state =
    event && box?.target && Object.values(doc.canvases).find(level => level.nodes[box.target])?.nodes[box.target];
  const title =
    event ?
      t("roles.whichEvent", { name: state?.name ?? box?.target })
    : t(party ? "roles.whichParty" : "roles.whichAction", { name: who });
  return (
    <section
      ref={section}
      role="dialog"
      aria-modal="false"
      aria-label={title}
      onKeyDown={event => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        editingStore.getState().close();
      }}
      style={{ left: editor.at.x * zoom + x, top: editor.at.y * zoom + y + 12 }}
      className="nodrag nopan nowheel absolute z-40 w-[280px] -translate-x-1/2 rounded-island border border-island-border bg-island p-3 shadow-island backdrop-blur-md motion-safe:animate-[menu-in_160ms_var(--ease-soft)]"
    >
      <p className="mb-2 text-ui text-sub">{title}</p>
      <CatalogPicker
        label={title}
        placeholder={t(
          party ? "tools.partyPlaceholder"
          : event ? "roles.eventPlaceholder"
          : "roles.actionPlaceholder"
        )}
        options={options}
        initial={party ? (box?.name ?? "") : ""}
      />
    </section>
  );
}
