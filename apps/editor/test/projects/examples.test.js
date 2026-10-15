import { parse } from "statewright";
import { describe, expect, it } from "vitest";

import { EXAMPLES } from "@/features/projects/examples";

describe("the examples on the Projects screen", () => {
  it.each(EXAMPLES.map(example => [example.file, example]))(
    "loads %s, a .sttw of the repository",
    async (_, example) => {
      expect(example.file).toMatch(/^[a-z-]+\.sttw$/);
      const result = parse(await example.load());
      expect(result.ok).toBe(true);
      expect(result.doc.project.id).toBe(example.projectId);
    }
  );
});
