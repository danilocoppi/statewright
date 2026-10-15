import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { useEditor } from "@/store/editor";
import { toast } from "@/stores/toast";

import { simulationStore, useSimulation } from "./store";
import { AREA } from "./ValueForm";

/** Why a read-only tab cannot save (spec §6.4: "the save actions say why"). */
export function ReadOnlyNote() {
  const { t } = useTranslation("simulate");
  return <p className="text-label text-muted">{t("save.readOnly")}</p>;
}

/**
 * Save as scenario… (simulator spec §6.4): a name and a description; saving is a change of the document, undoable and
 * autosaved. A read-only tab says why it cannot.
 */
export function SaveDialog() {
  const { t } = useTranslation("simulate");
  const open = useSimulation(state => state.saving);
  const readOnly = useEditor(state => state.readOnly);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState(null);
  const descriptionId = useId();
  const close = () => {
    setError(null);
    simulationStore.getState().setSaving(false);
  };
  const save = event => {
    event.preventDefault();
    if (!name.trim() || readOnly) return;
    const result = simulationStore
      .getState()
      .save(
        { name: name.trim(), ...(description.trim() ? { description: description.trim() } : {}) },
        t("save.label", { name: name.trim() })
      );
    if (!result.ok) return setError(result.error.code === "READ_ONLY" ? t("save.readOnly") : result.error.message);
    toast.success(t("save.saved", { name: name.trim() }));
    setName("");
    setDescription("");
    setError(null);
  };
  return (
    <Dialog open={open} onClose={close} title={t("save.title")} description={t("save.description")}>
      <form onSubmit={save} className="grid gap-3">
        <TextField label={t("save.name")} value={name} onChange={setName} autoFocus error={error ?? undefined} />
        <div className="grid gap-1.5">
          <label htmlFor={descriptionId} className="text-label font-medium text-sub">
            {t("save.about")}
          </label>
          <textarea
            id={descriptionId}
            rows={3}
            value={description}
            onChange={event => setDescription(event.target.value)}
            className={`${AREA} min-h-[72px] font-sans text-read`}
          />
        </div>
        {readOnly && <ReadOnlyNote />}
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>
            {t("payload.cancel")}
          </Button>
          <Button type="submit" variant="primary" disabled={!name.trim() || readOnly}>
            {t("save.save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * Stopping, starting over, or opening a scenario from a Problem, with steps no scenario holds (spec §6.1, §6.4): Save
 * as scenario… or discard them.
 */
export function LeaveDialog() {
  const { t } = useTranslation("simulate");
  const leaving = useSimulation(state => state.leaving);
  const saving = useSimulation(state => state.saving);
  const steps = useSimulation(
    state => state.points.filter((point, index) => index > 0 && point.recorded === undefined).length
  );
  const readOnly = useEditor(state => state.readOnly);
  const store = simulationStore.getState();
  const action =
    typeof leaving === "string" ? leaving
    : leaving ? "open"
    : "stop";
  return (
    <Dialog
      open={Boolean(leaving) && !saving}
      onClose={() => store.stay()}
      title={t(`leave.${action}Title`)}
      description={t("leave.description", { count: steps })}
      actions={
        <>
          <Button variant="ghost" onClick={() => store.stay()}>
            {t("payload.cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              const stopping = simulationStore.getState().leaving === "stop";
              store.discard();
              if (stopping) requestAnimationFrame(() => globalThis.document?.querySelector("[data-simulate]")?.focus());
            }}
          >
            {t(`leave.${action}Discard`)}
          </Button>
          <Button variant="primary" disabled={readOnly} onClick={() => store.setSaving(true)}>
            {t("save.open")}
          </Button>
        </>
      }
    >
      {readOnly && <ReadOnlyNote />}
    </Dialog>
  );
}

/**
 * Accepting a new path that drops later steps (spec §6.4: "it says how many will be dropped and asks first").
 * @param {{ ask: { index: number, dropped: number } | null, onClose: () => void, onAccept: () => void }} props
 */
export function AcceptDialog({ ask, onClose, onAccept }) {
  const { t } = useTranslation("simulate");
  const name = useSimulation(state => (state.script ? state.script.id : null));
  const doc = useEditor(state => state.doc);
  return (
    <Dialog
      open={Boolean(ask)}
      onClose={onClose}
      title={t("accept.title")}
      description={
        ask &&
        t(ask.index ? "accept.description" : "accept.descriptionStart", {
          step: ask.index,
          count: ask.dropped,
          name: doc.annotations?.scenarios?.[name]?.name ?? ""
        })
      }
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("payload.cancel")}
          </Button>
          <Button variant="primary" onClick={onAccept}>
            {t("accept.drop", { count: ask?.dropped ?? 0 })}
          </Button>
        </>
      }
    />
  );
}
