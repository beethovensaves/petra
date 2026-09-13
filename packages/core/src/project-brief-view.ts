import type { PetraProjectBriefReadView } from "@petra/contracts";

export interface ProjectBriefRequest {
  readonly expected_snapshot_hash?: string;
  readonly baseline_event_id?: string;
  readonly baseline_record_hash?: string;
}

/** Read-only composition. HTTP authentication remains server-owned. */
export interface ProjectBriefViewReader {
  getProjectBriefView(
    projectId: string,
    request?: ProjectBriefRequest,
  ): Promise<PetraProjectBriefReadView | undefined>;
}

export class ProjectBriefError extends Error {
  constructor(
    readonly code:
      | "PROJECT_BRIEF_UNSUPPORTED"
      | "PROJECT_BRIEF_STALE"
      | "PROJECT_BRIEF_CORRUPT"
      | "PROJECT_BRIEF_REQUEST_INVALID"
      | "PROJECT_BRIEF_BASELINE_UNAVAILABLE",
    message: string,
  ) {
    super(message);
    this.name = "ProjectBriefError";
  }
}

/** Stable identity of canonical owner observations; elapsed time and read timestamps are excluded. */
export const projectBriefSnapshotMaterial = (
  content: PetraProjectBriefReadView["content"],
): unknown => ({
  shell: content.shell.content_hash,
  definition: content.definition.content_hash,
  objective: {
    id: content.objective.objective_id,
    revision: content.objective.revision,
    hash: content.objective.content_hash,
  },
  reviews: content.reviews.map((view) => ({
    id: view.review_session_id,
    hash: view.content_hash,
  })),
  work: content.work.map((view) =>
    view.content.view_kind === "detail"
      ? view.content.summary.work_unit_ref
      : undefined,
  ),
  links: content.inquiry_links.map((link) => ({
    id: link.project_inquiry_link_id,
    hash: link.content_hash,
  })),
  actions: content.next_steps.map((view) => view.content_hash),
  profile: {
    sources: content.profile_payload.sources.map((view) => ({
      id: view.project_source_id,
      hash: view.content_hash,
    })),
    coverage: content.profile_payload.source_coverage,
    ...(content.profile_payload.schema_version === "1.1.0"
      ? { current_state: content.profile_payload.current_state }
      : {}),
  },
  history: content.recent_decisions.content_hash,
  comparison: content.comparison,
});

/** Validates identity and evidence bindings; does not calculate presentation or action eligibility. */
export const assertProjectBriefIntegrity = async (
  view: PetraProjectBriefReadView,
  projectId: string,
  digest: (value: unknown) => Promise<string>,
  profileSchemaHash: string,
): Promise<void> => {
  const fail = (): never => {
    throw new ProjectBriefError(
      "PROJECT_BRIEF_CORRUPT",
      "The Brief does not preserve its exact Project, profile, snapshot, and canonical owner bindings.",
    );
  };
  const c = view.content;
  const d = c.definition;
  const o = c.objective;
  const ref = o.project_definition_ref;
  if (
    view.project_id !== projectId ||
    d.project_id !== projectId ||
    o.project_id !== projectId ||
    ref.project_definition_id !== d.project_definition_id ||
    ref.revision !== d.revision ||
    ref.content_hash !== d.content_hash ||
    c.shell.content.definition.project_definition_id !==
      d.project_definition_id ||
    c.shell.content.definition.revision !== d.revision ||
    c.shell.content.definition.content_hash !== d.content_hash ||
    c.shell.content.current_objective?.objective_id !== o.objective_id ||
    c.shell.content.current_objective.revision !== o.revision ||
    c.shell.content.current_objective.content_hash !== o.content_hash ||
    c.orientation.statement !== o.content.statement
  )
    fail();
  if (view.schema_version !== c.profile_payload.schema_version) fail();
  const registrations = d.content.registrations.filter(
    (r) =>
      r.registration_kind === "extension" &&
      r.semantic_key === c.profile_registration.semantic_key,
  );
  if (
    registrations.length !== 1 ||
    registrations[0]!.contract.name !== c.profile_payload.schema_name ||
    registrations[0]!.contract.version !== c.profile_payload.schema_version ||
    registrations[0]!.contract.content_hash !== profileSchemaHash ||
    (await digest(registrations[0])) !== (await digest(c.profile_registration))
  )
    fail();
  if (
    (await digest(c)) !== view.content_hash ||
    (await digest(projectBriefSnapshotMaterial(c))) !== view.snapshot_hash ||
    (await digest(d.content)) !== d.content_hash ||
    (await digest(o.content)) !== o.content_hash
  )
    fail();
  const owners = [
    c.shell,
    ...c.reviews,
    ...c.work,
    ...c.next_steps,
    ...c.profile_payload.sources,
    c.recent_decisions,
  ];
  for (const owner of owners) {
    if (
      owner.project_id !== projectId ||
      owner.read_at !== view.read_at ||
      (await digest(owner.content)) !== owner.content_hash
    )
      fail();
    const authority = owner.content.authority;
    const position =
      "event_position" in authority
        ? authority.event_position
        : authority.through_event_position;
    const revision =
      "stream_revision" in authority
        ? authority.stream_revision
        : authority.through_stream_revision;
    if (
      position !== c.shell.content.authority.event_position ||
      revision !== c.shell.content.authority.stream_revision
    )
      fail();
  }
  for (const link of c.inquiry_links) {
    const anchor = link.content.inquiry_anchor.objective_ref;
    if (
      link.project_id !== projectId ||
      anchor.objective_id !== o.objective_id ||
      anchor.revision !== o.revision ||
      anchor.content_hash !== o.content_hash ||
      anchor.record_hash !== (await digest(o)) ||
      (await digest(link.content)) !== link.content_hash
    )
      fail();
  }
  for (const link of c.inquiry_links) {
    const target = link.content.target;
    if (
      target.target_kind === "work" &&
      !c.work.some(
        (work) =>
          work.content.view_kind === "detail" &&
          work.content.summary.work_unit_ref.work_unit_id ===
            target.work_unit_ref.work_unit_id,
      )
    )
      fail();
    if (
      target.target_kind === "result" &&
      target.bearing === "addresses" &&
      !c.next_steps.some(
        (action) =>
          action.content.action.basis.inquiry_result_link_ref
            .project_inquiry_link_id === link.project_inquiry_link_id,
      )
    )
      fail();
  }
  for (const work of c.work) {
    if (work.content.view_kind !== "detail") fail();
    const workId =
      work.content.view_kind === "detail"
        ? work.content.summary.work_unit_ref.work_unit_id
        : undefined;
    if (
      !c.inquiry_links.some(
        (link) =>
          link.content.target.target_kind === "work" &&
          link.content.target.work_unit_ref.work_unit_id === workId,
      )
    )
      fail();
  }
  for (const action of c.next_steps) {
    const link = c.inquiry_links.find(
      (link) =>
        link.project_inquiry_link_id ===
        action.content.action.basis.inquiry_result_link_ref
          .project_inquiry_link_id,
    );
    if (
      link === undefined ||
      link.content_hash !==
        action.content.action.basis.inquiry_result_link_ref.content_hash ||
      (await digest(link)) !==
        action.content.action.basis.inquiry_result_link_ref.record_hash
    )
      fail();
  }
  if (c.profile_payload.schema_version === "1.1.0")
    await assertResearchBriefSynthesisBindings(c, projectId, digest);
  for (const item of c.attention) {
    const owner =
      item.owner === "shell"
        ? c.shell
        : item.owner === "review"
          ? c.reviews.find((r) => r.review_session_id === item.item_id)
          : c.work.find(
              (w) =>
                w.content.view_kind === "detail" &&
                w.content.summary.work_unit_ref.work_unit_id === item.item_id,
            );
    if (owner === undefined || owner.content_hash !== item.owner_content_hash)
      fail();
  }
  if (c.comparison.state === "recent_history_interval") {
    const comparison = c.comparison;
    const baseline = c.recent_decisions.content.changes.find(
      (change) => change.event_ref.event_id === comparison.baseline.event_id,
    );
    if (
      baseline === undefined ||
      (await digest(baseline.event_ref)) !==
        (await digest(comparison.baseline)) ||
      (await digest(comparison.through)) !==
        (await digest(c.recent_decisions.content.authority)) ||
      (await digest(comparison.changes)) !==
        (await digest(
          c.recent_decisions.content.changes.filter(
            (change) =>
              change.event_ref.stream_revision >
              comparison.baseline.stream_revision,
          ),
        ))
    )
      fail();
  }
};

/** Reproduces retained output identity and basis; it grants no scientific or execution authority. */
export const assertResearchBriefSynthesisBindings = async (
  content: PetraProjectBriefReadView["content"],
  projectId: string,
  digest: (value: unknown) => Promise<string>,
): Promise<void> => {
  if (content.profile_payload.schema_version !== "1.1.0") return;
  const fail = (): never => {
    throw new ProjectBriefError(
      "PROJECT_BRIEF_CORRUPT",
      "The retained synthesis lost its exact inquiry, output, response, or evidence snapshot binding.",
    );
  };
  const state = content.profile_payload.current_state;
  const links = content.inquiry_links.filter(
    (link) =>
      link.content.target.target_kind === "result" &&
      link.content.target.bearing === "addresses",
  );
  const ids = state.syntheses.map((s) => s.project_inquiry_link_id);
  if (new Set(ids).size !== ids.length || ids.length !== links.length) fail();
  for (const synthesis of state.syntheses) {
    const link = links.find(
      (l) => l.project_inquiry_link_id === synthesis.project_inquiry_link_id,
    );
    const target = link?.content.target;
    if (target?.target_kind !== "result") return fail();
    const {
      linked_response: response,
      current_response: current,
      context_packet: context,
      evidence_packet: evidence,
      output,
    } = synthesis;
    const ref = target.result_ref;
    if (
      ref.schema_name !== response.schema_name ||
      ref.schema_version !== response.schema_version ||
      ref.record_id !== response.grounded_response_id ||
      ref.revision !== response.revision ||
      ref.content_hash !== response.content_hash ||
      ref.record_hash !== (await digest(response)) ||
      current.grounded_response_id !== response.grounded_response_id ||
      current.revision < response.revision ||
      (await digest(output)) !== response.content.model_output_hash
    )
      fail();
    for (const record of [response, current, context, evidence]) {
      if (
        record.project_id !== projectId ||
        (await digest(record.content)) !== record.content_hash
      )
        fail();
    }
    // Invalidation changes cache observations only; retained scientific/execution basis stays exact.
    const { cache: linkedCache, ...linkedContent } = response.content;
    const { cache: currentCache, ...currentContent } = current.content;
    if (
      (await digest(linkedContent)) !== (await digest(currentContent)) ||
      (current.revision === response.revision &&
        (await digest(current)) !== (await digest(response))) ||
      (linkedCache.state === "invalidated" &&
        currentCache.state !== "invalidated")
    )
      fail();
    if (
      response.content.context_packet_ref.context_packet_id !==
        context.context_packet_id ||
      response.content.context_packet_ref.content_hash !==
        context.content_hash ||
      response.content.evidence_packet_ref.evidence_packet_id !==
        evidence.evidence_packet_id ||
      response.content.evidence_packet_ref.content_hash !==
        evidence.content_hash ||
      evidence.content.context_packet_ref.context_packet_id !==
        context.context_packet_id ||
      evidence.content.context_packet_ref.content_hash !==
        context.content_hash ||
      (await digest(response.content.snapshot_ref)) !==
        (await digest(context.snapshot_ref)) ||
      (await digest(context.snapshot_ref)) !==
        (await digest(evidence.snapshot_ref))
    )
      fail();
    const work = target.produced_by_work_ref;
    const produced = response.content.interaction_ref.work_unit_ref;
    if (
      work === undefined ||
      work.work_unit_id !== produced.work_unit_id ||
      work.revision !== produced.revision ||
      work.spec_hash !== produced.spec_hash
    )
      fail();
    const selections = evidence.content.selected_evidence;
    const keys = output.statements.map((statement) => statement.statement_key);
    if (new Set(keys).size !== keys.length) fail();
    for (const statement of output.statements) {
      for (const basis of statement.evidence_refs) {
        const selected = selections.find(
          (s) => s.context_selection_order === basis.context_selection_order,
        );
        const included = context.content.included_objects.find(
          (s) => s.selection_order === basis.context_selection_order,
        );
        const object = {
          object_kind: basis.object_kind,
          object_id: basis.object_id,
          object_revision: basis.object_revision,
          object_hash: basis.object_hash,
        };
        if (
          selected === undefined ||
          included === undefined ||
          (await digest(selected.object_ref)) !== (await digest(object)) ||
          (await digest(included.object_ref)) !== (await digest(object)) ||
          (await digest([...selected.source_span_selection_orders].sort())) !==
            (await digest([...basis.source_span_selection_orders].sort())) ||
          !response.content.dependencies.some(
            (d) =>
              d.object_ref.object_id === object.object_id &&
              d.object_ref.object_revision === object.object_revision &&
              d.object_ref.object_hash === object.object_hash &&
              d.object_ref.object_kind === object.object_kind,
          )
        )
          fail();
        for (const order of basis.source_span_selection_orders) {
          const span = selections.find(
            (s) => s.context_selection_order === order,
          );
          const spanContext = context.content.included_objects.find(
            (s) => s.selection_order === order,
          );
          if (
            span?.object_ref.object_kind !== "source_span" ||
            spanContext === undefined ||
            (await digest(span.object_ref)) !==
              (await digest(spanContext.object_ref))
          )
            fail();
        }
      }
    }
  }
};
