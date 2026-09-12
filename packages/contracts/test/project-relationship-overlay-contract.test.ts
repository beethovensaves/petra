import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraProjectDefinition,
  PetraProjectRelationshipOverlayView,
  PetraProjectRelationshipView,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
} from "../src/index.js";
import { PetraContractRegistry } from "../src/validator.js";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

const registry = new PetraContractRegistry();

const readFixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(`../fixtures/accepted/${name}.json`, import.meta.url),
      "utf8",
    ),
  ) as Value;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const fixture = (): PetraProjectRelationshipOverlayView => {
  const authoritative = readFixture<PetraProjectRelationshipView>(
    "project-relationship-view",
  );
  const candidate = readFixture<PetraWorkingCandidate>("working-candidate");
  const relationship = readFixture<PetraWorkingRelationship>(
    "working-relationship",
  );
  const definition = readFixture<PetraProjectDefinition>(
    "project-definition-working-scientific",
  );
  const term = (semanticKey: string) => {
    const result = definition.content.terms.find(
      (item) => item.semantic_key === semanticKey,
    );
    if (result === undefined) throw new Error(`Missing ${semanticKey} term.`);
    return {
      semantic_key: result.semantic_key,
      singular: result.singular,
      plural: result.plural,
      definition: result.definition,
    };
  };
  const currentNodes = authoritative.content.nodes.map((node) => ({
    node_key: `current:${node.node_ref.record_id}:${node.node_ref.revision}:${node.node_ref.record_hash}`,
    layer: "current" as const,
    owner: {
      owner_kind: "authoritative_record" as const,
      record_ref: node.node_ref,
    },
    object_kind: node.object_kind,
    object_term:
      node.object_kind === "claim"
        ? "Claim"
        : node.object_kind === "source_span"
          ? "Source passage"
          : node.object_kind.replace("_", " "),
    label: node.label,
    summary: node.summary,
    basis: node.basis,
    lifecycle: "represented" as const,
    ...(node.source_destination === undefined
      ? {}
      : { source_destination: node.source_destination }),
  }));
  const currentById = new Map(
    currentNodes.map((node) => [node.owner.record_ref.record_id, node]),
  );
  const currentRelationships = authoritative.content.relationships.map(
    (item) => ({
      relationship_key: `current:${item.relationship_ref.element_id}:${item.relationship_ref.revision}:${item.relationship_ref.record_hash}`,
      layer: "current" as const,
      owner: {
        owner_kind: "authoritative_relationship" as const,
        relationship_ref: item.relationship_ref,
      },
      source_node_key: currentById.get(item.source_id)!.node_key,
      target_node_key: currentById.get(item.target_id)!.node_key,
      direction: "outgoing" as const,
      relation_class: item.relation_class,
      label: item.label,
      summary: item.summary,
      meaning: "Server-resolved exact relationship meaning.",
      scope: authoritative.content.completeness.scope,
      basis: item.basis,
    }),
  );
  const candidateRecordHash = canonicalHash(candidate);
  const candidateKey = `working:${candidate.working_candidate_id}:${candidate.revision}:${candidateRecordHash}`;
  const workingNode = {
    node_key: candidateKey,
    layer: "working" as const,
    owner: {
      owner_kind: "working_candidate" as const,
      working_candidate_ref: {
        working_candidate_id: candidate.working_candidate_id,
        revision: candidate.revision,
        content_hash: candidate.content_hash,
        record_hash: candidateRecordHash,
      },
    },
    profile_record_ref: {
      record_id: candidate.profile_object.object_record_ref.record_id,
      revision: candidate.profile_object.object_record_ref.revision,
      record_hash: candidate.profile_object.object_record_ref.record_hash,
    },
    object_term: "Claim",
    label: "The study reports a measurable improvement.",
    summary: "Model-produced working Claim revision 1.",
    basis: candidate.basis[0].summary,
    validation_summary:
      "Validation completed: 2 passed; validation does not grant authority.",
    endpoint_posture: "current_working_head" as const,
    working_record: candidate,
  };
  if (relationship.endpoints.subject.endpoint_kind !== "profile_record") {
    throw new Error("Expected a profile-record subject.");
  }
  const source = currentById.get(
    relationship.endpoints.subject.record_ref.record_id,
  );
  if (source === undefined)
    throw new Error("Missing authoritative source node.");
  const relationshipRecordHash = canonicalHash(relationship);
  const workingEdge = {
    relationship_key: `working:${relationship.working_relationship_id}:${relationship.revision}:${relationshipRecordHash}`,
    layer: "working" as const,
    owner: {
      owner_kind: "working_relationship" as const,
      working_relationship_ref: {
        working_relationship_id: relationship.working_relationship_id,
        revision: relationship.revision,
        content_hash: relationship.content_hash,
        record_hash: relationshipRecordHash,
      },
    },
    profile_record_ref: {
      record_id:
        relationship.profile_relationship.relationship_record_ref.record_id,
      revision:
        relationship.profile_relationship.relationship_record_ref.revision,
      record_hash:
        relationship.profile_relationship.relationship_record_ref.record_hash,
    },
    source_node_key: source.node_key,
    target_node_key: candidateKey,
    target_endpoint_posture: "current_working_head" as const,
    direction: "outgoing" as const,
    relation_class: "representation" as const,
    relationship_term: "Evidence relationship",
    label: "asserts",
    summary:
      "The exact working Evidence relationship connects the Work version to the candidate Claim.",
    meaning:
      "This records source representation, not truth, approval, or authority.",
    scope: "Bound to the exact working input snapshot.",
    basis: relationship.basis[0].summary,
    validation_summary:
      "Validation completed: 1 passed; validation does not grant authority.",
    working_record: relationship,
  };
  const nodes = [...currentNodes, workingNode];
  const relationships = [...currentRelationships, workingEdge];
  const nodeByKey = new Map(nodes.map((node) => [node.node_key, node]));
  const omissions = [
    "Historical authoritative state and whole-Project traversal are not included.",
  ] as [string, ...string[]];
  const definitionRef = {
    project_definition_id: definition.project_definition_id,
    revision: definition.revision,
    content_hash: definition.content_hash,
    record_hash: canonicalHash(definition),
    definition_family: definition.definition_family,
  };
  const queryInput = {
    query_kind: "scientific_provenance_working_overlay" as const,
    question: authoritative.content.query.question,
    scope: authoritative.content.query.scope,
    authoritative_focus_ref: authoritative.content.query.focus_ref,
    maximum_authoritative_depth: 3 as const,
    working_selection:
      "current_relationship_heads_on_authoritative_path_with_exact_candidate_endpoints" as const,
  };
  const content: PetraProjectRelationshipOverlayView["content"] = {
    query: { request_hash: canonicalHash(queryInput), ...queryInput },
    profile: {
      project_definition_ref: definitionRef,
      label: definition.content.label,
      object_term: term("scientific.claim"),
      relationship_term: term("scientific.assertion"),
      source_term: term("scientific.literature"),
      layer_labels: {
        current: "Current authority",
        working: "Working — not authoritative",
      },
      endpoint_posture_labels: {
        current_working_head: "Current working revision",
        non_current_working_endpoint:
          "Referenced earlier working revision — not current",
      },
    },
    capabilities: {
      current: "available",
      working: "available",
      historical_authority: "unavailable",
      historical_working_endpoints: "exact_references_only",
      comparison: "unavailable",
      expansion: "unavailable",
      continuation: "unavailable",
      text_peer: "available",
    },
    positions: {
      isolation:
        "repeatable_read_working_with_exact_authoritative_projection_guard",
      authoritative: {
        source_view_ref: {
          schema_name: "petra.project-relationship-view",
          schema_version: "1.0.0",
          content_hash: authoritative.content_hash,
          read_at: authoritative.read_at,
        },
        authority: authoritative.content.position.authority,
        projection: authoritative.content.position.projection,
      },
      working: {
        snapshot_ref: {
          schema_name: "petra.project-working-state-snapshot",
          schema_version: "1.0.0",
          content_hash: `sha256:${"1".repeat(64)}`,
          read_at: "2026-09-12T14:30:00.000Z",
        },
        base_authority: authoritative.content.position.authority,
        project_definition_ref: definitionRef,
        selection_kind: "current_heads_plus_exact_referenced_working_revisions",
        historical_working_revisions_included: "referenced_only",
        authoritative_records_included: false,
      },
    },
    nodes: nodes as PetraProjectRelationshipOverlayView["content"]["nodes"],
    relationships:
      relationships as PetraProjectRelationshipOverlayView["content"]["relationships"],
    completeness: {
      state:
        "complete_for_selected_authoritative_path_and_relevant_working_heads",
      scope:
        "Complete for the selected authoritative path and exact relevant working records.",
      authoritative_nodes: currentNodes.length,
      authoritative_relationships: currentRelationships.length,
      current_working_candidate_heads: 1,
      current_working_relationship_heads: 1,
      returned_working_candidate_revisions: 1,
      returned_working_relationships: 1,
      referenced_non_current_working_candidate_revisions: 0,
      returned_nodes: nodes.length,
      returned_relationships: relationships.length,
      exclusions: [
        {
          member_kind: "working_candidate",
          reason: "not_referenced_by_selected_relationship",
          count: 0,
        },
        {
          member_kind: "working_relationship",
          reason: "outside_authoritative_path",
          count: 0,
        },
      ],
      omissions,
    },
    textual_peer: {
      title: "Scientific evidence inquiry: relationship layers",
      scope: "Textual peer for every returned node and relationship.",
      completeness: "complete_for_every_returned_node_and_relationship",
      nodes: nodes.map((node) => ({
        node_key: node.node_key,
        layer: node.layer,
        object_term: node.object_term,
        label: node.label,
        summary: node.summary,
        basis: node.basis,
      })) as PetraProjectRelationshipOverlayView["content"]["textual_peer"]["nodes"],
      relationships: relationships.map((item) => ({
        relationship_key: item.relationship_key,
        layer: item.layer,
        source_node_key: item.source_node_key,
        source_label: nodeByKey.get(item.source_node_key)!.label,
        direction: "outgoing",
        label: item.label,
        target_node_key: item.target_node_key,
        target_label: nodeByKey.get(item.target_node_key)!.label,
        summary: item.summary,
        meaning: item.meaning,
        scope: item.scope,
        basis: item.basis,
      })) as PetraProjectRelationshipOverlayView["content"]["textual_peer"]["relationships"],
      omissions,
    },
    authority_boundary: {
      working_domain_authority: false,
      working_review_decision: false,
      working_mutation_authority: false,
      validation_grants_authority: false,
      visibility_grants_authority: false,
      selection_grants_authority: false,
      projection_grants_authority: false,
      promotion_requires_review: true,
      layout_client_local: true,
      focus_client_local: true,
      disclosure_client_local: true,
      comparison_selection_client_local: true,
      navigation_history_client_local: true,
    },
    limitations: [
      "The first adapter is limited to one registered scientific profile.",
    ],
  };
  return {
    schema_name: "petra.project-relationship-overlay-view",
    schema_version: "1.0.0",
    project_id: candidate.project_id,
    content,
    content_hash: canonicalHash(content),
    read_at: "2026-09-12T14:30:00.000Z",
  };
};

describe("Project relationship overlay contract", () => {
  it("accepts exact current and working layers with a complete textual peer", () => {
    const view = fixture();
    expect(() =>
      registry.assertValid("project-relationship-overlay-view", "1.0.0", view),
    ).not.toThrow();
    expect(view.content.textual_peer.nodes).toHaveLength(
      view.content.nodes.length,
    );
    expect(view.content.textual_peer.relationships).toHaveLength(
      view.content.relationships.length,
    );
  });

  it("rejects implicit working authority and renderer-owned layout", () => {
    const authority = fixture() as unknown as {
      content: { authority_boundary: { working_domain_authority: boolean } };
    };
    authority.content.authority_boundary.working_domain_authority = true;
    expect(() =>
      registry.assertValid(
        "project-relationship-overlay-view",
        "1.0.0",
        authority,
      ),
    ).toThrow();

    const presentation = fixture() as unknown as {
      content: { nodes: Array<Record<string, unknown>> };
    };
    presentation.content.nodes[0]!.position = { x: 10, y: 10 };
    expect(() =>
      registry.assertValid(
        "project-relationship-overlay-view",
        "1.0.0",
        presentation,
      ),
    ).toThrow();
  });

  it("requires complete textual meaning for returned relationships", () => {
    const view = fixture() as unknown as {
      content: {
        textual_peer: { relationships: Array<Record<string, unknown>> };
      };
    };
    delete view.content.textual_peer.relationships[0]!.meaning;
    expect(() =>
      registry.assertValid("project-relationship-overlay-view", "1.0.0", view),
    ).toThrow();
  });
});
