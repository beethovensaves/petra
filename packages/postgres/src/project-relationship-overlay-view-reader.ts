import { createHash } from "node:crypto";

import type {
  PetraAssertion,
  PetraClaim,
  PetraProjectDefinition,
  PetraProjectRelationshipOverlayView,
  PetraProjectRelationshipView,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
  ProjectRelationshipOverlayCurrentNode,
  ProjectRelationshipOverlayCurrentRelationship,
  ProjectRelationshipOverlayNode,
  ProjectRelationshipOverlayRelationship,
  ProjectRelationshipOverlayViewContent,
  ProjectRelationshipOverlayWorkingNode,
  ProjectRelationshipOverlayWorkingRelationship,
  ProjectWorkingStateSnapshotContent,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  ProjectRelationshipOverlayViewReader,
  ProjectRelationshipViewReader,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresProjectRelationshipOverlayViewErrorCode =
  | "PROJECT_RELATIONSHIP_OVERLAY_AUTHORITY_MISMATCH"
  | "PROJECT_RELATIONSHIP_OVERLAY_BOUND_EXCEEDED"
  | "PROJECT_RELATIONSHIP_OVERLAY_CORRUPT"
  | "PROJECT_RELATIONSHIP_OVERLAY_DEFINITION_MISMATCH"
  | "PROJECT_RELATIONSHIP_OVERLAY_ENDPOINT_INVALID"
  | "PROJECT_RELATIONSHIP_OVERLAY_PROFILE_UNSUPPORTED"
  | "PROJECT_RELATIONSHIP_OVERLAY_PROJECTION_MISMATCH";

export class PostgresProjectRelationshipOverlayViewError extends Error {
  readonly code: PostgresProjectRelationshipOverlayViewErrorCode;

  constructor(
    code: PostgresProjectRelationshipOverlayViewErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PostgresProjectRelationshipOverlayViewError";
    this.code = code;
  }
}

interface ContextRow {
  definition_payload: unknown;
  definition_record_hash: string;
  event_position: string;
  stream_revision: string | null;
}

interface WorkingRow {
  payload: unknown;
  record_hash: string;
}

interface EvidenceRow {
  evidence_kind: string;
  payload: unknown;
  record_hash: string;
}

interface CandidateRecord {
  record: PetraWorkingCandidate;
  recordHash: string;
  profile: PetraClaim;
}

interface RelationshipRecord {
  record: PetraWorkingRelationship;
  recordHash: string;
  profile: PetraAssertion;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

const sameAuthorityPosition = (
  left: { readonly event_position: number; readonly stream_revision: number },
  right: { readonly event_position: number; readonly stream_revision: number },
): boolean =>
  left.event_position === right.event_position &&
  left.stream_revision === right.stream_revision;

const currentNodeKey = (node: {
  readonly node_ref: {
    readonly record_id: string;
    readonly revision: number;
    readonly record_hash: string;
  };
}): string =>
  `current:${node.node_ref.record_id}:${node.node_ref.revision}:${node.node_ref.record_hash}`;

const workingNodeKey = (
  record: PetraWorkingCandidate,
  recordHash: string,
): string =>
  `working:${record.working_candidate_id}:${record.revision}:${recordHash}`;

const currentRelationshipKey = (relationship: {
  readonly relationship_ref: {
    readonly element_id: string;
    readonly revision: number;
    readonly record_hash: string;
  };
}): string =>
  `current:${relationship.relationship_ref.element_id}:${relationship.relationship_ref.revision}:${relationship.relationship_ref.record_hash}`;

const workingRelationshipKey = (
  record: PetraWorkingRelationship,
  recordHash: string,
): string =>
  `working:${record.working_relationship_id}:${record.revision}:${recordHash}`;

const currentObjectTerm = (
  kind: PetraProjectRelationshipView["content"]["nodes"][number]["object_kind"],
  objectTerm: string,
  sourceTerm: string,
): string =>
  ({
    work: "Work",
    work_version: "Work version",
    claim: objectTerm,
    source_span: `${sourceTerm} passage`,
    artifact: "Artifact",
  })[kind];

const currentRelationshipMeaning = (
  label: string,
  relationClass: "structural" | "provenance" | "representation",
): string => {
  if (relationClass === "representation") {
    return `“${label}” records what one exact source record states; it does not establish the target as true.`;
  }
  if (relationClass === "provenance") {
    return `“${label}” identifies an exact provenance dependency retained by the authoritative record.`;
  }
  return `“${label}” identifies an exact structural relationship between the two authoritative records.`;
};

const producerLabel = (candidate: PetraWorkingCandidate): string => {
  if (candidate.producer.producer_kind === "model") {
    return `Model-produced under ${candidate.producer.model_role_ref.name}@${candidate.producer.model_role_ref.version}`;
  }
  if (candidate.producer.producer_kind === "service") {
    return `Service-produced under ${candidate.producer.service_role_ref.name}@${candidate.producer.service_role_ref.version}`;
  }
  return "Human-produced";
};

const validationSummary = (
  record: PetraWorkingCandidate | PetraWorkingRelationship,
): string => {
  const results = record.validation.results;
  if (record.validation.state === "pending") {
    return "Validation is pending; this does not grant authority.";
  }
  if (record.validation.state === "blocked") {
    const blocked = results.filter(
      (result) => result.outcome === "blocked",
    ).length;
    return `Validation is blocked with ${blocked} blocked ${blocked === 1 ? "result" : "results"}; this does not grant authority.`;
  }
  const counts = new Map<string, number>();
  for (const result of results) {
    counts.set(result.outcome, (counts.get(result.outcome) ?? 0) + 1);
  }
  const detail = ["passed", "warning", "failed", "blocked"]
    .flatMap((outcome) => {
      const count = counts.get(outcome) ?? 0;
      return count === 0 ? [] : [`${count} ${outcome}`];
    })
    .join(", ");
  return `Validation completed${detail === "" ? "" : `: ${detail}`}; validation does not grant authority.`;
};

const basisSummary = (
  record: PetraWorkingCandidate | PetraWorkingRelationship,
): string => record.basis.map((item) => item.summary).join(" ");

export class PostgresProjectRelationshipOverlayViewReader implements ProjectRelationshipOverlayViewReader {
  readonly #pool: Pool;
  readonly #authoritative: ProjectRelationshipViewReader;
  readonly #contracts: PetraContractRegistry;

  constructor(
    pool: Pool,
    authoritative: ProjectRelationshipViewReader,
    contracts = new PetraContractRegistry(),
  ) {
    this.#pool = pool;
    this.#authoritative = authoritative;
    this.#contracts = contracts;
  }

  async getProjectRelationshipOverlayView(
    projectId: string,
  ): Promise<PetraProjectRelationshipOverlayView | undefined> {
    const authoritative =
      await this.#authoritative.getProjectRelationshipView(projectId);
    if (authoritative === undefined) return undefined;
    this.#contracts.assertValid(
      "project-relationship-view",
      "1.0.0",
      authoritative,
    );
    if (
      authoritative.project_id !== projectId ||
      authoritative.content_hash !== canonicalHash(authoritative.content)
    ) {
      throw this.#corrupt(
        "The authoritative relationship source view does not preserve its exact Project and content hash.",
      );
    }

    return this.#readTransaction(async (client, readAt) => {
      const context = await this.#context(client, projectId);
      if (context === undefined) return undefined;
      const definition = this.#storedRecord<PetraProjectDefinition>(
        "project-definition",
        context.definition_payload,
        context.definition_record_hash,
      );
      if (
        definition.project_id !== projectId ||
        definition.content_hash !== canonicalHash(definition.content)
      ) {
        throw this.#corrupt(
          "The current ProjectDefinition is corrupt or belongs to another Project.",
        );
      }
      this.#assertScientificProfile(definition);
      this.#assertDefinitionAlignment(authoritative, definition);

      const authority = {
        event_position: Number(context.event_position),
        stream_revision: Number(context.stream_revision ?? 0),
      };
      if (
        !sameAuthorityPosition(
          authoritative.content.position.authority,
          authority,
        )
      ) {
        throw new PostgresProjectRelationshipOverlayViewError(
          "PROJECT_RELATIONSHIP_OVERLAY_AUTHORITY_MISMATCH",
          "The authoritative path and working state no longer share one exact authority position.",
        );
      }
      this.#assertProjectionAlignment(authoritative);

      const currentCandidates = await this.#currentCandidates(
        client,
        projectId,
        definition,
      );
      const currentRelationships = await this.#currentRelationships(
        client,
        projectId,
        definition,
      );
      const snapshotContent: ProjectWorkingStateSnapshotContent = {
        project_definition_ref: {
          project_definition_id: definition.project_definition_id,
          revision: definition.revision,
          content_hash: definition.content_hash,
          definition_family: definition.definition_family,
        },
        authority: {
          isolation: "repeatable_read",
          ...authority,
        },
        selection_boundary: {
          selection_kind: "current_working_heads",
          historical_working_revisions_included: false,
          authoritative_records_included: false,
          graph_overlay_composed: false,
        },
        candidates: currentCandidates.map(({ record }) => clone(record)),
        relationships: currentRelationships.map(({ record }) => clone(record)),
      };
      this.#contracts.assertValid("project-working-state-snapshot", "1.0.0", {
        schema_name: "petra.project-working-state-snapshot",
        schema_version: "1.0.0",
        project_id: projectId,
        content: snapshotContent,
        content_hash: canonicalHash(snapshotContent),
        read_at: readAt,
      });

      const objectTerm = this.#term(definition, "scientific.claim");
      const relationshipTerm = this.#term(definition, "scientific.assertion");
      const sourceTerm = this.#term(definition, "scientific.literature");
      const authoritativeNodes = authoritative.content.nodes.map(
        (node): ProjectRelationshipOverlayCurrentNode => ({
          node_key: currentNodeKey(node),
          layer: "current",
          owner: {
            owner_kind: "authoritative_record",
            record_ref: clone(node.node_ref),
          },
          object_kind: node.object_kind,
          object_term: currentObjectTerm(
            node.object_kind,
            objectTerm.singular,
            sourceTerm.singular,
          ),
          label: node.label,
          summary: node.summary,
          basis: node.basis,
          lifecycle: "represented",
          ...(node.source_destination === undefined
            ? {}
            : { source_destination: clone(node.source_destination) }),
        }),
      );
      const currentNodeById = new Map(
        authoritative.content.nodes.map((node, index) => [
          node.node_ref.record_id,
          authoritativeNodes[index]!,
        ]),
      );
      const authoritativeRelationships =
        authoritative.content.relationships.map(
          (relationship): ProjectRelationshipOverlayCurrentRelationship => {
            const source = currentNodeById.get(relationship.source_id);
            const target = currentNodeById.get(relationship.target_id);
            if (source === undefined || target === undefined) {
              throw this.#corrupt(
                "An authoritative relationship lost a returned endpoint during overlay composition.",
              );
            }
            return {
              relationship_key: currentRelationshipKey(relationship),
              layer: "current",
              owner: {
                owner_kind: "authoritative_relationship",
                relationship_ref: clone(relationship.relationship_ref),
              },
              source_node_key: source.node_key,
              target_node_key: target.node_key,
              direction: "outgoing",
              relation_class: relationship.relation_class,
              label: relationship.label,
              summary: relationship.summary,
              meaning: currentRelationshipMeaning(
                relationship.label,
                relationship.relation_class,
              ),
              scope: authoritative.content.completeness.scope,
              basis: relationship.basis,
            };
          },
        );

      const candidateHeadById = new Map(
        currentCandidates.map((candidate) => [
          candidate.record.working_candidate_id,
          candidate,
        ]),
      );
      const selectedCandidates = new Map<string, CandidateRecord>();
      const selectedRelationships: RelationshipRecord[] = [];
      let excludedRelationships = 0;
      for (const relationship of currentRelationships) {
        const record = relationship.record;
        if (
          record.endpoints.subject.endpoint_kind !== "profile_record" ||
          record.endpoints.object.endpoint_kind !== "working_candidate"
        ) {
          throw new PostgresProjectRelationshipOverlayViewError(
            "PROJECT_RELATIONSHIP_OVERLAY_ENDPOINT_INVALID",
            "The registered scientific overlay requires a profile-record subject and an exact WorkingCandidate object.",
          );
        }
        const source = currentNodeById.get(
          record.endpoints.subject.record_ref.record_id,
        );
        if (
          source === undefined ||
          source.owner.record_ref.revision !==
            record.endpoints.subject.record_ref.revision ||
          source.owner.record_ref.record_hash !==
            record.endpoints.subject.record_ref.record_hash
        ) {
          excludedRelationships += 1;
          continue;
        }
        const referenced = await this.#candidateRevision(
          client,
          projectId,
          record.endpoints.object.candidate_ref.working_candidate_id,
          record.endpoints.object.candidate_ref.revision,
          definition,
        );
        if (
          referenced.record.content_hash !==
          record.endpoints.object.candidate_ref.content_hash
        ) {
          throw new PostgresProjectRelationshipOverlayViewError(
            "PROJECT_RELATIONSHIP_OVERLAY_ENDPOINT_INVALID",
            "A working relationship candidate endpoint does not resolve to its exact content hash.",
          );
        }
        const head = candidateHeadById.get(
          referenced.record.working_candidate_id,
        );
        if (head === undefined) {
          throw new PostgresProjectRelationshipOverlayViewError(
            "PROJECT_RELATIONSHIP_OVERLAY_ENDPOINT_INVALID",
            "A referenced WorkingCandidate has no current head in this Project.",
          );
        }
        this.#assertRelationshipEndpoints(
          relationship,
          referenced,
          record.endpoints.subject.record_ref.record_id,
        );
        selectedCandidates.set(
          `${referenced.record.working_candidate_id}:${referenced.record.revision}`,
          referenced,
        );
        selectedCandidates.set(
          `${head.record.working_candidate_id}:${head.record.revision}`,
          head,
        );
        selectedRelationships.push(relationship);
      }

      const workingNodes = [...selectedCandidates.values()]
        .sort(
          (left, right) =>
            left.record.recorded_at.localeCompare(right.record.recorded_at) ||
            left.record.working_candidate_id.localeCompare(
              right.record.working_candidate_id,
            ) ||
            left.record.revision - right.record.revision,
        )
        .map((candidate): ProjectRelationshipOverlayWorkingNode => {
          const head = candidateHeadById.get(
            candidate.record.working_candidate_id,
          );
          if (head === undefined) {
            throw this.#corrupt(
              "A returned working candidate revision lost its current head.",
            );
          }
          const endpointPosture =
            head.record.revision === candidate.record.revision &&
            head.recordHash === candidate.recordHash
              ? "current_working_head"
              : "non_current_working_endpoint";
          return {
            node_key: workingNodeKey(candidate.record, candidate.recordHash),
            layer: "working",
            owner: {
              owner_kind: "working_candidate",
              working_candidate_ref: {
                working_candidate_id: candidate.record.working_candidate_id,
                revision: candidate.record.revision,
                content_hash: candidate.record.content_hash,
                record_hash: candidate.recordHash,
              },
            },
            profile_record_ref: {
              record_id:
                candidate.record.profile_object.object_record_ref.record_id,
              revision:
                candidate.record.profile_object.object_record_ref.revision,
              record_hash:
                candidate.record.profile_object.object_record_ref.record_hash,
            },
            object_term: objectTerm.singular,
            label: candidate.profile.canonical_text,
            summary: `${producerLabel(candidate.record)} ${candidate.record.profile_object.candidate_operation} ${objectTerm.singular} revision ${candidate.record.revision}. ${endpointPosture === "current_working_head" ? "This is the current working head." : "This earlier working revision remains the exact endpoint of a current WorkingRelationship and is not the current working head."}`,
            basis: basisSummary(candidate.record),
            validation_summary: validationSummary(candidate.record),
            endpoint_posture: endpointPosture,
            working_record: clone(candidate.record),
          };
        });
      const workingNodeByRevision = new Map(
        workingNodes.map((node) => [
          `${node.owner.working_candidate_ref.working_candidate_id}:${node.owner.working_candidate_ref.revision}`,
          node,
        ]),
      );
      const workingRelationships = selectedRelationships.map(
        (relationship): ProjectRelationshipOverlayWorkingRelationship => {
          const record = relationship.record;
          if (
            record.endpoints.subject.endpoint_kind !== "profile_record" ||
            record.endpoints.object.endpoint_kind !== "working_candidate"
          ) {
            throw this.#corrupt(
              "A selected relationship changed endpoint shape during composition.",
            );
          }
          const source = currentNodeById.get(
            record.endpoints.subject.record_ref.record_id,
          );
          const target = workingNodeByRevision.get(
            `${record.endpoints.object.candidate_ref.working_candidate_id}:${record.endpoints.object.candidate_ref.revision}`,
          );
          if (source === undefined || target === undefined) {
            throw this.#corrupt(
              "A selected working relationship lost an exact endpoint during composition.",
            );
          }
          return {
            relationship_key: workingRelationshipKey(
              record,
              relationship.recordHash,
            ),
            layer: "working",
            owner: {
              owner_kind: "working_relationship",
              working_relationship_ref: {
                working_relationship_id: record.working_relationship_id,
                revision: record.revision,
                content_hash: record.content_hash,
                record_hash: relationship.recordHash,
              },
            },
            profile_record_ref: {
              record_id:
                record.profile_relationship.relationship_record_ref.record_id,
              revision:
                record.profile_relationship.relationship_record_ref.revision,
              record_hash:
                record.profile_relationship.relationship_record_ref.record_hash,
            },
            source_node_key: source.node_key,
            target_node_key: target.node_key,
            target_endpoint_posture: target.endpoint_posture,
            direction: "outgoing",
            relation_class: "representation",
            relationship_term: relationshipTerm.singular,
            label: "asserts",
            summary: `This exact working ${relationshipTerm.singular} connects “${source.label}” to the referenced ${objectTerm.singular} revision without rebinding it to another working revision.`,
            meaning: `The exact source Work version states the candidate ${objectTerm.singular}; this records source representation, not truth, approval, or authority. ${relationshipTerm.definition}`,
            scope: `Bound to snapshot ${record.input_snapshot.snapshot_ref.snapshot_id} revision ${record.input_snapshot.snapshot_ref.revision} at authority event ${record.input_snapshot.snapshot_ref.event_position}.`,
            basis: basisSummary(record),
            validation_summary: validationSummary(record),
            working_record: clone(record),
          };
        },
      );

      const nodes: [
        ProjectRelationshipOverlayNode,
        ...ProjectRelationshipOverlayNode[],
      ] = [
        authoritativeNodes[0]!,
        ...authoritativeNodes.slice(1),
        ...workingNodes,
      ];
      const relationships: [
        ProjectRelationshipOverlayRelationship,
        ...ProjectRelationshipOverlayRelationship[],
      ] = [
        authoritativeRelationships[0]!,
        ...authoritativeRelationships.slice(1),
        ...workingRelationships,
      ];
      const nodeByKey = new Map(nodes.map((node) => [node.node_key, node]));
      const omissions: [string, ...string[]] = [
        "Historical authoritative state, whole-Project traversal, expansion, continuation, and comparison selection are not included.",
        "Working candidates that are not endpoints of a current working relationship on the selected authoritative path are counted but not returned.",
      ];
      const queryInput = {
        query_kind: "scientific_provenance_working_overlay" as const,
        question: authoritative.content.query.question,
        scope: `${authoritative.content.query.scope} Relevant current working relationships are included only when their exact profile-record subject is on that authoritative path.`,
        authoritative_focus_ref: clone(authoritative.content.query.focus_ref),
        maximum_authoritative_depth: 3 as const,
        working_selection:
          "current_relationship_heads_on_authoritative_path_with_exact_candidate_endpoints" as const,
      };
      const profileDefinitionRef = {
        project_definition_id: definition.project_definition_id,
        revision: definition.revision,
        content_hash: definition.content_hash,
        record_hash: context.definition_record_hash,
        definition_family: definition.definition_family,
      };
      const content: ProjectRelationshipOverlayViewContent = {
        query: {
          request_hash: canonicalHash(queryInput),
          ...queryInput,
        },
        profile: {
          project_definition_ref: clone(profileDefinitionRef),
          label: definition.content.label,
          object_term: this.#viewTerm(objectTerm),
          relationship_term: this.#viewTerm(relationshipTerm),
          source_term: this.#viewTerm(sourceTerm),
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
            authority: clone(authoritative.content.position.authority),
            projection: clone(authoritative.content.position.projection),
          },
          working: {
            snapshot_ref: {
              schema_name: "petra.project-working-state-snapshot",
              schema_version: "1.0.0",
              content_hash: canonicalHash(snapshotContent),
              read_at: readAt,
            },
            base_authority: clone(authority),
            project_definition_ref: clone(profileDefinitionRef),
            selection_kind:
              "current_heads_plus_exact_referenced_working_revisions",
            historical_working_revisions_included: "referenced_only",
            authoritative_records_included: false,
          },
        },
        nodes,
        relationships,
        completeness: {
          state:
            "complete_for_selected_authoritative_path_and_relevant_working_heads",
          scope:
            "Complete for every current authoritative node and relationship in the source provenance path, every current working relationship whose exact subject is on that path, its exact candidate endpoint revision, and that candidate identity's current head.",
          authoritative_nodes: authoritativeNodes.length,
          authoritative_relationships: authoritativeRelationships.length,
          current_working_candidate_heads: currentCandidates.length,
          current_working_relationship_heads: currentRelationships.length,
          returned_working_candidate_revisions: workingNodes.length,
          returned_working_relationships: workingRelationships.length,
          referenced_non_current_working_candidate_revisions:
            workingNodes.filter(
              (node) =>
                node.endpoint_posture === "non_current_working_endpoint",
            ).length,
          returned_nodes: nodes.length,
          returned_relationships: relationships.length,
          exclusions: [
            {
              member_kind: "working_candidate",
              reason: "not_referenced_by_selected_relationship",
              count:
                currentCandidates.length -
                new Set(
                  workingNodes.map(
                    (node) =>
                      node.owner.working_candidate_ref.working_candidate_id,
                  ),
                ).size,
            },
            {
              member_kind: "working_relationship",
              reason: "outside_authoritative_path",
              count: excludedRelationships,
            },
          ],
          omissions,
        },
        textual_peer: {
          title: `${definition.content.label}: relationship layers`,
          scope:
            "Textual peer for every returned current and working node and relationship; it preserves exact layers and endpoint postures without relying on graph geometry or color.",
          completeness: "complete_for_every_returned_node_and_relationship",
          nodes: nodes.map((node) => ({
            node_key: node.node_key,
            layer: node.layer,
            object_term: node.object_term,
            label: node.label,
            summary: node.summary,
            basis: node.basis,
          })) as ProjectRelationshipOverlayViewContent["textual_peer"]["nodes"],
          relationships: relationships.map((relationship) => {
            const source = nodeByKey.get(relationship.source_node_key);
            const target = nodeByKey.get(relationship.target_node_key);
            if (source === undefined || target === undefined) {
              throw this.#corrupt(
                "A textual relationship peer lost one of its returned endpoint nodes.",
              );
            }
            return {
              relationship_key: relationship.relationship_key,
              layer: relationship.layer,
              source_node_key: source.node_key,
              source_label: source.label,
              direction: "outgoing" as const,
              label: relationship.label,
              target_node_key: target.node_key,
              target_label: target.label,
              summary: relationship.summary,
              meaning: relationship.meaning,
              scope: relationship.scope,
              basis: relationship.basis,
            };
          }) as ProjectRelationshipOverlayViewContent["textual_peer"]["relationships"],
          omissions: clone(omissions),
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
          "This first overlay adapter supports the registered scientific Claim and ASSERTS relationship only; it does not establish paired-profile neutrality.",
          "Working visibility, validation, selection, and graph projection do not grant review, mutation, or domain authority.",
        ],
      };
      const view: PetraProjectRelationshipOverlayView = {
        schema_name: "petra.project-relationship-overlay-view",
        schema_version: "1.0.0",
        project_id: projectId,
        content,
        content_hash: canonicalHash(content),
        read_at: readAt,
      };
      this.#contracts.assertValid(
        "project-relationship-overlay-view",
        "1.0.0",
        view,
      );
      return clone(view);
    });
  }

  async #context(
    client: PoolClient,
    projectId: string,
  ): Promise<ContextRow | undefined> {
    const result = await client.query<ContextRow>(
      `SELECT definition_revision.payload AS definition_payload,
              definition_revision.record_hash AS definition_record_hash,
              authority.event_position::text,
              stream.current_stream_revision::text AS stream_revision
         FROM petra.projects AS project
         JOIN petra.project_definitions AS definition
           ON definition.project_id = project.project_id
         JOIN petra.project_definition_revisions AS definition_revision
           ON definition_revision.project_definition_id =
                definition.project_definition_id
          AND definition_revision.revision = definition.current_revision
         CROSS JOIN petra.authority_positions AS authority
         LEFT JOIN petra.project_event_stream_heads AS stream
           ON stream.project_id = project.project_id
        WHERE project.project_id = $1
          AND authority.singleton`,
      [projectId],
    );
    return result.rows[0];
  }

  async #currentCandidates(
    client: PoolClient,
    projectId: string,
    definition: PetraProjectDefinition,
  ): Promise<CandidateRecord[]> {
    const result = await client.query<WorkingRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.working_candidates AS head
         JOIN petra.working_candidate_revisions AS revision
           ON revision.working_candidate_id = head.working_candidate_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
        ORDER BY revision.recorded_at, revision.working_candidate_id
        LIMIT 1001`,
      [projectId],
    );
    if (result.rows.length > 1000) {
      throw new PostgresProjectRelationshipOverlayViewError(
        "PROJECT_RELATIONSHIP_OVERLAY_BOUND_EXCEEDED",
        "The bounded overlay supports at most 1000 current WorkingCandidate heads.",
      );
    }
    const candidates: CandidateRecord[] = [];
    for (const row of result.rows) {
      candidates.push(await this.#candidateFromRow(client, row, definition));
    }
    return candidates;
  }

  async #currentRelationships(
    client: PoolClient,
    projectId: string,
    definition: PetraProjectDefinition,
  ): Promise<RelationshipRecord[]> {
    const result = await client.query<WorkingRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.working_relationships AS head
         JOIN petra.working_relationship_revisions AS revision
           ON revision.working_relationship_id = head.working_relationship_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
        ORDER BY revision.recorded_at, revision.working_relationship_id
        LIMIT 1001`,
      [projectId],
    );
    if (result.rows.length > 1000) {
      throw new PostgresProjectRelationshipOverlayViewError(
        "PROJECT_RELATIONSHIP_OVERLAY_BOUND_EXCEEDED",
        "The bounded overlay supports at most 1000 current WorkingRelationship heads.",
      );
    }
    const relationships: RelationshipRecord[] = [];
    for (const row of result.rows) {
      relationships.push(
        await this.#relationshipFromRow(client, row, definition),
      );
    }
    return relationships;
  }

  async #candidateRevision(
    client: PoolClient,
    projectId: string,
    workingCandidateId: string,
    revision: number,
    definition: PetraProjectDefinition,
  ): Promise<CandidateRecord> {
    const result = await client.query<WorkingRow>(
      `SELECT payload, record_hash
         FROM petra.working_candidate_revisions
        WHERE project_id = $1
          AND working_candidate_id = $2
          AND revision = $3`,
      [projectId, workingCandidateId, revision],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new PostgresProjectRelationshipOverlayViewError(
        "PROJECT_RELATIONSHIP_OVERLAY_ENDPOINT_INVALID",
        "A current WorkingRelationship references an unavailable WorkingCandidate revision.",
      );
    }
    return this.#candidateFromRow(client, row, definition);
  }

  async #candidateFromRow(
    client: PoolClient,
    row: WorkingRow,
    definition: PetraProjectDefinition,
  ): Promise<CandidateRecord> {
    const record = this.#storedRecord<PetraWorkingCandidate>(
      "working-candidate",
      row.payload,
      row.record_hash,
    );
    this.#assertWorkingDefinition(record, definition);
    this.#assertRegistration(
      definition,
      record.profile_object.registration,
      "object_schema",
      "scientific.claim",
      "petra.claim",
    );
    const profile = await this.#evidenceRecord<PetraClaim>(
      client,
      record.profile_object.object_record_ref,
      "claim",
      "claim",
    );
    if (
      profile.claim_id !== record.profile_object.object_record_ref.record_id ||
      profile.revision !== record.profile_object.object_record_ref.revision ||
      record.validation.target_record_hash !==
        record.profile_object.object_record_ref.record_hash
    ) {
      throw new PostgresProjectRelationshipOverlayViewError(
        "PROJECT_RELATIONSHIP_OVERLAY_ENDPOINT_INVALID",
        "A WorkingCandidate does not preserve its exact Claim and validation target.",
      );
    }
    return { record, recordHash: row.record_hash, profile };
  }

  async #relationshipFromRow(
    client: PoolClient,
    row: WorkingRow,
    definition: PetraProjectDefinition,
  ): Promise<RelationshipRecord> {
    const record = this.#storedRecord<PetraWorkingRelationship>(
      "working-relationship",
      row.payload,
      row.record_hash,
    );
    this.#assertWorkingDefinition(record, definition);
    this.#assertRegistration(
      definition,
      record.profile_relationship.registration,
      "relationship_schema",
      "scientific.assertion",
      "petra.assertion",
    );
    if (record.profile_relationship.predicate !== "ASSERTS") {
      throw new PostgresProjectRelationshipOverlayViewError(
        "PROJECT_RELATIONSHIP_OVERLAY_PROFILE_UNSUPPORTED",
        "The first overlay adapter supports only the registered ASSERTS predicate.",
      );
    }
    const profile = await this.#evidenceRecord<PetraAssertion>(
      client,
      record.profile_relationship.relationship_record_ref,
      "assertion",
      "assertion",
    );
    if (
      profile.assertion_id !==
        record.profile_relationship.relationship_record_ref.record_id ||
      profile.revision !==
        record.profile_relationship.relationship_record_ref.revision ||
      record.validation.target_record_hash !==
        record.profile_relationship.relationship_record_ref.record_hash ||
      profile.predicate !== "ASSERTS"
    ) {
      throw new PostgresProjectRelationshipOverlayViewError(
        "PROJECT_RELATIONSHIP_OVERLAY_ENDPOINT_INVALID",
        "A WorkingRelationship does not preserve its exact ASSERTS profile record and validation target.",
      );
    }
    return { record, recordHash: row.record_hash, profile };
  }

  async #evidenceRecord<RecordType>(
    client: PoolClient,
    ref: {
      readonly record_id: string;
      readonly revision: number;
      readonly record_hash: string;
    },
    evidenceKind: "claim" | "assertion",
    contractName: "claim" | "assertion",
  ): Promise<RecordType> {
    const result = await client.query<EvidenceRow>(
      `SELECT evidence_kind, payload, record_hash
         FROM petra.evidence_entity_revisions
        WHERE evidence_id = $1
          AND revision = $2
          AND record_hash = $3`,
      [ref.record_id, ref.revision, ref.record_hash],
    );
    const row = result.rows[0];
    if (row === undefined || row.evidence_kind !== evidenceKind) {
      throw new PostgresProjectRelationshipOverlayViewError(
        "PROJECT_RELATIONSHIP_OVERLAY_ENDPOINT_INVALID",
        "A working profile record reference does not resolve exactly.",
      );
    }
    return this.#storedRecord<RecordType>(
      contractName,
      row.payload,
      row.record_hash,
    );
  }

  #assertRelationshipEndpoints(
    relationship: RelationshipRecord,
    candidate: CandidateRecord,
    sourceId: string,
  ): void {
    const assertion = relationship.profile;
    if (
      assertion.subject_id !== sourceId ||
      assertion.object.object_kind !== "entity" ||
      assertion.object.entity_id !== candidate.profile.claim_id
    ) {
      throw new PostgresProjectRelationshipOverlayViewError(
        "PROJECT_RELATIONSHIP_OVERLAY_ENDPOINT_INVALID",
        "The exact ASSERTS profile record and WorkingRelationship endpoints disagree.",
      );
    }
  }

  #assertDefinitionAlignment(
    authoritative: PetraProjectRelationshipView,
    definition: PetraProjectDefinition,
  ): void {
    const ref = authoritative.content.profile.project_definition_ref;
    if (
      ref.record_id !== definition.project_definition_id ||
      ref.revision !== definition.revision ||
      ref.content_hash !== definition.content_hash
    ) {
      throw new PostgresProjectRelationshipOverlayViewError(
        "PROJECT_RELATIONSHIP_OVERLAY_DEFINITION_MISMATCH",
        "The authoritative path and working state no longer share one exact current ProjectDefinition.",
      );
    }
  }

  #assertProjectionAlignment(
    authoritative: PetraProjectRelationshipView,
  ): void {
    const projection = authoritative.content.position.projection;
    if (
      projection.represented_event_position >
        authoritative.content.position.authority.event_position ||
      projection.represented_stream_revision >
        authoritative.content.position.authority.stream_revision ||
      projection.observed_event_position >
        authoritative.content.position.authority.event_position ||
      projection.observed_stream_revision >
        authoritative.content.position.authority.stream_revision ||
      projection.represented_target_sequence >
        projection.observed_target_sequence ||
      projection.pending_records !==
        projection.observed_target_sequence -
          projection.represented_target_sequence ||
      (projection.state === "current" && projection.pending_records !== 0)
    ) {
      throw new PostgresProjectRelationshipOverlayViewError(
        "PROJECT_RELATIONSHIP_OVERLAY_PROJECTION_MISMATCH",
        "The source view does not preserve one coherent authoritative graph-projection position.",
      );
    }
  }

  #assertScientificProfile(definition: PetraProjectDefinition): void {
    if (
      definition.definition_family !== "petra.scientific-evidence" ||
      !definition.content.supported_places.includes("graph")
    ) {
      throw new PostgresProjectRelationshipOverlayViewError(
        "PROJECT_RELATIONSHIP_OVERLAY_PROFILE_UNSUPPORTED",
        "The first relationship overlay adapter requires a petra.scientific-evidence definition with the graph place enabled.",
      );
    }
    this.#requireProfileRegistration(
      definition,
      "object_schema",
      "scientific.claim",
      "petra.claim",
    );
    this.#requireProfileRegistration(
      definition,
      "relationship_schema",
      "scientific.assertion",
      "petra.assertion",
    );
    this.#term(definition, "scientific.claim");
    this.#term(definition, "scientific.assertion");
    this.#term(definition, "scientific.literature");
  }

  #requireProfileRegistration(
    definition: PetraProjectDefinition,
    registrationKind: "object_schema" | "relationship_schema",
    semanticKey: string,
    contractName: string,
  ): void {
    const matches = definition.content.registrations.filter(
      (registration) =>
        registration.registration_kind === registrationKind &&
        registration.semantic_key === semanticKey &&
        registration.contract.name === contractName &&
        registration.contract.version === "1.0.0",
    );
    if (matches.length !== 1) {
      throw new PostgresProjectRelationshipOverlayViewError(
        "PROJECT_RELATIONSHIP_OVERLAY_PROFILE_UNSUPPORTED",
        `The ProjectDefinition must register exactly one ${semanticKey} ${contractName}@1.0.0 contract.`,
      );
    }
  }

  #term(
    definition: PetraProjectDefinition,
    semanticKey: string,
  ): PetraProjectDefinition["content"]["terms"][number] {
    const matches = definition.content.terms.filter(
      (term) => term.semantic_key === semanticKey,
    );
    if (matches.length !== 1) {
      throw new PostgresProjectRelationshipOverlayViewError(
        "PROJECT_RELATIONSHIP_OVERLAY_PROFILE_UNSUPPORTED",
        `The ProjectDefinition must supply exactly one ${semanticKey} term.`,
      );
    }
    return matches[0]!;
  }

  #viewTerm(term: PetraProjectDefinition["content"]["terms"][number]): {
    semantic_key: string;
    singular: string;
    plural: string;
    definition: string;
  } {
    return {
      semantic_key: term.semantic_key,
      singular: term.singular,
      plural: term.plural,
      definition: term.definition,
    };
  }

  #assertRegistration(
    definition: PetraProjectDefinition,
    recordRegistration: {
      readonly registration_kind: "object_schema" | "relationship_schema";
      readonly semantic_key: string;
      readonly contract: {
        readonly name: string;
        readonly version: string;
        readonly content_hash: string;
      };
    },
    registrationKind: "object_schema" | "relationship_schema",
    semanticKey: string,
    contractName: string,
  ): void {
    const matches = definition.content.registrations.filter(
      (registration) =>
        registration.registration_kind === registrationKind &&
        registration.semantic_key === semanticKey &&
        registration.contract.name === contractName &&
        registration.contract.version === "1.0.0" &&
        registration.contract.content_hash ===
          recordRegistration.contract.content_hash,
    );
    if (
      matches.length !== 1 ||
      recordRegistration.registration_kind !== registrationKind ||
      recordRegistration.semantic_key !== semanticKey ||
      recordRegistration.contract.name !== contractName ||
      recordRegistration.contract.version !== "1.0.0"
    ) {
      throw new PostgresProjectRelationshipOverlayViewError(
        "PROJECT_RELATIONSHIP_OVERLAY_PROFILE_UNSUPPORTED",
        `The working record does not match the exact registered ${semanticKey} contract.`,
      );
    }
  }

  #assertWorkingDefinition(
    record: PetraWorkingCandidate | PetraWorkingRelationship,
    definition: PetraProjectDefinition,
  ): void {
    if (
      record.project_id !== definition.project_id ||
      record.project_definition_ref.project_definition_id !==
        definition.project_definition_id ||
      record.project_definition_ref.revision !== definition.revision ||
      record.project_definition_ref.content_hash !== definition.content_hash ||
      record.project_definition_ref.definition_family !==
        definition.definition_family
    ) {
      throw new PostgresProjectRelationshipOverlayViewError(
        "PROJECT_RELATIONSHIP_OVERLAY_DEFINITION_MISMATCH",
        "A working revision is not bound to the exact current ProjectDefinition.",
      );
    }
  }

  #storedRecord<RecordType>(
    contractName:
      | "assertion"
      | "claim"
      | "project-definition"
      | "working-candidate"
      | "working-relationship",
    payload: unknown,
    recordHash: string,
  ): RecordType {
    this.#contracts.assertValid(contractName, "1.0.0", payload);
    if (recordHash !== canonicalHash(payload)) {
      throw this.#corrupt(
        `The stored ${contractName} record does not match its exact record hash.`,
      );
    }
    return clone(payload as RecordType);
  }

  async #readTransaction<Value>(
    operation: (client: PoolClient, readAt: string) => Promise<Value>,
  ): Promise<Value> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const timestamp = await client.query<{ read_at: Date }>(
        "SELECT clock_timestamp() AS read_at",
      );
      const result = await operation(
        client,
        timestamp.rows[0]!.read_at.toISOString(),
      );
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  #corrupt(message: string): PostgresProjectRelationshipOverlayViewError {
    return new PostgresProjectRelationshipOverlayViewError(
      "PROJECT_RELATIONSHIP_OVERLAY_CORRUPT",
      message,
    );
  }
}
