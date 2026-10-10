import type {
  PetraHypothesis,
  PetraHypothesisAssessment,
  PetraPostureDecision,
  PetraCycleDisposition,
  PetraProjectSemanticGraphView,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { copilotHash } from "./project-copilot.js";

type Reference = PetraHypothesisAssessment["content"]["subject_ref"];
type Axis = PetraHypothesisAssessment["content"]["axes"][number]["axis"];
type Criterion = PetraHypothesisAssessment["content"]["criteria"][number];
type Disposition = PetraCycleDisposition["content"]["disposition"];
export interface ExaminationSemantics {
  readonly profile_ref: Reference;
  readonly policy_ref: Reference;
  readonly criteria: ReadonlyMap<
    string,
    {
      readonly required_for_satisfied: boolean;
      readonly permitted_origins: readonly Criterion["origin"][];
      readonly required_evidence_schemas?: readonly string[];
      readonly method?: string;
    }
  >;
  readonly finding_types: ReadonlyMap<string, Axis>;
  readonly finding_rules?: ReadonlyMap<
    string,
    {
      readonly permitted_summaries: readonly string[];
      readonly criterion_keys: readonly string[];
    }
  >;
  readonly obligation_types: ReadonlyMap<
    string,
    {
      readonly criterion_keys: readonly string[];
      readonly enforcement: PetraPostureDecision["content"]["obligations"][number]["enforcement"];
    }
  >;
  readonly allowed_dispositions: readonly Disposition[];
  readonly required_obligation_types?: readonly string[];
}
export class ExaminationBoundaryError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ExaminationBoundaryError";
  }
}
const same = (a: unknown, b: unknown): boolean =>
  copilotHash(a) === copilotHash(b);
const key = (ref: Reference): string =>
  `${ref.schema_name}:${ref.record_id}@${ref.revision}:${ref.record_hash}`;
export const examinationRecordRef = (
  record:
    | PetraHypothesis
    | PetraHypothesisAssessment
    | PetraPostureDecision
    | PetraCycleDisposition,
): Reference => {
  const id =
    "hypothesis_id" in record
      ? record.hypothesis_id
      : "hypothesis_assessment_id" in record
        ? record.hypothesis_assessment_id
        : "posture_decision_id" in record
          ? record.posture_decision_id
          : record.cycle_disposition_id;
  return {
    schema_name: record.schema_name,
    schema_version: record.schema_version,
    record_id: id,
    revision: record.revision,
    record_hash: copilotHash(record),
  };
};
const summaries: Record<Axis, readonly string[]> = {
  development: [
    "unknown",
    "seed",
    "articulated",
    "structured",
    "test_ready",
    "developed",
  ],
  activity: [
    "unknown",
    "idle",
    "mapping_literature",
    "analyzing_evidence",
    "designing_test",
    "under_test",
    "awaiting_review",
    "reproducing",
    "updating_standing",
  ],
  warrant: [
    "unknown",
    "unassessed",
    "insufficient",
    "supporting_within_scope",
    "challenging_within_scope",
    "mixed",
    "scope_dependent",
    "underdetermined",
    "not_comparable",
  ],
  lifecycle: ["unknown", "active", "paused", "retired", "superseded"],
  scientific_standing: [
    "unknown",
    "unassessed",
    "historical_only",
    "qualified_within_scope",
    "disputed_within_scope",
  ],
  alternative_coverage: [
    "unknown",
    "unsearched",
    "seeded",
    "bounded_search",
    "broad_search",
    "provisionally_saturated",
  ],
  project_dependence: ["unknown", "none", "local", "material", "critical"],
  research_stakes: ["unknown", "human_defined_within_scope"],
};

/** Registered semantics alone may control posture and cycle disposition.
 * Model proposals and unmapped considerations remain inspectable without this
 * authority. Command owners must authenticate and authorize the human separately.
 */
export class HypothesisExaminationKernel {
  constructor(
    readonly semantics: ExaminationSemantics,
    readonly contracts = new PetraContractRegistry(),
  ) {}
  #record(
    record:
      | PetraHypothesis
      | PetraHypothesisAssessment
      | PetraPostureDecision
      | PetraCycleDisposition,
  ): void {
    this.contracts.assertValid(
      record.schema_name.replace(/^petra\./u, ""),
      record.schema_version,
      record,
    );
    if (record.content_hash !== copilotHash(record.content))
      throw new ExaminationBoundaryError(
        "RECORD_HASH",
        "The examination record content hash is incoherent.",
      );
  }
  #refs(graph: PetraProjectSemanticGraphView): Set<string> {
    const refs = graph.content.nodes.flatMap((node) => [
      node.record_ref,
      ...(node.source_passages?.flatMap((passage) => [
        passage.project_source_ref,
        passage.rights_ref,
        {
          schema_name: passage.span.schema_name,
          schema_version: passage.span.schema_version,
          record_id: passage.span.source_span_id,
          revision: passage.span.revision,
          record_hash: copilotHash(passage.span),
        },
      ]) ?? []),
    ]);
    refs.push(...graph.content.relationships.map((edge) => edge.record_ref));
    if (
      graph.content.objective_ref !== undefined &&
      graph.content.objective_ref !== null
    )
      refs.push(graph.content.objective_ref);
    return new Set(refs.map(key));
  }
  #examinedRefs(graph: PetraProjectSemanticGraphView): Set<string> {
    return new Set(
      graph.content.nodes
        .filter(
          (node) =>
            node.material_state === "available" &&
            node.native_record !== undefined,
        )
        .flatMap((node) => [
          key(node.record_ref),
          ...(node.source_passages ?? []).map((passage) =>
            key({
              schema_name: passage.span.schema_name,
              schema_version: passage.span.schema_version,
              record_id: passage.span.source_span_id,
              revision: passage.span.revision,
              record_hash: copilotHash(passage.span),
            }),
          ),
        ]),
    );
  }
  #graph(graph: PetraProjectSemanticGraphView): void {
    this.contracts.assertValid("project-semantic-graph-view", "1.0.0", graph);
    if (graph.content_hash !== copilotHash(graph.content))
      throw new ExaminationBoundaryError(
        "GRAPH_HASH",
        "The exact examined graph content hash is incoherent.",
      );
    for (const node of graph.content.nodes) {
      if (node.native_record === undefined) continue;
      this.contracts.assertValid(
        node.record_ref.schema_name.replace(/^petra\./u, ""),
        node.record_ref.schema_version,
        node.native_record,
      );
      if (copilotHash(node.native_record) !== node.record_ref.record_hash)
        throw new ExaminationBoundaryError(
          "NATIVE_MATERIAL_HASH",
          "The examined native record does not match its exact graph reference.",
        );
    }
  }
  #basis(
    assessment: PetraHypothesisAssessment,
    graph: PetraProjectSemanticGraphView,
  ): void {
    if (
      assessment.project_id !== graph.project_id ||
      assessment.content.basis.graph_content_hash !== graph.content_hash ||
      !same(
        assessment.content.basis.objective_ref ?? null,
        graph.content.objective_ref ?? null,
      ) ||
      assessment.content.basis.event_position !==
        graph.content.authority.event_position ||
      assessment.content.basis.stream_revision !==
        graph.content.authority.stream_revision ||
      assessment.content.basis.definition_ref.record_id !==
        graph.content.definition_ref.record_id ||
      assessment.content.basis.definition_ref.revision !==
        graph.content.definition_ref.revision ||
      assessment.content.basis.definition_ref.content_hash !==
        graph.content.definition_ref.content_hash
    )
      throw new ExaminationBoundaryError(
        "SNAPSHOT_CHANGED",
        "The assessment must pin this exact Project, definition, and examined graph snapshot.",
      );
  }
  validateHypothesis(
    hypothesis: PetraHypothesis,
    graph: PetraProjectSemanticGraphView,
  ): void {
    this.#record(hypothesis);
    this.#graph(graph);
    if (
      hypothesis.project_id !== graph.project_id ||
      hypothesis.content.target_claim_ref.schema_name !== "petra.claim" ||
      !this.#refs(graph).has(key(hypothesis.content.target_claim_ref))
    )
      throw new ExaminationBoundaryError(
        "TARGET_BINDING",
        "The Hypothesis must bind an exact Claim represented in its own Project.",
      );
    if (
      hypothesis.revision === 1 &&
      hypothesis.content.development !== "seed" &&
      hypothesis.content.development !== "articulated"
    )
      throw new ExaminationBoundaryError(
        "DEVELOPMENT_BASIS",
        "A new Hypothesis cannot assert a completed formal cycle or valid protocol.",
      );
  }
  validateAssessment(
    assessment: PetraHypothesisAssessment,
    hypothesis: PetraHypothesis,
    graph: PetraProjectSemanticGraphView,
  ): void {
    this.validateHypothesis(hypothesis, graph);
    this.#record(assessment);
    this.#basis(assessment, graph);
    if (
      !same(assessment.content.subject_ref, examinationRecordRef(hypothesis)) ||
      !same(
        assessment.content.target_claim_ref,
        hypothesis.content.target_claim_ref,
      ) ||
      !same(assessment.content.profile_ref, this.semantics.profile_ref) ||
      !same(assessment.content.policy_ref, this.semantics.policy_ref)
    )
      throw new ExaminationBoundaryError(
        "ASSESSMENT_BINDING",
        "The assessment subject, target, profile, and policy must remain exact.",
      );
    const refs = this.#refs(graph);
    if (
      assessment.content.review_state === "reviewed" &&
      (assessment.created_by.actor_kind !== "human" ||
        assessment.content.origin !== "human_judgment")
    )
      throw new ExaminationBoundaryError(
        "ASSESSMENT_REVIEW",
        "Only a retained human judgment may declare a reviewed assessment under this profile.",
      );
    const criterionKeys = new Set<string>();
    for (const criterion of assessment.content.criteria) {
      const registered = this.semantics.criteria.get(criterion.criterion_key);
      if (
        !registered ||
        criterionKeys.has(criterion.criterion_key) ||
        !registered.permitted_origins.includes(criterion.origin)
      )
        throw new ExaminationBoundaryError(
          "CRITERION_UNREGISTERED",
          "An unregistered or duplicate criterion cannot control verification.",
        );
      criterionKeys.add(criterion.criterion_key);
      if (
        registered.method !== undefined &&
        criterion.method !== registered.method
      )
        throw new ExaminationBoundaryError(
          "CRITERION_METHOD",
          "The named criterion must preserve its registered examination method.",
        );
      if (criterion.evidence_refs.some((ref) => !refs.has(key(ref))))
        throw new ExaminationBoundaryError(
          "EVIDENCE_BINDING",
          "A criterion cited evidence outside the exact examined snapshot.",
        );
      if (
        criterion.result !== "unknown" &&
        (criterion.origin === "model_proposal" ||
          criterion.evidence_refs.length === 0 ||
          (registered.required_evidence_schemas?.includes("petra.claim") &&
            !criterion.evidence_refs.some(
              (ref) => key(ref) === key(assessment.content.target_claim_ref),
            )) ||
          registered.required_evidence_schemas?.some(
            (schema) =>
              !criterion.evidence_refs.some(
                (ref) => ref.schema_name === schema,
              ),
          ) ||
          criterion.evidence_refs.some(
            (ref) => !this.#examinedRefs(graph).has(key(ref)),
          ))
      )
        throw new ExaminationBoundaryError(
          "CRITERION_AUTHORITY",
          "Model proposals and evidence-free criteria cannot establish a passed or failed finding.",
        );
    }
    const findingKeys = new Set<string>();
    for (const finding of assessment.content.findings) {
      if (findingKeys.has(finding.finding_key))
        throw new ExaminationBoundaryError(
          "FINDING_DUPLICATE",
          "Finding keys must be unique within their assessment.",
        );
      findingKeys.add(finding.finding_key);
      if (
        finding.evidence_refs.some((ref) => !refs.has(key(ref))) ||
        finding.criterion_keys.some((id) => !criterionKeys.has(id))
      )
        throw new ExaminationBoundaryError(
          "FINDING_BINDING",
          "A Finding must retain its exact examined evidence and named criteria.",
        );
      // Unmapped Findings can be retained. They cannot drive an axis or posture.
      const registered = this.semantics.finding_types.get(finding.type_key);
      if (registered !== undefined && registered !== finding.axis)
        throw new ExaminationBoundaryError(
          "FINDING_AXIS",
          "The Finding's registered meaning belongs to a different axis.",
        );
      const rule = this.semantics.finding_rules?.get(finding.type_key);
      if (
        rule !== undefined &&
        rule.criterion_keys.some((id) => !finding.criterion_keys.includes(id))
      )
        throw new ExaminationBoundaryError(
          "FINDING_CRITERIA",
          "A registered Finding must retain every criterion required by its meaning.",
        );
    }
    const axisKeys = new Set<Axis>();
    for (const axis of assessment.content.axes) {
      if (
        axisKeys.has(axis.axis) ||
        !summaries[axis.axis].includes(axis.summary)
      )
        throw new ExaminationBoundaryError(
          "AXIS_SUMMARY",
          "An axis summary must have one registered scoped meaning; numeric confidence is unavailable.",
        );
      axisKeys.add(axis.axis);
      if (axis.dependency_refs.some((ref) => !refs.has(key(ref))))
        throw new ExaminationBoundaryError(
          "AXIS_BINDING",
          "The axis depends on material outside this examined snapshot.",
        );
      const findings = axis.finding_keys.map((id) =>
        assessment.content.findings.find(
          (finding) => finding.finding_key === id,
        ),
      );
      if (
        findings.some(
          (finding) =>
            finding !== undefined &&
            this.semantics.finding_rules
              ?.get(finding.type_key)
              ?.permitted_summaries.includes(axis.summary) === false,
        )
      )
        throw new ExaminationBoundaryError(
          "FINDING_MEANING",
          "The axis summary exceeds the registered Finding's scoped meaning.",
        );
      if (
        findings.some(
          (finding) =>
            finding === undefined ||
            this.semantics.finding_types.get(finding.type_key) !== axis.axis,
        )
      )
        throw new ExaminationBoundaryError(
          "AXIS_UNMAPPED",
          "Unmapped considerations cannot control an assessment axis.",
        );
      if (
        !["unknown", "unassessed"].includes(axis.summary) &&
        (findings.length === 0 ||
          findings.some(
            (finding) =>
              finding?.origin === "model_proposal" ||
              finding?.review_state !== "reviewed",
          ))
      )
        throw new ExaminationBoundaryError(
          "AXIS_REVIEW",
          "A scoped finding requires reviewed registered basis. Missing information remains unknown.",
        );

      if (
        [
          "supporting_within_scope",
          "challenging_within_scope",
          "mixed",
        ].includes(axis.summary) &&
        findings.some(
          (finding) =>
            finding !== undefined &&
            this.semantics.finding_rules
              ?.get(finding.type_key)
              ?.criterion_keys.some(
                (id) =>
                  !assessment.content.criteria.some(
                    (criterion) =>
                      criterion.criterion_key === id &&
                      criterion.result === "passed" &&
                      criterion.origin !== "model_proposal",
                  ),
              ),
        )
      )
        throw new ExaminationBoundaryError(
          "WARRANT_CRITERIA",
          "Scoped warrant requires the named examined criteria of its registered Finding.",
        );
      if (axis.axis === "activity")
        throw new ExaminationBoundaryError(
          "ACTIVITY_OWNER",
          "Activity is derived from current WorkUnits, never written by an assessment.",
        );
      if (axis.axis === "lifecycle" || axis.axis === "development")
        throw new ExaminationBoundaryError(
          "STATE_OWNER",
          "Hypothesis lifecycle and development belong to their own accepted transition history.",
        );
    }
  }
  freshness(
    assessment: PetraHypothesisAssessment,
    graph: PetraProjectSemanticGraphView,
  ): { state: "current" | "stale" | "invalidated"; affected_axes: Axis[] } {
    this.#record(assessment);
    this.#graph(graph);
    if (assessment.project_id !== graph.project_id)
      throw new ExaminationBoundaryError(
        "PROJECT_SCOPE",
        "Freshness cannot be resolved using another Project.",
      );
    const refs = this.#refs(graph);
    const definitionChanged =
      assessment.content.basis.definition_ref.record_id !==
        graph.content.definition_ref.record_id ||
      assessment.content.basis.definition_ref.revision !==
        graph.content.definition_ref.revision ||
      assessment.content.basis.definition_ref.content_hash !==
        graph.content.definition_ref.content_hash;
    const semanticsChanged =
      !same(assessment.content.profile_ref, this.semantics.profile_ref) ||
      !same(assessment.content.policy_ref, this.semantics.policy_ref);
    const objectiveChanged = !same(
      assessment.content.basis.objective_ref ?? null,
      graph.content.objective_ref ?? null,
    );
    const targetChanged = !refs.has(key(assessment.content.target_claim_ref));
    const affected = assessment.content.axes
      .filter(
        (axis) =>
          definitionChanged ||
          semanticsChanged ||
          (objectiveChanged &&
            [
              "warrant",
              "alternative_coverage",
              "project_dependence",
              "research_stakes",
            ].includes(axis.axis)) ||
          (targetChanged &&
            ["warrant", "scientific_standing", "alternative_coverage"].includes(
              axis.axis,
            )) ||
          axis.dependency_refs.some((ref) => !refs.has(key(ref))),
      )
      .map((axis) => axis.axis);
    return {
      state:
        definitionChanged ||
        semanticsChanged ||
        objectiveChanged ||
        targetChanged ||
        affected.length > 0
          ? "invalidated"
          : assessment.content.basis.graph_content_hash !== graph.content_hash
            ? "stale"
            : "current",
      affected_axes: affected,
    };
  }
  validatePosture(
    posture: PetraPostureDecision,
    assessment: PetraHypothesisAssessment,
    hypothesis: PetraHypothesis,
    graph: PetraProjectSemanticGraphView,
  ): void {
    this.validateAssessment(assessment, hypothesis, graph);
    this.#record(posture);
    this.#record(assessment);
    this.#graph(graph);
    if (
      posture.project_id !== assessment.project_id ||
      !same(posture.content.assessment_ref, examinationRecordRef(assessment)) ||
      !same(posture.content.profile_ref, this.semantics.profile_ref) ||
      !same(posture.content.policy_ref, this.semantics.policy_ref)
    )
      throw new ExaminationBoundaryError(
        "POSTURE_BINDING",
        "Posture must pin the exact assessment, profile, and policy.",
      );
    if (
      posture.content.determining_finding_keys.some(
        (id) =>
          !assessment.content.findings.some(
            (finding) =>
              finding.finding_key === id &&
              this.semantics.finding_types.has(finding.type_key) &&
              finding.review_state === "reviewed" &&
              finding.origin !== "model_proposal",
          ),
      )
    )
      throw new ExaminationBoundaryError(
        "POSTURE_FINDING",
        "Unmapped or unreviewed Findings cannot determine an active posture.",
      );
    if (
      posture.content.state === "active" &&
      (posture.created_by.actor_kind !== "human" ||
        assessment.content.review_state !== "reviewed" ||
        this.freshness(assessment, graph).state !== "current")
    )
      throw new ExaminationBoundaryError(
        "POSTURE_ACTIVATION",
        "Active posture requires an authorized human's reviewed current assessment.",
      );
    const obligationKeys = new Set<string>();
    if (
      posture.content.state === "active" &&
      posture.content.expires_at !== null &&
      Date.parse(posture.content.expires_at) <= Date.parse(posture.created_at)
    ) {
      throw new ExaminationBoundaryError(
        "POSTURE_EXPIRED",
        "An already expired posture cannot be activated.",
      );
    }
    if (
      posture.content.state === "active" &&
      this.semantics.required_obligation_types?.some(
        (type) =>
          !posture.content.obligations.some(
            (obligation) => obligation.type_key === type,
          ),
      )
    )
      throw new ExaminationBoundaryError(
        "OBLIGATION_MISSING",
        "An active posture must retain every mandatory obligation of its registered policy.",
      );
    for (const obligation of posture.content.obligations) {
      if (obligationKeys.has(obligation.obligation_id))
        throw new ExaminationBoundaryError(
          "OBLIGATION_DUPLICATE",
          "An obligation must have one identity within its posture.",
        );
      obligationKeys.add(obligation.obligation_id);
      const registered = this.semantics.obligation_types.get(
        obligation.type_key,
      );
      if (
        !registered ||
        registered.enforcement !== obligation.enforcement ||
        !same(
          [...registered.criterion_keys].sort(),
          [...obligation.criterion_keys].sort(),
        )
      )
        throw new ExaminationBoundaryError(
          "OBLIGATION_UNREGISTERED",
          "Only the registered obligation semantics can control a transition.",
        );
      if (
        obligation.enforcement !== "advisory" &&
        posture.content.state !== "active"
      )
        throw new ExaminationBoundaryError(
          "OBLIGATION_ACTIVATION",
          "Enforceable obligations require an active posture.",
        );
      if (obligation.state === "waived" || obligation.waiver_ref !== null)
        throw new ExaminationBoundaryError(
          "WAIVER_UNAVAILABLE",
          "This initial profile grants no waiver authority; waiver never means satisfaction.",
        );
      if (
        obligation.state === "satisfied" &&
        (obligation.satisfaction_evidence_refs.length === 0 ||
          obligation.satisfaction_evidence_refs.some(
            (ref) => !this.#refs(graph).has(key(ref)),
          ) ||
          obligation.criterion_keys.some(
            (id) =>
              !assessment.content.criteria.some(
                (criterion) =>
                  criterion.criterion_key === id &&
                  criterion.result === "passed",
              ),
          ))
      )
        throw new ExaminationBoundaryError(
          "OBLIGATION_SATISFACTION",
          "Work completion does not satisfy an obligation without its named criterion evidence.",
        );
      if (
        obligation.creating_finding_key !== null &&
        !assessment.content.findings.some(
          (finding) =>
            finding.finding_key === obligation.creating_finding_key &&
            this.semantics.finding_types.has(finding.type_key),
        )
      )
        throw new ExaminationBoundaryError(
          "OBLIGATION_FINDING",
          "The obligation must retain its registered creating Finding.",
        );
    }
  }
  validateDisposition(
    disposition: PetraCycleDisposition,
    assessment: PetraHypothesisAssessment,
    posture: PetraPostureDecision,
    hypothesis: PetraHypothesis,
    graph: PetraProjectSemanticGraphView,
  ): void {
    this.#record(disposition);
    this.validatePosture(posture, assessment, hypothesis, graph);
    this.#basis(assessment, graph);
    if (
      disposition.project_id !== assessment.project_id ||
      !same(
        disposition.content.assessment_ref,
        examinationRecordRef(assessment),
      ) ||
      !same(disposition.content.posture_ref, examinationRecordRef(posture)) ||
      !same(disposition.content.basis, assessment.content.basis) ||
      !this.semantics.allowed_dispositions.includes(
        disposition.content.disposition,
      )
    )
      throw new ExaminationBoundaryError(
        "DISPOSITION_BINDING",
        "Cycle disposition must pin the reviewed assessment and posture under the registered policy.",
      );
    if (
      disposition.created_by.actor_kind !== "human" ||
      assessment.content.review_state !== "reviewed" ||
      this.freshness(assessment, graph).state !== "current"
    )
      throw new ExaminationBoundaryError(
        "DISPOSITION_REVIEW",
        "A cycle disposition needs an authorized human's reviewed current assessment.",
      );
    if (
      posture.content.expires_at !== null &&
      Date.parse(posture.content.expires_at) <=
        Date.parse(disposition.created_at)
    )
      throw new ExaminationBoundaryError(
        "POSTURE_EXPIRED",
        "An expired posture cannot govern a new cycle disposition.",
      );
    if (
      ["supporting_within_scope", "challenging_within_scope", "mixed"].includes(
        disposition.content.disposition,
      )
    ) {
      if (
        posture.content.state !== "active" ||
        posture.content.obligations.some(
          (obligation) =>
            obligation.enforcement !== "advisory" &&
            obligation.state !== "satisfied",
        )
      )
        throw new ExaminationBoundaryError(
          "OPEN_OBLIGATION",
          "Open mandatory obligations prevent a satisfied cycle disposition.",
        );
      for (const [id, criterion] of this.semantics.criteria) {
        if (
          criterion.required_for_satisfied &&
          !assessment.content.criteria.some(
            (value) =>
              value.criterion_key === id &&
              value.result === "passed" &&
              value.origin !== "model_proposal" &&
              value.evidence_refs.length > 0,
          )
        )
          throw new ExaminationBoundaryError(
            "UNEXAMINED_CRITERION",
            "Unexamined required evidence prevents a satisfied cycle disposition.",
          );
      }
      const warrant = assessment.content.axes.find(
        (axis) => axis.axis === "warrant",
      );
      if (warrant?.summary !== disposition.content.disposition)
        throw new ExaminationBoundaryError(
          "WARRANT_BINDING",
          "A scoped disposition cannot exceed the reviewed warrant finding.",
        );
    }
    if (
      assessment.content.material_unknowns.some(
        (unknown) =>
          !disposition.content.unresolved_questions.includes(unknown),
      )
    ) {
      throw new ExaminationBoundaryError(
        "UNKNOWN_ERASURE",
        "A scoped disposition must preserve every material unknown from its assessment.",
      );
    }
    if (
      disposition.content.criterion_keys.some(
        (id) =>
          !assessment.content.criteria.some(
            (criterion) => criterion.criterion_key === id,
          ),
      ) ||
      disposition.content.finding_keys.some(
        (id) =>
          !assessment.content.findings.some(
            (finding) => finding.finding_key === id,
          ),
      )
    )
      throw new ExaminationBoundaryError(
        "DISPOSITION_EVIDENCE",
        "A disposition cites unexamined criteria or Findings.",
      );
  }
}
