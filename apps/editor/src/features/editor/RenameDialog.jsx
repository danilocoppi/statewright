import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";

/**
 * Rename the project. Mount it only while open, so it starts from the current name.
 * @param {{ name: string, onClose: () => void, onRename: (name: string) => void }} props
 */
export function RenameDialog({ name, onClose, onRename }) {
  const { t } = useTranslation("editor");
  const [value, setValue] = useState(name);
  const trimmed = value.trim();
  return (
    <Dialog
      open
      testId="rename-dialog"
      onClose={onClose}
      title={t("rename.title")}
      actions={
        <>
          <Button onClick={onClose}>{t("common:actions.cancel")}</Button>
          <Button variant="primary" type="submit" form="rename-project" disabled={!trimmed || trimmed === name}>
            {t("rename.save")}
          </Button>
        </>
      }
    >
      <form
        id="rename-project"
        onSubmit={event => {
          event.preventDefault();
          if (trimmed && trimmed !== name) onRename(trimmed);
        }}
      >
        <TextField label={t("rename.name")} value={value} onChange={setValue} autoFocus />
      </form>
    </Dialog>
  );
}
