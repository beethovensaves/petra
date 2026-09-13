import type { PetraReviewRecoveryAssessment } from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { ReviewRecoveryAssessmentRequest } from "@petra/core";
import { canonicalize } from "json-canonicalize";

export interface ReviewRecoveryAssessmentClientOptions {
  readonly baseUrl: string;
  readonly token: string;
  readonly fetch?: typeof fetch;
  readonly contracts?: PetraContractRegistry;
}

export class ReviewRecoveryAssessmentClientError extends Error {
  constructor(
    readonly status: number,
    readonly response: unknown,
  ) {
    super(
      "The exact read-only Review recovery assessment is unavailable or inconsistent.",
    );
    this.name = "ReviewRecoveryAssessmentClientError";
  }
}

const hash = async (value: unknown): Promise<string> => {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};

/** Renderer-neutral query transport shared by direct and model-mediated callers. */
export class ReviewRecoveryAssessmentClient {
  readonly #contracts: PetraContractRegistry;
  constructor(readonly options: ReviewRecoveryAssessmentClientOptions) {
    this.#contracts = options.contracts ?? new PetraContractRegistry();
  }

  async assess(
    request: ReviewRecoveryAssessmentRequest,
  ): Promise<PetraReviewRecoveryAssessment> {
    if (
      Object.keys(request).sort().join(",") !==
        "expected_content_hash,expected_revision,project_id,review_session_id" ||
      !/^project_[0-9A-HJKMNP-TV-Z]{26}$/u.test(request.project_id) ||
      !/^review_session_[0-9A-HJKMNP-TV-Z]{26}$/u.test(
        request.review_session_id,
      ) ||
      !Number.isSafeInteger(request.expected_revision) ||
      request.expected_revision < 1 ||
      !/^sha256:[0-9a-f]{64}$/u.test(request.expected_content_hash)
    ) {
      throw new TypeError(
        "Recovery assessment requires an exact Project and Review identity; no member subset or operation is accepted.",
      );
    }
    const endpoint = new URL(
      `/api/queries/projects/${request.project_id}/reviews/${request.review_session_id}/recovery-assessment`,
      this.options.baseUrl,
    );
    endpoint.searchParams.set(
      "expected_revision",
      String(request.expected_revision),
    );
    endpoint.searchParams.set(
      "expected_content_hash",
      request.expected_content_hash,
    );
    const response = await (this.options.fetch ?? fetch)(endpoint, {
      method: "GET",
      headers: { authorization: `Bearer ${this.options.token}` },
    });
    const body: unknown = await response.json();
    if (!response.ok)
      throw new ReviewRecoveryAssessmentClientError(response.status, body);
    try {
      return await validateReviewRecoveryAssessment(
        body,
        request,
        this.#contracts,
      );
    } catch {
      throw new ReviewRecoveryAssessmentClientError(response.status, body);
    }
  }
}

/** Validates identities and complete manifests only; it computes no effect or eligibility. */
export async function validateReviewRecoveryAssessment(
  body: unknown,
  request: ReviewRecoveryAssessmentRequest,
  contracts = new PetraContractRegistry(),
): Promise<PetraReviewRecoveryAssessment> {
  contracts.assertValid("review-recovery-assessment", "1.0.0", body);
  const assessment = body as PetraReviewRecoveryAssessment;
  const content = assessment.content;
  const session = content.review_session;
  if (
    assessment.project_id !== request.project_id ||
    session.project_id !== request.project_id ||
    session.review_session_id !== request.review_session_id ||
    session.revision !== request.expected_revision ||
    session.content_hash !== request.expected_content_hash ||
    session.content_hash !== (await hash(session.content)) ||
    assessment.content_hash !== (await hash(content)) ||
    assessment.assessment_id !==
      `review_recovery_sha256_${assessment.content_hash.slice(7)}`
  )
    throw new Error("Mismatched assessment identity.");
  const ids = session.content.members.map((m) => m.review_member_id);
  if (
    new Set(ids).size !== ids.length ||
    content.review.members.length !== ids.length ||
    content.review.members.some((m, i) => m.review_member_id !== ids[i]) ||
    content.review.session.revision !== session.revision ||
    content.review.session.content_hash !== session.content_hash
  )
    throw new Error("Incomplete Review identity coverage.");
  if (
    new Set(content.preservation.map((i) => i.kind)).size !== 13 ||
    content.freshness.members.length !== ids.length ||
    content.freshness.members.some((m, i) => m.review_member_id !== ids[i]) ||
    content.freshness.authority_snapshot !==
      content.review.session.snapshot_state
  )
    throw new Error("Incomplete preservation or freshness inventory.");
  const covered = new Set(content.unbound_member_ids);
  const groupIds = new Set<string>();
  for (const group of content.groups) {
    if (
      groupIds.has(group.change_set.change_set_id) ||
      group.change_set.content.project_id !== request.project_id ||
      group.record_hash !== (await hash(group.change_set)) ||
      group.change_set.content_hash !==
        (await hash(group.change_set.content)) ||
      group.operation_count !== group.change_set.content.operations.length ||
      new Set(group.member_ids).size !== group.member_ids.length ||
      group.member_outcomes.length !== group.member_ids.length ||
      group.member_outcomes.some(
        (m, i) =>
          m.review_member_id !== group.member_ids[i] ||
          m.review_outcome !==
            content.review.members.find(
              (r) => r.review_member_id === m.review_member_id,
            )?.outcome,
      )
    )
      throw new Error("Incomplete atomic manifest.");
    groupIds.add(group.change_set.change_set_id);
    const bindings = session.content.members
      .filter((m) => group.member_ids.includes(m.review_member_id))
      .flatMap((m) => m.candidate_bindings);
    if (
      group.member_ids.some(
        (id) => !ids.includes(id) || content.unbound_member_ids.includes(id),
      ) ||
      bindings.some(
        (b) =>
          !group.change_set.content.operations.some(
            (o) =>
              o.target_id === b.record_ref.record_id &&
              o.base_revision === b.record_ref.revision,
          ),
      ) ||
      group.change_set.content.operations.some(
        (o) =>
          !bindings.some(
            (b) =>
              b.record_ref.record_id === o.target_id &&
              b.record_ref.revision === o.base_revision,
          ),
      )
    )
      throw new Error("Partial ChangeSet coverage.");
    const allTouchedMembers = session.content.members
      .filter((m) =>
        m.candidate_bindings.some((b) =>
          group.change_set.content.operations.some(
            (o) =>
              o.target_id === b.record_ref.record_id &&
              o.base_revision === b.record_ref.revision,
          ),
        ),
      )
      .map((m) => m.review_member_id);
    if (canonicalize(allTouchedMembers) !== canonicalize(group.member_ids))
      throw new Error("A shared ChangeSet omitted an affected Review member.");
    for (const id of group.member_ids) {
      const summary = content.review.members
        .find((m) => m.review_member_id === id)
        ?.change_sets.find(
          (c) => c.change_set_ref.record_id === group.change_set.change_set_id,
        );
      if (
        summary === undefined ||
        summary.change_set_ref.content_hash !== group.change_set.content_hash ||
        summary.state !== group.state
      )
        throw new Error(
          "The atomic manifest does not match every member's canonical ChangeSet.",
        );
    }
    if (
      group.history_assessment !== undefined &&
      (group.history_assessment.content_hash !==
        (await hash(group.history_assessment.content)) ||
        !group.events.some(
          (e) => e.event_id === group.history_assessment?.event_id,
        ))
    )
      throw new Error("History owner identity is inconsistent.");
    group.member_ids.forEach((id) => covered.add(id));
  }
  for (const member of content.review.members) {
    if (
      member.change_sets.some(
        (c) =>
          !content.groups.some(
            (g) =>
              g.change_set.change_set_id === c.change_set_ref.record_id &&
              g.member_ids.includes(member.review_member_id),
          ),
      )
    )
      throw new Error("An associated ChangeSet was omitted from the manifest.");
  }
  if (
    covered.size !== ids.length ||
    ids.some((id) => !covered.has(id)) ||
    content.unbound_member_ids.some((id) => !ids.includes(id)) ||
    new Set(content.unbound_member_ids).size !==
      content.unbound_member_ids.length ||
    content.coverage.review_members !== ids.length ||
    content.coverage.assessed_members !== ids.length ||
    content.coverage.atomic_change_sets !== content.groups.length ||
    content.coverage.operations !==
      content.groups.reduce((n, g) => n + g.operation_count, 0)
  )
    throw new Error("Assessment counts do not establish complete coverage.");
  return assessment;
}
