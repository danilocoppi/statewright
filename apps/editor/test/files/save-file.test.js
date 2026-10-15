import { parse, verify } from "statewright";
import { describe, expect, it, vi } from "vitest";

import { slug } from "@/files/names";
import { FILE_TYPES, documentFileName, pickFile, saveToFile } from "@/files/save-file";

import { demoDoc, readExample } from "../fixtures.js";

/** A fake FileSystemFileHandle that records what is written. */
function fakeHandle({ permission = "granted", granted = permission, fail = false } = {}) {
  const handle = {
    written: null,
    queryPermission: vi.fn(async () => permission),
    requestPermission: vi.fn(async () => granted),
    createWritable: vi.fn(async () => {
      if (fail) throw new DOMException("The file was moved", "NotFoundError");
      return { write: async text => (handle.written = text), close: async () => {} };
    })
  };
  return handle;
}

describe("slug and file names", () => {
  it("names file types the way Chrome's pickers accept, so Open file and Save to file can open them", () => {
    // Chrome refuses an extension longer than 16 characters, or one that is not a dot and letters or digits.
    const extensions = FILE_TYPES.flatMap(type => Object.values(type.accept).flat());
    expect(extensions.length).toBeGreaterThan(0);
    for (const extension of extensions) expect(extension).toMatch(/^\.[A-Za-z0-9.]{1,15}$/);
  });

  it("makes safe, readable file names from any project name", () => {
    expect(slug("Get paid / v2 – ü")).toBe("get-paid-v2-u");
    expect(slug("  Pagamentos à vista  ")).toBe("pagamentos-a-vista");
    expect(slug("日本語")).toBe("project");
    expect(slug("")).toBe("project");
    expect(slug("x".repeat(80))).toHaveLength(60);
    expect(documentFileName(readExample("get-paid-as-built"))).toBe("get-paid-as-built.statewright.json");
  });
});

describe("saveToFile", () => {
  it("writes a signed document to the file it already has", async () => {
    const handle = fakeHandle();
    const result = await saveToFile(demoDoc(), { handle, env: {} });
    expect(result).toEqual({ method: "file", handle });
    const saved = parse(handle.written);
    expect(saved.ok).toBe(true);
    expect(await verify(saved.doc)).toEqual({ content: "ok", annotations: "ok", layout: "ok" });
  });

  it("asks for permission again, and downloads when it is refused", async () => {
    const handle = fakeHandle({ permission: "prompt", granted: "denied" });
    const download = vi.fn();
    const result = await saveToFile(demoDoc(), { handle, env: {}, download });
    expect(handle.requestPermission).toHaveBeenCalled();
    expect(result).toEqual({ method: "download", reason: "permission" });
    expect(download).toHaveBeenCalledWith(
      "demo.statewright.json",
      expect.stringContaining('"prj_demo"'),
      "application/json"
    );
  });

  it("downloads when the file can no longer be written", async () => {
    const download = vi.fn();
    const result = await saveToFile(demoDoc(), { handle: fakeHandle({ fail: true }), env: {}, download });
    expect(result).toEqual({ method: "download", reason: "permission" });
    expect(download).toHaveBeenCalledOnce();
  });

  it("asks for a location with the picker, and remembers nothing when the person cancels", async () => {
    const picked = fakeHandle();
    const showSaveFilePicker = vi.fn(async () => picked);
    expect(await saveToFile(demoDoc(), { env: { showSaveFilePicker } })).toEqual({ method: "file", handle: picked });
    expect(showSaveFilePicker.mock.calls[0][0].suggestedName).toBe("demo.statewright.json");
    const cancel = vi.fn(async () => {
      throw new DOMException("The user aborted a request.", "AbortError");
    });
    expect(await saveToFile(demoDoc(), { env: { showSaveFilePicker: cancel } })).toEqual({ method: "cancelled" });
  });

  it("asks for a new location for 'Save a copy' even when there is a handle", async () => {
    const picked = fakeHandle();
    const handle = fakeHandle();
    await saveToFile(demoDoc(), { handle, askLocation: true, env: { showSaveFilePicker: async () => picked } });
    expect(handle.written).toBeNull();
    expect(picked.written).toContain('"prj_demo"');
  });

  it("downloads where the browser cannot write files", async () => {
    const download = vi.fn();
    expect(await saveToFile(demoDoc(), { env: {}, download })).toEqual({ method: "download", reason: "unsupported" });
  });
});

describe("pickFile", () => {
  it("returns the file and its handle, or null when cancelled", async () => {
    const file = { name: "a.statewright.json" };
    const handle = { getFile: async () => file };
    expect(await pickFile({ showOpenFilePicker: async () => [handle] })).toEqual({ file, handle });
    const cancel = async () => {
      throw new DOMException("The user aborted a request.", "AbortError");
    };
    expect(await pickFile({ showOpenFilePicker: cancel })).toBeNull();
  });
});
