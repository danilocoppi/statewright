import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { hierarchy } from "statewright";

import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";
import { useEditor } from "@/store/editor";

/** One level and the levels inside it. */
function Branch({ node, depth, onPick }) {
  const { t } = useTranslation(["editor", "projects"]);
  const doc = useEditor(state => state.doc);
  const current = useEditor(state => state.canvasId);
  const canvas = doc.canvases[node.canvas];
  if (!canvas) return null;
  return (
    <li>
      <button
        type="button"
        aria-current={node.canvas === current ? "page" : undefined}
        onClick={() => onPick(node.canvas)}
        style={{ paddingLeft: 10 + depth * 16 }}
        className={cn(
          "flex w-full items-baseline gap-2 rounded-control py-1.5 pr-2.5 text-left hover:bg-subtle",
          node.canvas === current && "bg-subtle font-medium"
        )}
      >
        <span className="truncate">{canvas.name}</span>
        <span className="shrink-0 text-label text-muted">
          {node.cycle ? t("levels.shownAbove") : t(`projects:start.${canvas.kind}`)}
        </span>
      </button>
      {node.children.length > 0 && (
        <ul>
          {node.children.map(child => (
            <Branch key={`${child.via}-${child.canvas}`} node={child} depth={depth + 1} onPick={onPick} />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Every level of the project (spec §6.3, `hierarchy`): the levels from the top, then the flows that implement catalog
 * items and the bodies of definitions. Picking one shows it.
 * @param {{ open: boolean, onClose: () => void, onNavigate: (canvasId: string) => void }} props
 */
export function LevelsDialog({ open, onClose, onNavigate }) {
  const { t } = useTranslation("editor");
  const doc = useEditor(state => state.doc);
  const trees = useMemo(() => hierarchy(doc), [doc]);
  const pick = canvasId => {
    onClose();
    onNavigate(canvasId);
  };
  const sections = [
    { title: null, roots: [trees.root] },
    { title: t("levels.implementations"), roots: trees.catalog },
    { title: t("levels.definitions"), roots: trees.definitions }
  ].filter(section => section.roots.length);

  return (
    <Dialog open={open} onClose={onClose} title={t("levels.title")} className="w-[420px]" testId="levels-dialog">
      <nav aria-label={t("levels.title")} className="-mx-2 max-h-[60vh] overflow-y-auto text-read">
        {sections.map(section => (
          <section key={section.title ?? "levels"} className="mt-2 first:mt-0">
            {section.title && <h3 className="px-2.5 pb-1 pt-2 text-label text-muted">{section.title}</h3>}
            <ul>
              {section.roots.map(root => (
                <Branch key={`${root.via}-${root.canvas}`} node={root} depth={0} onPick={pick} />
              ))}
            </ul>
          </section>
        ))}
      </nav>
    </Dialog>
  );
}
