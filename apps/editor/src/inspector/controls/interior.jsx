import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { instanceCounts, interiorCommands, interiorKinds } from "@/reuse/definitions";
import { editorStore, useEditor } from "@/store/editor";

import { useField } from "../useField";
import { AddPicker } from "./Picker";
import { Row } from "./Row";

/** A small text button of the interior's row. */
function Action({ label, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-7 items-center text-[12px] font-medium hover:underline ${danger ? "text-danger" : "text-accent"}`}
    >
      {label}
    </button>
  );
}

/**
 * What is inside a box or a catalog item (spec §7.6, Core spec §9.8): nothing yet — add an interior of a kind it can
 * have, or use a reusable part; its own level — open it, make it reusable, remove it; a reusable part — open its body,
 * detach this use into its own copy, stop using it.
 */
export function InteriorControl({ id, field, value, layer, entry }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const doc = useEditor(state => state.doc);
  const [removing, setRemoving] = useState(false);
  // The inspector adds a typed level; a mixed one is made from the level-kind menu or by changing a level to mixed.
  const kinds = interiorKinds(doc, entry).filter(kind => kind !== "mixed");
  const name = entry.value.name ?? id;
  // The address follows the level the store shows (spec §4.6), so opening a level is showing it.
  const open = canvasId => editorStore.getState().setCanvas(canvasId);

  const add = kind => edit.run(interiorCommands(doc, id, kind, name).commands, { named: t("reuse.added") });

  if (!value) {
    const parts = query =>
      Object.entries(doc.definitions)
        .filter(([, part]) => kinds.includes(part.kind) && part.name.toLowerCase().includes(query.trim().toLowerCase()))
        .map(([partId, part]) => ({
          id: partId,
          label: part.name,
          meta: t(`kinds.canvas.${part.kind}`),
          onPick: () =>
            edit.run([{ type: "definition.instantiate", args: { owner: id, definition: partId } }], {
              named: t("reuse.used")
            })
        }));
    return (
      <Row label={edit.label} layer={layer} wide error={edit.error}>
        <p className="text-ui text-muted">{t("reuse.none")}</p>
        {!edit.readOnly && kinds.length > 0 && (
          <div className="mt-1 grid justify-items-start gap-1">
            {kinds.length === 1 ?
              <Action label={t(`reuse.add.${kinds[0]}`)} onClick={() => add(kinds[0])} />
            : <div className="flex flex-wrap items-center gap-1">
                <span className="mr-1 text-[12px] text-sub">{t("reuse.addInside")}</span>
                {kinds.map(kind => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => add(kind)}
                    className="inline-flex h-6 items-center gap-1 rounded-[6px] border border-control-border px-2 text-[12px] text-ink hover:border-muted"
                  >
                    <Icon name={kind} size={12} className="text-muted" />
                    {t(`kinds.canvas.${kind}`)}
                  </button>
                ))}
              </div>
            }
            <AddPicker label={t("reuse.use")} placeholder={t("reuse.find")} options={parts} />
          </div>
        )}
      </Row>
    );
  }

  if (value.canvas) {
    return (
      <Row label={edit.label} layer={layer} wide error={edit.error}>
        <button
          type="button"
          onClick={() => open(value.canvas)}
          className="flex min-h-6 items-center gap-1.5 text-ui font-medium text-ink hover:underline"
        >
          {doc.canvases[value.canvas]?.name}
          <span className="font-normal text-muted">{t(`kinds.canvas.${doc.canvases[value.canvas]?.kind}`)}</span>
        </button>
        {removing ?
          <div role="alert" className="mt-1.5 grid gap-2 rounded-control bg-danger-soft px-3 py-2.5 text-ui">
            <p>{t("reuse.removeAll")}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="danger"
                onClick={() =>
                  edit.run([{ type: "canvas.remove", args: { id: value.canvas } }], { named: t("reuse.removed") })
                }
              >
                {t("reuse.removeIt")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRemoving(false)}>
                {t("catalog.keep")}
              </Button>
            </div>
          </div>
        : !edit.readOnly && (
            <div className="mt-0.5 flex flex-wrap gap-x-3">
              <Action label={t("reuse.open")} onClick={() => open(value.canvas)} />
              <Action
                label={t("reuse.make")}
                onClick={() =>
                  edit.run([{ type: "definition.extract", args: { owner: id, name } }], { named: t("reuse.made") })
                }
              />
              <Action label={t("reuse.remove")} danger onClick={() => setRemoving(true)} />
            </div>
          )
        }
      </Row>
    );
  }

  const part = doc.definitions[value.definition];
  const uses = instanceCounts(doc).get(value.definition) ?? 0;
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      <button
        type="button"
        onClick={() => part && open(part.canvas)}
        className="flex items-center gap-1.5 text-left text-ui font-medium text-ink hover:underline"
      >
        <Icon name="duplicate" size={13} className="shrink-0 text-muted" />
        {part?.name ?? value.definition}
      </button>
      <p className="text-label text-muted">{t("reuse.instance", { count: uses })}</p>
      {!edit.readOnly && (
        <div className="mt-0.5 flex flex-wrap gap-x-3">
          {part && <Action label={t("reuse.open")} onClick={() => open(part.canvas)} />}
          <Action
            label={t("reuse.detach")}
            onClick={() =>
              edit.run([{ type: "definition.detach", args: { owner: id } }], { named: t("reuse.detached") })
            }
          />
          <Action label={t("reuse.stop")} danger onClick={() => edit.change(undefined)} />
        </div>
      )}
    </Row>
  );
}
