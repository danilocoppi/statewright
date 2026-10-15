// M and ⌘K's "Write to <agent>" put the focus in the conversation's field (collaboration spec §4).

/** Focus the conversation's field, when the bar is shown. @returns {boolean} whether it took the focus */
export function focusConversation(root = document) {
  const field = root.querySelector('[data-testid="conversation-field"]');
  field?.focus();
  return Boolean(field);
}
