import { useState } from "react";
import { useTranslation } from "react-i18next";

import { refusalKey } from "@/editing/refusals";
import { editorStore, useEditor } from "@/store/editor";

import { fieldCommands } from "./apply";

/**
 * Edit one field of an element (spec §4.2): `change(value)` is one undoable change, named for the field; typing into the
 * same field (`{ typing: true }`) is one change until `done()` (the field lost the focus) or a second passes. A value
 * Core refuses changes nothing and is said in `error`, in plain words with Core's own message.
 * @param {string} id The element's ID.
 * @param {import("./fields").Field} field
 * @returns {{ change: (value: unknown, options?: { typing?: boolean }) => boolean, run: (commands: object[]) => boolean,
 *   done: () => void, error: { reason: string, message: string } | null, readOnly: boolean, label: string }}
 *   `run`: other commands for the field as one change (an item created and chosen); `{ named }` names the change
 *   otherwise than "Edit <field>".
 */
export function useField(id, field) {
  const { t } = useTranslation(["inspector", "editor"]);
  const readOnly = useEditor(state => state.readOnly);
  const [error, setError] = useState(null);
  const label = t(`inspector:fields.${field.label ?? field.key}`);

  const run = (commands, { typing = false, named } = {}) => {
    if (!commands.length) return false;
    const result = editorStore.getState().dispatch(commands, {
      label: named ?? t("inspector:edit", { field: label }),
      coalesceKey: typing ? `${id}:${field.key}` : undefined
    });
    setError(
      result.ok ? null : { reason: t(`editor:${refusalKey(result.error.code)}`), message: result.error.message }
    );
    return result.ok;
  };
  const change = (value, options) => run(fieldCommands(editorStore.getState().doc, id, field.key, value), options);
  const done = () => {
    editorStore.getState().seal();
    setError(null);
  };
  return { change, run, done, error, readOnly, label };
}
