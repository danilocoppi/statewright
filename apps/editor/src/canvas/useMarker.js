import { useProblems } from "@/problems/store";
import { useView } from "@/stores/view";

/**
 * The worst severity of an element's Problems, if markers show it: incomplete ones can be hidden (spec §8.1).
 * @returns {"error" | "warning" | "incomplete" | null}
 */
export function useMarker(element) {
  const severity = useProblems(state => state.byElement.get(element));
  const incomplete = useView(state => state.incomplete);
  return severity === "incomplete" && !incomplete ? null : (severity ?? null);
}
