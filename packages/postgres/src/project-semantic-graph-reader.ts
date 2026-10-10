import type { Pool, PoolClient } from "pg";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  PetraProject,
  PetraProjectDefinition,
  PetraProjectObjective,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
  PetraProjectSemanticGraphView,
  PetraSourceSpan,
  PetraRightsDecision,
  PetraProjectSource,
} from "@petra/contracts";
import { copilotHash, type ProjectSemanticGraphReader } from "@petra/core";

type Content = PetraProjectSemanticGraphView["content"];
type Node = Content["nodes"][number];
type Ref = Node["record_ref"];
type Stored = { payload: unknown; record_hash: string };
const object = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export class PostgresProjectSemanticGraphReader implements ProjectSemanticGraphReader {
  constructor(
    readonly pool: Pool,
    readonly contracts = new PetraContractRegistry(),
  ) {}

  #stored<T>(name: string, row: Stored): T {
    this.contracts.assertValid(name, "1.0.0", row.payload);
    if (copilotHash(row.payload) !== row.record_hash)
      throw new Error("A retained graph record does not match its exact hash.");
    return row.payload as T;
  }

  async #sourceMaterial(
    client: PoolClient,
    candidate: PetraWorkingCandidate,
    native?: Record<string, unknown>,
  ): Promise<Pick<Node, "source_passages" | "remote_context">> {
    const passages: NonNullable<Node["source_passages"]>[number][] = [];
    const rights: Ref[] = [];
    const basis = object(native?.basis);
    const spanIds = Array.isArray(basis.source_span_ids)
      ? basis.source_span_ids.filter(
          (id): id is string => typeof id === "string",
        )
      : [];
    const sourceRefs = candidate.basis
      .filter(
        (entry) => entry.record_ref.schema_name === "petra.project-source",
      )
      .map((entry) => entry.record_ref);
    let permitted = true;
    let resolved = 0;
    for (const id of [...new Set(spanIds)].slice(0, 10)) {
      const result = await client.query<{
        span_payload: PetraSourceSpan;
        span_hash: string;
        source_payload: PetraProjectSource;
        source_hash: string;
        rights_payload: PetraRightsDecision;
        rights_hash: string;
      }>(
        `SELECT span.payload AS span_payload, span.record_hash AS span_hash,
          binding.payload AS source_payload, binding.record_hash AS source_hash,
          rights.payload AS rights_payload, rights.record_hash AS rights_hash
        FROM petra.source_spans span
        JOIN petra.parsed_documents document ON document.parsed_document_id=span.parsed_document_id
        JOIN petra.project_sources source ON source.project_id=$1
        JOIN petra.project_source_revisions binding ON binding.project_source_id=source.project_source_id
          AND binding.revision=source.current_revision AND binding.work_version_id=$3
          AND binding.artifact_manifest_id=document.source_artifact_manifest_id
        JOIN petra.artifact_manifests manifest ON manifest.artifact_manifest_id=binding.artifact_manifest_id
          AND manifest.record_hash=binding.artifact_manifest_record_hash
        JOIN petra.rights_decisions rights ON rights.rights_decision_id=manifest.rights_decision_id
          AND rights.artifact_manifest_id=manifest.artifact_manifest_id
        WHERE span.source_span_id=$2 AND span.revision=1`,
        [candidate.project_id, id, basis.work_version_id],
      );
      if (result.rows.length !== 1) {
        permitted = false;
        continue;
      }
      const row = result.rows[0]!;
      const span = this.#stored<PetraSourceSpan>("source-span", {
        payload: row.span_payload,
        record_hash: row.span_hash,
      });
      const source = this.#stored<PetraProjectSource>("project-source", {
        payload: row.source_payload,
        record_hash: row.source_hash,
      });
      const decision = this.#stored<PetraRightsDecision>("rights-decision", {
        payload: row.rights_payload,
        record_hash: row.rights_hash,
      });
      const rightsRef: Ref = {
        schema_name: decision.schema_name,
        schema_version: decision.schema_version,
        record_id: decision.rights_decision_id,
        revision: decision.revision,
        record_hash: row.rights_hash,
      };
      const allowed =
        source.content.status === "active" &&
        decision.decision_status === "verified" &&
        decision.permissions.send_selected_text_remotely;
      passages.push({
        span,
        project_source_ref: {
          schema_name: source.schema_name,
          schema_version: source.schema_version,
          record_id: source.project_source_id,
          revision: source.revision,
          record_hash: row.source_hash,
        },
        rights_ref: rightsRef,
        remote_permitted: allowed,
      });
      rights.push(rightsRef);
      resolved++;
      permitted &&= allowed;
    }
    for (const ref of sourceRefs.slice(0, 10)) {
      const result = await client.query<{
        source_payload: PetraProjectSource;
        source_hash: string;
        rights_payload: PetraRightsDecision;
        rights_hash: string;
      }>(
        `SELECT binding.payload AS source_payload,binding.record_hash AS source_hash,rights.payload AS rights_payload,rights.record_hash AS rights_hash
        FROM petra.project_sources source JOIN petra.project_source_revisions binding
          ON binding.project_source_id=source.project_source_id AND binding.revision=source.current_revision
        JOIN petra.artifact_manifests manifest ON manifest.artifact_manifest_id=binding.artifact_manifest_id AND manifest.record_hash=binding.artifact_manifest_record_hash
        JOIN petra.rights_decisions rights ON rights.rights_decision_id=manifest.rights_decision_id AND rights.artifact_manifest_id=manifest.artifact_manifest_id
        WHERE source.project_id=$1 AND binding.project_source_id=$2 AND binding.revision=$3 AND binding.record_hash=$4`,
        [candidate.project_id, ref.record_id, ref.revision, ref.record_hash],
      );
      const row = result.rows[0];
      if (row === undefined) {
        permitted = false;
        continue;
      }
      const source = this.#stored<PetraProjectSource>("project-source", {
        payload: row.source_payload,
        record_hash: row.source_hash,
      });
      const decision = this.#stored<PetraRightsDecision>("rights-decision", {
        payload: row.rights_payload,
        record_hash: row.rights_hash,
      });
      permitted &&=
        source.content.status === "active" &&
        decision.decision_status === "verified" &&
        decision.permissions.send_selected_text_remotely;
      rights.push({
        schema_name: decision.schema_name,
        schema_version: decision.schema_version,
        record_id: decision.rights_decision_id,
        revision: decision.revision,
        record_hash: row.rights_hash,
      });
      resolved++;
    }
    if (
      spanIds.length > 10 ||
      sourceRefs.length > 10 ||
      resolved < spanIds.length + sourceRefs.length ||
      native === undefined
    )
      permitted = false;
    // Source-free human material has no artifact egress restriction. Derived
    // source material needs exact current ProjectSource and RightsDecision pins.
    if (native?.schema_name === "petra.assertion" && spanIds.length === 0)
      permitted = false;
    if (
      basis.basis_kind === "synthesis" ||
      (basis.basis_kind === "source" && spanIds.length === 0)
    )
      permitted = false;
    return {
      source_passages: passages as NonNullable<Node["source_passages"]>,
      remote_context: {
        permitted,
        reason: permitted
          ? "All represented source dependencies permit remote selected text, or this is source-free Project-authored material."
          : "Source dependencies are restricted, inactive, unresolved, or exceed this query's budget; native bytes are withheld from the remote copilot.",
        rights_refs: rights.slice(0, 20) as NonNullable<
          Node["remote_context"]
        >["rights_refs"],
      },
    };
  }

  async #native(
    client: PoolClient,
    ref: Ref,
    projectId: string,
  ): Promise<Record<string, unknown> | undefined> {
    let rows: Stored[];
    if (
      ref.schema_name === "petra.claim" ||
      ref.schema_name === "petra.assertion"
    ) {
      rows = (
        await client.query<Stored>(
          `SELECT payload, record_hash FROM petra.evidence_entity_revisions
        WHERE evidence_id=$1 AND revision=$2 AND record_hash=$3 AND evidence_kind=$4`,
          [
            ref.record_id,
            ref.revision,
            ref.record_hash,
            ref.schema_name === "petra.claim" ? "claim" : "assertion",
          ],
        )
      ).rows;
    } else if (ref.schema_name === "petra.controlled-writing-requirement") {
      rows = (
        await client.query<Stored>(
          `SELECT payload, record_hash FROM petra.controlled_writing_requirement_records
        WHERE project_id=$1 AND requirement_id=$2 AND revision=$3 AND record_hash=$4`,
          [projectId, ref.record_id, ref.revision, ref.record_hash],
        )
      ).rows;
    } else return undefined;
    const row = rows[0];
    if (row === undefined)
      throw new Error("The exact native working record is unavailable.");
    this.contracts.assertValid(
      ref.schema_name.replace(/^petra\./u, ""),
      ref.schema_version,
      row.payload,
    );
    if (copilotHash(row.payload) !== ref.record_hash)
      throw new Error("The native record hash is incoherent.");
    const payload = object(row.payload);
    // The full record remains exact. Large material is withheld, never truncated
    // into a different apparent native record.
    return Buffer.byteLength(JSON.stringify(payload), "utf8") <= 24000
      ? payload
      : undefined;
  }

  async getProjectSemanticGraph(
    projectId: string,
  ): Promise<PetraProjectSemanticGraphView | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const view = await this.getProjectSemanticGraphInTransaction(
        client,
        projectId,
      );
      await client.query("COMMIT");
      return view;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  /** The caller owns transaction isolation, locks, commit and rollback. */
  async getProjectSemanticGraphInTransaction(
    client: PoolClient,
    projectId: string,
  ): Promise<PetraProjectSemanticGraphView | undefined> {
    const scope = await client.query<{
      project_payload: PetraProject;
      definition_payload: PetraProjectDefinition;
      definition_hash: string;
      project_hash: string;
    }>(
      `SELECT p.payload AS project_payload, d.payload AS definition_payload, d.record_hash AS definition_hash, p.record_hash AS project_hash
        FROM petra.projects h JOIN petra.project_revisions p ON p.project_id=h.project_id AND p.revision=h.current_revision
        JOIN petra.project_definitions dh ON dh.project_id=h.project_id
        JOIN petra.project_definition_revisions d ON d.project_definition_id=dh.project_definition_id AND d.revision=dh.current_revision
        WHERE h.project_id=$1`,
      [projectId],
    );
    const current = scope.rows[0];
    if (current === undefined) {
      return undefined;
    }
    this.#stored<PetraProject>("project", {
      payload: current.project_payload,
      record_hash: current.project_hash,
    });
    if (current.project_payload.project_id !== projectId)
      throw new Error("The retained Project graph scope is incoherent.");
    const definition = this.#stored<PetraProjectDefinition>(
      "project-definition",
      {
        payload: current.definition_payload,
        record_hash: current.definition_hash,
      },
    );
    const objectiveRow = (
      await client.query<{
        payload: PetraProjectObjective;
        record_hash: string;
        focus_revision: string;
        head_revision: string;
      }>(
        `SELECT r.payload,r.record_hash,f.objective_revision AS focus_revision,h.current_revision AS head_revision FROM petra.project_objective_focus f JOIN petra.project_objectives h ON h.project_id=f.project_id AND h.objective_id=f.objective_id JOIN petra.project_objective_revisions r ON r.project_id=f.project_id AND r.objective_id=f.objective_id AND r.revision=f.objective_revision AND r.content_hash=f.objective_content_hash WHERE f.project_id=$1`,
        [projectId],
      )
    ).rows[0];
    const objective =
      objectiveRow === undefined
        ? undefined
        : this.#stored<PetraProjectObjective>(
            "project-objective",
            objectiveRow,
          );
    if (
      objectiveRow !== undefined &&
      (objectiveRow.focus_revision !== objectiveRow.head_revision ||
        objective?.project_id !== projectId)
    )
      throw new Error(
        "The exact focused outcome has a stale or incoherent Project binding.",
      );
    const position = await client.query<{
      event_position: string;
      stream_revision: string;
    }>(
      `SELECT p.event_position, COALESCE(h.current_stream_revision,0) AS stream_revision
        FROM petra.authority_positions p LEFT JOIN petra.project_event_stream_heads h ON h.project_id=$1 WHERE p.singleton`,
      [projectId],
    );
    const authority = position.rows[0];
    if (authority === undefined)
      throw new Error("Project authority position is unavailable.");
    const candidates = await client.query<Stored & { total_count: string }>(
      `SELECT r.payload,r.record_hash,COUNT(*) OVER() AS total_count FROM petra.working_candidates h
        JOIN petra.working_candidate_revisions r ON r.working_candidate_id=h.working_candidate_id AND r.revision=h.current_revision
        WHERE h.project_id=$1 ORDER BY h.working_candidate_id LIMIT 51`,
      [projectId],
    );
    const relationships = await client.query<Stored & { total_count: string }>(
      `SELECT r.payload,r.record_hash,COUNT(*) OVER() AS total_count FROM petra.working_relationships h
        JOIN petra.working_relationship_revisions r ON r.working_relationship_id=h.working_relationship_id AND r.revision=h.current_revision
        WHERE h.project_id=$1 ORDER BY h.working_relationship_id LIMIT 101`,
      [projectId],
    );
    const nodes: Node[] = [];
    const edges: Content["relationships"] = [];
    const registrations = definition.content.registrations;
    for (const row of candidates.rows.slice(0, 50)) {
      const candidate = this.#stored<PetraWorkingCandidate>(
        "working-candidate",
        row,
      );
      if (candidate.project_id !== projectId)
        throw new Error("A working record crossed its Project boundary.");
      const binding = candidate.profile_object;
      if (
        candidate.validation.target_record_hash !==
        binding.object_record_ref.record_hash
      )
        throw new Error(
          "The candidate validation target does not match its exact native material.",
        );
      const registered = registrations.some(
        (registration) =>
          registration.registration_kind === "object_schema" &&
          registration.semantic_key === binding.registration.semantic_key &&
          copilotHash(registration.contract) ===
            copilotHash(binding.registration.contract),
      );
      const native = registered
        ? await this.#native(client, binding.object_record_ref, projectId)
        : undefined;
      const nativeObject = object(native);
      const nativeContent = object(nativeObject.content);
      const summary = [
        nativeObject.canonical_text,
        nativeContent.statement,
        nativeObject.statement,
        nativeContent.description,
      ].find((value) => typeof value === "string" && value !== "");
      nodes.push({
        key: `${candidate.working_candidate_id}@${candidate.revision}`,
        semantic_key: binding.registration.semantic_key,
        label:
          definition.content.terms.find(
            (term) => term.semantic_key === binding.registration.semantic_key,
          )?.singular ?? binding.registration.semantic_key,
        summary:
          typeof summary === "string"
            ? summary.slice(0, 8000)
            : "An exact working record awaiting examination.",
        layer: "working",
        record_ref: binding.object_record_ref,
        candidate_ref: {
          record_id: candidate.working_candidate_id,
          revision: candidate.revision,
          record_hash: row.record_hash,
          schema_name: candidate.schema_name,
          schema_version: candidate.schema_version,
        },
        ...(native === undefined ? {} : { native_record: native }),
        ...(await this.#sourceMaterial(client, candidate, native)),
        material_state:
          !registered ||
          candidate.project_definition_ref.content_hash !==
            definition.content_hash
            ? "definition_stale"
            : native === undefined
              ? "metadata_only"
              : "available",
      });
    }
    const endpoint = (
      value: PetraWorkingRelationship["endpoints"]["subject"],
      relationship: PetraWorkingRelationship,
      row: Stored,
      side: string,
    ): string => {
      if (value.endpoint_kind === "working_candidate")
        return `${value.candidate_ref.working_candidate_id}@${value.candidate_ref.revision}`;
      const ref: Ref =
        value.endpoint_kind === "profile_record"
          ? value.record_ref
          : {
              record_id: relationship.working_relationship_id,
              revision: relationship.revision,
              record_hash: row.record_hash,
              schema_name: relationship.schema_name,
              schema_version: relationship.schema_version,
            };
      const key =
        value.endpoint_kind === "literal"
          ? `${relationship.working_relationship_id}:${side}:${value.value_hash}`
          : `reference:${ref.record_id}@${ref.revision}`;
      if (!nodes.some((node) => node.key === key))
        nodes.push({
          key,
          semantic_key:
            value.endpoint_kind === "literal"
              ? `petra.literal.${value.literal_type}`
              : ref.schema_name,
          label:
            value.endpoint_kind === "literal"
              ? `${value.literal_type} value reference`
              : ref.record_id,
          summary:
            "Exact endpoint reference. Its material and current authority were not resolved by this working-head query.",
          layer: "reference",
          record_ref: ref,
          material_state: "metadata_only",
        });
      return key;
    };
    let unrepresentedRelationships = 0;
    for (const row of relationships.rows.slice(0, 100)) {
      const relationship = this.#stored<PetraWorkingRelationship>(
        "working-relationship",
        row,
      );
      if (relationship.project_id !== projectId)
        throw new Error("A working relationship crossed its Project boundary.");
      const subject_key = endpoint(
        relationship.endpoints.subject,
        relationship,
        row,
        "subject",
      );
      const object_key = endpoint(
        relationship.endpoints.object,
        relationship,
        row,
        "object",
      );
      if (
        !nodes.some((node) => node.key === subject_key) ||
        !nodes.some((node) => node.key === object_key)
      ) {
        unrepresentedRelationships++;
        continue;
      }
      edges.push({
        key: `${relationship.working_relationship_id}@${relationship.revision}`,
        semantic_key:
          relationship.profile_relationship.registration.semantic_key,
        predicate: relationship.profile_relationship.predicate,
        subject_key,
        object_key,
        record_ref: {
          record_id: relationship.working_relationship_id,
          revision: relationship.revision,
          record_hash: row.record_hash,
          schema_name: relationship.schema_name,
          schema_version: relationship.schema_version,
        },
      });
    }
    const content: Content = {
      project_label: current.project_payload.name,
      definition_family: definition.definition_family,
      objective_ref:
        objective === undefined
          ? null
          : {
              schema_name: objective.schema_name,
              schema_version: objective.schema_version,
              record_id: objective.objective_id,
              revision: objective.revision,
              record_hash: objectiveRow!.record_hash,
            },
      definition_ref: {
        record_id: definition.project_definition_id,
        revision: definition.revision,
        content_hash: definition.content_hash,
      },
      authority: {
        event_position: Number(authority.event_position),
        stream_revision: Number(authority.stream_revision),
      },
      query: {
        kind: "current_registered_working_heads",
        max_candidates: 50,
        max_relationships: 100,
        authority_effect: "none",
      },
      nodes,
      relationships: edges,
      omitted_candidates: Math.max(
        0,
        Number(candidates.rows[0]?.total_count ?? 0) - 50,
      ),
      omitted_relationships:
        Math.max(0, Number(relationships.rows[0]?.total_count ?? 0) - 100) +
        unrepresentedRelationships,
      limitations: [
        "This bounded query represents registered current working heads and their exact supplied endpoints. It supplies no trusted projection, historical reconstruction, inferred relationship, or scientific support assessment.",
        "Working material requires examination and governed Review before promotion. Validation, a drawn edge, and a model answer confer no authority.",
        "Native material larger than 24,000 bytes or without a registered storage adapter is represented by its exact metadata only.",
      ],
    };
    const view: PetraProjectSemanticGraphView = {
      schema_name: "petra.project-semantic-graph-view",
      schema_version: "1.0.0",
      project_id: projectId,
      content,
      content_hash: copilotHash(content),
      read_at: new Date().toISOString(),
    };
    this.contracts.assertValid("project-semantic-graph-view", "1.0.0", view);
    return view;
  }
}
