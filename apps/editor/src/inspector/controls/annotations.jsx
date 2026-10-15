import { useTranslation } from "react-i18next";
import { BADGE } from "statewright";

import { paint } from "@/canvas/palette";
import { Icon } from "@/components/ui/Icon";
import { idsFor } from "@/editing/ids";
import { useEditor } from "@/store/editor";

import { inspectorStore } from "../state";
import { useField } from "../useField";
import { TextPart } from "./parts";
import { Row } from "./Row";

/** A small icon button of a row. */
function RowButton({ label, icon, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-6 shrink-0 place-items-center rounded-[6px] text-muted hover:bg-subtle hover:text-ink"
    >
      <Icon name={icon} size={12} />
    </button>
  );
}

/** A small text button that adds something. */
function AddButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 inline-flex h-7 items-center gap-1 text-[12px] font-medium text-accent hover:underline"
    >
      <Icon name="plus" size={12} />
      {label}
    </button>
  );
}

/**
 * The findings about an element (spec §7.7): each with its badge as the diagram draws it, its title and severity;
 * a click shows it to edit, × removes it; "+ Add a finding" writes a new one about the element.
 */
export function FindingsControl({ id, field, layer }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const doc = useEditor(state => state.doc);
  const findings = Object.entries(doc.annotations?.findings ?? {}).filter(([, finding]) =>
    finding.targets.includes(id)
  );
  const add = () => {
    const findingId = idsFor(doc).take("fnd", "review");
    const finding = { code: "REVIEW", title: t("findings.newTitle"), severity: "info", targets: [id] };
    if (edit.run([{ type: "finding.upsert", args: { id: findingId, finding } }], { named: t("findings.added") })) {
      inspectorStore.getState().show(findingId, { fresh: true });
    }
  };
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      {findings.length ?
        <ul className="grid gap-0.5">
          {findings.map(([findingId, finding]) => (
            <li key={findingId} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => inspectorStore.getState().show(findingId)}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-[6px] py-1 text-left hover:bg-subtle"
              >
                <span
                  className="shrink-0 rounded-[3px] px-1 font-mono text-[9.5px] font-semibold leading-4"
                  style={{ background: paint(BADGE.fill), color: paint(BADGE.color) }}
                >
                  {finding.code}
                </span>
                <span className="truncate text-ui text-ink">{finding.title}</span>
                <span className="ml-auto shrink-0 text-label text-muted">
                  {t(`choices.severity.${finding.severity}`)}
                </span>
              </button>
              {!edit.readOnly && (
                <RowButton
                  label={t("refs.remove", { name: finding.code })}
                  icon="close"
                  onClick={() =>
                    edit.run([{ type: "finding.remove", args: { id: findingId } }], { named: t("findings.removed") })
                  }
                />
              )}
            </li>
          ))}
        </ul>
      : <p className="text-ui text-muted">{t("findings.none")}</p>}
      {!edit.readOnly && <AddButton label={t("findings.add")} onClick={add} />}
    </Row>
  );
}

const LABEL = { key: "label", required: true };

/** One lane of the level: its caption typed in place, how many boxes it holds, its details, ×. */
function LaneRow({ id, lane, readOnly }) {
  const { t } = useTranslation("inspector");
  const label = useField(id, LABEL);
  return (
    <li className="flex items-center gap-1">
      <TextPart
        bare
        label={t("lanes.caption")}
        value={lane.label}
        readOnly={readOnly}
        onType={text => text.trim() && label.change(text, { typing: true })}
        onDone={label.done}
        className="min-w-0 flex-1"
        inputClassName="h-7 text-[12px]"
      />
      <span className="shrink-0 px-1 text-label text-muted">{t("lanes.boxes", { count: lane.nodes.length })}</span>
      <RowButton
        label={t("lanes.details", { name: lane.label })}
        icon="pencil"
        onClick={() => inspectorStore.getState().show(id)}
      />
      {!readOnly && (
        <RowButton
          label={t("refs.remove", { name: lane.label })}
          icon="close"
          onClick={() => label.run([{ type: "lane.remove", args: { id } }], { named: t("lanes.removed") })}
        />
      )}
    </li>
  );
}

/**
 * The level's lanes (spec §7.7): unboxed captions above rows of boxes — named in place, opened to choose their boxes,
 * removed; "+ Make a lane" adds one (the canvas menu makes one of the selected boxes).
 */
export function LanesControl({ id, field, layer }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const doc = useEditor(state => state.doc);
  const lanes = Object.entries(doc.annotations?.lanes ?? {}).filter(([, lane]) => lane.canvas === id);
  const add = () => {
    const label = t("lanes.name", { number: lanes.length + 1 });
    const laneId = idsFor(doc).take("lne", label);
    if (
      edit.run([{ type: "lane.add", args: { id: laneId, lane: { canvas: id, label, nodes: [] } } }], {
        named: t("lanes.added")
      })
    ) {
      inspectorStore.getState().show(laneId, { fresh: true });
    }
  };
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      {lanes.length ?
        <ul className="grid gap-1">
          {lanes.map(([laneId, lane]) => (
            <LaneRow key={laneId} id={laneId} lane={lane} readOnly={edit.readOnly} />
          ))}
        </ul>
      : <p className="text-ui text-muted">{t("lanes.none")}</p>}
      {!edit.readOnly && <AddButton label={t("lanes.add")} onClick={add} />}
    </Row>
  );
}
