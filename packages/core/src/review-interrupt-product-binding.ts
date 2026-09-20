import { createHash } from "node:crypto";

import type {
  PetraArtifact,
  PetraArtifactManifest,
  PetraInteractionRun,
  PetraProjectReviewViewRecord,
  PetraProjectThreadView,
  PetraProjectWorkReadView,
  PetraReviewInterruptResponse,
  PetraReviewSessionApplyCheckpoint,
  PetraReviewSessionApplyRequest,
  PetraReviewSessionRejectCheckpoint,
  PetraReviewSessionRejectRequest,
  PetraRightsDecision,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";

import type { ArtifactStore } from "./artifact-store.js";
import type { AvailableArtifact } from "./artifact-store.js";
import type { ArtifactAuthorityRepository } from "./artifact-registry.js";
import {
  DurableReviewInterruptError,
  type ReviewInterruptBinding,
  type ReviewInterruptBindingLoader,
  type ReviewInterruptRepository,
  type ReviewResponsePayloadRecorder,
} from "./durable-review-interrupt.js";
import type { InteractionAuthorityRepository } from "./interaction-authority-repository.js";
import { derivePetraId } from "./identity.js";
import type { ProjectThreadViewReader } from "./project-thread.js";
import type { ProjectWorkViewReader } from "./project-work-view.js";
import type { ProjectReviewViewReader } from "./review-session.js";
import {
  buildReviewApplyPlan,
  reviewApplyHash,
  type ReviewSessionApplyBoundary,
} from "./review-session-apply.js";
import {
  buildReviewRejectPlan,
  reviewRejectHash,
  type ReviewSessionRejectBoundary,
} from "./review-session-reject.js";

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const same = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);

const fail = (message: string): never => {
  throw new DurableReviewInterruptError(
    "REVIEW_INTERRUPT_BINDING_CONFLICT",
    message,
  );
};

export interface ReviewInterruptCommandPrompt {
  readonly schema_name: "petra.review-interrupt-command-prompt";
  readonly schema_version: "1.0.0";
  readonly project_id: string;
  readonly interaction_run_ref: {
    readonly interaction_run_id: string;
    readonly revision: number;
    readonly content_hash: string;
  };
  readonly project_thread_ref: {
    readonly project_thread_id: string;
    readonly revision: number;
    readonly content_hash: string;
    readonly record_hash: string;
  };
  readonly work_unit_ref: {
    readonly work_unit_id: string;
    readonly revision: number;
    readonly spec_hash: string;
    readonly record_hash: string;
  };
  readonly review_session_ref: {
    readonly review_session_id: string;
    readonly revision: number;
    readonly content_hash: string;
  };
  readonly review_member_id: string;
  readonly return_context: {
    readonly place:
      | "brief"
      | "sources"
      | "review"
      | "graph"
      | "work"
      | "petra"
      | "composition"
      | "history"
      | "profile_tool";
    readonly object_ref?: string;
    readonly label: string;
  };
  readonly apply_checkpoint: PetraReviewSessionApplyCheckpoint;
  readonly reject_checkpoint: PetraReviewSessionRejectCheckpoint;
}

export const reviewInterruptCommandPromptBytes = (
  prompt: ReviewInterruptCommandPrompt,
): Uint8Array => {
  assertPrompt(prompt);
  return new TextEncoder().encode(canonicalize(prompt));
};

const assertPrompt = (prompt: ReviewInterruptCommandPrompt): void => {
  const apply = prompt.apply_checkpoint;
  const reject = prompt.reject_checkpoint;
  const applyBinding = apply.binding;
  const rejectBinding = reject.binding;
  if (
    prompt.schema_name !== "petra.review-interrupt-command-prompt" ||
    prompt.schema_version !== "1.0.0" ||
    apply.schema_name !== "petra.review-session-apply-checkpoint" ||
    apply.schema_version !== "1.0.0" ||
    reject.schema_name !== "petra.review-session-reject-checkpoint" ||
    reject.schema_version !== "1.0.0" ||
    apply.displayed_commitment_hash !== reviewApplyHash(applyBinding) ||
    reject.displayed_commitment_hash !== reviewRejectHash(rejectBinding) ||
    prompt.project_id !== applyBinding.project_id ||
    prompt.project_id !== rejectBinding.project_id ||
    prompt.review_session_ref.review_session_id !==
      applyBinding.review_session.review_session_id ||
    prompt.review_session_ref.review_session_id !==
      rejectBinding.review_session.review_session_id ||
    prompt.review_session_ref.revision !==
      applyBinding.review_session.revision ||
    prompt.review_session_ref.revision !==
      rejectBinding.review_session.revision ||
    prompt.review_session_ref.content_hash !==
      applyBinding.review_session.content_hash ||
    prompt.review_session_ref.content_hash !==
      rejectBinding.review_session.content_hash ||
    prompt.review_member_id !== applyBinding.selected_review_member_id ||
    prompt.review_member_id !==
      rejectBinding.selected_review_member.review_member_id ||
    !same(
      applyBinding.authorization_basis.actor,
      rejectBinding.authorization_basis.actor,
    ) ||
    applyBinding.capability_grants.SubmitChangeSet !==
      rejectBinding.capability_grants.SubmitChangeSet ||
    applyBinding.capability_grants.RecordApproval !==
      rejectBinding.capability_grants.RecordApproval
  ) {
    fail(
      "The retained interrupt prompt does not bind one exact Project, Review member, ChangeSet, and authenticated command authority.",
    );
  }
};

const bytesFrom = async (
  stream: AsyncIterable<Uint8Array>,
): Promise<Uint8Array> => {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of stream) {
    size += chunk.byteLength;
    if (size > 8 * 1024 * 1024) {
      fail("The retained interrupt command prompt exceeds Petra's safe limit.");
    }
    chunks.push(chunk);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

const selectedReviewMember = (
  review: PetraProjectReviewViewRecord,
  memberId: string,
): Extract<
  PetraProjectReviewViewRecord,
  { schema_version: "1.2.0" | "1.3.0" }
>["content"]["members"][number] => {
  if (review.schema_version !== "1.2.0" && review.schema_version !== "1.3.0") {
    fail(
      "A durable Review interrupt requires the current working-state Review view.",
    );
  }
  const member = review.content.members.find(
    (candidate) => candidate.review_member_id === memberId,
  );
  if (member === undefined) {
    fail(
      "The retained Review member is no longer present in the exact Review.",
    );
  }
  return member as Extract<
    PetraProjectReviewViewRecord,
    { schema_version: "1.2.0" | "1.3.0" }
  >["content"]["members"][number];
};

const exactThread = (
  thread: PetraProjectThreadView | undefined,
  prompt: ReviewInterruptCommandPrompt,
  run: PetraInteractionRun,
): PetraProjectThreadView => {
  if (thread === undefined) {
    throw new DurableReviewInterruptError(
      "REVIEW_INTERRUPT_BINDING_CONFLICT",
      "The exact originating ProjectThread revision is unavailable or stale.",
    );
  }
  if (thread.content.view_kind !== "detail") {
    throw new DurableReviewInterruptError(
      "REVIEW_INTERRUPT_BINDING_CONFLICT",
      "The exact originating ProjectThread revision is unavailable or stale.",
    );
  }
  if (!same(thread.content.summary.thread_ref, prompt.project_thread_ref)) {
    fail(
      "The exact originating ProjectThread revision is unavailable or stale.",
    );
  }
  const linked = thread.content.turns.some(
    ({ turn }) =>
      turn.execution.interaction_run_ref.interaction_run_id ===
        run.interaction_run_id &&
      turn.execution.interaction_run_ref.revision === run.revision &&
      turn.execution.interaction_run_ref.content_hash === run.content_hash &&
      turn.execution.work_unit_ref.work_unit_id ===
        prompt.work_unit_ref.work_unit_id &&
      turn.execution.work_unit_ref.revision === prompt.work_unit_ref.revision &&
      turn.execution.work_unit_ref.spec_hash === prompt.work_unit_ref.spec_hash,
  );
  if (!linked) {
    fail(
      "The originating ProjectThread no longer binds the exact InteractionRun and WorkUnit.",
    );
  }
  return thread;
};

const exactWork = (
  work: PetraProjectWorkReadView | undefined,
  prompt: ReviewInterruptCommandPrompt,
): PetraProjectWorkReadView => {
  if (work === undefined) {
    throw new DurableReviewInterruptError(
      "REVIEW_INTERRUPT_BINDING_CONFLICT",
      "The exact originating WorkUnit revision is unavailable or stale.",
    );
  }
  if (work.content.view_kind !== "detail") {
    throw new DurableReviewInterruptError(
      "REVIEW_INTERRUPT_BINDING_CONFLICT",
      "The exact originating WorkUnit revision is unavailable or stale.",
    );
  }
  if (!same(work.content.summary.work_unit_ref, prompt.work_unit_ref)) {
    fail("The exact originating WorkUnit revision is unavailable or stale.");
  }
  return work;
};

const destinationPath = (
  projectId: string,
  destination: ReviewInterruptCommandPrompt["return_context"],
): string => {
  const base = `/projects/${encodeURIComponent(projectId)}`;
  const suffix =
    destination.place === "profile_tool"
      ? "profile"
      : destination.place === "composition"
        ? "brief"
        : destination.place;
  return `${base}/${suffix}${
    destination.object_ref === undefined
      ? ""
      : `/${encodeURIComponent(destination.object_ref)}`
  }`;
};

export class DurableReviewInterruptProductBindingLoader implements ReviewInterruptBindingLoader {
  readonly #interactions: InteractionAuthorityRepository;
  readonly #artifactStore: ArtifactStore;
  readonly #reviews: ProjectReviewViewReader;
  readonly #threads: ProjectThreadViewReader;
  readonly #work: ProjectWorkViewReader;
  readonly #apply: ReviewSessionApplyBoundary;
  readonly #reject: ReviewSessionRejectBoundary;

  constructor(input: {
    interactions: InteractionAuthorityRepository;
    artifactStore: ArtifactStore;
    reviews: ProjectReviewViewReader;
    threads: ProjectThreadViewReader;
    work: ProjectWorkViewReader;
    apply: ReviewSessionApplyBoundary;
    reject: ReviewSessionRejectBoundary;
  }) {
    this.#interactions = input.interactions;
    this.#artifactStore = input.artifactStore;
    this.#reviews = input.reviews;
    this.#threads = input.threads;
    this.#work = input.work;
    this.#apply = input.apply;
    this.#reject = input.reject;
  }

  loadForProtocolRun(): Promise<ReviewInterruptBinding | undefined> {
    // Initial presentation registers its freshly prepared binding in-process.
    // Restart/replay uses the persisted InteractionRun and interrupt response.
    return Promise.resolve(undefined);
  }

  async loadForResponse(
    response: PetraReviewInterruptResponse,
  ): Promise<ReviewInterruptBinding | undefined> {
    const pending = await this.#interactions.getInterruptRevision(
      response.interrupt_ref.interaction_interrupt_id,
      response.interrupt_ref.revision,
    );
    if (pending === undefined) return undefined;
    if (pending.content.state !== "pending") {
      throw new DurableReviewInterruptError(
        "REVIEW_INTERRUPT_BINDING_CONFLICT",
        "The response does not name a pending durable Review interrupt.",
      );
    }
    const pendingContent = pending.content;
    if (
      pending.project_id !== response.project_id ||
      pending.interaction_run_ref.interaction_run_id !==
        response.interaction_run_id ||
      pendingContent.prompt_artifact_ref === undefined
    ) {
      fail(
        "The response does not bind one exact pending durable Review interrupt and retained command prompt.",
      );
    }
    const run = await this.#interactions.getRunRevision(
      pending.interaction_run_ref.interaction_run_id,
      pending.interaction_run_ref.revision,
    );
    if (run === undefined) {
      throw new DurableReviewInterruptError(
        "REVIEW_INTERRUPT_BINDING_CONFLICT",
        "The interrupt's exact durable InteractionRun is unavailable or stale.",
      );
    }
    if (
      run.project_id !== response.project_id ||
      run.content_hash !== pending.interaction_run_ref.content_hash
    ) {
      fail(
        "The interrupt's exact durable InteractionRun is unavailable or stale.",
      );
    }
    const promptRef = pendingContent.prompt_artifact_ref;
    const stored = await this.#artifactStore.readByHash(
      promptRef.content_sha256,
      {
        byteSize: promptRef.byte_size,
        mediaType: promptRef.media_type,
      },
    );
    const bytes = await bytesFrom(stored.bytes);
    if (
      bytes.byteLength !== promptRef.byte_size ||
      stored.artifact.contentHash !== promptRef.content_sha256
    ) {
      fail(
        "The retained interrupt command prompt failed exact byte verification.",
      );
    }
    let prompt: ReviewInterruptCommandPrompt;
    try {
      prompt = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      ) as ReviewInterruptCommandPrompt;
    } catch {
      return fail(
        "The retained interrupt command prompt is not valid UTF-8 JSON.",
      );
    }
    assertPrompt(prompt);
    if (
      canonicalHash(prompt) !== promptRef.content_sha256 ||
      prompt.project_id !== response.project_id ||
      !same(prompt.interaction_run_ref, pending.interaction_run_ref) ||
      !same(prompt.interaction_run_ref, {
        interaction_run_id: run.interaction_run_id,
        revision: run.revision,
        content_hash: run.content_hash,
      }) ||
      run.content.correlation.protocol_thread_id !==
        prompt.project_thread_ref.project_thread_id ||
      run.content.correlation.work_unit_ref.work_unit_id !==
        prompt.work_unit_ref.work_unit_id ||
      run.content.correlation.work_unit_ref.revision !==
        prompt.work_unit_ref.revision ||
      run.content.correlation.work_unit_ref.spec_hash !==
        prompt.work_unit_ref.spec_hash
    ) {
      fail(
        "The command prompt does not preserve the exact Project, ProjectThread, InteractionRun, and WorkUnit binding.",
      );
    }

    const review = await this.#reviews.getProjectReviewView(
      prompt.project_id,
      prompt.review_session_ref.review_session_id,
    );
    if (review === undefined) {
      throw new DurableReviewInterruptError(
        "REVIEW_INTERRUPT_BINDING_CONFLICT",
        "The exact Review revision or its return context is stale.",
      );
    }
    if (
      review.project_id !== prompt.project_id ||
      review.review_session_id !==
        prompt.review_session_ref.review_session_id ||
      review.content.session.revision !== prompt.review_session_ref.revision ||
      review.content.session.content_hash !==
        prompt.review_session_ref.content_hash ||
      !same(review.content.session.return_context, prompt.return_context)
    ) {
      fail("The exact Review revision or its return context is stale.");
    }
    const member = selectedReviewMember(review, prompt.review_member_id);
    const task = member.working_state.candidate.task_context;
    if (
      !["work_unit", "interaction_work"].includes(task.task_kind) ||
      !("work_unit_ref" in task) ||
      task.work_unit_ref.record_id !== prompt.work_unit_ref.work_unit_id ||
      task.work_unit_ref.revision !== prompt.work_unit_ref.revision ||
      task.work_unit_ref.record_hash !== prompt.work_unit_ref.record_hash ||
      (task.task_kind === "interaction_work" &&
        (task.thread_binding.project_thread_ref.record_id !==
          prompt.project_thread_ref.project_thread_id ||
          task.thread_binding.project_thread_ref.revision !==
            prompt.project_thread_ref.revision ||
          task.thread_binding.project_thread_ref.record_hash !==
            prompt.project_thread_ref.record_hash ||
          task.interaction_run_ref.record_id !== run.interaction_run_id ||
          task.interaction_run_ref.revision !== run.revision))
    ) {
      fail(
        "The Review member no longer binds the exact originating ProjectThread, WorkUnit, and InteractionRun.",
      );
    }
    exactThread(
      await this.#threads.getProjectThreadView(
        prompt.project_id,
        prompt.project_thread_ref.project_thread_id,
      ),
      prompt,
      run,
    );
    exactWork(
      await this.#work.getProjectWorkView(
        prompt.project_id,
        prompt.work_unit_ref.work_unit_id,
      ),
      prompt,
    );

    const applyRequest: PetraReviewSessionApplyRequest = {
      schema_name: "petra.review-session-apply-request",
      schema_version: "1.0.0",
      checkpoint: structuredClone(prompt.apply_checkpoint),
      decided_at: response.decided_at,
    };
    const rejectRequest: PetraReviewSessionRejectRequest = {
      schema_name: "petra.review-session-reject-request",
      schema_version: "1.0.0",
      checkpoint: structuredClone(prompt.reject_checkpoint),
      rationale: response.rationale,
      decided_at: response.decided_at,
    };
    const selectedCheckpoint =
      response.decision === "accept"
        ? prompt.apply_checkpoint
        : prompt.reject_checkpoint;
    const selectedBinding = selectedCheckpoint.binding;
    const changeSet = selectedBinding.change_set;
    if (
      response.change_set_ref.change_set_id !== changeSet.change_set_id ||
      response.change_set_ref.revision !== changeSet.revision ||
      response.change_set_ref.content_hash !== changeSet.content_hash
    ) {
      fail("The response does not name the exact previewed Review ChangeSet.");
    }
    const actor = selectedBinding.authorization_basis.actor;
    const grant = selectedBinding.capability_grants.RecordApproval;
    const authorityContext = {
      actor: { actor_id: actor.actor_id, actor_kind: "human" as const },
      capability_grant_id: grant,
    };
    if (
      run.content.authority_context.actor.actor_kind !== "human" ||
      !same(run.content.authority_context.actor, authorityContext.actor) ||
      run.content.authority_context.capability_grant_id !== grant
    ) {
      fail(
        "The authenticated command checkpoint does not match the InteractionRun authority context.",
      );
    }
    const buildPlan = () =>
      response.decision === "accept"
        ? buildReviewApplyPlan(applyRequest)
        : buildReviewRejectPlan(rejectRequest);
    const expectedPlan = buildPlan();
    return {
      presentation: {
        protocol_run_id: run.content.correlation.protocol_run_id,
        project_id: prompt.project_id,
        interaction_run_id: run.interaction_run_id,
        interrupt_ref: structuredClone(response.interrupt_ref),
        change_set_ref: structuredClone(response.change_set_ref),
      },
      authority_context: authorityContext,
      buildPlan,
      executePlan: async ({ plan }) => {
        if (!same(plan, expectedPlan)) {
          fail(
            "The Petra-mediated Review plan differs from the direct Review command plan.",
          );
        }
        return response.decision === "accept"
          ? await this.#apply.executeReviewApply(applyRequest, {
              authorization_basis: structuredClone(
                prompt.apply_checkpoint.binding.authorization_basis,
              ),
              capability_grants: structuredClone(
                prompt.apply_checkpoint.binding.capability_grants,
              ),
            })
          : await this.#reject.executeReviewReject(rejectRequest, {
              authorization_basis: structuredClone(
                prompt.reject_checkpoint.binding.authorization_basis,
              ),
              capability_grants: structuredClone(
                prompt.reject_checkpoint.binding.capability_grants,
              ),
            });
      },
      return_context: {
        project_thread_ref: structuredClone(prompt.project_thread_ref),
        review_session_ref: structuredClone(prompt.review_session_ref),
        review_member_id: prompt.review_member_id,
        work_unit_ref: structuredClone(prompt.work_unit_ref),
        destination: structuredClone(prompt.return_context),
        paths: {
          project_thread: `/projects/${encodeURIComponent(prompt.project_id)}/petra/${encodeURIComponent(prompt.project_thread_ref.project_thread_id)}`,
          review: `/projects/${encodeURIComponent(prompt.project_id)}/review/${encodeURIComponent(prompt.review_session_ref.review_session_id)}`,
          work: `/projects/${encodeURIComponent(prompt.project_id)}/work/${encodeURIComponent(prompt.work_unit_ref.work_unit_id)}`,
          return: destinationPath(prompt.project_id, prompt.return_context),
        },
      },
    };
  }
}

export class ArtifactStoreReviewResponsePayloadRecorder implements ReviewResponsePayloadRecorder {
  readonly #store: ArtifactStore;
  readonly #artifacts: ArtifactAuthorityRepository | undefined;
  readonly #serviceActor:
    { readonly actor_id: string; readonly actor_kind: "service" } | undefined;

  constructor(
    input:
      | ArtifactStore
      | {
          readonly store: ArtifactStore;
          readonly artifacts: ArtifactAuthorityRepository;
          readonly serviceActor: {
            readonly actor_id: string;
            readonly actor_kind: "service";
          };
        },
  ) {
    if ("stage" in input) {
      this.#store = input;
      this.#artifacts = undefined;
      this.#serviceActor = undefined;
    } else {
      this.#store = input.store;
      this.#artifacts = input.artifacts;
      this.#serviceActor = input.serviceActor;
    }
  }

  async recordResponse(response: PetraReviewInterruptResponse) {
    const bytes = new TextEncoder().encode(canonicalize(response));
    const hash = canonicalHash(response);
    const staged = await this.#store.stage({
      bytes: [bytes],
      declaredByteSize: bytes.byteLength,
      declaredMediaType: "application/json",
      expectedContentHash: hash,
    });
    const available = await this.#store.makeAvailable(staged);
    if (this.#artifacts !== undefined && this.#serviceActor !== undefined) {
      await persistResponseArtifact(
        this.#artifacts,
        responseArtifactRecords(response, available, this.#serviceActor),
      );
    }
    return {
      artifact_id: derivePetraId("artifact", hash),
      content_sha256: available.contentHash,
      byte_size: available.byteSize,
      media_type: "application/json" as const,
    };
  }
}

const responseArtifactRecords = (
  response: PetraReviewInterruptResponse,
  available: AvailableArtifact,
  serviceActor: { readonly actor_id: string; readonly actor_kind: "service" },
): {
  artifact: PetraArtifact;
  manifest: PetraArtifactManifest;
  rightsDecision: PetraRightsDecision;
} => {
  const actor = {
    actor_id: serviceActor.actor_id,
    actor_kind: "service" as const,
  };
  const seed = `${response.interaction_run_id}|${response.client_response_id}|${available.contentHash}`;
  const artifactId = derivePetraId("artifact", available.contentHash);
  const manifestId = derivePetraId("artifact_manifest", seed);
  const rightsId = derivePetraId("rights_decision", seed);
  return {
    artifact: {
      schema_name: "petra.artifact",
      schema_version: "1.0.0",
      artifact_id: artifactId,
      revision: 1,
      artifact_kind: "structured_text",
      media_type: "application/json",
      content_hash: available.contentHash,
      byte_size: available.byteSize,
      created_by: actor,
      created_at: available.availableAt,
    },
    manifest: {
      schema_name: "petra.artifact-manifest",
      schema_version: "1.0.0",
      artifact_manifest_id: manifestId,
      revision: 1,
      artifact_id: artifactId,
      rights_decision_id: rightsId,
      origin: {
        origin_kind: "generated",
        generator_name: "petra-review-interrupt-response",
        generator_version: "1.0.0",
        generated_at: available.availableAt,
        input_artifact_ids: [],
      },
      storage_ref: {
        storage_kind: "content_addressed_object",
        store_name: available.storeName,
        object_key: available.objectKey,
        content_hash: available.contentHash,
        availability: "available",
        verified_at: available.availableAt,
      },
      integrity:
        available.verification.status === "verified"
          ? {
              status: "verified",
              checked_at: available.availableAt,
              problems: [],
            }
          : {
              status: "verified_with_warnings",
              checked_at: available.availableAt,
              problems: available.verification.problems.map(
                (message, index) => ({
                  code: `STORE_WARNING_${String(index + 1).padStart(2, "0")}`,
                  severity: "warning" as const,
                  message,
                }),
              ) as [
                {
                  code: string;
                  severity: "warning";
                  message: string;
                },
                ...{
                  code: string;
                  severity: "warning";
                  message: string;
                }[],
              ],
            },
      recorded_by: actor,
      recorded_at: available.availableAt,
    },
    rightsDecision: {
      schema_name: "petra.rights-decision",
      schema_version: "1.0.0",
      rights_decision_id: rightsId,
      revision: 1,
      artifact_manifest_id: manifestId,
      source_location: `urn:petra:review-interrupt-response:${response.interaction_run_id}:${response.client_response_id}`,
      license_status: "known",
      observed_license: {
        statement: "Petra-generated private Review interrupt response.",
        source: "artifact",
      },
      access_basis: "permission",
      decision_status: "verified",
      permissions: {
        store_raw_bytes: true,
        parse: true,
        index: false,
        embed: false,
        send_selected_text_remotely: false,
        quote_publicly: false,
        redistribute_artifact: false,
      },
      conditions: [],
      required_notices: [],
      authorization_reference: "petra-private-review-interrupt/1.0.0",
      decision_maker: actor,
      rationale:
        "The response records an authenticated private Review decision and is not model or domain authority.",
      observed_at: available.availableAt,
      policy_version: "petra-rights/1.0.0",
      created_at: available.availableAt,
    },
  };
};

const persistResponseArtifact = async (
  repository: ArtifactAuthorityRepository,
  records: ReturnType<typeof responseArtifactRecords>,
): Promise<void> => {
  const existing = await repository.getArtifact(records.artifact.artifact_id);
  if (existing === undefined) {
    try {
      await repository.registerVerifiedAcquisition(records);
      return;
    } catch (error) {
      const concurrent = await repository.getArtifact(
        records.artifact.artifact_id,
      );
      if (concurrent === undefined || !same(concurrent, records.artifact)) {
        throw error;
      }
    }
  } else if (!same(existing, records.artifact)) {
    fail("The response payload hash is bound to a different Artifact.");
  }
  await repository.attachVerifiedManifest({
    artifactId: records.artifact.artifact_id,
    manifest: records.manifest,
    rightsDecision: records.rightsDecision,
  });
};

export const asReviewInterruptRepository = (
  interactions: InteractionAuthorityRepository,
): ReviewInterruptRepository => interactions;
