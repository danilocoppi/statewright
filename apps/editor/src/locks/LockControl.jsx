import { useTranslation } from "react-i18next";

import { editorStore, useEditor } from "@/store/editor";

import { lockOf } from "./locked";

/**
 * Don't let the AI change this (collaboration spec §8.2): the inspector's switch for a box, an arrow, a region or a
 * level. Locked, the agent's changes to it are only proposed; the person's own go through. One change each way.
 * @param {{ id: string }} props
 */
export function LockControl({ id }) {
  const { t } = useTranslation("inspector");
  const lock = useEditor(state => lockOf(state.doc, id));
  const readOnly = useEditor(state => state.readOnly);
  const toggle = () =>
    editorStore
      .getState()
      .dispatch(lock ? [{ type: "lock.remove", args: { id: lock } }] : [{ type: "lock.add", args: { target: id } }], {
        label: lock ? t("lock.unlocked") : t("lock.locked")
      });
  return (
    <label className="flex items-center gap-2 text-ui text-sub" data-testid="inspector-lock">
      <input type="checkbox" checked={Boolean(lock)} disabled={readOnly} onChange={toggle} />
      {t("lock.label")}
    </label>
  );
}
