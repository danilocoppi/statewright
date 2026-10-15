import { useState } from "react";

/**
 * Copy text, and say so for a moment: `copied` is the key of what was just copied, for a second and a half.
 * @returns {{ copied: string | null, copy: (key: string, text: string) => void }}
 */
export function useCopy() {
  const [copied, setCopied] = useState(null);
  const copy = (key, text) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(current => (current === key ? null : current)), 1500);
  };
  return { copied, copy };
}
