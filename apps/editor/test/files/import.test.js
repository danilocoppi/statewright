import { sign } from "statewright";
import { describe, expect, it } from "vitest";

import { copyOf, readImport, sameDocument } from "@/files/import";
import { memoryRepository } from "@/persistence/repository";

import { exampleText, readExample } from "../fixtures.js";

/** The example's file text after a hand edit (its signature no longer matches). */
function edited(name, edit) {
  const raw = JSON.parse(exampleText(name));
  edit(raw);
  return JSON.stringify(raw, null, 2);
}

const noLocal = async () => null;
const read = (text, loadLocal = noLocal) => readImport(text, { fileName: "file.sttw", loadLocal });

describe("readImport", () => {
  it("refuses a file that is not JSON, such as an image, and imports nothing", async () => {
    const plan = await read("\u0089PNG\r\n\u001a\n\u0000\u0000binary");
    expect(plan.status).toBe("invalid");
    expect(plan.errors[0]).toMatchObject({ path: "" });
    expect(plan.errors[0].message).toMatch(/Invalid JSON/);
  });

  it("takes a copy in this browser that cannot be read for no copy, so the file replaces it", async () => {
    const damaged = async id => {
      throw new Error(`The stored copy of ${id} is damaged`);
    };
    expect(await read(exampleText("get-paid-as-built"), damaged)).toMatchObject({
      status: "open",
      existing: false,
      damaged: true
    });
  });

  it("refuses JSON that is not a Statewright document, listing the errors by path", async () => {
    const plan = await read(JSON.stringify({ hello: "world" }));
    expect(plan.status).toBe("invalid");
    expect(plan.errors.map(error => error.path)).toContain("/statewright");
  });

  it("refuses a document from a newer format, saying so", async () => {
    const plan = await read(edited("payments", raw => (raw.statewright = "2.0")));
    expect(plan.status).toBe("invalid");
    expect(plan.errors[0].message).toMatch(/upgrade Statewright/);
  });

  it("opens an intact file of a new project directly", async () => {
    const plan = await read(exampleText("payments"));
    expect(plan.status).toBe("open");
    expect(plan.existing).toBe(false);
    expect(plan.doc).toEqual(readExample("payments"));
    expect(plan.migrations).toEqual([]);
  });

  it("opens a file signed in an older format directly, judging it as written, and says it was updated", async () => {
    const old = await sign({ ...readExample("payments"), statewright: "1.0" }, { channel: "cli" });
    const plan = await read(JSON.stringify(old, null, 2));
    expect(plan.status).toBe("open");
    expect(plan.migrations).toEqual(["1.0 → 1.1", "1.1 → 1.2", "1.2 → 1.3"]);
    expect(plan.doc.statewright).toBe("1.3");
  });

  it("opens the local copy directly when the file holds the same document, whoever signed it", async () => {
    const repository = memoryRepository();
    const { doc: local } = await repository.save(readExample("payments"));
    const plan = await read(exampleText("payments"), id => repository.load(id));
    expect(plan.status).toBe("open");
    expect(plan.existing).toBe(true);
    expect(plan.doc).toEqual(local);
  });

  it("asks for a review of a file changed outside Statewright, naming the changed parts", async () => {
    const plan = await read(
      edited("get-paid-as-built", raw => (raw.canvases.cnv_open.nodes.nod_awaitingPayment.name = "waiting"))
    );
    expect(plan.status).toBe("review");
    expect(plan.sections).toEqual({ content: "changed", layout: "ok", annotations: "ok" });
    expect(plan.local).toBeNull();
    expect(plan.diff).toBeNull();
  });

  it("asks for a review of an unsigned file", async () => {
    const plan = await read(edited("payments", raw => delete raw.signature));
    expect(plan.status).toBe("review");
    expect(plan.sections).toEqual({ content: "missing", layout: "missing", annotations: "missing" });
  });

  it("compares a changed file with the local copy, element by element", async () => {
    const repository = memoryRepository();
    await repository.save(readExample("get-paid-as-built"));
    const plan = await read(
      edited("get-paid-as-built", raw => {
        raw.canvases.cnv_open.nodes.nod_awaitingPayment.name = "waiting";
        raw.layout.canvases.cnv_open.nodes.nod_created.x += 40;
      }),
      id => repository.load(id)
    );
    expect(plan.status).toBe("review");
    expect(plan.sections).toMatchObject({ content: "changed", layout: "changed" });
    expect(plan.diff.changes).toEqual([
      { change: "changed", type: "node", id: "nod_awaitingPayment", name: "waiting", canvasName: "Open" }
    ]);
    expect(plan.diff.layout).toBe(1);
  });

  it("asks before replacing a different local copy even when the file is intact", async () => {
    const repository = memoryRepository();
    const local = readExample("payments");
    local.project = { ...local.project, name: "Payments (edited here)" };
    await repository.save(local);
    const plan = await read(exampleText("payments"), id => repository.load(id));
    expect(plan.status).toBe("review");
    expect(plan.sections).toEqual({ content: "ok", layout: "ok", annotations: "ok" });
    expect(plan.diff.changes).toEqual([{ change: "changed", type: "project", id: "prj_payments", name: "Payments" }]);
  });
});

describe("sameDocument", () => {
  it("ignores the signature and the generator but nothing else", async () => {
    const { doc: signed } = await memoryRepository().save(readExample("payments"));
    expect(sameDocument(signed, readExample("payments"))).toBe(true);
    const renamed = { ...signed, project: { ...signed.project, name: "Other" } };
    expect(sameDocument(renamed, readExample("payments"))).toBe(false);
  });
});

describe("copyOf", () => {
  it("gives the copy a new project ID and the given name", () => {
    const copy = copyOf(readExample("payments"), new Set(["prj_payments", "prj_paymentsCopy"]), "Payments (copy)");
    expect(copy.project).toMatchObject({ id: "prj_paymentsCopy2", name: "Payments (copy)" });
    expect(copy.canvases).toEqual(readExample("payments").canvases);
  });
});
