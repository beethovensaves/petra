import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import type { PetraProjectSemanticGraphView } from "@petra/contracts";
import { NativeMaterialExaminer } from "../src/product/SemanticGraphSurface.js";
import { ExaminationGraph } from "../src/product/ExaminationGraph.js";
import { ProjectCopilotClient } from "@petra/adapters/ag-ui";
import {
  CopilotWorkspaceProvider,
  useCopilotWorkspace,
} from "../src/product/CopilotWorkspace.js";
import "../src/product/copilot.css";
const projectId = new URL(location.href).searchParams.get("project") ?? "";
sessionStorage.setItem("petra.auth.token", "petra-a1-examination-test");
const SharedSceneProbe = (): React.JSX.Element => {
  const workspace = useCopilotWorkspace();
  const binding =
    workspace?.sharedGraph?.status === "ready"
      ? workspace.sharedGraph.binding
      : undefined;
  const signature = JSON.stringify(binding);
  const [result, setResult] = useState<{
    status: string;
    signature?: string;
    error?: string;
  }>({ status: "preparing" });
  useEffect(() => {
    let current = true;
    setResult({ status: "preparing" });
    if (binding !== undefined)
      void new ProjectCopilotClient({
        baseUrl: location.origin,
        token: "petra-a1-examination-test",
      })
        .read(projectId, binding.parameters.selected_keys, binding)
        .then(() => {
          if (current) setResult({ status: "ready", signature });
        })
        .catch((error: unknown) => {
          if (current)
            setResult({
              status: "failed",
              error:
                error instanceof Error
                  ? error.message
                  : "Shared graph read failed",
            });
        });
    return () => {
      current = false;
    };
  }, [signature]);
  return (
    <output
      data-shared-scene-read={
        result.signature === signature ? result.status : "preparing"
      }
      data-shared-binding={signature}
    >
      {result.error}
    </output>
  );
};
const Functions = () => {
  const [graph, setGraph] = useState<PetraProjectSemanticGraphView>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    void fetch(`/api/queries/projects/${projectId}/semantic-graph`, {
      headers: { authorization: "Bearer petra-a1-examination-test" },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("The native graph is unavailable.");
        setGraph((await response.json()) as PetraProjectSemanticGraphView);
      })
      .catch((failure: unknown) =>
        setError(
          failure instanceof Error ? failure.message : "Graph unavailable",
        ),
      );
  }, []);
  const node = graph?.content.nodes.find(
    (entry) =>
      entry.record_ref.schema_name === "petra.claim" &&
      entry.layer === "working",
  );
  return (
    <main>
      <SharedSceneProbe />
      {error === undefined ? null : <p role="alert">{error}</p>}
      {graph === undefined || node === undefined ? (
        <p>Reading exact native material…</p>
      ) : (
        <>
          <NativeMaterialExaminer
            key={node.key}
            node={node}
            projectId={projectId}
            graphHash={graph.content_hash}
          />
          <ExaminationGraph
            projectId={projectId}
            graphHash={graph.content_hash}
          />
        </>
      )}
    </main>
  );
};
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <CopilotWorkspaceProvider>
      <Functions />
    </CopilotWorkspaceProvider>
  </BrowserRouter>,
);
