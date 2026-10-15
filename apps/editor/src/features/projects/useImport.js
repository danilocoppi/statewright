// The import flow (spec §4.5) for files opened, dropped or picked from the examples: read, then open directly, show the
// errors, or ask for a review; storing and opening the result.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { useRepository } from "@/app/repository";
import { copyOf, readImport } from "@/files/import";
import { storageReason } from "@/persistence/repository";
import { toast } from "@/stores/toast";

/** Say that this browser refused to store a project (spec §10: what happened and what to do). */
export function reportStoreFailure(t, error) {
  toast.error(t("projects:storeFailed", { reason: t(`editor:status.reasons.${storageReason(error?.name)}`) }));
}

/**
 * @returns {{ plan: import("@/files/import").ImportPlan | null, importText: (text: string, source: { fileName: string,
 *   handle?: object }) => Promise<void>, importFile: (file: File, handle?: object) => Promise<void>,
 *   accept: (as: "replace" | "copy") => Promise<void>, dismiss: () => void }}
 */
export function useImport() {
  const { t } = useTranslation(["files", "projects"]);
  const repository = useRepository();
  const navigate = useNavigate();
  const [pending, setPending] = useState(null);

  /** Say from which format a file was updated (spec §4.5), once it is opened. */
  const announce = plan => {
    if (!plan.migrations.length) return;
    const [from] = plan.migrations[0].split(" → ");
    toast.info(t("files:import.migrated", { from, to: plan.doc.statewright }));
  };

  /** Store and open a document; `replaced`: it took the place of a copy in this browser that could not be read. */
  const store = async (doc, handle, replaced = false) => {
    const saved = await repository.save(doc, { thumbnail: true }).catch(error => reportStoreFailure(t, error));
    if (!saved) return;
    if (replaced) toast.info(t("files:import.replacedDamaged", { name: doc.project.name }));
    // The file it came from, or none: a copy it replaced forgets the file that copy came from, and the next save to a
    // file asks where to save.
    await repository.setHandle(saved.summary.id, handle ?? null).catch(() => {});
    navigate(`/p/${saved.summary.id}`);
    return saved;
  };

  const importText = async (text, { fileName, handle }) => {
    const plan = await readImport(text, { fileName, loadLocal: id => repository.load(id) });
    if (plan.status === "open" && plan.existing) {
      if (handle) await repository.setHandle(plan.doc.project.id, handle).catch(() => {});
      navigate(`/p/${plan.doc.project.id}`);
      announce(plan);
    } else if (plan.status === "open") {
      if (await store(plan.doc, handle, plan.damaged)) announce(plan);
    } else {
      setPending({ plan, handle });
    }
  };

  const importFile = async (file, handle) => {
    let text;
    try {
      text = await file.text();
    } catch {
      toast.error(t("files:import.unreadable", { file: file.name }));
      return;
    }
    await importText(text, { fileName: file.name, handle });
  };

  const accept = async as => {
    const { plan, handle } = pending;
    setPending(null);
    if (as === "copy") {
      const taken = new Set((await repository.list()).map(summary => summary.id));
      if (await store(copyOf(plan.doc, taken, t("projects:copyName", { name: plan.doc.project.name })))) announce(plan);
    } else if (await store(plan.doc, handle, plan.damaged)) {
      announce(plan);
    }
  };

  return { plan: pending?.plan ?? null, importText, importFile, accept, dismiss: () => setPending(null) };
}
