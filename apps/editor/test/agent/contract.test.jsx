// @vitest-environment jsdom
// The contract suite on the Editor's host (AI interface spec §10: "the same scenarios of operations run on the file
// host and on window.statewright … give the same documents and results"), as Core runs it on the file host.
import "../dom.js";
import "../i18n.js";

import { act } from "@testing-library/react";
import { afterEach } from "vitest";

import { createEditorHost } from "@/agent/host";
import { noticeStore } from "@/agent/notice";
import { simulationStore } from "@/simulate/store";
import { editorStore } from "@/store/editor";
import { useToastStore } from "@/stores/toast";

import { describeContract } from "../../../../packages/core/test/agent/suite.js";
import { readExample } from "../fixtures.js";

afterEach(() =>
  act(() => {
    simulationStore.getState().close();
    editorStore.getState().close();
    noticeStore.setState({ marked: null });
    useToastStore.setState({ items: [] });
  })
);

describeContract("the Editor's host", async () => {
  act(() => {
    simulationStore.getState().close();
    editorStore.getState().open(readExample("payments"));
  });
  // The scenario page without the bundled fonts: a test has no server to fetch them from.
  const host = createEditorHost({ fonts: [] });
  return {
    call: (name, args) => act(() => host.call(name, args)),
    document: async () => editorStore.getState().doc
  };
});
