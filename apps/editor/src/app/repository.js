import { createContext, use, useContext } from "react";

import { openRepository } from "@/persistence/repository";

/** Lets a subtree use a specific repository (tests use an in-memory one): `<RepositoryContext value={repository}>`. */
export const RepositoryContext = createContext(null);

let shared = null;

/** The app's repository, opened once (IndexedDB, or memory when the browser refuses). */
export const sharedRepository = () => (shared ??= openRepository());

/**
 * The repository for this component; suspends until the shared one is open.
 * @returns {import("@/persistence/repository").Repository}
 */
export function useRepository() {
  return useContext(RepositoryContext) ?? use(sharedRepository());
}
