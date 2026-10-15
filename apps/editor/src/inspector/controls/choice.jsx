import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { applyBatch, CommandError, TypeDef } from "statewright";

import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import { useEditor } from "@/store/editor";

import { fieldCommands } from "../apply";
import { choicesOf, kindsOf } from "../schema";
import { Swatch } from "../Swatch";
import { swatchOf } from "../swatches";
import { useField } from "../useField";
import { Row } from "./Row";

/** The choice that leaves the key out. */
const NONE = "__none";

/**
 * One of the format's values, in plain words (a row of pills): "Nothing special · Waits on someone · …", each with
 * its look on the diagram when it changes it. The
 * choice that leaves the key out comes first when there is one; choosing the value the format assumes leaves it out too.
 * A link is shown only on an edge that is one.
 */
export function ChoiceControl({ id, field, value, layer, entry }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const words = field.label ?? field.key;
  const choices = field.choices.filter(choice => choice !== "link" || value === "link");
  // Choices that change the look show it, in the figure's own colours.
  const icon = choice => {
    const swatch = swatchOf(field.key, choice, entry.type);
    return swatch ? <Swatch swatch={swatch} /> : undefined;
  };
  const options = [
    ...(field.none ? [{ value: NONE, label: t(`choices.none.${field.none}`), icon: icon(undefined) }] : []),
    ...choices.map(choice => ({ value: String(choice), label: t(`choices.${words}.${choice}`), icon: icon(choice) }))
  ];
  const current = value ?? field.default ?? NONE;
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      <Segmented
        label={edit.label}
        value={String(current)}
        options={options}
        disabled={edit.readOnly}
        // Separate pills that wrap: the inspector is narrow and the words are plain.
        pills
        onChange={next => edit.change(next === NONE || next === field.default ? undefined : next)}
      />
    </Row>
  );
}

/** A yes-or-no field: on sets it, off leaves it out. */
export function ToggleControl({ id, field, value, layer }) {
  const edit = useField(id, field);
  const on = value === true;
  return (
    <Row
      label={edit.label}
      layer={layer}
      error={edit.error}
      className={layer === "basics" ? "flex items-center justify-between" : ""}
    >
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={edit.label}
        disabled={edit.readOnly}
        onClick={() => edit.change(on ? undefined : true)}
        className="group inline-flex h-8 items-center disabled:opacity-60"
      >
        <span
          aria-hidden="true"
          className={cn(
            "relative h-[18px] w-8 rounded-full transition-colors duration-150",
            on ? "bg-accent" : "bg-control-border"
          )}
        >
          <span
            className={cn(
              "absolute top-[2px] size-[14px] rounded-full bg-surface shadow-sm transition-[left] duration-150",
              on ? "left-[16px]" : "left-[2px]"
            )}
          />
        </span>
      </button>
    </Row>
  );
}

/**
 * What an element is (a node's kind on its level, a type's kind): changing it leaves out what the new kind does not
 * take. A shortcut stays a shortcut, so it is not offered.
 */
export function KindControl({ id, field, value, layer, entry }) {
  const { t } = useTranslation("inspector");
  const selectId = useId();
  const edit = useField(id, field);
  const doc = useEditor(state => state.doc);
  const level = entry.type === "node" ? doc.canvases[entry.canvas].kind : null;
  const kinds = useMemo(
    () => (level ? kindsOf("node", level).filter(kind => kind !== "ref") : choicesOf(TypeDef, "kind")),
    [level]
  );
  const words = kind => (entry.type === "node" ? t(`kinds.node.${kind}`) : t(`choices.typeKind.${kind}`));
  // The kinds Core would refuse for this element now (an unnamed initial node as a state, a box with arrows into it
  // as an initial node) are greyed out, saying what to set first when Core names it — tried on the document, which is
  // not changed, when the field is opened (a pointer press or the focus), not on every edit; what was tried holds for
  // that document only.
  const [tried, setTried] = useState(null);
  const refused = tried?.doc === doc ? tried.refused : null;
  const tryKinds = () => {
    if (edit.readOnly || refused) return;
    const reasons = new Map();
    for (const kind of kinds) {
      if (kind === value) continue;
      try {
        applyBatch(doc, fieldCommands(doc, id, field.key, kind));
      } catch (error) {
        if (!(error instanceof CommandError)) throw error;
        // A field of the element Core finds missing or wrong ("…/name"), in the inspector's words.
        const key = error.details?.errors?.[0]?.path?.split("/").pop();
        const missing = key && t(`fields.${key}`, { defaultValue: "" });
        reasons.set(
          kind,
          missing ? t("kindNeeds", { kind: words(kind), field: missing }) : t("kindRefused", { kind: words(kind) })
        );
      }
    }
    setTried({ doc, refused: reasons });
  };
  return (
    <Row label={edit.label} layer={layer} htmlFor={selectId} error={edit.error}>
      <select
        id={selectId}
        value={value}
        disabled={edit.readOnly}
        onPointerDown={tryKinds}
        onFocus={tryKinds}
        onChange={event => edit.change(event.target.value)}
        className="h-8 w-full rounded-control border border-control-border bg-surface px-2 text-ui text-ink outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] disabled:border-transparent disabled:bg-transparent disabled:px-0 disabled:opacity-100"
      >
        {kinds.map(kind => (
          <option key={kind} value={kind} disabled={Boolean(refused?.has(kind))}>
            {refused?.get(kind) ?? words(kind)}
          </option>
        ))}
      </select>
    </Row>
  );
}
