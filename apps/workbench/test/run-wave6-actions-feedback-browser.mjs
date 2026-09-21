import { spawn } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
const backendHarness = resolve(
  root,
  "scripts/test-wave4-cumulative-integration.mjs",
);
const instrumentedHarness = resolve(
  root,
  `scripts/.wave6-review-workflow-${process.pid}.mjs`,
);

if (process.versions.node !== "24.20.0") {
  throw new Error(
    `The Wave 6 Review workflow requires Node 24.20.0; received ${process.versions.node}.`,
  );
}

const replaceOnce = (source, expected, replacement) => {
  const first = source.indexOf(expected);
  if (first < 0 || source.indexOf(expected, first + expected.length) >= 0) {
    throw new Error(
      "The exact cumulative harness boundary changed; Review workflow instrumentation was not applied.",
    );
  }
  return `${source.slice(0, first)}${replacement}${source.slice(first + expected.length)}`;
};

const seedHelper = `const seedWave6ReviewWorkflow = async ({
  pool,
  scientific,
  interruptWorkUnit = scientific.workUnit,
}) => {
  const evidence = new PostgresEvidenceAuthorityRepository(pool);
  const working = new PostgresWorkingStateAuthorityRepository(pool);
  const sessions = new PostgresReviewSessionAuthorityRepository(pool);
  const grants = new PostgresCapabilityGrantAuthorityRepository(pool);
  const pairSpecs = [
    ["correction", 3],
    ["separation-retained", 4],
    ["separation-moved", 5],
    ["rejection", 6],
    ["apply", 7],
    ["interrupt", 8],
  ];
  const pairs = {};
  for (const [label, sequence] of pairSpecs) {
    const pair = makeScientificPair({
      definition: scientific.definition,
      objective: scientific.objective,
      workUnit: label === "interrupt" ? interruptWorkUnit : scientific.workUnit,
      sourceSpan: scientific.documentBundle.spans[0],
      workVersion: scientific.workVersion,
      label: \`wave6-review-ui:\${label}\`,
      sequence,
    });
    await evidence.proposeClaim(pair.claim);
    await evidence.proposeAssertion(pair.assertion);
    await working.admitWorkingCandidateRevision({
      candidate: pair.candidate,
      profileRecord: pair.claim,
    });
    await working.admitWorkingRelationshipRevision({
      relationship: pair.relationship,
      profileRecord: pair.assertion,
    });
    pairs[label] = pair;
  }
  const position = await authorityPosition(pool, scientificProjectId);
  const makeSession = async (
    label,
    members,
    originWorkUnit = scientific.workUnit,
  ) => {
    const session = readAccepted("review-session-working-candidate");
    session.review_session_id = derivePetraId(
      "review_session",
      \`wave6-review-ui:\${label}\`,
    );
    session.project_definition_ref = {
      project_definition_id: scientific.definition.project_definition_id,
      revision: scientific.definition.revision,
      content_hash: scientific.definition.content_hash,
    };
    session.content.objective_ref = {
      objective_id: scientific.objective.objective_id,
      revision: scientific.objective.revision,
      content_hash: scientific.objective.content_hash,
    };
    session.content.snapshot = {
      event_position: position.event_position,
      stream_revision: position.stream_revision,
      captured_at: "2026-09-20T20:00:00.000Z",
    };
    session.content.origin.record_refs = [originWorkUnit.work_unit_id];
    session.content.origin.summary =
      "Opened from the representative Work for the complete visible Review workflow.";
    session.content.return_context = {
      place: "work",
      object_ref: originWorkUnit.work_unit_id,
      label: "Review workflow Work",
    };
    session.content.members = members;
    session.content_hash = hash(session.content);
    await sessions.registerReviewSessionRevision(session);
    return session;
  };
  const correction = await makeSession("correction", [
    reviewMember(
      pairs.correction,
      derivePetraId("review_member", "wave6-review-ui:correction"),
    ),
  ]);
  const retainedMemberId = derivePetraId(
    "review_member",
    "wave6-review-ui:separation-retained",
  );
  const separatedMemberId = derivePetraId(
    "review_member",
    "wave6-review-ui:separation-moved",
  );
  const separation = await makeSession("separation", [
    reviewMember(pairs["separation-retained"], retainedMemberId),
    reviewMember(pairs["separation-moved"], separatedMemberId, "exception"),
  ]);
  const rejection = await makeSession("rejection", [
    reviewMember(
      pairs.rejection,
      derivePetraId("review_member", "wave6-review-ui:rejection"),
    ),
  ]);
  const apply = await makeSession("apply", [
    reviewMember(
      pairs.apply,
      derivePetraId("review_member", "wave6-review-ui:apply"),
    ),
  ]);
  const interrupt = await makeSession(
    "interrupt",
    [
      reviewMember(
        pairs.interrupt,
        derivePetraId("review_member", "wave6-review-ui:interrupt"),
      ),
    ],
    interruptWorkUnit,
  );
  const registerGrant = async ({ label, version, command, reason }) => {
    const content = {
      scope_kind: "project_commands",
      allowed_commands: Array.isArray(command) ? command : [command],
      valid_from: "2026-09-01T00:00:00.000Z",
      reason,
    };
    const grant = {
      schema_name: "petra.capability-grant",
      schema_version: version,
      capability_grant_id: derivePetraId(
        "capability_grant",
        \`wave6-review-ui:\${label}\`,
      ),
      revision: 1,
      project_id: scientificProjectId,
      grantee: { actor_id: humanActorId, actor_kind: "human" },
      content,
      content_hash: hash(content),
      issued_by: { actor_id: humanActorId, actor_kind: "human" },
      issued_at: "2026-09-01T00:00:00.000Z",
    };
    await grants.registerCapabilityGrant(grant);
    return grant;
  };
  await registerGrant({
    label: "basis-revision",
    version: "1.6.0",
    command: "ReviseReviewCandidateBasis",
    reason:
      "Allow the representative Project author to revise one exact non-authoritative Review basis.",
  });
  await registerGrant({
    label: "separation",
    version: "1.7.0",
    command: "SeparateReviewSessionMember",
    reason:
      "Allow the representative Project author to separate one exact Review member.",
  });
  const interruptGrantId = readAccepted("capability-grant").capability_grant_id;
  return {
    correction_review_session_id: correction.review_session_id,
    separation_review_session_id: separation.review_session_id,
    separated_review_member_id: separatedMemberId,
    reject_review_session_id: rejection.review_session_id,
    apply_review_session_id: apply.review_session_id,
    interrupt_review_session_id: interrupt.review_session_id,
    interrupt_review_member_id: interrupt.content.members[0].review_member_id,
    interrupt_capability_grant_id: interruptGrantId,
    interrupt_return_work_unit_id: interruptWorkUnit.work_unit_id,
    return_work_unit_id: scientific.workUnit.work_unit_id,
  };
};

const seedWave6ActionFeedbackWorkflow = async ({
  pool,
  scientific,
  continuation,
  artifactStore,
}) => {
  if (artifactStore === undefined) {
    throw new Error("The actions-feedback workflow requires the live ArtifactStore.");
  }
  const review = await seedWave6ReviewWorkflow({
    pool,
    scientific,
    interruptWorkUnit: continuation.workAndInteraction.work,
  });
  const postgres = await import("@petra/postgres");
  const core = await import("@petra/core");
  const contracts = new PetraContractRegistry();
  const inquiries = new PostgresProjectInquiryAuthorityRepository(pool);
  const grants = new PostgresCapabilityGrantAuthorityRepository(pool);
  const resultLink = readAccepted("project-inquiry-result-link");
  resultLink.project_inquiry_link_id = derivePetraId(
    "project_inquiry_link",
    "wave6-actions-feedback:grounded-result",
  );
  resultLink.project_id = scientificProjectId;
  resultLink.content.project_definition_ref = {
    project_definition_id: scientific.definition.project_definition_id,
    revision: scientific.definition.revision,
    content_hash: scientific.definition.content_hash,
  };
  resultLink.content.inquiry_role_ref = projectInquiryRoleRef(
    scientific.inquiryRole,
  );
  resultLink.content.inquiry_anchor.objective_ref = {
    objective_id: scientific.objective.objective_id,
    revision: scientific.objective.revision,
    content_hash: scientific.objective.content_hash,
    record_hash: hash(scientific.objective),
  };
  resultLink.content.target.result_ref = {
    schema_name: continuation.grounded.response.schema_name,
    schema_version: continuation.grounded.response.schema_version,
    record_id: continuation.grounded.response.grounded_response_id,
    revision: continuation.grounded.response.revision,
    content_hash: continuation.grounded.response.content_hash,
    record_hash: hash(continuation.grounded.response),
  };
  resultLink.content.target.produced_by_work_ref = {
    work_unit_id: continuation.workAndInteraction.work.work_unit_id,
    revision: continuation.workAndInteraction.work.revision,
    spec_hash: continuation.workAndInteraction.work.spec_hash,
    record_hash: hash(continuation.workAndInteraction.work),
  };
  resultLink.content_hash = hash(resultLink.content);
  await inquiries.registerProjectInquiryLink(resultLink);
  const actionGrantContent = {
    scope_kind: "project_commands",
    allowed_commands: ["InvokeSuggestedAction"],
    valid_from: "2026-09-01T00:00:00.000Z",
    reason:
      "Allow the representative Project author to confirm the exact displayed SuggestedAction.",
  };
  const actionGrant = {
    schema_name: "petra.capability-grant",
    schema_version: "1.2.0",
    capability_grant_id: derivePetraId(
      "capability_grant",
      "wave6-actions-feedback:invoke",
    ),
    revision: 1,
    project_id: scientificProjectId,
    grantee: { actor_id: humanActorId, actor_kind: "human" },
    content: actionGrantContent,
    content_hash: hash(actionGrantContent),
    issued_by: { actor_id: humanActorId, actor_kind: "human" },
    issued_at: "2026-09-01T00:00:00.000Z",
  };
  await grants.registerCapabilityGrant(actionGrant);

  const reviewReader = new postgres.PostgresProjectReviewViewReader(
    pool,
    contracts,
  );
  const reviewView = await reviewReader.getProjectReviewView(
    scientificProjectId,
    review.interrupt_review_session_id,
  );
  const workReader = new postgres.PostgresProjectWorkViewReader(pool, contracts);
  const workView = await workReader.getProjectWorkView(
    scientificProjectId,
    review.interrupt_return_work_unit_id,
  );
  if (
    reviewView === undefined ||
    workView === undefined ||
    workView.content.view_kind !== "detail"
  ) {
    throw new Error("The durable interrupt lost its exact Review or Work view.");
  }
  const authorizer = new PostgresCapabilityGrantCommandAuthorizer(contracts);
  const reviewBoundary = new postgres.PostgresReviewSessionApplyBoundary(
    pool,
    authorizer,
    new PostgresChangeControlAuthorityRepository(pool, authorizer),
    contracts,
    undefined,
    () => "2026-09-20T20:05:00.000Z",
  );
  const selection = {
    project_id: scientificProjectId,
    review_session_id: review.interrupt_review_session_id,
    expected_revision: reviewView.content.session.revision,
    expected_content_hash: reviewView.content.session.content_hash,
    selected_review_member_id: review.interrupt_review_member_id,
  };
  const actor = { actor_id: humanActorId, actor_kind: "human" };
  const applyAuthority = {
    authorization_basis: {
      kind: "authenticated_human_checkpoint",
      decision: "apply",
      actor,
    },
    capability_grants: {
      SubmitChangeSet: review.interrupt_capability_grant_id,
      RecordApproval: review.interrupt_capability_grant_id,
      ApplyChangeSet: review.interrupt_capability_grant_id,
    },
  };
  const rejectAuthority = {
    authorization_basis: {
      kind: "authenticated_human_checkpoint",
      decision: "reject",
      actor,
    },
    capability_grants: {
      SubmitChangeSet: review.interrupt_capability_grant_id,
      RecordApproval: review.interrupt_capability_grant_id,
    },
  };
  const applyCheckpoint = await reviewBoundary.prepareReviewApply(
    selection,
    applyAuthority,
  );
  const rejectCheckpoint = await reviewBoundary.prepareReviewReject(
    selection,
    rejectAuthority,
  );
  const synthesistExecutions = new PostgresSynthesistExecutionRepository(pool);
  const originalRequest = await synthesistExecutions.getRequest(
    continuation.workAndInteraction.synthesistRequestId,
  );
  if (originalRequest === undefined) {
    throw new Error(
      "The durable interrupt lost its originating synthesist request.",
    );
  }
  const request = structuredClone(originalRequest);
  const call = structuredClone(continuation.grounded.call);
  request.model_request_id = derivePetraId(
    "model_request",
    "wave6-actions-feedback:durable-review",
  );
  request.content.prompt_profile = {
    ...request.content.prompt_profile,
    name: "petra-wave6-review-interrupt-context",
    content_hash: hash(
      "wave6-actions-feedback:exact-review-interrupt-context",
    ),
  };
  call.model_call_id = derivePetraId(
    "model_call",
    "wave6-actions-feedback:durable-review",
  );
  call.content.model_request_id = request.model_request_id;
  call.content.prompt_profile = structuredClone(request.content.prompt_profile);
  call.started_at = "2026-09-20T20:04:01.000Z";
  call.completed_at = call.started_at;
  call.content_hash = hash(call.content);
  request.content.terminal.model_call_ids = [call.model_call_id];
  request.created_at = call.started_at;
  request.completed_at = call.completed_at;
  request.content_hash = hash(request.content);
  await synthesistExecutions.persistExecution({ request, calls: [call] });
  const interactionRun = readAccepted("interaction-run");
  interactionRun.interaction_run_id = derivePetraId(
    "interaction_run",
    "wave6-actions-feedback:durable-review",
  );
  interactionRun.project_id = scientificProjectId;
  interactionRun.feature_manifest_ref = structuredClone(
    continuation.workAndInteraction.terminalRun.feature_manifest_ref,
  );
  interactionRun.content.correlation = {
    protocol_thread_id:
      continuation.grounded.projectThread.project_thread_id,
    protocol_run_id: "run-wave6-actions-feedback-review",
    request_id: derivePetraId("request", "wave6-actions-feedback-review"),
    trace_id: derivePetraId("trace", "wave6-actions-feedback-review"),
    work_unit_ref: {
      work_unit_id: workView.content.summary.work_unit_ref.work_unit_id,
      revision: workView.content.summary.work_unit_ref.revision,
      spec_hash: workView.content.summary.work_unit_ref.spec_hash,
    },
    model_request_id: request.model_request_id,
  };
  interactionRun.content.authority_context.actor = actor;
  interactionRun.content.authority_context.capability_grant_id =
    review.interrupt_capability_grant_id;
  interactionRun.content.input = {
    input_hash: hash("Review the exact registered ChangeSet."),
    source_message_id: "wave6-actions-feedback-review-question",
  };
  interactionRun.content.lifecycle = {
    state: "completed",
    started_at: "2026-09-20T20:04:00.000Z",
    ended_at: "2026-09-20T20:04:02.000Z",
    outcome_code: "REVIEW_RESPONSE_REQUIRED",
  };
  interactionRun.content.stream_head = { state: "empty", event_count: 0 };
  interactionRun.content_hash = hash(interactionRun.content);
  interactionRun.created_by = actor;
  interactionRun.created_at = "2026-09-20T20:04:00.000Z";
  interactionRun.updated_at = interactionRun.created_at;

  const interactions = new postgres.PostgresInteractionAuthorityRepository(
    pool,
    contracts,
  );
  await interactions.registerRun(interactionRun);
  const response = structuredClone(continuation.grounded.response);
  response.grounded_response_id = derivePetraId(
    "grounded_response",
    "wave6-actions-feedback:durable-review",
  );
  response.content.execution_ref = {
    ...response.content.execution_ref,
    model_request_id: request.model_request_id,
    model_call_id: call.model_call_id,
  };
  response.content.interaction_ref = {
    interaction_run_ref: {
      interaction_run_id: interactionRun.interaction_run_id,
      revision: interactionRun.revision,
      content_hash: interactionRun.content_hash,
    },
    work_unit_ref: {
      work_unit_id: workView.content.summary.work_unit_ref.work_unit_id,
      revision: workView.content.summary.work_unit_ref.revision,
      spec_hash: workView.content.summary.work_unit_ref.spec_hash,
    },
  };
  response.content.cache = {
    state: "reusable",
    cache_key: groundedResponseCacheKey(
      request,
      continuation.grounded.evidencePacket,
    ),
    checked_at: call.completed_at,
  };
  response.content.terminal = {
    state: "completed",
    persisted_at: "2026-09-20T20:04:02.000Z",
    authority_effect: "none",
  };
  response.content_hash = hash(response.content);
  response.recorded_at = response.content.terminal.persisted_at;
  const packets = new InMemoryContextPacketRegistry();
  packets.registerContextPacket(
    continuation.grounded.context,
    certifiedGroundedPacketRecords(),
  );
  packets.registerEvidencePacket(continuation.grounded.evidencePacket);
  await new PostgresGroundedResponseAuthorityRepository(
    pool,
    packets,
  ).register({
    response,
    responseArtifact: continuation.workAndInteraction.responseArtifact.artifact,
    responseBytes: continuation.workAndInteraction.responseBytes,
    modelRequest: request,
    modelCall: call,
    interactionRun,
    workUnit: continuation.workAndInteraction.work,
  });
  const interruptThread = structuredClone(
    continuation.grounded.projectThread,
  );
  const priorThreadRevision = interruptThread.revision;
  const priorThreadHash = interruptThread.content_hash;
  const priorTurn = interruptThread.content.turns.at(-1);
  if (priorTurn === undefined) {
    throw new Error("The durable interrupt lost its originating Project turn.");
  }
  const interruptTurn = structuredClone(priorTurn);
  interruptTurn.project_turn_id = derivePetraId(
    "project_turn",
    "wave6-actions-feedback-review",
  );
  interruptTurn.sequence = priorTurn.sequence + 1;
  interruptTurn.previous_turn_id = priorTurn.project_turn_id;
  interruptTurn.input = {
    retention_state: "hash_only",
    input_hash: interactionRun.content.input.input_hash,
    source_message_id: interactionRun.content.input.source_message_id,
    limitation:
      "The exact durable Review request remains retained through its InteractionRun and command prompt Artifact.",
  };
  interruptTurn.execution = {
    interaction_run_ref: {
      interaction_run_id: interactionRun.interaction_run_id,
      revision: interactionRun.revision,
      content_hash: interactionRun.content_hash,
    },
    work_unit_ref: {
      work_unit_id: workView.content.summary.work_unit_ref.work_unit_id,
      revision: workView.content.summary.work_unit_ref.revision,
      spec_hash: workView.content.summary.work_unit_ref.spec_hash,
    },
  };
  interruptTurn.authority_context.actor = actor;
  interruptTurn.authority_context.capability_grant_id =
    review.interrupt_capability_grant_id;
  interruptTurn.response = {
    ...interruptTurn.response,
    result_record_ref: {
      schema_name: response.schema_name,
      schema_version: response.schema_version,
      record_id: response.grounded_response_id,
      revision: response.revision,
      content_hash: response.content_hash,
    },
    response_artifact_ref: structuredClone(
      response.content.response_artifact_ref,
    ),
  };
  interruptTurn.recorded_at = "2026-09-20T20:04:00.000Z";
  interruptThread.revision = priorThreadRevision + 1;
  interruptThread.lineage = {
    lineage_kind: "revision",
    parent_revision: priorThreadRevision,
    parent_hash: priorThreadHash,
  };
  interruptThread.content.turns.push(interruptTurn);
  interruptThread.content_hash = hash(interruptThread.content);
  interruptThread.updated_at = "2026-09-20T20:04:00.000Z";
  await new PostgresProjectThreadAuthorityRepository(
    pool,
  ).registerProjectThreadRevision(interruptThread);
  const artifacts = new PostgresArtifactAuthorityRepository(pool, artifactStore);
  const history = new DurableInteractionHistory({
    serviceActor: { actor_id: serviceActorId, actor_kind: "service" },
    artifactStore,
    artifacts,
    interactions,
    workUnits: new PostgresWorkUnitAuthorityRepository(pool),
  });
  const identity = {
    threadId: interactionRun.content.correlation.protocol_thread_id,
    runId: interactionRun.content.correlation.protocol_run_id,
    workUnitId: interactionRun.content.correlation.work_unit_ref.work_unit_id,
    modelRequestId: "unavailable",
    requestId: interactionRun.content.correlation.request_id,
    traceId: interactionRun.content.correlation.trace_id,
  };
  const runStartedEvent = {
    ...identity,
    sequence: 1,
    timestamp: Date.parse("2026-09-20T20:04:00.000Z"),
    kind: "run.started",
  };
  const [runStartedRecord] = await history.persistEvents(interactionRun, [
    runStartedEvent,
  ]);
  if (runStartedRecord === undefined) {
    throw new Error("The durable Review run start was not retained.");
  }
  const toolEvent = {
    ...identity,
    sequence: 2,
    timestamp: Date.parse("2026-09-20T20:04:01.000Z"),
    kind: "tool.proposal",
    toolCallId: "tool-wave6-actions-feedback-review",
    toolName: "petra.review_changeset",
    arguments: {
      changeSetId: applyCheckpoint.binding.change_set.change_set_id,
    },
  };
  const prompt = {
    schema_name: "petra.review-interrupt-command-prompt",
    schema_version: "1.0.0",
    project_id: scientificProjectId,
    interaction_run_ref: {
      interaction_run_id: interactionRun.interaction_run_id,
      revision: interactionRun.revision,
      content_hash: interactionRun.content_hash,
    },
    project_thread_ref: {
      project_thread_id: interruptThread.project_thread_id,
      revision: interruptThread.revision,
      content_hash: interruptThread.content_hash,
      record_hash: hash(interruptThread),
    },
    work_unit_ref: structuredClone(workView.content.summary.work_unit_ref),
    review_session_ref: {
      review_session_id: review.interrupt_review_session_id,
      revision: reviewView.content.session.revision,
      content_hash: reviewView.content.session.content_hash,
    },
    review_member_id: review.interrupt_review_member_id,
    return_context: structuredClone(reviewView.content.session.return_context),
    apply_checkpoint: applyCheckpoint,
    reject_checkpoint: rejectCheckpoint,
  };
  let promptBytes;
  try {
    promptBytes = core.reviewInterruptCommandPromptBytes(prompt);
  } catch (error) {
    process.stderr.write(
      "[wave6-actions-feedback-prompt] " +
        JSON.stringify(
          {
            prompt_project: prompt.project_id,
            apply_project: applyCheckpoint.binding.project_id,
            reject_project: rejectCheckpoint.binding.project_id,
            prompt_review: prompt.review_session_ref,
            apply_review: applyCheckpoint.binding.review_session,
            reject_review: rejectCheckpoint.binding.review_session,
            prompt_member: prompt.review_member_id,
            apply_member: applyCheckpoint.binding.selected_review_member_id,
            reject_member:
              rejectCheckpoint.binding.selected_review_member.review_member_id,
            apply_actor: applyCheckpoint.binding.authorization_basis.actor,
            reject_actor: rejectCheckpoint.binding.authorization_basis.actor,
            apply_grants: applyCheckpoint.binding.capability_grants,
            reject_grants: rejectCheckpoint.binding.capability_grants,
            apply_displayed: applyCheckpoint.displayed_commitment_hash,
            apply_computed: core.reviewApplyHash(applyCheckpoint.binding),
            reject_displayed: rejectCheckpoint.displayed_commitment_hash,
            reject_computed: core.reviewRejectHash(rejectCheckpoint.binding),
          },
          null,
          2,
        ) +
        "\\n",
    );
    throw error;
  }
  const registerGeneratedArtifact = async ({
    bytes,
    label,
    generatorName,
    sourceLocation,
  }) => {
    const contentHash =
      "sha256:" + createHash("sha256").update(bytes).digest("hex");
    const staged = await artifactStore.stage({
      bytes: [bytes],
      declaredByteSize: bytes.byteLength,
      declaredMediaType: "application/json",
      expectedContentHash: contentHash,
    });
    const available = await artifactStore.makeAvailable(staged);
    const records = sourceArtifactInput();
    records.artifact.artifact_id = derivePetraId("artifact", label);
    records.artifact.artifact_kind = "structured_text";
    records.artifact.media_type = "application/json";
    records.artifact.content_hash = contentHash;
    records.artifact.byte_size = bytes.byteLength;
    records.artifact.created_by = {
      actor_id: serviceActorId,
      actor_kind: "service",
    };
    records.artifact.created_at = "2026-09-20T20:04:01.000Z";
    records.manifest.artifact_manifest_id = derivePetraId(
      "artifact_manifest",
      label,
    );
    records.manifest.artifact_id = records.artifact.artifact_id;
    records.manifest.rights_decision_id = derivePetraId(
      "rights_decision",
      label,
    );
    records.manifest.origin = {
      origin_kind: "generated",
      generator_name: generatorName,
      generator_version: "1.0.0",
      generated_at: "2026-09-20T20:04:01.000Z",
      input_artifact_ids: [scientific.source.artifact.artifact_id],
    };
    records.manifest.storage_ref = {
      storage_kind: "content_addressed_object",
      store_name: available.storeName,
      object_key: available.objectKey,
      content_hash: available.contentHash,
      availability: "available",
      verified_at: available.availableAt,
    };
    records.manifest.integrity = {
      status: available.verification.status,
      checked_at: available.availableAt,
      problems: [...available.verification.problems],
    };
    records.manifest.recorded_at = available.availableAt;
    records.rightsDecision.rights_decision_id =
      records.manifest.rights_decision_id;
    records.rightsDecision.artifact_manifest_id =
      records.manifest.artifact_manifest_id;
    records.rightsDecision.source_location = sourceLocation;
    records.rightsDecision.observed_at = "2026-09-20T20:04:01.000Z";
    records.rightsDecision.created_at = "2026-09-20T20:04:01.000Z";
    await artifacts.registerVerifiedAcquisition(records);
    return records;
  };
  const promptRecords = await registerGeneratedArtifact({
    bytes: promptBytes,
    label: "wave6-actions-feedback-review-prompt",
    generatorName: "petra-review-interrupt-command-prompt",
    sourceLocation:
      "urn:petra:review-interrupt-command-prompt:wave6-actions-feedback",
  });
  const promptHash = promptRecords.artifact.content_hash;
  const requestPayloadRecords = await registerGeneratedArtifact({
    bytes: new TextEncoder().encode(canonicalize(toolEvent)),
    label: "wave6-actions-feedback-review-request-event",
    generatorName: "petra-interaction-event-payload",
    sourceLocation:
      "urn:petra:interaction-event:wave6-actions-feedback:review-request",
  });
  const requestEvent = readAccepted("interaction-event-record");
  requestEvent.interaction_event_record_id = derivePetraId(
    "interaction_event_record",
    "wave6-actions-feedback-review-request",
  );
  requestEvent.project_id = scientificProjectId;
  requestEvent.interaction_run_ref = prompt.interaction_run_ref;
  requestEvent.sequence = 2;
  requestEvent.lineage = {
    lineage_kind: "continuation",
    previous_event_record_id:
      runStartedRecord.interaction_event_record_id,
    previous_sequence: runStartedRecord.sequence,
    previous_content_hash: runStartedRecord.content_hash,
  };
  requestEvent.content.payload_artifact_ref = {
    artifact_id: requestPayloadRecords.artifact.artifact_id,
    content_sha256: requestPayloadRecords.artifact.content_hash,
    byte_size: requestPayloadRecords.artifact.byte_size,
    media_type: "application/json",
  };
  requestEvent.content_hash = hash(requestEvent.content);
  requestEvent.recorded_by = {
    actor_id: serviceActorId,
    actor_kind: "service",
  };
  requestEvent.recorded_at = "2026-09-20T20:04:01.000Z";
  await interactions.appendEvent(requestEvent);

  const pending = readAccepted("interaction-interrupt-pending");
  pending.interaction_interrupt_id = derivePetraId(
    "interaction_interrupt",
    "wave6-actions-feedback-review",
  );
  pending.project_id = scientificProjectId;
  pending.interaction_run_ref = prompt.interaction_run_ref;
  pending.content.request_event_ref = {
    interaction_event_record_id: requestEvent.interaction_event_record_id,
    sequence: requestEvent.sequence,
    content_hash: requestEvent.content_hash,
  };
  pending.content.subject_refs = [
    applyCheckpoint.binding.change_set.change_set_id,
    rejectCheckpoint.binding.change_set.change_set_id,
  ];
  pending.content.prompt_artifact_ref = {
    artifact_id: promptRecords.artifact.artifact_id,
    content_sha256: promptHash,
    byte_size: promptBytes.byteLength,
    media_type: "application/json",
  };
  pending.content.response_schema_ref = {
    schema_name: "review-interrupt-response",
    schema_version: "1.0.0",
    content_hash:
      "sha256:81a8a6771e1e7155681741b024f94862bf0e4c1cb7b8ff737b2fcf14f2a20306",
  };
  pending.content_hash = hash(pending.content);
  pending.recorded_by = {
    actor_id: serviceActorId,
    actor_kind: "service",
  };
  pending.created_at = "2026-09-20T20:04:02.000Z";
  pending.updated_at = pending.created_at;
  await interactions.registerInterrupt(pending);
  const reviewEvent = {
    ...identity,
    sequence: 3,
    timestamp: Date.parse("2026-09-20T20:04:02.000Z"),
    kind: "review.interrupt",
    interruptId: pending.interaction_interrupt_id,
    interruptRevision: pending.revision,
    interruptContentHash: pending.content_hash,
    interactionRunId: interactionRun.interaction_run_id,
    projectId: scientificProjectId,
    changeSetId: applyCheckpoint.binding.change_set.change_set_id,
    changeSetRevision: applyCheckpoint.binding.change_set.revision,
    changeSetContentHash: applyCheckpoint.binding.change_set.content_hash,
    toolCallId: toolEvent.toolCallId,
  };
  const eventRecords = await history.persistEvents(interactionRun, [
    runStartedEvent,
    toolEvent,
    reviewEvent,
  ]);
  await history.advanceRun(
    interactionRun,
    eventRecords,
    structuredClone(interactionRun.content.lifecycle),
    "2026-09-20T20:04:02.000Z",
  );
  return {
    ...review,
    action: {
      inquiry_result_link_id: resultLink.project_inquiry_link_id,
      capability_grant_id: actionGrant.capability_grant_id,
    },
    interrupt: {
      protocol_thread_id: interactionRun.content.correlation.protocol_thread_id,
      protocol_run_id: interactionRun.content.correlation.protocol_run_id,
      interaction_interrupt_id: pending.interaction_interrupt_id,
      interaction_run_id: interactionRun.interaction_run_id,
      review_session_id: review.interrupt_review_session_id,
      return_work_unit_id: review.interrupt_return_work_unit_id,
    },
  };
};

`;

let source = readFileSync(backendHarness, "utf8");
source = replaceOnce(
  source,
  "const item53Counts = async (pool) => {",
  `${seedHelper}const item53Counts = async (pool) => {`,
);
source = replaceOnce(
  source,
  `    await record("restart_complete", {
      item49ReviewHash: postRestartReview?.content_hash,
      failureReviewHash: failureReview.content_hash,
    });`,
  `    let wave6ReviewScenario;
    try {
      wave6ReviewScenario = await seedWave6ActionFeedbackWorkflow({
        pool,
        scientific,
        continuation,
        artifactStore,
      });
    } catch (error) {
      process.stderr.write(
        "[wave6-actions-feedback-seed] " +
          (error instanceof Error ? error.stack : String(error)) +
          (Array.isArray(error?.validationErrors)
            ? "\\n" + JSON.stringify(error.validationErrors, null, 2)
            : "") +
          "\\n",
      );
      throw error;
    }
    await record("restart_complete", {
      item49ReviewHash: postRestartReview?.content_hash,
      failureReviewHash: failureReview.content_hash,
      wave6ReviewScenario,
    });`,
);

const run = () =>
  new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [instrumentedHarness], {
      cwd: root,
      env: process.env,
      stdio: "inherit",
    });
    child.on("error", rejectRun);
    child.on("close", (code, signal) => {
      if (code === 0) resolveRun();
      else
        rejectRun(
          new Error(
            `The instrumented Review workflow failed (${code ?? signal}).`,
          ),
        );
    });
  });

let failure;
try {
  writeFileSync(instrumentedHarness, source, { flag: "wx" });
  await run();
} catch (error) {
  failure = error;
} finally {
  try {
    unlinkSync(instrumentedHarness);
  } catch (error) {
    if (error?.code !== "ENOENT" && failure === undefined) failure = error;
  }
}

if (failure !== undefined) throw failure;
