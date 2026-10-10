import type { Pool, PoolClient } from "pg";
import type {
  PetraAssessmentProfile,
  PetraAssessmentPolicy,
  PetraProjectDefinition,
  PetraProjectSemanticGraphView,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  copilotHash,
  ExaminationBoundaryError,
  HypothesisExaminationKernel,
} from "@petra/core";

type Catalog = PetraAssessmentProfile | PetraAssessmentPolicy;
type Row = { payload: Catalog; record_hash: string };
export interface ProjectExaminationConfiguration {
  readonly profile: PetraAssessmentProfile;
  readonly policy: PetraAssessmentPolicy;
  readonly kernel: HypothesisExaminationKernel;
}
const catalogRef = (record: Catalog) => ({
  schema_name: record.schema_name,
  schema_version: record.schema_version,
  record_id:
    record.schema_name === "petra.assessment-profile"
      ? record.assessment_profile_id
      : record.assessment_policy_id,
  revision: record.revision,
  record_hash: copilotHash(record),
});

/** Versioned executable semantics selected by exact ProjectDefinition registrations.
 * Loading a catalog does not enable it for an existing Project. */
export class PostgresProjectExaminationRegistry {
  constructor(
    readonly pool: Pool,
    readonly contracts = new PetraContractRegistry(),
  ) {}
  #check(row: Row): Catalog {
    const record = row.payload;
    this.contracts.assertValid(
      record.schema_name.replace(/^petra\./u, ""),
      record.schema_version,
      record,
    );
    if (
      copilotHash(record) !== row.record_hash ||
      copilotHash(record.content) !== record.content_hash
    )
      throw new ExaminationBoundaryError(
        "EXAMINATION_CATALOG_CORRUPT",
        "The exact examination semantics record is incoherent.",
      );
    return structuredClone(record);
  }
  /** Trusted server registration only. There is no product/model catalog-write route. */
  async register(record: Catalog): Promise<void> {
    const checked = this.#check({
      payload: record,
      record_hash: copilotHash(record),
    });
    const ref = catalogRef(checked);
    await this.pool.query(
      "INSERT INTO petra.assessment_catalog_records(record_id,revision,record_kind,semantic_key,record_hash,payload) VALUES($1,$2,$3,$4,$5,$6::jsonb) ON CONFLICT(record_id,revision) DO NOTHING",
      [
        ref.record_id,
        ref.revision,
        checked.schema_name.replace(/^petra\./u, ""),
        checked.content.semantic_key,
        ref.record_hash,
        JSON.stringify(checked),
      ],
    );
    const retained = await this.pool.query<Row>(
      "SELECT payload,record_hash FROM petra.assessment_catalog_records WHERE record_id=$1 AND revision=$2",
      [ref.record_id, ref.revision],
    );
    if (
      retained.rows[0] === undefined ||
      copilotHash(this.#check(retained.rows[0])) !== ref.record_hash
    )
      throw new ExaminationBoundaryError(
        "EXAMINATION_CATALOG_CONFLICT",
        "This examination semantics identity is bound to different immutable content.",
      );
  }
  async resolve(
    projectId: string,
    graph: PetraProjectSemanticGraphView,
    transaction?: PoolClient,
  ): Promise<ProjectExaminationConfiguration | undefined> {
    const db = transaction ?? this.pool;
    const result = await db.query<{
      payload: PetraProjectDefinition;
      record_hash: string;
    }>(
      "SELECT r.payload,r.record_hash FROM petra.project_definitions h JOIN petra.project_definition_revisions r ON r.project_definition_id=h.project_definition_id AND r.revision=h.current_revision WHERE h.project_id=$1",
      [projectId],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    const definition = row.payload;
    this.contracts.assertValid("project-definition", "1.0.0", definition);
    if (
      copilotHash(definition) !== row.record_hash ||
      definition.content_hash !== copilotHash(definition.content) ||
      definition.project_id !== projectId ||
      definition.project_definition_id !==
        graph.content.definition_ref.record_id ||
      definition.revision !== graph.content.definition_ref.revision ||
      definition.content_hash !== graph.content.definition_ref.content_hash
    )
      throw new ExaminationBoundaryError(
        "EXAMINATION_DEFINITION_CHANGED",
        "The examination definition no longer matches this exact Project snapshot.",
      );
    const entries = this.contracts.entries;
    const validRegistration = (name: string) =>
      definition.content.registrations.filter((registration) => {
        const entry = entries.find(
          (value) =>
            value.name === name &&
            value.version === registration.contract.version,
        );
        return (
          registration.contract.name === `petra.${name}` &&
          entry?.canonical_sha256 === registration.contract.content_hash
        );
      });
    if (
      [
        "hypothesis",
        "hypothesis-assessment",
        "posture-decision",
        "cycle-disposition",
      ].some((name) => validRegistration(name).length !== 1)
    )
      return undefined;
    const profiles = validRegistration("assessment-profile").filter(
      (r) => r.registration_kind === "validator",
    );
    const policies = validRegistration("assessment-policy");
    if (profiles.length !== 1 || policies.length !== 1) return undefined;
    const catalog = await db.query<Row>(
      "SELECT payload,record_hash FROM petra.assessment_catalog_records WHERE semantic_key=ANY($1::text[]) ORDER BY revision DESC LIMIT 3",
      [[profiles[0]!.semantic_key, policies[0]!.semantic_key]],
    );
    // Revision is encoded in the exact semantic key. Ambiguous catalog versions fail closed.
    if (catalog.rows.length !== 2) return undefined;
    const records = catalog.rows.map((entry) => this.#check(entry));
    const profile = records.find(
      (r): r is PetraAssessmentProfile =>
        r.schema_name === "petra.assessment-profile",
    );
    const policy = records.find(
      (r): r is PetraAssessmentPolicy =>
        r.schema_name === "petra.assessment-policy",
    );
    if (
      !profile ||
      !policy ||
      copilotHash(policy.content.profile_ref) !==
        copilotHash(catalogRef(profile))
    )
      throw new ExaminationBoundaryError(
        "EXAMINATION_PROFILE_BINDING",
        "The policy must pin one exact registered profile revision.",
      );
    const unique = (keys: string[]) => new Set(keys).size === keys.length;
    if (
      !unique(profile.content.criteria.map((c) => c.key)) ||
      !unique(profile.content.finding_types.map((f) => f.key)) ||
      !unique(policy.content.obligation_types.map((o) => o.key))
    )
      throw new ExaminationBoundaryError(
        "EXAMINATION_SEMANTICS_DUPLICATE",
        "Executable examination meanings require unique keys.",
      );
    const criteria = new Map(
      profile.content.criteria.map((criterion) => [criterion.key, criterion]),
    );
    if (
      profile.content.finding_types.some((finding) =>
        finding.criterion_keys.some((key) => !criteria.has(key)),
      ) ||
      policy.content.obligation_types.some((obligation) =>
        obligation.criterion_keys.some((key) => !criteria.has(key)),
      )
    )
      throw new ExaminationBoundaryError(
        "EXAMINATION_SEMANTICS_UNREGISTERED",
        "Findings and obligations must bind registered named criteria.",
      );
    const kernel = new HypothesisExaminationKernel(
      {
        profile_ref: catalogRef(profile),
        policy_ref: catalogRef(policy),
        criteria,
        finding_types: new Map(
          profile.content.finding_types.map((f) => [f.key, f.axis]),
        ),
        finding_rules: new Map(
          profile.content.finding_types.map((f) => [f.key, f]),
        ),
        obligation_types: new Map(
          policy.content.obligation_types.map((o) => [o.key, o]),
        ),
        allowed_dispositions: policy.content.allowed_dispositions,
        required_obligation_types: policy.content.obligation_types
          .filter((o) => o.enforcement !== "advisory")
          .map((o) => o.key),
      },
      this.contracts,
    );
    return { profile, policy, kernel };
  }
}
