// Short notices. Call from anywhere: toast.success(t("files:saved")), toast.error(message, { action }).
// <Toaster /> (components/ui/Toaster.jsx, mounted once) draws them. Each item:
// { id, tone: "success" | "error" | "info" | "ai", message, lead?, actions: Array<{ label, onClick }> }.
import { create } from "zustand";

export const TOAST_MS = 5000;
let nextId = 0;

export const useToastStore = create()(set => ({
  items: [],
  dismiss: id => set(state => ({ items: state.items.filter(item => item.id !== id) }))
}));

/**
 * @param {"success" | "error" | "info" | "ai"} tone
 * @param {string} message
 * @param {{ action?: { label: string, onClick: () => void }, actions?: Array<{ label: string, onClick: () => void }>,
 *   lead?: string, duration?: number }} [options] `lead`: who the notice is about, before the message ("AI · claude").
 * @returns {number} The toast's ID.
 */
function show(tone, message, { action, actions = action ? [action] : [], lead, duration = TOAST_MS } = {}) {
  const id = ++nextId;
  useToastStore.setState(state => ({ items: [...state.items.slice(-2), { id, tone, message, lead, actions }] }));
  setTimeout(() => useToastStore.getState().dismiss(id), duration);
  return id;
}

export const toast = {
  success: (message, options) => show("success", message, options),
  error: (message, options) => show("error", message, options),
  info: (message, options) => show("info", message, options),
  /** An agent's change (AI interface spec §7.3). */
  ai: (message, options) => show("ai", message, options)
};
