import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Icon } from "@/components/ui/Icon";

const hasFiles = event => [...(event.dataTransfer?.types ?? [])].includes("Files");

/**
 * Accepts a file dropped anywhere on the page (spec §6.2) and shows where it will go while it is dragged. Hands over
 * the first file and, where the browser offers one, its handle (so later saves write back to it).
 * @param {{ onDrop: (file: File, handle?: object) => void }} props
 */
export function DropOverlay({ onDrop }) {
  const { t } = useTranslation("projects");
  const [active, setActive] = useState(false);
  const depth = useRef(0);
  const onDropRef = useRef(onDrop);
  useEffect(() => {
    onDropRef.current = onDrop;
  });

  useEffect(() => {
    const enter = event => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth.current += 1;
      setActive(true);
    };
    const over = event => {
      if (hasFiles(event)) event.preventDefault();
    };
    const leave = event => {
      if (!hasFiles(event)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setActive(false);
    };
    const drop = event => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth.current = 0;
      setActive(false);
      const item = [...event.dataTransfer.items].find(entry => entry.kind === "file");
      const file = item?.getAsFile() ?? event.dataTransfer.files[0];
      if (!file) return;
      const handle = item?.getAsFileSystemHandle?.();
      if (handle)
        handle.then(
          resolved => onDropRef.current(file, resolved),
          () => onDropRef.current(file)
        );
      else onDropRef.current(file);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, []);

  if (!active) return null;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-scrim motion-safe:animate-[fade-in_120ms_ease-out]">
      <div className="pointer-events-none grid place-items-center gap-2 rounded-dialog border-[1.5px] border-dashed border-accent bg-surface px-16 py-12 text-center shadow-dialog">
        <Icon name="upload" size={22} className="text-accent" />
        <p className="text-title font-semibold">{t("drop.title")}</p>
        <p className="text-sub">{t("drop.hint")}</p>
      </div>
    </div>
  );
}
