// The agent's proposals (collaboration spec §7): batches kept apart until the person accepts — then one change of the
// agent's — or rejects them, and the agent is told either way. They live with the pairing, as does the switch that
// lets the agent delete without asking.
import i18n from "i18next";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import { isSimulating } from "@/simulate/store";
import { editorStore } from "@/store/editor";

/**
 * @typedef {{ id: string, title: string, why?: string, label: string, agent: string | null,
 *   commands: object[], diff: ReturnType<typeof import("./diff").diffOf>, forced?: "deletes" | "locked",
 *   state: "waiting" | "accepted" | "rejected" | "stale", stale?: string }} Proposal
 */

/** Tell the agent, through the pairing (loaded when needed: the pairing loads this store too). */
const tellAgent = async body => (await import("@/agent/connection")).connection.send(body);

/** A store of proposals; the Editor keeps one (`proposalsStore`), tests make their own. */
export function createProposalsStore({ send = tellAgent } = {}) {
  let next = 0;
  return createStore((set, get) => {
    const update = (id, patch) =>
      set(state => ({ list: state.list.map(proposal => (proposal.id === id ? { ...proposal, ...patch } : proposal)) }));
    /** The next proposal waiting, to show once this one is settled. */
    const nextShown = id => {
      const { shown, list } = get();
      if (shown !== id) return shown;
      return list.find(proposal => proposal.id !== id && proposal.state === "waiting")?.id ?? null;
    };
    const answer = (proposal, body) =>
      get()
        .send({ proposal: { id: proposal.id, title: proposal.title, ...body } })
        .catch(() => {});
    return {
      /** @type {Proposal[]} */
      list: [],
      /** @type {string | null} */
      shown: null,
      allowDeletes: false,
      send,
      /** Keep a batch as a proposal: its ID. */
      propose(input) {
        next += 1;
        const id = `prp_${next}`;
        set(state => ({ list: [...state.list, { ...input, id, state: "waiting" }] }));
        return id;
      },
      /**
       * Apply a proposal as the agent's change, to the document as it is now; if it no longer applies, nothing changes
       * and the agent is told.
       * @returns {Promise<{ ok: true } | { ok: false, reason: string, stale?: true }>}
       */
      async accept(id) {
        const proposal = get().list.find(item => item.id === id && item.state === "waiting");
        if (!proposal) return { ok: false, reason: "no such proposal waits" };
        const editor = editorStore.getState();
        if (editor.readOnly) return { ok: false, reason: i18n.t("agent:change.undoReadOnly") };
        if (isSimulating()) return { ok: false, reason: i18n.t("agent:change.undoHeld") };
        const result = editor.dispatch(proposal.commands, {
          label: proposal.title,
          origin: "ai",
          agent: proposal.agent ?? undefined
        });
        if (!result.ok) {
          const stale = result.error.message;
          update(id, { state: "stale", stale });
          set({ shown: nextShown(id) });
          await answer(proposal, { accepted: false, stale });
          return { ok: false, reason: stale, stale: true };
        }
        update(id, { state: "accepted" });
        set({ shown: nextShown(id) });
        const { announce } = await import("@/agent/notice");
        announce(editorStore.getState().history.past.at(-1));
        await answer(proposal, { accepted: true });
        return { ok: true };
      },
      /** Reject a proposal, with the person's reason if they gave one. */
      async reject(id, reason) {
        const proposal = get().list.find(item => item.id === id && item.state === "waiting");
        if (!proposal) return;
        update(id, { state: "rejected", ...(reason ? { reason } : {}) });
        set({ shown: nextShown(id) });
        await answer(proposal, { accepted: false, ...(reason ? { reason } : {}) });
      },
      /** Draw a proposal on the canvas, or none. */
      show: id => set({ shown: id }),
      setAllowDeletes: allowDeletes => set({ allowDeletes }),
      /** The pairing ended: no proposals, and the agent may no longer delete without asking. */
      clear: () => {
        next = 0;
        set({ list: [], shown: null, allowDeletes: false });
      }
    };
  });
}

export const proposalsStore = createProposalsStore();

/** Read the proposals in a component. */
export const useProposals = selector => useStore(proposalsStore, selector);
