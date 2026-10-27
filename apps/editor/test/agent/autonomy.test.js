// Working without asking (collaboration spec §7): the person's choice, kept in this browser across pairings.
import { describe, expect, it } from "vitest";

import { AUTONOMY_KEY, createAutonomy } from "@/agent/autonomy";

const memory = () => {
  const items = new Map();
  return { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, String(value)) };
};

describe("working without asking", () => {
  it("is off until the person turns it on, and stays as they left it in this browser", () => {
    const storage = memory();
    const autonomy = createAutonomy({ storage });
    expect(autonomy.getState().on).toBe(false);
    autonomy.getState().set(true);
    expect(storage.getItem(AUTONOMY_KEY)).toBe("on");
    expect(createAutonomy({ storage }).getState().on).toBe(true);
    autonomy.getState().set(false);
    expect(createAutonomy({ storage }).getState().on).toBe(false);
  });

  it("works where the browser keeps nothing", () => {
    const broken = {
      getItem: () => {
        throw new Error("no storage");
      },
      setItem: () => {
        throw new Error("no storage");
      }
    };
    const autonomy = createAutonomy({ storage: broken });
    autonomy.getState().set(true);
    expect(autonomy.getState().on).toBe(true);
  });
});
