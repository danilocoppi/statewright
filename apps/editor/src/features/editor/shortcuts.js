// Keyboard shortcuts of the editor shell (spec §7.3). ⌘ on macOS, Ctrl elsewhere.

/** Whether the focus is in a text field, where plain keys and undo belong to the field. */
const typing = target =>
  target instanceof Element && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** Whether the focus is in a dialog, a panel beside the canvas or an open menu: Esc is theirs. */
const inOverlay = target =>
  target instanceof Element && Boolean(target.closest("dialog, [role='dialog'], [role='menu']"));

/**
 * Whether the focus is in a modal dialog or an open menu: every key but save is theirs. A panel beside the canvas (the
 * Problems panel, not modal) keeps the editor's keys.
 */
const inModal = target =>
  target instanceof Element &&
  Boolean(target.closest("dialog, [role='dialog']:not([aria-modal='false']), [role='menu']"));

/** Whether copy and paste belong to where the focus is (a field, a dialog, a panel or a menu), not to the canvas. */
export const ownsClipboard = target => typing(target) || inOverlay(target);

/** Whether the focus is on a box of the canvas. */
const onBox = target => target instanceof Element && Boolean(target.closest(".react-flow__node"));

/** Whether the focus is in a toolbar (the tool dock), whose arrows are its own. */
const inToolbar = target => target instanceof Element && Boolean(target.closest("[role='toolbar']"));

/** Whether the focus is on the page itself or in the canvas, not on a button or a field of the islands. */
const onCanvas = target =>
  target === document.body || (target instanceof Element && Boolean(target.closest(".react-flow")));

/**
 * @typedef {"save" | "saveCopy" | "exportSVG" | "undo" | "redo" | "up" | "selectAll" | "duplicate" | "delete" |
 *   "arrow" | "select" | "menu" | "region" | "rename" | "trigger" | "tool" | "insert" | "layout" | "fit" | "zoomIn" |
 *   "zoomOut" | "inspector" | "catalog" | "palette" | "nextArea" | "previousArea"} Shortcut
 */

/**
 * The editor action a key press asks for, or null.
 * @param {KeyboardEvent} event
 * @param {{ mac: boolean }} platform
 * @returns {Shortcut | null} "up": Esc — clear the selection, or go up one level when nothing is selected (spec
 *   §6.3); "arrow": nudge the selection, or move to a connected box (spec §7.3, §9); "select": Space on a box;
 *   "menu": the canvas's context menu (the menu key, Shift+F10); "region": R, selected states become a region;
 *   "rename": F2, the selected or focused box is renamed in place; "trigger": Enter in the canvas, the selected
 *   edge's trigger editor opens (with no edge selected, Enter on a box opens it); "tool": a letter, the tool with that key on this kind of level (spec §7.1); "insert":
 *   `/`, insert anything by name (spec §7.2); "layout": ⇧A or ⇧L, lay the level out again; "fit": ⇧F or ⇧1;
 *   "zoomIn", "zoomOut": ⌘+ and ⌘− (spec §7.3); "inspector": ⇧I, show or hide the inspector (the level's details with nothing selected);
 *   "catalog": G, the catalog sheet (spec §7.5); "palette": ⌘K, search and commands (spec §7.8), also from a field; "nextArea", "previousArea": F6 and ⇧F6, the focus moves
 *   to the next or previous area of the editor (areas.js), also from a field.
 */
export function shortcutFor(event, { mac }) {
  const command = mac ? event.metaKey : event.ctrlKey;
  const key = event.key.toLowerCase();
  // Save works from anywhere, as from a text field: otherwise the browser offers to save the page.
  if (command && key === "s") return event.shiftKey ? "saveCopy" : "save";
  // Search and commands open from anywhere but a modal dialog or a menu, a field included.
  if (command && !event.shiftKey && key === "k" && !inModal(event.target)) return "palette";
  // F6 moves between the editor's areas from anywhere but a modal dialog or a menu, a field included.
  if (key === "f6" && !event.metaKey && !event.ctrlKey && !event.altKey && !inModal(event.target))
    return event.shiftKey ? "previousArea" : "nextArea";
  if (inModal(event.target) || typing(event.target)) return null;
  if (command && key === "z") return event.shiftKey ? "redo" : "undo";
  if (command && !mac && key === "y") return "redo";
  if (command && !event.shiftKey && key === "a") return "selectAll";
  if (command && !event.shiftKey && key === "d") return "duplicate";
  if (command && (key === "+" || key === "=")) return "zoomIn";
  if (command && (key === "-" || key === "_")) return "zoomOut";
  // Plain keys from here on: any modifier but Shift leaves them to the browser.
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  if (event.shiftKey && key === "e") return "exportSVG";
  // ⇧A and ⇧F are letters for ⇧L and ⇧1, easier to remember: plain A and F are tools' keys.
  if (event.shiftKey && (key === "l" || key === "a")) return "layout";
  if (event.shiftKey && key === "i") return "inspector";
  if (event.shiftKey && (event.code === "Digit1" || key === "f")) return "fit";
  if (key === "contextmenu" || (event.shiftKey && key === "f10")) return inOverlay(event.target) ? null : "menu";
  // Plain keys in the Problems panel are the panel's (its filters use the arrows).
  if (inOverlay(event.target)) return null;
  if (key === "escape") return event.shiftKey ? null : "up";
  if ((key === "delete" || key === "backspace") && !event.shiftKey) return "delete";
  if (key.startsWith("arrow")) return inToolbar(event.target) ? null : "arrow";
  if (key === " " && onBox(event.target)) return "select";
  if (key === "r" && !event.shiftKey) return "region";
  if (key === "f2" && !event.shiftKey) return "rename";
  if (key === "enter" && !event.shiftKey && onCanvas(event.target)) return "trigger";
  if (key === "g" && !event.shiftKey) return "catalog";
  if (/^[a-z]$/.test(key) && !event.shiftKey) return "tool";
  if (key === "/") return "insert";
  return null;
}

/** Whether this is an Apple platform (⌘ instead of Ctrl). */
export const isMac = (navigatorLike = globalThis.navigator) =>
  /Mac|iPhone|iPad/.test(navigatorLike?.userAgentData?.platform ?? navigatorLike?.platform ?? "");
