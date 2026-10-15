import { useId } from "react";
import { useTranslation } from "react-i18next";
import { EDGE_STYLES, legendFor, NODE_STYLES } from "statewright";

import { Icon } from "@/components/ui/Icon";
import { useEditor } from "@/store/editor";

import { Swatch } from "../Swatch";
import { useField } from "../useField";
import { INPUT, TextPart } from "./parts";
import { Row } from "./Row";

const NAME = { key: "name", required: true };
const DESCRIPTION = { key: "description" };

/** One region of a machine: its name and description, typed in place, and × (its boxes go to another region). */
function RegionRow({ id, region, others, readOnly }) {
  const { t } = useTranslation("inspector");
  const name = useField(id, NAME);
  const description = useField(id, DESCRIPTION);
  const [first] = others;
  return (
    <li className="grid gap-1 border-l-2 border-hairline pl-3">
      <div className="flex items-end gap-1">
        <TextPart
          bare
          label={t("regions.name")}
          value={region.name}
          readOnly={readOnly}
          onType={text => text.trim() && name.change(text, { typing: true })}
          onDone={name.done}
          className="flex-1"
          inputClassName="font-medium"
        />
        {!readOnly && (
          <button
            type="button"
            aria-label={t("regions.remove", { name: region.name })}
            title={first ? t("regions.moves", { other: first[1].name }) : t("regions.last")}
            onClick={() =>
              name.run([{ type: "region.remove", args: { id, ...(first && { moveNodesTo: first[0] }) } }], {
                named: t("regions.removed")
              })
            }
            className="mb-1 grid size-6 shrink-0 place-items-center rounded-[6px] text-muted hover:bg-subtle hover:text-ink"
          >
            <Icon name="close" size={12} />
          </button>
        )}
      </div>
      <TextPart
        bare
        label={t("regions.description")}
        value={region.description}
        readOnly={readOnly}
        onType={text => description.change(text, { typing: true })}
        onDone={description.done}
      />
      {(name.error || description.error) && (
        <p role="alert" className="text-label text-danger">
          {(name.error ?? description.error).reason}
        </p>
      )}
    </li>
  );
}

/**
 * A machine's regions (format §12.3): each named and described in place, taken out (its boxes going to the first other
 * region; the last one leaves the machine with one implicit region), and "+ Add a region" (the first adopts every box).
 */
export function RegionsControl({ id, field, value, layer }) {
  const { t } = useTranslation(["inspector", "editor"]);
  const edit = useField(id, field);
  const regions = Object.entries(value ?? {});
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      {regions.length > 0 ?
        <ul className="grid gap-2.5">
          {regions.map(([regionId, region]) => (
            <RegionRow
              key={regionId}
              id={regionId}
              region={region}
              others={regions.filter(([other]) => other !== regionId)}
              readOnly={edit.readOnly}
            />
          ))}
        </ul>
      : <p className="text-ui text-muted">{t("inspector:regions.none")}</p>}
      {!edit.readOnly && (
        <button
          type="button"
          onClick={() =>
            edit.run(
              [
                {
                  type: "region.add",
                  args: {
                    canvas: id,
                    name:
                      regions.length ?
                        t("editor:editing.regionNext", { number: regions.length + 1 })
                      : t("editor:editing.regionFirst")
                  }
                }
              ],
              { named: t("inspector:regions.added") }
            )
          }
          className="mt-1.5 inline-flex h-7 items-center gap-1 text-[12px] font-medium text-accent hover:underline"
        >
          <Icon name="plus" size={12} />
          {t("inspector:regions.add")}
        </button>
      )}
    </Row>
  );
}

/** One style's wording in the legend: its look, the format's words as the placeholder, the project's own words. */
function LegendRow({ style, words, readOnly, onType, onDone }) {
  const inputId = useId();
  const fallback = (NODE_STYLES[style.key] ?? EDGE_STYLES[style.key]).label;
  return (
    <li className="grid grid-cols-[18px_minmax(0,1fr)] items-center gap-2">
      <Swatch swatch={NODE_STYLES[style.key] ? { node: style.key } : { edge: style.key }} />
      <input
        id={inputId}
        aria-label={fallback}
        value={words ?? ""}
        placeholder={fallback}
        disabled={readOnly}
        onChange={event => onType(event.target.value)}
        onBlur={onDone}
        className={`${INPUT} h-7`}
      />
    </li>
  );
}

/**
 * The project's legend wording (format §14): for each style the project's levels use, its own words instead of the
 * format's — left empty, the format's words are used.
 */
export function LegendControl({ id, field, layer }) {
  const edit = useField(id, field);
  const doc = useEditor(state => state.doc);
  const labels = doc.layout?.legend?.labels ?? {};
  const used = new Map();
  for (const canvasId of Object.keys(doc.canvases)) {
    const legend = legendFor(doc, canvasId);
    for (const style of [...legend.nodes, ...legend.edges]) used.set(style.key, style);
  }
  const type = (key, text) => {
    const next = { ...labels, [key]: text };
    if (!text.trim()) delete next[key];
    edit.run([{ type: "legend.labels.set", args: { labels: next } }], { typing: true });
  };
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      <ul className="grid gap-1">
        {[...used.values()].map(style => (
          <LegendRow
            key={style.key}
            style={style}
            words={labels[style.key]}
            readOnly={edit.readOnly}
            onType={text => type(style.key, text)}
            onDone={edit.done}
          />
        ))}
      </ul>
    </Row>
  );
}
