import { useSharedGraphPresentation } from "./shared-graph-presentation.js";
import { ExaminationGraph } from "./ExaminationGraph.js";
import { nativeExamination } from "./native-examination-registry.js";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { PetraProjectSemanticGraphView } from "@petra/contracts";
import { useCopilotWorkspace } from "./CopilotWorkspace.js";

type Node = PetraProjectSemanticGraphView["content"]["nodes"][number];
export const NativeMaterialExaminer = ({
  node,
  projectId,
  graphHash,
}: {
  node: Node;
  projectId: string;
  graphHash: string;
}): React.JSX.Element => {
  const examination = nativeExamination({ node, projectId, graphHash });
  return (
    <article
      className="native-material-examiner"
      aria-label={`${node.label} examination`}
    >
      <p className="reference-panel-kicker">
        {node.layer === "working" ? "Working material" : "Referenced record"}
      </p>
      <h2>{node.label}</h2>
      {examination.body}
      {node.material_state === "definition_stale" ? (
        <p role="status">
          This material belongs to an earlier definition basis. Examine its
          retained context before using it in a new decision.
        </p>
      ) : null}
      <p className="copilot-advisory-note">
        A working record and a drawn relationship confer no approval or
        verification.
      </p>
      {node.source_passages === undefined ||
      node.source_passages.length === 0 ? null : (
        <section
          className="native-source-passages"
          aria-label="Exact source passages"
        >
          <h3>Source passages</h3>
          {node.source_passages.map((passage) => {
            const selector = passage.span.selector;
            const quote =
              selector.selector_type === "compound"
                ? selector.components.find(
                    (component) => component.component_kind === "text_quote",
                  )?.quote
                : selector.selector_type === "text_quote"
                  ? selector.quote
                  : undefined;
            const page =
              selector.selector_type === "compound"
                ? selector.components.find(
                    (component) => component.component_kind === "page_region",
                  )?.page_region
                : selector.selector_type === "page_region"
                  ? selector.page_region
                  : undefined;
            return (
              <article key={passage.span.source_span_id}>
                <blockquote>
                  {quote !== undefined
                    ? quote.exact_text
                    : "No textual quotation is represented by this exact selector."}
                </blockquote>
                <p>
                  {page !== undefined ? `Page ${page.page_number} · ` : ""}
                  {passage.span.verification.status.replaceAll("_", " ")}
                </p>
                <Link
                  to={`/projects/${projectId}/sources/${passage.project_source_ref.record_id}`}
                >
                  Open source
                </Link>
                <details>
                  <summary>Passage identity and surrounding context</summary>
                  {quote !== undefined ? (
                    <p>
                      {quote.prefix}
                      <mark>{quote.exact_text}</mark>
                      {quote.suffix}
                    </p>
                  ) : null}
                  <p>
                    {passage.span.source_span_id} · revision{" "}
                    {passage.span.revision}
                  </p>
                  <pre>{JSON.stringify(passage.span.selector, null, 2)}</pre>
                </details>
              </article>
            );
          })}
        </section>
      )}
      {node.remote_context?.permitted === false ? (
        <details>
          <summary>Use in remote conversation</summary>
          <p>{node.remote_context.reason}</p>
        </details>
      ) : null}
      {examination.continuation}
      <details>
        <summary>Inspect exact record</summary>
        <dl>
          <dt>Schema</dt>
          <dd>
            {node.record_ref.schema_name} {node.record_ref.schema_version}
          </dd>
          <dt>Record</dt>
          <dd>{node.record_ref.record_id}</dd>
          <dt>Revision</dt>
          <dd>{node.record_ref.revision}</dd>
          <dt>Hash</dt>
          <dd>
            <code>{node.record_ref.record_hash}</code>
          </dd>
        </dl>
        {node.native_record === undefined ? null : (
          <pre>{JSON.stringify(node.native_record, null, 2)}</pre>
        )}
      </details>
    </article>
  );
};

export const SemanticGraphSurface = ({
  view,
}: {
  view: PetraProjectSemanticGraphView;
}): React.JSX.Element => {
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState<"graph" | "text" | "cycles">("graph");
  const copilot = useCopilotWorkspace();
  const [localKey, setLocalKey] = useState<string>();
  const [filterKind, setFilterKind] = useState("");
  const nodes = view.content.nodes.filter(
    (node) => filterKind === "" || node.semantic_key === filterKind,
  );
  const representedKeys = new Set(nodes.map((node) => node.key));
  const relationships = view.content.relationships.filter(
    (edge) =>
      representedKeys.has(edge.subject_key) &&
      representedKeys.has(edge.object_key),
  );
  const requestedKey = localKey ?? params.get("selected");
  const selected =
    requestedKey === null || requestedKey === undefined
      ? undefined
      : nodes.find((node) => node.key === requestedKey);
  useSharedGraphPresentation(
    mode === "cycles" ? undefined : view,
    mode === "cycles"
      ? undefined
      : {
          renderer: "native_working",
          mode,
          semantic_content_hash: view.content_hash,
          selected_keys: selected === undefined ? [] : [selected.key],
          excluded_kinds: [
            ...new Set(view.content.nodes.map((node) => node.semantic_key)),
          ].filter((kind) => filterKind !== "" && kind !== filterKind),
        },
  );
  const choose = (node: Node): void => {
    setLocalKey(node.key);
    copilot?.focus([node.key]);
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("selected", node.key);
        return next;
      },
      { replace: true },
    );
  };
  const position = (index: number): { x: number; y: number } => ({
    x: 110 + (index % 4) * 220,
    y: 70 + Math.floor(index / 4) * 130,
  });
  const height = Math.max(280, Math.ceil(nodes.length / 4) * 130);
  return (
    <main
      className="reference-surface semantic-graph-surface"
      id="reference-main"
      data-operation-id="graph.open"
    >
      <header className="reference-surface-heading">
        <div>
          <p className="reference-eyebrow">Graph</p>
          <h1>What we are examining</h1>
          <p>
            Current working material and its registered relationships, with
            exact native records available alongside the conversation.
          </p>
        </div>
        <Link to={`/projects/${view.project_id}/graph?query=authority-path`}>
          Open authority path
        </Link>
      </header>
      <div className="semantic-graph-toolbar">
        <button
          type="button"
          aria-pressed={mode === "graph"}
          onClick={() => setMode("graph")}
        >
          Graph
        </button>
        <button
          type="button"
          aria-pressed={mode === "text"}
          onClick={() => setMode("text")}
        >
          Objects and relationships
        </button>
        <button
          type="button"
          aria-pressed={mode === "cycles"}
          onClick={() => {
            setMode("cycles");
            setLocalKey(undefined);
            copilot?.focus([]);
            setParams(
              (current) => {
                const next = new URLSearchParams(current);
                next.delete("selected");
                return next;
              },
              { replace: true },
            );
          }}
        >
          Examination cycles
        </button>
        <button
          type="button"
          onClick={() => {
            setLocalKey(undefined);
            copilot?.focus([]);
            setParams(
              (current) => {
                const next = new URLSearchParams(current);
                next.delete("selected");
                return next;
              },
              { replace: true },
            );
          }}
        >
          Use whole graph with Petra
        </button>
        {mode === "cycles" ? null : (
          <label>
            Show kind{" "}
            <select
              aria-label="Filter native graph kinds"
              value={filterKind}
              onChange={(event) => {
                setFilterKind(event.target.value);
                setLocalKey(undefined);
                copilot?.focus([]);
                setParams(
                  (current) => {
                    const next = new URLSearchParams(current);
                    next.delete("selected");
                    return next;
                  },
                  { replace: true },
                );
              }}
            >
              <option value="">All kinds</option>
              {[
                ...new Set(view.content.nodes.map((node) => node.semantic_key)),
              ].map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>
        )}
        <span>
          {nodes.length} represented objects · {relationships.length} working
          relationships
        </span>
      </div>
      {mode === "cycles" ? (
        <ExaminationGraph
          projectId={view.project_id}
          graphHash={view.content_hash}
        />
      ) : nodes.length === 0 ? (
        <section className="reference-empty">
          <h2>No working material yet</h2>
          <p>
            Ask Petra what to supply or examine first. This registered graph
            will represent the records as they are retained.
          </p>
        </section>
      ) : (
        <div className="semantic-graph-body">
          <section
            aria-label="Bounded working graph"
            className="semantic-graph-scene"
          >
            {mode === "graph" ? (
              <svg
                viewBox={`0 0 880 ${height}`}
                role="group"
                aria-label="Current working material and exact registered endpoint references"
              >
                {relationships.map((edge) => {
                  const subject = nodes.findIndex(
                    (node) => node.key === edge.subject_key,
                  );
                  const target = nodes.findIndex(
                    (node) => node.key === edge.object_key,
                  );
                  const a = position(subject),
                    b = position(target);
                  return (
                    <g key={edge.key}>
                      <line
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke="currentColor"
                        opacity="0.3"
                      />
                      <text
                        x={(a.x + b.x) / 2}
                        y={(a.y + b.y) / 2 - 8}
                        fontSize="10"
                        textAnchor="middle"
                      >
                        {edge.predicate}
                      </text>
                    </g>
                  );
                })}
                {nodes.map((node, index) => {
                  const p = position(index);
                  return (
                    <g
                      key={node.key}
                      role="button"
                      tabIndex={0}
                      aria-label={`Examine ${node.label}: ${node.summary}`}
                      aria-pressed={selected?.key === node.key}
                      data-node-id={node.key}
                      className="semantic-graph-node"
                      transform={`translate(${p.x},${p.y})`}
                      onClick={() => choose(node)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          choose(node);
                        }
                      }}
                    >
                      <rect
                        x="-94"
                        y="-28"
                        width="188"
                        height="56"
                        rx="9"
                        fill="var(--petra-surface-panel)"
                        stroke={
                          selected?.key === node.key
                            ? "var(--petra-action-primary)"
                            : "var(--petra-border-strong)"
                        }
                        strokeWidth={selected?.key === node.key ? 2 : 1}
                      />
                      <text textAnchor="middle" y="-2" fontSize="12">
                        {node.label.length > 25
                          ? `${node.label.slice(0, 24)}…`
                          : node.label}
                      </text>
                      <text textAnchor="middle" y="15" fontSize="9">
                        {node.layer === "working"
                          ? "Working record"
                          : "Endpoint reference"}
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <>
                <ol>
                  {nodes.map((node) => (
                    <li key={node.key}>
                      <button
                        type="button"
                        onClick={() => choose(node)}
                        aria-pressed={selected?.key === node.key}
                      >
                        {node.label}
                      </button>
                      <p>{node.summary}</p>
                    </li>
                  ))}
                </ol>
                <ul>
                  {relationships.map((edge) => (
                    <li key={edge.key}>
                      {
                        nodes.find((node) => node.key === edge.subject_key)
                          ?.label
                      }{" "}
                      → {edge.predicate} →{" "}
                      {
                        nodes.find((node) => node.key === edge.object_key)
                          ?.label
                      }
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
          {selected === undefined &&
          requestedKey !== null &&
          requestedKey !== undefined ? (
            <p role="status">
              The exact selected object is no longer represented by this graph.
              Select a represented object to continue.
            </p>
          ) : null}
          {selected === undefined ? null : (
            <aside id="graph-selection">
              <NativeMaterialExaminer
                node={selected}
                projectId={view.project_id}
                graphHash={view.content_hash}
              />
              <button
                type="button"
                onClick={() => copilot?.focus([selected.key])}
              >
                Use this selection with Petra
              </button>
              <Link to={`/projects/${view.project_id}/review`}>
                Examine in Review →
              </Link>
            </aside>
          )}
        </div>
      )}
      <details className="semantic-graph-legend">
        <summary>Read the legend and visible scope</summary>
        <p>
          Working records remain candidates. Endpoint references carry identity
          without implying inspected evidence. Lines name registered
          relationships; placement establishes no support, causality or
          priority.
        </p>
        <ul>
          {[...new Set(nodes.map((node) => node.semantic_key))].map((kind) => (
            <li key={kind}>{kind}</li>
          ))}
        </ul>
        <p>
          {view.content.omitted_candidates +
            view.content.nodes.length -
            nodes.length}{" "}
          objects and{" "}
          {view.content.omitted_relationships +
            view.content.relationships.length -
            relationships.length}{" "}
          relationships are outside the current display, including the active
          kind filter.
        </p>
      </details>
      <details className="semantic-graph-limits">
        <summary>Query scope and limitations</summary>
        <ul>
          {view.content.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
        <p>
          Definition revision {view.content.definition_ref.revision}; event{" "}
          {view.content.authority.event_position}; stream revision{" "}
          {view.content.authority.stream_revision}.
        </p>
        <code>{view.content_hash}</code>
      </details>
    </main>
  );
};
