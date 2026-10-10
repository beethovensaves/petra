import type { PetraGraphPresentationContext } from "@petra/contracts";
export const GraphPresentationDetails = ({
  scene,
}: {
  scene: PetraGraphPresentationContext;
}): React.JSX.Element => (
  <details className="copilot-shared-scene">
    <summary>Inspect the graph shared with this answer</summary>
    <p>
      {scene.content.parameters.renderer === "native_working"
        ? "Working material"
        : "Examination lineage"}{" "}
      · {scene.content.parameters.mode === "graph" ? "Graph" : "Text view"} ·{" "}
      {scene.content.nodes.length} represented objects ·{" "}
      {scene.content.relationships.length} paths.
    </p>
    <p>
      {scene.content.omitted_nodes} objects and{" "}
      {scene.content.omitted_relationships} paths were outside this display.{" "}
      {scene.content.has_more_history
        ? "More history lies outside this scene."
        : ""}
    </p>
    <p>
      {scene.content.parameters.excluded_kinds.length === 0
        ? "All represented kinds were shown."
        : `Hidden kinds: ${scene.content.parameters.excluded_kinds.join(", ")}.`}
    </p>
    <p>
      Layout records a presentation choice. Placement and adjacency establish no
      support, causality or priority.
    </p>
    <details>
      <summary>Original selection, objects and paths</summary>
      <ul>
        {scene.content.nodes.map((node) => (
          <li key={node.key}>
            {node.kind} · {node.state.replaceAll("_", " ")} ·{" "}
            {node.record_ref.record_id}, revision {node.record_ref.revision}
            {new Set(scene.content.parameters.selected_keys).has(node.key)
              ? " · selected for this question"
              : ""}{" "}
            · position {node.position.x}, {node.position.y}
          </li>
        ))}
      </ul>
      <ul>
        {scene.content.relationships.map((path) => (
          <li key={path.key}>
            {path.subject_key} → {path.predicate.replaceAll("_", " ")} →{" "}
            {path.object_key}
          </li>
        ))}
      </ul>
    </details>
    <details>
      <summary>Exact scene and semantic peer identities</summary>
      <dl>
        <dt>Semantic result</dt>
        <dd>
          <code>{scene.content.parameters.semantic_content_hash}</code>
        </dd>
        <dt>Examined graph</dt>
        <dd>
          <code>{scene.content.graph_content_hash}</code>
        </dd>
        <dt>Display</dt>
        <dd>
          <code>{scene.content_hash}</code>
        </dd>
        <dt>Semantic peer</dt>
        <dd>
          <code>{scene.content.peer_content_hash}</code>
        </dd>
        <dt>Layout</dt>
        <dd>
          {scene.content.layout_version} · {scene.content.viewport.width} ×{" "}
          {scene.content.viewport.height}
        </dd>
      </dl>
    </details>
  </details>
);
