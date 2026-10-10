import { useSharedGraphPresentation } from "./shared-graph-presentation.js";
import { cycleGraphColumn } from "@petra/core/graph-presentation";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { PetraProjectExaminationView } from "@petra/contracts";
import { ProjectExaminationClient } from "@petra/adapters";
import { useCopilotWorkspace } from "./CopilotWorkspace.js";
import { ExaminationRecordDetails } from "./HypothesisCycles.js";
type Node = NonNullable<
  PetraProjectExaminationView["scene"]
>["content"]["nodes"][number];
export const ExaminationGraph = ({
  projectId,
  graphHash,
}: {
  projectId: string;
  graphHash: string;
}): React.JSX.Element => {
  const workspace = useCopilotWorkspace();
  const [view, setView] = useState<PetraProjectExaminationView>();
  const [selectedKey, setSelectedKey] = useState<string>();
  const [error, setError] = useState<string>();
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setView(undefined);
    const client = new ProjectExaminationClient({
      baseUrl: location.origin,
      token:
        sessionStorage.getItem("petra.auth.token") ?? "petra-local-development",
    });
    void client
      .read(projectId, 0, abort.signal)
      .then((result) => {
        if (abort.signal.aborted) return;
        if (result.graph.content_hash !== graphHash)
          throw new Error(
            "The examined material changed. Refresh the workspace graph before comparing these cycles.",
          );
        setView(result);
        setError(undefined);
      })
      .catch((failure: unknown) => {
        if (!abort.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "The exact examination graph is unavailable.",
          );
      });
    return () => abort.abort();
  }, [projectId, graphHash, workspace?.contextRevision, reload]);
  const scene = view?.scene;
  const [filterKind, setFilterKind] = useState("");
  const nodes = (scene?.content.nodes ?? []).filter(
    (node) => filterKind === "" || node.kind === filterKind,
  );
  const representedKeys = new Set(nodes.map((node) => node.key));
  const relationships = (scene?.content.relationships ?? []).filter(
    (edge) =>
      representedKeys.has(edge.subject_key) &&
      representedKeys.has(edge.object_key),
  );
  useSharedGraphPresentation(
    scene,
    scene === undefined
      ? undefined
      : {
          renderer: "examination_cycles",
          mode: "graph",
          semantic_content_hash: scene.content_hash,
          selected_keys: selectedKey === undefined ? [] : [selectedKey],
          excluded_kinds: [
            ...new Set(scene.content.nodes.map((node) => node.kind)),
          ].filter((kind) => filterKind !== "" && kind !== filterKind),
        },
  );
  const selected = nodes.find((node) => node.key === selectedKey);
  const record = view?.records.find(
    (entry) =>
      selected?.key ===
      `examination:${"hypothesis_id" in entry ? entry.hypothesis_id : "hypothesis_assessment_id" in entry ? entry.hypothesis_assessment_id : "posture_decision_id" in entry ? entry.posture_decision_id : entry.cycle_disposition_id}@${entry.revision}`,
  );
  const choose = (node: Node) => {
    setSelectedKey(node.key);
    workspace?.focus([node.key]);
  };
  const column = (node: Node) => cycleGraphColumn(node.kind);
  const position = (node: Node) => ({
    x: 95 + column(node) * 185,
    y:
      60 +
      nodes
        .filter((item) => column(item) === column(node))
        .findIndex((item) => item.key === node.key) *
        90,
  });
  const rows = Math.max(
    1,
    ...[0, 1, 2, 3, 4].map(
      (index) => nodes.filter((node) => column(node) === index).length,
    ),
  );
  return (
    <section
      className="examination-graph"
      aria-label="Exact examination lineage graph"
    >
      <p>
        Follow the retained target, examination, posture, obligations, and
        conclusion. Links describe recorded lineage and named evidence. Earlier
        cycles keep their original basis.
      </p>
      {error === undefined ? null : <p role="alert">{error}</p>}
      {view === undefined ? (
        <button type="button" onClick={() => setReload((n) => n + 1)}>
          Read examination graph
        </button>
      ) : (
        <>
          {view.profile === null ? (
            <p>
              This Project has no registered Hypothesis examiner. Its native
              working graph remains available.
            </p>
          ) : null}
          {view.records.length === 0 ? (
            <p>
              No examination cycle has been recorded. Open an available native
              object to frame a Hypothesis and review its examination.
            </p>
          ) : null}
          <label>
            Show kind{" "}
            <select
              aria-label="Filter examination graph kinds"
              value={filterKind}
              onChange={(event) => {
                setFilterKind(event.target.value);
                setSelectedKey(undefined);
                workspace?.focus([]);
              }}
            >
              <option value="">All kinds</option>
              {[
                ...new Set(
                  (scene?.content.nodes ?? []).map((node) => node.kind),
                ),
              ].map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setSelectedKey(undefined);
              workspace?.focus([]);
            }}
          >
            Use whole examination graph with Petra
          </button>
          <div className="examination-graph-scene">
            <svg
              viewBox={`0 0 940 ${Math.max(240, rows * 90 + 50)}`}
              role="group"
              aria-label="Recorded examination lineage and exact references"
            >
              <defs>
                <marker
                  id="examination-arrow"
                  markerWidth="7"
                  markerHeight="7"
                  refX="7"
                  refY="3.5"
                  orient="auto"
                >
                  <path d="M0,0 L7,3.5 L0,7 Z" fill="currentColor" />
                </marker>
              </defs>
              {relationships.map((edge) => {
                const subject = nodes.find(
                  (node) => node.key === edge.subject_key,
                );
                const object = nodes.find(
                  (node) => node.key === edge.object_key,
                );
                if (subject === undefined || object === undefined) return null;
                const from = position(subject),
                  to = position(object);
                return (
                  <g key={edge.key}>
                    <title>
                      {subject.label} → {edge.predicate.replaceAll("_", " ")} →{" "}
                      {object.label}
                    </title>
                    <path
                      d={`M${from.x},${from.y} Q${(from.x + to.x) / 2},${Math.min(from.y, to.y) - 35} ${to.x},${to.y}`}
                      fill="none"
                      stroke="currentColor"
                      opacity="0.3"
                      markerEnd="url(#examination-arrow)"
                    />
                  </g>
                );
              })}
              {nodes.map((node) => {
                const point = position(node);
                return (
                  <g
                    key={node.key}
                    data-cycle-node={node.key}
                    transform={`translate(${point.x},${point.y})`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${node.label}; ${node.state.replaceAll("_", " ")}; revision ${node.record_ref.revision}`}
                    aria-pressed={selectedKey === node.key}
                    onClick={() => choose(node)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        choose(node);
                      }
                    }}
                  >
                    <title>
                      {node.label}; {node.state}; {node.record_ref.record_id}@
                      {node.record_ref.revision}
                    </title>
                    <rect
                      x="-83"
                      y="-27"
                      width="166"
                      height="54"
                      rx="9"
                      fill="var(--petra-bg-surface)"
                      stroke={
                        selectedKey === node.key
                          ? "var(--petra-action-primary)"
                          : "var(--petra-border-strong)"
                      }
                      strokeWidth={selectedKey === node.key ? 2 : 1}
                    />
                    <text textAnchor="middle" fontSize="11">
                      {node.label.length > 25
                        ? `${node.label.slice(0, 24)}…`
                        : node.label}
                    </text>
                    <text textAnchor="middle" y="17" fontSize="9">
                      {node.state.replaceAll("_", " ")}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          {selectedKey !== undefined && selected === undefined ? (
            <p role="status">
              The exact selected cycle is outside this current bounded scene.
              Choose a represented record or read its retained history.
            </p>
          ) : null}
          {selected === undefined ? null : (
            <article aria-label="Selected examination graph record">
              <h3>{selected.label}</h3>
              <p>
                {selected.state.replaceAll("_", " ")}
                {selected.affected_axes.length > 0
                  ? ` · affected dimensions: ${selected.affected_axes.join(", ")}`
                  : ""}
              </p>
              {record === undefined ? (
                <p>
                  This is an exact endpoint reference. Its full record is
                  outside the examination page; it supplies no unexamined
                  evidence.
                </p>
              ) : (
                <ExaminationRecordDetails record={record} />
              )}
              <details>
                <summary>Exact graph identity</summary>
                <pre>{JSON.stringify(selected.record_ref, null, 2)}</pre>
              </details>
              {view.graph.content.nodes.find(
                (node) => node.key === selected.key,
              ) === undefined ? null : (
                <Link
                  to={`/projects/${projectId}/graph?selected=${encodeURIComponent(selected.key)}`}
                >
                  Open this native material
                </Link>
              )}
            </article>
          )}
          <details className="examination-graph-peer">
            <summary>Read all represented objects and paths</summary>
            <ol>
              {nodes.map((node) => (
                <li key={node.key}>
                  <button
                    type="button"
                    aria-pressed={selectedKey === node.key}
                    onClick={() => choose(node)}
                  >
                    {node.label}
                  </button>
                  <p>
                    {node.state.replaceAll("_", " ")} · revision{" "}
                    {node.record_ref.revision}
                  </p>
                </li>
              ))}
            </ol>
            <ul>
              {relationships.map((edge) => (
                <li key={edge.key}>
                  {nodes.find((node) => node.key === edge.subject_key)?.label} →{" "}
                  {edge.predicate.replaceAll("_", " ")} →{" "}
                  {nodes.find((node) => node.key === edge.object_key)?.label}
                </li>
              ))}
            </ul>
          </details>
          <details>
            <summary>Inspect scene scope and examined basis</summary>
            <p>
              {nodes.length} represented objects · {relationships.length} paths
              ·{" "}
              {(scene?.content.omitted_nodes ?? 0) +
                (scene?.content.nodes.length ?? 0) -
                nodes.length}{" "}
              objects and{" "}
              {(scene?.content.omitted_relationships ?? 0) +
                (scene?.content.relationships.length ?? 0) -
                relationships.length}{" "}
              paths omitted by this scene's budgets.
            </p>
            <p>
              {view.has_more
                ? "More retained history exists outside this page."
                : "This page covers the currently retained examination history."}
            </p>
            <p>
              Examined graph: <code>{graphHash}</code>
            </p>
            <p>
              Visible scene: <code>{scene?.content_hash}</code>
            </p>
            <ul>
              {scene?.content.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  );
};
