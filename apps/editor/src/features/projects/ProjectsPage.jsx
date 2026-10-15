import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { applyBatch } from "statewright";

import { useRepository } from "@/app/repository";
import { BrandMark } from "@/components/BrandMark";
import { LanguageMenu, ThemeMenu } from "@/components/PreferenceMenus";
import { SupportBadge } from "@/components/SupportBadge";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { buttonClass } from "@/components/ui/buttonClass";
import { Icon } from "@/components/ui/Icon";
import { Island } from "@/components/ui/Island";
import { REPOSITORY } from "@/config/app";
import { RenameDialog } from "@/features/editor/RenameDialog";
import { copyOf } from "@/files/import";
import { newProject } from "@/files/new-project";
import { canPickFiles, documentFileName, pickFile, saveToFile } from "@/files/save-file";
import { whileClosed } from "@/persistence/lock";
import { toast } from "@/stores/toast";

import { DropOverlay } from "./DropOverlay";
import { ImportDialog } from "./ImportDialog";
import { NewProjectDialog } from "./NewProjectDialog";
import { ProjectCard } from "./ProjectCard";
import { StartTiles } from "./StartTiles";
import { reportStoreFailure, useImport } from "./useImport";

/** The current time, refreshed every minute (for "Edited 2 minutes ago"). */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** The Projects screen (spec §6.2, mockup 03). */
export default function ProjectsPage() {
  const { t } = useTranslation(["projects", "files"]);
  const repository = useRepository();
  const navigate = useNavigate();
  const importer = useImport();
  const now = useNow();
  const fileInput = useRef(null);
  const [summaries, setSummaries] = useState(null);
  const [newKind, setNewKind] = useState(null);
  /** The project being renamed from its card. */
  const [renaming, setRenaming] = useState(null);

  const refresh = useCallback(() => repository.list().then(setSummaries), [repository]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const taken = () => new Set((summaries ?? []).map(summary => summary.id));

  const openFile = async () => {
    if (!canPickFiles()) return fileInput.current.click();
    // A picker that refuses to open (not one the person cancelled) leaves the browser's file input to ask instead.
    const picked = await pickFile().catch(() => "refused");
    if (picked === "refused") return fileInput.current.click();
    if (picked) await importer.importFile(picked.file, picked.handle);
  };

  const createProject = async ({ name, kind }) => {
    setNewKind(null);
    const doc = newProject({ name, kind, names: { state: t("new.firstState"), end: t("new.end") } }, taken());
    const saved = await repository.save(doc, { thumbnail: true }).catch(error => reportStoreFailure(t, error));
    if (saved) navigate(`/p/${saved.summary.id}`);
  };

  const openExample = async example => {
    if (taken().has(example.projectId)) return navigate(`/p/${example.projectId}`);
    await importer.importText(await example.load(), { fileName: `${example.file}` });
  };

  /** A project's document, or null — and why — when its copy in this browser cannot be read. */
  const loadProject = summary =>
    repository.load(summary.id).catch(() => {
      toast.error(t("unreadable", { name: summary.name }));
      return null;
    });

  const saveProject = async summary => {
    const doc = await loadProject(summary);
    if (!doc) return;
    const result = await saveToFile(doc, { handle: await repository.getHandle(summary.id) });
    const file = result.handle?.name ?? documentFileName(doc);
    if (result.method === "file") {
      await repository.setHandle(summary.id, result.handle);
      toast.success(t("files:save.saved", { file }));
    } else if (result.method === "download") {
      toast.info(t(result.reason === "permission" ? "files:save.permission" : "files:save.downloaded", { file }));
    }
  };

  // Renamed here only while no tab edits it: an open editor would store its own name over this one (spec §4.7).
  const rename = async (summary, name) => {
    setRenaming(null);
    const ran = await whileClosed(summary.id, async () => {
      const doc = await loadProject(summary);
      if (!doc) return;
      const { doc: renamed } = applyBatch(doc, [{ type: "project.update", args: { set: { name } } }]);
      await repository.save(renamed).catch(error => reportStoreFailure(t, error));
    });
    if (!ran) toast.error(t("openElsewhere", { name: summary.name }));
    await refresh();
  };

  const duplicate = async summary => {
    const doc = await loadProject(summary);
    if (!doc) return;
    const name = t("copyName", { name: summary.name });
    const saved = await repository
      .save(copyOf(doc, taken(), name), { thumbnail: true })
      .catch(error => reportStoreFailure(t, error));
    if (!saved) return;
    await refresh();
    toast.success(t("duplicated", { name }));
  };

  const remove = async summary => {
    let record;
    try {
      record = await repository.remove(summary.id);
    } catch (error) {
      return reportStoreFailure(t, error);
    }
    await refresh();
    toast.success(t("deleted", { name: summary.name }), {
      action: {
        label: t("undo"),
        onClick: async () => {
          await repository.restore(record).catch(error => reportStoreFailure(t, error));
          await refresh();
        }
      }
    });
  };

  return (
    <main className="min-h-screen bg-dots">
      <Island className="fixed left-4 top-4 z-10 flex h-10 items-center gap-2.5 pl-2.5 pr-3.5 font-semibold">
        <BrandMark />
        Statewright
      </Island>
      <Island className="fixed right-4 top-4 z-10 flex h-10 items-center gap-0.5 px-1">
        <Link to="/readme" className={buttonClass("ghost", "sm")}>
          {t("common:guide.link")}
        </Link>
        <a
          href={REPOSITORY}
          target="_blank"
          rel="noreferrer"
          title="GitHub"
          className="grid size-8 shrink-0 place-items-center rounded-control text-sub transition-colors duration-150 hover:bg-subtle hover:text-ink"
        >
          <Icon name="github" />
          <span className="sr-only">GitHub ({t("common:guide.newTab")})</span>
        </a>
        <LanguageMenu />
        <ThemeMenu />
      </Island>
      {!repository.persistent && (
        <Banner className="fixed left-1/2 top-4 z-10 w-[min(560px,calc(100vw-360px))] -translate-x-1/2">
          {t("storage")}
        </Banner>
      )}

      <div className="mx-auto max-w-[1180px] px-6 pb-24 pt-[92px] sm:px-16">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-page font-semibold tracking-tight">{t("title")}</h1>
            <p className="mt-1.5 text-sub">{t("lede")}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={openFile} data-testid="projects-open-file">
              <Icon name="upload" size={14} />
              {t("actions.openFile")}
            </Button>
            <Button variant="primary" data-testid="projects-new" onClick={() => setNewKind("machine")}>
              <Icon name="plus" size={14} />
              {t("actions.newProject")}
            </Button>
          </div>
        </header>

        {summaries?.length > 0 && (
          <section
            aria-label={t("title")}
            data-testid="projects-list"
            className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-[18px]"
          >
            {summaries.map(summary => (
              <ProjectCard
                key={summary.id}
                summary={summary}
                now={now}
                onRename={() => setRenaming(summary)}
                onSaveToFile={() => saveProject(summary)}
                onDuplicate={() => duplicate(summary)}
                onDelete={() => remove(summary)}
              />
            ))}
          </section>
        )}
        {summaries?.length === 0 && (
          <p className="mt-8 text-read text-sub">
            {t("empty")}{" "}
            <Link to="/readme" className="font-medium text-accent hover:underline">
              {t("emptyGuide")}
            </Link>
          </p>
        )}

        <div className="mt-12">
          <StartTiles onStart={setNewKind} onOpenFile={openFile} onExample={openExample} />
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        aria-label={t("actions.openFile")}
        hidden
        onChange={event => {
          const [file] = event.target.files;
          event.target.value = "";
          if (file) importer.importFile(file);
        }}
      />
      <SupportBadge />
      <DropOverlay onDrop={importer.importFile} />
      <ImportDialog plan={importer.plan} onAccept={importer.accept} onClose={importer.dismiss} />
      {renaming && (
        <RenameDialog
          name={renaming.name}
          onClose={() => setRenaming(null)}
          onRename={name => rename(renaming, name)}
        />
      )}
      <NewProjectDialog
        open={newKind !== null}
        kind={newKind ?? "machine"}
        onKindChange={setNewKind}
        onClose={() => setNewKind(null)}
        onCreate={createProject}
      />
    </main>
  );
}
