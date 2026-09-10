import { createHash } from "node:crypto";

import type {
  PetraAssertion,
  PetraChangeSetRecord,
  PetraDraftArtifact,
  PetraProjectDefinition,
  PetraProjectObjectLocationView,
  PetraProjectSource,
  PetraProjectSourceReplacement,
  PetraProjectionCheckpoint,
  PetraWorkUnit,
  ProjectObjectDescriptor,
  ProjectObjectDestination,
  ProjectObjectExactRef,
  ProjectObjectLocationContent,
  ProjectObjectLocationProjectionSummary,
  ProjectObjectPlaceRole,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  ProjectObjectLocationRequest,
  ProjectObjectLocationViewReader,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresProjectObjectLocationViewErrorCode =
  | "PROJECT_OBJECT_LOCATION_REQUEST_INVALID"
  | "PROJECT_OBJECT_LOCATION_DEFINITION_MISSING"
  | "PROJECT_OBJECT_LOCATION_DESTINATION_UNSUPPORTED"
  | "PROJECT_OBJECT_LOCATION_STORED_RECORD_CORRUPT";

export class PostgresProjectObjectLocationViewError extends Error {
  readonly code: PostgresProjectObjectLocationViewErrorCode;

  constructor(
    code: PostgresProjectObjectLocationViewErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PostgresProjectObjectLocationViewError";
    this.code = code;
  }
}

interface DefinitionRow {
  definition_payload: unknown;
}

interface AuthorityRow {
  event_position: string;
  stream_revision: string | null;
}

interface PayloadRow {
  payload: unknown;
}

interface RevisionLookupRow {
  current_revision: string;
  current_record_hash: string;
  current_payload: unknown;
  current_lifecycle: string;
  selected_revision: string | null;
  selected_record_hash: string | null;
  selected_payload: unknown;
  selected_lifecycle: string | null;
}

interface StoredRevision {
  revision: number;
  recordHash: string;
  payload: unknown;
  lifecycleState: string;
}

interface LocatedRecord {
  current: StoredRevision;
  selected?: StoredRevision;
  replacementSteps?: ReplacementStep[];
}

interface ReplacementStep {
  edge: StoredRow;
  successorId: string;
  successor: StoredRevision;
}

interface StoredRow {
  payload: unknown;
  recordHash: string;
}

interface ReplacementLookupRow {
  edge_payload: unknown;
  edge_record_hash: string;
  replacement_project_source_id: string;
  replacement_revision: string;
  replacement_payload: unknown;
  replacement_record_hash: string;
  replacement_status: string;
  depth: string;
  is_cycle: boolean;
}

interface RequiredRegistration {
  kind: PetraProjectDefinition["content"]["registrations"][number]["registration_kind"];
  contractName: string;
}

interface DestinationSpec {
  role: ProjectObjectPlaceRole;
  purpose: string;
  intents: readonly ProjectObjectLocationRequest["task_intent"][];
}

interface ObjectLocationAdapter {
  semanticKey: string;
  idPattern: RegExp;
  schemaName: string;
  registration?: RequiredRegistration;
  destinations: readonly DestinationSpec[];
  locate: (
    client: PoolClient,
    projectId: string,
    objectId: string,
    revision: number | undefined,
  ) => Promise<LocatedRecord | undefined>;
  descriptor: (
    record: StoredRevision,
    definition: PetraProjectDefinition,
  ) => ProjectObjectDescriptor;
}

const PETRA_ID = /^[a-z][a-z0-9_]{1,31}_[0-9A-HJKMNP-TV-Z]{26}$/u;
const SEMANTIC_KEY = /^[a-z][a-z0-9._/-]{1,199}$/u;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

const truncate = (value: string, maximum = 4000): string =>
  value.length <= maximum ? value : `${value.slice(0, maximum - 1)}…`;

const rowRecord = (row: RevisionLookupRow): LocatedRecord => ({
  current: {
    revision: Number(row.current_revision),
    recordHash: row.current_record_hash,
    payload: row.current_payload,
    lifecycleState: row.current_lifecycle,
  },
  ...(row.selected_revision === null ||
  row.selected_record_hash === null ||
  row.selected_payload === null ||
  row.selected_lifecycle === null
    ? {}
    : {
        selected: {
          revision: Number(row.selected_revision),
          recordHash: row.selected_record_hash,
          payload: row.selected_payload,
          lifecycleState: row.selected_lifecycle,
        },
      }),
});

const projectSourceLookup = async (
  client: PoolClient,
  projectId: string,
  objectId: string,
  revision: number | undefined,
): Promise<LocatedRecord | undefined> => {
  const result = await client.query<RevisionLookupRow>(
    `SELECT head.current_revision::text,
            current_revision.record_hash AS current_record_hash,
            current_revision.payload AS current_payload,
            current_revision.status AS current_lifecycle,
            selected_revision.revision::text AS selected_revision,
            selected_revision.record_hash AS selected_record_hash,
            selected_revision.payload AS selected_payload,
            selected_revision.status AS selected_lifecycle
       FROM petra.project_sources AS head
       JOIN petra.project_source_revisions AS current_revision
         ON current_revision.project_source_id = head.project_source_id
        AND current_revision.revision = head.current_revision
       LEFT JOIN petra.project_source_revisions AS selected_revision
         ON selected_revision.project_source_id = head.project_source_id
        AND selected_revision.revision = COALESCE($3, head.current_revision)
      WHERE head.project_id = $1
        AND head.project_source_id = $2`,
    [projectId, objectId, revision ?? null],
  );
  const row = result.rows[0];
  if (row === undefined) return undefined;
  const replacements = await client.query<ReplacementLookupRow>(
    `WITH RECURSIVE chain AS (
       SELECT edge.payload AS edge_payload,
              edge.record_hash AS edge_record_hash,
              edge.replacement_project_source_id,
              edge.replacement_revision,
              1::bigint AS depth,
              ARRAY[
                edge.replaced_project_source_id,
                edge.replacement_project_source_id
              ] AS path,
              false AS is_cycle
         FROM petra.project_source_replacement_heads AS head
         JOIN petra.project_source_replacements AS edge
           ON edge.project_source_replacement_id =
              head.current_project_source_replacement_id
        WHERE head.project_id = $1
          AND head.replaced_project_source_id = $2
          AND head.state = 'active'
       UNION ALL
       SELECT edge.payload, edge.record_hash,
              edge.replacement_project_source_id,
              edge.replacement_revision,
              chain.depth + 1,
              chain.path || edge.replacement_project_source_id,
              edge.replacement_project_source_id = ANY(chain.path)
         FROM chain
         JOIN petra.project_source_replacement_heads AS head
           ON head.project_id = $1
          AND head.replaced_project_source_id =
              chain.replacement_project_source_id
          AND head.state = 'active'
         JOIN petra.project_source_replacements AS edge
           ON edge.project_source_replacement_id =
              head.current_project_source_replacement_id
        WHERE chain.depth < 33 AND NOT chain.is_cycle
     )
     SELECT chain.edge_payload, chain.edge_record_hash,
            chain.replacement_project_source_id,
            chain.replacement_revision::text,
            revision.payload AS replacement_payload,
            revision.record_hash AS replacement_record_hash,
            revision.status AS replacement_status,
            chain.depth::text, chain.is_cycle
       FROM chain
       JOIN petra.project_source_revisions AS revision
         ON revision.project_source_id =
              chain.replacement_project_source_id
        AND revision.revision = chain.replacement_revision
      ORDER BY chain.depth`,
    [projectId, objectId],
  );
  if (
    replacements.rows.some(
      (replacement) => replacement.is_cycle || Number(replacement.depth) > 32,
    )
  ) {
    throw new PostgresProjectObjectLocationViewError(
      "PROJECT_OBJECT_LOCATION_STORED_RECORD_CORRUPT",
      "ProjectSource replacement lineage is cyclic or exceeds 32 edges.",
    );
  }
  return {
    ...rowRecord(row),
    replacementSteps: replacements.rows.map((replacement) => ({
      edge: {
        payload: replacement.edge_payload,
        recordHash: replacement.edge_record_hash,
      },
      successorId: replacement.replacement_project_source_id,
      successor: {
        revision: Number(replacement.replacement_revision),
        recordHash: replacement.replacement_record_hash,
        payload: replacement.replacement_payload,
        lifecycleState: replacement.replacement_status,
      },
    })),
  };
};

const assertionLookup = async (
  client: PoolClient,
  projectId: string,
  objectId: string,
  revision: number | undefined,
): Promise<LocatedRecord | undefined> => {
  const result = await client.query<RevisionLookupRow>(
    `SELECT head.current_revision::text,
            current_revision.record_hash AS current_record_hash,
            current_revision.payload AS current_payload,
            concat(
              current_revision.authority_zone,
              '_',
              current_revision.review_state
            ) AS current_lifecycle,
            selected_revision.revision::text AS selected_revision,
            selected_revision.record_hash AS selected_record_hash,
            selected_revision.payload AS selected_payload,
            concat(
              selected_revision.authority_zone,
              '_',
              selected_revision.review_state
            ) AS selected_lifecycle
       FROM petra.evidence_entities AS head
       JOIN petra.evidence_entity_revisions AS current_revision
         ON current_revision.evidence_id = head.evidence_id
        AND current_revision.revision = head.current_revision
       LEFT JOIN petra.evidence_entity_revisions AS selected_revision
         ON selected_revision.evidence_id = head.evidence_id
        AND selected_revision.revision = COALESCE($3, head.current_revision)
      WHERE head.evidence_kind = 'assertion'
        AND head.evidence_id = $2
        AND EXISTS (
          SELECT 1
            FROM petra.change_set_operations AS operation
            JOIN petra.change_sets AS change_set
              ON change_set.change_set_id = operation.change_set_id
           WHERE operation.target_id = head.evidence_id
             AND change_set.project_id = $1
        )`,
    [projectId, objectId, revision ?? null],
  );
  const row = result.rows[0];
  return row === undefined ? undefined : rowRecord(row);
};

const changeSetLookup = async (
  client: PoolClient,
  projectId: string,
  objectId: string,
  revision: number | undefined,
): Promise<LocatedRecord | undefined> => {
  const result = await client.query<RevisionLookupRow>(
    `SELECT change_set.revision::text AS current_revision,
            change_set.record_hash AS current_record_hash,
            change_set.payload AS current_payload,
            change_set.current_state AS current_lifecycle,
            CASE WHEN COALESCE($3, change_set.revision) = change_set.revision
              THEN change_set.revision::text END AS selected_revision,
            CASE WHEN COALESCE($3, change_set.revision) = change_set.revision
              THEN change_set.record_hash END AS selected_record_hash,
            CASE WHEN COALESCE($3, change_set.revision) = change_set.revision
              THEN change_set.payload END AS selected_payload,
            CASE WHEN COALESCE($3, change_set.revision) = change_set.revision
              THEN change_set.current_state END AS selected_lifecycle
       FROM petra.change_sets AS change_set
      WHERE change_set.project_id = $1
        AND change_set.change_set_id = $2`,
    [projectId, objectId, revision ?? null],
  );
  const row = result.rows[0];
  return row === undefined ? undefined : rowRecord(row);
};

const workUnitLookup = async (
  client: PoolClient,
  projectId: string,
  objectId: string,
  revision: number | undefined,
): Promise<LocatedRecord | undefined> => {
  const result = await client.query<RevisionLookupRow>(
    `SELECT head.current_revision::text,
            current_revision.record_hash AS current_record_hash,
            current_revision.payload AS current_payload,
            current_revision.state AS current_lifecycle,
            selected_revision.revision::text AS selected_revision,
            selected_revision.record_hash AS selected_record_hash,
            selected_revision.payload AS selected_payload,
            selected_revision.state AS selected_lifecycle
       FROM petra.work_units AS head
       JOIN petra.work_unit_revisions AS current_revision
         ON current_revision.work_unit_id = head.work_unit_id
        AND current_revision.revision = head.current_revision
       LEFT JOIN petra.work_unit_revisions AS selected_revision
         ON selected_revision.work_unit_id = head.work_unit_id
        AND selected_revision.revision = COALESCE($3, head.current_revision)
      WHERE head.project_id = $1
        AND head.work_unit_id = $2`,
    [projectId, objectId, revision ?? null],
  );
  const row = result.rows[0];
  return row === undefined ? undefined : rowRecord(row);
};

const draftArtifactLookup = async (
  client: PoolClient,
  projectId: string,
  objectId: string,
  revision: number | undefined,
): Promise<LocatedRecord | undefined> => {
  const result = await client.query<RevisionLookupRow>(
    `SELECT head.current_revision::text,
            current_revision.record_hash AS current_record_hash,
            current_revision.payload AS current_payload,
            current_revision.validation_state AS current_lifecycle,
            selected_revision.revision::text AS selected_revision,
            selected_revision.record_hash AS selected_record_hash,
            selected_revision.payload AS selected_payload,
            selected_revision.validation_state AS selected_lifecycle
       FROM petra.draft_artifacts AS head
       JOIN petra.draft_artifact_revisions AS current_revision
         ON current_revision.draft_artifact_id = head.draft_artifact_id
        AND current_revision.revision = head.current_revision
       LEFT JOIN petra.draft_artifact_revisions AS selected_revision
         ON selected_revision.draft_artifact_id = head.draft_artifact_id
        AND selected_revision.revision = COALESCE($3, head.current_revision)
      WHERE head.project_id = $1
        AND head.draft_artifact_id = $2`,
    [projectId, objectId, revision ?? null],
  );
  const row = result.rows[0];
  return row === undefined ? undefined : rowRecord(row);
};

const term = (
  definition: PetraProjectDefinition,
  semanticKey: string,
  family: ProjectObjectDescriptor["generic_family"],
  fallback: string,
): string =>
  definition.content.terms.find(
    (candidate) => candidate.semantic_key === semanticKey,
  )?.singular ??
  definition.content.terms.find(
    (candidate) => candidate.generic_family === family,
  )?.singular ??
  fallback;

const DEFAULT_ADAPTERS: readonly ObjectLocationAdapter[] = [
  {
    semanticKey: "petra.project-source",
    idPattern: /^project_source_[0-9A-HJKMNP-TV-Z]{26}$/u,
    schemaName: "project-source",
    destinations: [
      {
        role: "sources",
        purpose: "Inspect the exact Project source revision.",
        intents: ["orient", "inspect"],
      },
      {
        role: "graph",
        purpose: "Trace relationships grounded in this source.",
        intents: ["trace"],
      },
      {
        role: "history",
        purpose: "Inspect retained Project history for this source.",
        intents: ["view_history"],
      },
    ],
    locate: projectSourceLookup,
    descriptor: (record, definition) => {
      const source = record.payload as PetraProjectSource;
      return {
        semantic_key: "petra.project-source",
        generic_family: "reference",
        label: term(
          definition,
          source.content.source_role,
          "reference",
          "Source",
        ),
        summary: `${source.content.source_role} · ${record.lifecycleState} Project source`,
        lifecycle_state: record.lifecycleState,
      };
    },
  },
  {
    semanticKey: "scientific.assertion",
    idPattern: /^assertion_[0-9A-HJKMNP-TV-Z]{26}$/u,
    schemaName: "assertion",
    registration: {
      kind: "relationship_schema",
      contractName: "petra.assertion",
    },
    destinations: [
      {
        role: "graph",
        purpose: "Inspect the relationship in its bounded graph context.",
        intents: ["orient", "inspect", "trace"],
      },
      {
        role: "review",
        purpose: "Inspect the relationship's Review context.",
        intents: ["review"],
      },
      {
        role: "history",
        purpose: "Inspect retained Project history for this relationship.",
        intents: ["view_history"],
      },
    ],
    locate: assertionLookup,
    descriptor: (record, definition) => {
      const assertion = record.payload as PetraAssertion;
      return {
        semantic_key: "scientific.assertion",
        generic_family: "relationship",
        label: term(
          definition,
          "scientific.assertion",
          "relationship",
          "Assertion",
        ),
        summary: truncate(`${assertion.predicate} · ${assertion.rationale}`),
        lifecycle_state: record.lifecycleState,
      };
    },
  },
  {
    semanticKey: "petra.change-set",
    idPattern: /^change_set_[0-9A-HJKMNP-TV-Z]{26}$/u,
    schemaName: "change-set",
    destinations: [
      {
        role: "review",
        purpose: "Inspect the exact governed change and its decision state.",
        intents: ["orient", "inspect", "review", "trace"],
      },
      {
        role: "history",
        purpose: "Inspect retained Project history for this change.",
        intents: ["view_history"],
      },
    ],
    locate: changeSetLookup,
    descriptor: (record) => {
      const changeSet = record.payload as PetraChangeSetRecord;
      return {
        semantic_key: "petra.change-set",
        generic_family: "other",
        label: "Change set",
        summary: truncate(changeSet.content.reason),
        lifecycle_state: record.lifecycleState,
      };
    },
  },
  {
    semanticKey: "petra.work-unit",
    idPattern: /^work_unit_[0-9A-HJKMNP-TV-Z]{26}$/u,
    schemaName: "work-unit",
    destinations: [
      {
        role: "work",
        purpose: "Inspect or continue the exact bounded Work revision.",
        intents: ["orient", "inspect", "trace", "continue_work"],
      },
      {
        role: "history",
        purpose: "Inspect retained Project history for this Work.",
        intents: ["view_history"],
      },
    ],
    locate: workUnitLookup,
    descriptor: (record) => {
      const work = record.payload as PetraWorkUnit;
      return {
        semantic_key: "petra.work-unit",
        generic_family: "task",
        label: work.spec.workflow_name,
        summary: truncate(work.spec.objective),
        lifecycle_state: record.lifecycleState,
      };
    },
  },
  {
    semanticKey: "petra.draft-artifact",
    idPattern: /^draft_artifact_[0-9A-HJKMNP-TV-Z]{26}$/u,
    schemaName: "draft-artifact",
    destinations: [
      {
        role: "composition",
        purpose: "Inspect the exact Composition revision and its provenance.",
        intents: ["orient", "inspect", "trace", "continue_work"],
      },
      {
        role: "history",
        purpose: "Inspect retained Project history for this Composition.",
        intents: ["view_history"],
      },
    ],
    locate: draftArtifactLookup,
    descriptor: (record) => {
      const draft = record.payload as PetraDraftArtifact;
      return {
        semantic_key: "petra.draft-artifact",
        generic_family: "output",
        label: `${draft.content.artifact_kind.replaceAll("_", " ")} draft`,
        summary: truncate(draft.content.text),
        lifecycle_state: record.lifecycleState,
      };
    },
  },
];

export class PostgresProjectObjectLocationViewReader implements ProjectObjectLocationViewReader {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;
  readonly #adapters: ReadonlyMap<string, ObjectLocationAdapter>;

  constructor(
    pool: Pool,
    contracts = new PetraContractRegistry(),
    adapters: readonly ObjectLocationAdapter[] = DEFAULT_ADAPTERS,
  ) {
    this.#pool = pool;
    this.#contracts = contracts;
    this.#adapters = new Map(
      adapters.map((adapter) => [adapter.semanticKey, adapter]),
    );
    if (this.#adapters.size !== adapters.length) {
      throw new PostgresProjectObjectLocationViewError(
        "PROJECT_OBJECT_LOCATION_REQUEST_INVALID",
        "Semantic location adapters must have unique keys.",
      );
    }
  }

  async locateProjectObject(
    request: ProjectObjectLocationRequest,
  ): Promise<PetraProjectObjectLocationView | undefined> {
    this.#assertRequest(request);
    return this.#readTransaction((client, readAt) =>
      this.locateProjectObjectInSnapshot(client, request, readAt),
    );
  }

  /**
   * Composes a semantic location inside an existing PostgreSQL transaction.
   * Callers own transaction isolation, commit, rollback, and timestamp identity.
   */
  async locateProjectObjectInSnapshot(
    client: PoolClient,
    request: ProjectObjectLocationRequest,
    readAt: string,
  ): Promise<PetraProjectObjectLocationView | undefined> {
    this.#assertRequest(request);
    const definition = await this.#projectDefinition(
      client,
      request.project_id,
    );
    if (definition === undefined) return undefined;
    const authority = await this.#authorityPosition(client, request.project_id);
    const projection = this.#projectionSummary(
      await this.#projectionCheckpoint(client, request.project_id),
    );
    const adapter = this.#adapters.get(request.object_ref.semantic_key);

    let content: ProjectObjectLocationContent;
    if (
      adapter === undefined ||
      !this.#registrationSupported(definition, adapter)
    ) {
      content = this.#unavailableContent(
        request,
        definition,
        "unsupported",
        "OBJECT_KIND_UNSUPPORTED",
        "This Project definition does not register the requested object kind.",
        authority,
        projection,
      );
    } else if (!adapter.idPattern.test(request.object_ref.object_id)) {
      content = this.#unavailableContent(
        request,
        definition,
        "missing",
        "OBJECT_UNAVAILABLE",
        "The requested object or exact revision is unavailable in this Project.",
        authority,
        projection,
      );
    } else {
      const located = await adapter.locate(
        client,
        request.project_id,
        request.object_ref.object_id,
        request.object_ref.revision,
      );
      if (located === undefined || located.selected === undefined) {
        content = this.#unavailableContent(
          request,
          definition,
          "missing",
          "OBJECT_UNAVAILABLE",
          "The requested object or exact revision is unavailable in this Project.",
          authority,
          projection,
        );
      } else {
        this.#assertStored(adapter, located.current);
        this.#assertStored(adapter, located.selected);
        for (const replacement of located.replacementSteps ?? []) {
          this.#assertReplacement(replacement.edge);
          this.#assertStored(adapter, replacement.successor);
        }
        content = this.#resolvedContent(
          request,
          definition,
          adapter,
          { ...located, selected: located.selected },
          authority,
          projection,
        );
      }
    }

    const view: PetraProjectObjectLocationView = {
      schema_name: "petra.project-object-location-view",
      schema_version: "1.0.0",
      project_id: request.project_id,
      content,
      content_hash: canonicalHash(content),
      read_at: readAt,
    };
    this.#contracts.assertValid("project-object-location-view", "1.0.0", view);
    return view;
  }

  #resolvedContent(
    request: ProjectObjectLocationRequest,
    definition: PetraProjectDefinition,
    adapter: ObjectLocationAdapter,
    located: LocatedRecord & { selected: StoredRevision },
    authority: ProjectObjectLocationContent["authority"],
    projection: ProjectObjectLocationProjectionSummary,
  ): ProjectObjectLocationContent {
    const resolvedRef = this.#exactRef(
      adapter.semanticKey,
      request.object_ref.object_id,
      located.selected,
    );
    const currentRef = this.#exactRef(
      adapter.semanticKey,
      request.object_ref.object_id,
      located.current,
    );
    const state =
      (located.replacementSteps?.length ?? 0) > 0
        ? ("superseded" as const)
        : located.selected.revision === located.current.revision
          ? ("current" as const)
          : ("historical" as const);
    const destinations = this.#destinations(
      adapter,
      definition,
      state === "historical" ? "view_history" : request.task_intent,
      resolvedRef,
    );
    return {
      request: clone({
        object_ref: request.object_ref,
        task_intent: request.task_intent,
      }),
      definition_ref: this.#definitionRef(definition),
      resolution: {
        state,
        requested_ref: clone(request.object_ref),
        resolved_ref: resolvedRef,
        current_ref: currentRef,
        descriptor: adapter.descriptor(located.selected, definition),
        replacement_chain: (located.replacementSteps ?? []).map((replacement) =>
          this.#exactRef(
            adapter.semanticKey,
            replacement.successorId,
            replacement.successor,
          ),
        ),
      },
      primary_destination: destinations[0],
      alternate_destinations: destinations.slice(
        1,
      ) as ProjectObjectLocationContent["alternate_destinations"],
      ...(definition.content.supported_places.includes("brief")
        ? {
            fallback_destination: {
              role: "brief" as const,
              purpose: "Return to the current Project orientation.",
            },
          }
        : {}),
      context: {
        details_allowed: true,
        petra_allowed: definition.content.supported_places.includes("petra"),
      },
      authority,
      projection,
    };
  }

  #unavailableContent(
    request: ProjectObjectLocationRequest,
    definition: PetraProjectDefinition,
    state: "missing" | "unauthorized" | "unsupported",
    code: string,
    message: string,
    authority: ProjectObjectLocationContent["authority"],
    projection: ProjectObjectLocationProjectionSummary,
  ): ProjectObjectLocationContent {
    if (!definition.content.supported_places.includes("brief")) {
      throw new PostgresProjectObjectLocationViewError(
        "PROJECT_OBJECT_LOCATION_DESTINATION_UNSUPPORTED",
        "A missing or unsupported object requires the registered Brief fallback.",
      );
    }
    return {
      request: clone({
        object_ref: request.object_ref,
        task_intent: request.task_intent,
      }),
      definition_ref: this.#definitionRef(definition),
      resolution: {
        state,
        requested_ref: clone(request.object_ref),
        failure: { code, message },
      },
      primary_destination: {
        role: "brief",
        purpose: "Return to the current Project orientation.",
      },
      alternate_destinations: [],
      context: { details_allowed: false, petra_allowed: false },
      authority,
      projection,
    };
  }

  #destinations(
    adapter: ObjectLocationAdapter,
    definition: PetraProjectDefinition,
    intent: ProjectObjectLocationRequest["task_intent"],
    targetRef: ProjectObjectExactRef,
  ): [ProjectObjectDestination, ...ProjectObjectDestination[]] {
    const supported = adapter.destinations.filter((destination) =>
      definition.content.supported_places.includes(destination.role),
    );
    if (supported.length === 0) {
      throw new PostgresProjectObjectLocationViewError(
        "PROJECT_OBJECT_LOCATION_DESTINATION_UNSUPPORTED",
        `Project definition ${definition.project_definition_id} has no registered destination for ${adapter.semanticKey}.`,
      );
    }
    const preferred = supported.find((destination) =>
      destination.intents.includes(intent),
    );
    const ordered =
      preferred === undefined
        ? supported
        : [preferred, ...supported.filter((value) => value !== preferred)];
    return ordered.map((destination) => ({
      role: destination.role,
      purpose: destination.purpose,
      target_ref: clone(targetRef),
    })) as [ProjectObjectDestination, ...ProjectObjectDestination[]];
  }

  #exactRef(
    semanticKey: string,
    objectId: string,
    revision: StoredRevision,
  ): ProjectObjectExactRef {
    return {
      semantic_key: semanticKey,
      object_id: objectId,
      revision: revision.revision,
      record_hash: revision.recordHash,
    };
  }

  #definitionRef(
    definition: PetraProjectDefinition,
  ): ProjectObjectLocationContent["definition_ref"] {
    return {
      project_definition_id: definition.project_definition_id,
      revision: definition.revision,
      content_hash: definition.content_hash,
      definition_family: definition.definition_family,
    };
  }

  #registrationSupported(
    definition: PetraProjectDefinition,
    adapter: ObjectLocationAdapter,
  ): boolean {
    if (adapter.registration === undefined) return true;
    return definition.content.registrations.some(
      (registration) =>
        registration.registration_kind === adapter.registration?.kind &&
        registration.semantic_key === adapter.semanticKey &&
        registration.contract.name === adapter.registration.contractName,
    );
  }

  #assertStored(
    adapter: ObjectLocationAdapter,
    revision: StoredRevision,
  ): void {
    const payload = revision.payload as { schema_version?: unknown };
    const version = payload.schema_version;
    if (typeof version !== "string") {
      throw this.#corrupt("A located record has no schema version.");
    }
    this.#contracts.assertValid(adapter.schemaName, version, revision.payload);
    if (canonicalHash(revision.payload) !== revision.recordHash) {
      throw this.#corrupt(
        `Stored ${adapter.schemaName} revision ${revision.revision} has an invalid record hash.`,
      );
    }
  }

  #assertReplacement(row: StoredRow): void {
    this.#contracts.assertValid(
      "project-source-replacement",
      "1.0.0",
      row.payload,
    );
    const replacement = row.payload as PetraProjectSourceReplacement;
    if (
      replacement.content_hash !== canonicalHash(replacement.content) ||
      canonicalHash(replacement) !== row.recordHash
    ) {
      throw this.#corrupt(
        "A ProjectSource replacement edge does not reproduce its canonical hashes.",
      );
    }
  }

  async #projectDefinition(
    client: PoolClient,
    projectId: string,
  ): Promise<PetraProjectDefinition | undefined> {
    const result = await client.query<DefinitionRow>(
      `SELECT definition_revision.payload AS definition_payload
         FROM petra.projects AS project
         LEFT JOIN petra.project_definitions AS definition
           ON definition.project_id = project.project_id
         LEFT JOIN petra.project_definition_revisions AS definition_revision
           ON definition_revision.project_definition_id =
                definition.project_definition_id
          AND definition_revision.revision = definition.current_revision
        WHERE project.project_id = $1`,
      [projectId],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    if (row.definition_payload === null) {
      throw new PostgresProjectObjectLocationViewError(
        "PROJECT_OBJECT_LOCATION_DEFINITION_MISSING",
        `Project ${projectId} has no current ProjectDefinition and cannot resolve semantic destinations.`,
      );
    }
    this.#contracts.assertValid(
      "project-definition",
      "1.0.0",
      row.definition_payload,
    );
    const definition = row.definition_payload as PetraProjectDefinition;
    if (
      definition.project_id !== projectId ||
      definition.content_hash !== canonicalHash(definition.content)
    ) {
      throw this.#corrupt(
        "The current ProjectDefinition identity or content hash is invalid.",
      );
    }
    return clone(definition);
  }

  async #authorityPosition(
    client: PoolClient,
    projectId: string,
  ): Promise<ProjectObjectLocationContent["authority"]> {
    const result = await client.query<AuthorityRow>(
      `SELECT authority.event_position,
              stream.current_stream_revision AS stream_revision
         FROM petra.authority_positions AS authority
         LEFT JOIN petra.project_event_stream_heads AS stream
           ON stream.project_id = $1
        WHERE authority.singleton`,
      [projectId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#corrupt("The PostgreSQL authority position is unavailable.");
    }
    return {
      isolation: "repeatable_read",
      event_position: Number(row.event_position),
      stream_revision: Number(row.stream_revision ?? 0),
    };
  }

  async #projectionCheckpoint(
    client: PoolClient,
    projectId: string,
  ): Promise<PetraProjectionCheckpoint | undefined> {
    const result = await client.query<PayloadRow>(
      `SELECT revision.payload
         FROM petra.projection_checkpoints AS head
         JOIN petra.projection_checkpoint_revisions AS revision
           ON revision.projection_checkpoint_id = head.projection_checkpoint_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
          AND head.target = 'neo4j_graph'
          AND head.projection_name = 'petra.authority_graph'
        ORDER BY revision.recorded_at DESC
        LIMIT 1`,
      [projectId],
    );
    const payload = result.rows[0]?.payload;
    if (payload === undefined) return undefined;
    this.#contracts.assertValid("projection-checkpoint", "1.0.0", payload);
    return clone(payload as PetraProjectionCheckpoint);
  }

  #projectionSummary(
    checkpoint: PetraProjectionCheckpoint | undefined,
  ): ProjectObjectLocationProjectionSummary {
    if (checkpoint === undefined) {
      return {
        state: "unavailable",
        label: "Projection unavailable",
        detail:
          "No authority-graph checkpoint is registered for this Project. Authoritative Project records remain available.",
        represented_event_position: 0,
        observed_event_position: 0,
        pending_records: 0,
      };
    }
    const represented =
      checkpoint.content.position.position_kind === "advanced"
        ? checkpoint.content.position.event_position
        : 0;
    const observed = checkpoint.content.observed_head.event_position;
    const freshness = checkpoint.content.freshness;
    const common = {
      checkpoint_ref: {
        record_id: checkpoint.projection_checkpoint_id,
        revision: checkpoint.revision,
        content_hash: checkpoint.content_hash,
      },
      represented_event_position: represented,
      observed_event_position: observed,
      pending_records: freshness.pending_records,
    };
    if (freshness.state === "current") {
      return {
        state: "current",
        label: "Projection current",
        detail: `The graph represents authoritative event ${represented}.`,
        ...common,
      };
    }
    if (freshness.state === "catching_up") {
      return {
        state: "catching_up",
        label: "Projection catching up",
        detail: `The authority ledger is at event ${observed}; the graph safely represents event ${represented} while ${freshness.pending_records} ${freshness.pending_records === 1 ? "record remains" : "records remain"} pending.`,
        ...common,
      };
    }
    return {
      state: "blocked",
      label: "Projection blocked",
      detail: freshness.message,
      failure_code: freshness.failure_code,
      ...common,
    };
  }

  #assertRequest(request: ProjectObjectLocationRequest): void {
    if (
      !PETRA_ID.test(request.project_id) ||
      !request.project_id.startsWith("project_") ||
      !SEMANTIC_KEY.test(request.object_ref.semantic_key) ||
      !PETRA_ID.test(request.object_ref.object_id) ||
      (request.object_ref.revision !== undefined &&
        (!Number.isSafeInteger(request.object_ref.revision) ||
          request.object_ref.revision < 1))
    ) {
      throw new PostgresProjectObjectLocationViewError(
        "PROJECT_OBJECT_LOCATION_REQUEST_INVALID",
        "Semantic location requires a canonical Project ID, semantic key, opaque Petra object ID, and optional positive safe revision.",
      );
    }
  }

  #corrupt(message: string): PostgresProjectObjectLocationViewError {
    return new PostgresProjectObjectLocationViewError(
      "PROJECT_OBJECT_LOCATION_STORED_RECORD_CORRUPT",
      message,
    );
  }

  async #readTransaction<Value>(
    operation: (client: PoolClient, readAt: string) => Promise<Value>,
  ): Promise<Value> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const timestamp = await client.query<{ read_at: Date }>(
        "SELECT transaction_timestamp() AS read_at",
      );
      const readAt = timestamp.rows[0]?.read_at.toISOString();
      if (readAt === undefined) {
        throw new Error("PostgreSQL did not provide a transaction timestamp.");
      }
      const result = await operation(client, readAt);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
