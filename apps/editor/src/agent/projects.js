// The Editor host's projects (AI interface spec §4.2: projects): those kept in this browser, opened, created and
// imported as the Projects screen does. A path is the MCP server's to read: the Editor takes a project's ID, or a
// document's text.
import { AgentError } from "statewright/agent";
import i18n from "i18next";

import { sharedRepository } from "@/app/repository";
import { readImport } from "@/files/import";
import { newProject } from "@/files/new-project";
import { editorStore } from "@/store/editor";

import { busy } from "./busy";
import { keepUnsaved } from "./runs";

/** How long a project may take to open in the page before the call gives up. */
export const OPEN_MS = 10000;

/** Go to a project's page and wait until it is open there. */
async function openPage(id, navigate) {
  const open = () => editorStore.getState().doc?.project.id === id;
  const opened = new Promise((resolve, reject) => {
    if (open()) return resolve();
    const stop = editorStore.subscribe(() => {
      if (!open()) return;
      stop();
      clearTimeout(timer);
      resolve();
    });
    const timer = setTimeout(() => {
      stop();
      reject(new AgentError("TIMEOUT", `The project ${id} did not open within ${OPEN_MS / 1000} s`, { id }));
    }, OPEN_MS);
  });
  navigate(`/p/${id}`);
  await opened;
  const { project } = editorStore.getState().doc;
  return { project: { id: project.id, name: project.name } };
}

/**
 * Leaving the project open closes the person's dialog and their run: not while a dialog is open or the person is
 * typing (BUSY), nor while the run has steps no scenario holds (NOT_ALLOWED).
 */
function leaving(id) {
  if (id !== undefined && editorStore.getState().doc?.project.id === id) return;
  busy();
  keepUnsaved("opening another project");
}

/** A path is for the MCP server, which reads files: the Editor cannot. */
function noPath(path) {
  if (path !== undefined) {
    throw new AgentError(
      "FILE",
      "The Editor cannot read files: call this with file through the MCP server, or give text"
    );
  }
}

export const projectOperations = {
  "projects.list": async ({ repository = sharedRepository }) => ({
    projects: (await (await repository()).list()).map(({ id, name, stage, updatedAt }) => ({
      id,
      name,
      stage,
      updatedAt
    }))
  }),
  "projects.open": async ({ repository = sharedRepository, navigate }, { id, path }) => {
    noPath(path);
    if (!(await (await repository()).has(id))) {
      throw new AgentError("NOT_FOUND", `There is no project "${id}" in this browser; projects.list lists them`, {
        id
      });
    }
    leaving(id);
    return openPage(id, navigate);
  },
  "projects.create": async ({ repository = sharedRepository, navigate }, { name, kind }) => {
    leaving();
    const projects = await repository();
    const taken = new Set((await projects.list()).map(summary => summary.id));
    const names = { state: i18n.t("projects:new.firstState"), end: i18n.t("projects:new.end") };
    const saved = await projects.save(newProject({ name, kind, names }, taken), { thumbnail: true });
    return openPage(saved.summary.id, navigate);
  },
  "projects.import": async ({ repository = sharedRepository, navigate }, { text, path }) => {
    noPath(path);
    busy();
    const projects = await repository();
    const plan = await readImport(text, { fileName: "import.sttw", loadLocal: id => projects.load(id) });
    if (plan.status === "invalid") {
      throw new AgentError(
        "SCHEMA",
        `Not a valid Statewright document: ${plan.errors[0].path || "/"} ${plan.errors[0].message}`,
        {
          errors: plan.errors
        }
      );
    }
    if (plan.status === "review") {
      // A document changed outside Statewright, or other than this browser's copy: the person reviews it (Editor spec
      // §4.5), not an agent.
      throw new AgentError(
        "FILE",
        "This document was changed outside Statewright, or differs from the copy in this browser: the person reviews it in the Editor (Open file…)",
        { review: true, sections: plan.sections ?? null }
      );
    }
    leaving(plan.doc.project.id);
    if (!plan.existing) await projects.save(plan.doc, { thumbnail: true });
    return openPage(plan.doc.project.id, navigate);
  }
};
