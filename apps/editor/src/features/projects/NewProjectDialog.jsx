import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { Segmented } from "@/components/ui/Segmented";
import { TextField } from "@/components/ui/TextField";
import { PROJECT_KINDS } from "@/files/new-project";

/**
 * Name a new project and choose what its top level is.
 * @param {{ open: boolean, kind: string, onKindChange: (kind: string) => void, onClose: () => void,
 *   onCreate: (project: { name: string, kind: string }) => void }} props
 */
export function NewProjectDialog({ open, kind, onKindChange, onClose, onCreate }) {
  const { t } = useTranslation("projects");
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const create = () => {
    if (!trimmed) return;
    onCreate({ name: trimmed, kind });
    setName("");
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("new.title")}
      actions={
        <>
          <Button onClick={onClose}>{t("common:actions.cancel")}</Button>
          <Button variant="primary" type="submit" form="new-project" disabled={!trimmed}>
            {t("new.create")}
          </Button>
        </>
      }
    >
      <form
        id="new-project"
        className="grid gap-4"
        onSubmit={event => {
          event.preventDefault();
          create();
        }}
      >
        <TextField
          label={t("new.name")}
          value={name}
          onChange={setName}
          placeholder={t("new.namePlaceholder")}
          autoFocus
        />
        <div className="grid gap-1.5">
          <span className="text-label font-medium text-sub">{t("new.kind")}</span>
          <Segmented
            className="justify-self-start"
            label={t("new.kind")}
            value={kind}
            onChange={onKindChange}
            options={PROJECT_KINDS.map(option => ({
              value: option,
              label: t(`start.${option}`),
              icon: <Icon name={option} size={14} />
            }))}
          />
        </div>
      </form>
    </Dialog>
  );
}
