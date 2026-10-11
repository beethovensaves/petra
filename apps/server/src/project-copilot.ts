import {
  CopilotBoundaryError,
  graphPresentationContent,
  graphPresentationPeer,
  type GraphPresentationBinding,
  type GraphPresentationSource,
  copilotHash,
  derivePetraId,
  examinationRecordRef,
  validateCopilotContext,
  type CopilotContext,
  type CopilotTurn,
  type ConversationHistoryPage,
  type ConversationPermissionRead,
  type ConversationOwnerBinding,
  type ProjectCopilotRuntime,
} from "@petra/core";
import type { CopilotRequest } from "@petra/core";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  PetraCopilotAuthorityRequest,
  PetraCopilotAuthorityReceipt,
  PetraGraphPresentationContext,
} from "@petra/contracts";
const contracts = new PetraContractRegistry();
import type { ProjectShellPersistence } from "./project-shell-persistence.js";
import {
  contextShellBasis,
  exactDefinitionContext,
  projectActivityContext,
  sameContextDefinition,
} from "./project-copilot-context.js";

const sharedPresentation = (
  source: GraphPresentationSource,
  binding: GraphPresentationBinding,
): PetraGraphPresentationContext => {
  let content;
  try {
    content = graphPresentationContent(source, binding.parameters);
  } catch {
    throw new CopilotBoundaryError(
      "SHARED_SCENE_CHANGED",
      "The displayed graph or selection changed. Refresh it before asking against that scene.",
    );
  }
  const complete = {
    ...content,
    peer_content_hash: copilotHash(graphPresentationPeer(content)),
  };
  const scene: PetraGraphPresentationContext = {
    schema_name: "petra.graph-presentation-context",
    schema_version: "1.0.0",
    content: complete,
    content_hash: copilotHash(complete),
  };
  contracts.assertValid("graph-presentation-context", "1.0.0", scene);
  if (
    scene.content_hash !== binding.content_hash ||
    complete.peer_content_hash !== binding.peer_content_hash
  )
    throw new CopilotBoundaryError(
      "SHARED_SCENE_MISMATCH",
      "The displayed scene and its semantic peer do not match the exact server result. Refresh the graph before asking about its layout.",
    );
  return scene;
};

const sharedPresentationExcerpt = (
  scene: PetraGraphPresentationContext,
): string => {
  const nodes = [...scene.content.nodes].sort(
    (a, b) =>
      Number(new Set(scene.content.parameters.selected_keys).has(b.key)) -
      Number(new Set(scene.content.parameters.selected_keys).has(a.key)),
  );
  const excerpt = () => {
    const keys = new Set(nodes.map((node) => node.key));
    const relationships = scene.content.relationships.filter(
      (edge) => keys.has(edge.subject_key) && keys.has(edge.object_key),
    );
    return {
      ...scene.content,
      nodes,
      relationships,
      legend: scene.content.legend.filter((entry) =>
        nodes.some((node) => node.kind === entry.kind),
      ),
      scene_content_hash: scene.content_hash,
      omitted_nodes:
        scene.content.omitted_nodes + scene.content.nodes.length - nodes.length,
      omitted_relationships:
        scene.content.omitted_relationships +
        scene.content.relationships.length -
        relationships.length,
      disclosure:
        "Only these exact identities, positions and paths are included in this model input. Native labels and all other nodes/paths are withheld. Explain layout only for included positions, preserve omissions, and infer no support, causality or priority from placement.",
    };
  };
  while (nodes.length > 0 && JSON.stringify(excerpt()).length > 7500)
    nodes.pop();
  return JSON.stringify(excerpt());
};

export class ProjectCopilotService {
  constructor(
    readonly persistence: ProjectShellPersistence,
    readonly actorId: string,
    readonly runtime?: ProjectCopilotRuntime,
    readonly unavailableReason = "The conversational model role has not passed its registered eligibility checks.",
    readonly providerModel?: string,
  ) {}

  async assertAccess(projectId: string): Promise<void> {
    const permission =
      await this.persistence.copilotPermission?.read(projectId);
    if (permission?.state === "unavailable")
      throw new CopilotBoundaryError(
        "CONVERSATION_PERMISSION_UNAVAILABLE",
        permission.reason,
      );
    const shell = await this.persistence.views.getProjectShellView(projectId);
    if (shell === undefined || shell.content.project.status !== "active")
      throw new CopilotBoundaryError(
        "PROJECT_NOT_FOUND",
        "This Project is unavailable.",
      );
  }

  async intakeOrigin(projectId: string) {
    await this.assertAccess(projectId);
    const binding = await this.persistence.intakeCopilot?.bindingForProject?.(
      projectId,
      this.actorId,
    );
    return { binding: binding ?? null };
  }

  async context(
    projectId: string,
    focusKeys: readonly string[] = [],
  ): Promise<CopilotContext> {
    await this.assertAccess(projectId);
    return (await this.contextResult(projectId, focusKeys)).context;
  }

  private async contextResult(
    projectId: string,
    focusKeys: readonly string[] = [],
    binding?: GraphPresentationBinding,
  ): Promise<{
    context: CopilotContext;
    shared_scene?: PetraGraphPresentationContext;
  }> {
    let sharedScene: PetraGraphPresentationContext | undefined;
    if (
      binding !== undefined &&
      copilotHash(binding.parameters.selected_keys) !== copilotHash(focusKeys)
    )
      throw new CopilotBoundaryError(
        "SHARED_SELECTION_MISMATCH",
        "The question selection differs from the shared visible graph selection.",
      );
    const shell = await this.persistence.views.getProjectShellView(projectId);
    if (shell === undefined)
      throw new CopilotBoundaryError(
        "PROJECT_NOT_FOUND",
        "This Project is unavailable.",
      );
    const {
      project,
      definition,
      current_objective: objective,
      authority,
    } = shell.content;
    if (
      project.status !== "active" ||
      definition.kernel_compatibility !== "petra.project-kernel@1.0.0" ||
      !definition.supported_places.includes("petra")
    ) {
      throw new CopilotBoundaryError(
        "PROJECT_ROLE_UNSUPPORTED",
        "This Project definition does not support the registered copilot interaction.",
      );
    }
    const records: CopilotContext["records"] = [];
    const limitations = [
      "This role is advisory. Its answer creates no Project facts, permission, approval, assessment, closure, or completed Work.",
      "Context contains a bounded selection of authorized current record summaries and working material. It is not an exhaustive evidence search or the complete bytes of a Source.",
      "Managed model execution uses the registered remote provider; Project routing preferences and per-call price accounting are not available through this role.",
    ];
    records.push(
      exactDefinitionContext(
        shell,
        await this.persistence.definitions?.getProjectDefinition(
          projectId,
          definition.revision,
        ),
      ),
    );
    const activity = projectActivityContext(
      shell,
      await this.persistence.inquiryViews
        ?.listProjectInquiryView(projectId, { limit: 20 })
        .catch((error: unknown) => {
          if (
            error instanceof Error &&
            "code" in error &&
            [
              "PROJECT_INQUIRY_VIEW_MAPPING_UNAVAILABLE",
              "PROJECT_INQUIRY_VIEW_DESTINATION_UNSUPPORTED",
            ].includes(String(error.code))
          )
            return undefined;
          throw error;
        }),
      await this.persistence.workViews?.listProjectWorkView(projectId, {
        limit: 20,
      }),
    );
    records.push(...activity.records);
    limitations.push(...activity.limitations);
    const originBinding =
      await this.persistence.intakeCopilot?.bindingForProject?.(
        projectId,
        this.actorId,
      );
    if (
      originBinding !== undefined &&
      this.persistence.intakeCopilot !== undefined
    ) {
      const originSession = await this.persistence.intakeCopilot.getSession(
        originBinding.content.intake_session_ref.record_id,
        this.actorId,
      );
      if (
        originSession !== undefined &&
        copilotHash(originSession) ===
          originBinding.content.intake_session_ref.record_hash &&
        originSession.content.policy.managed_model_egress &&
        originSession.content.policy.provider_model === this.providerModel
      ) {
        const original = await this.persistence.intakeCopilot.list(
          originSession.content.intake_session_id,
          this.actorId,
        );
        const included = original.slice(-12).map((turn) => ({
          run_id: turn.run_id,
          user_wording: turn.question,
          advisory_answer: turn.terminal?.output ?? null,
          outcome: turn.terminal?.state ?? "unknown",
        }));
        const excerpt = () => ({
          authority: "pre_project_advice_only",
          creation_binding_hash: copilotHash(originBinding),
          retained_turn_count: original.length,
          included_turn_count: included.length,
          discussion: included,
        });
        while (
          included.length > 0 &&
          Buffer.byteLength(JSON.stringify(excerpt()), "utf8") > 12000
        )
          included.shift();
        records.push({
          key: "pre-creation-discussion",
          ref: originBinding.content.intake_session_ref,
          kind: "pre_project_discussion",
          label: "Original user wording and pre-creation advice",
          text: JSON.stringify(excerpt()),
          destination: `/projects/${projectId}/brief#copilot-intake-origin`,
        });
        limitations.push(
          "The original pre-creation discussion is untrusted user wording and advisory answers, not Project evidence, an approved definition or a domain examination. Its excerpt preserves whole turns and declares omissions.",
        );
      } else
        limitations.push(
          "The original pre-creation discussion remains available for its owner to inspect. Its wording is withheld from this model input because its acknowledged provider policy differs or its exact binding cannot be admitted.",
        );
    }
    if (objective === undefined)
      limitations.push(
        "No current outcome has been selected. Ask and clarify before proposing an outcome; this conversation does not set or select one.",
      );
    const nativeView =
      await this.persistence.semanticGraphs?.getProjectSemanticGraph(projectId);
    if (nativeView !== undefined) {
      if (binding?.parameters.renderer === "native_working")
        sharedScene = sharedPresentation(nativeView, binding);
      if (
        nativeView.project_id !== projectId ||
        nativeView.content.authority.event_position !==
          authority.event_position ||
        nativeView.content.authority.stream_revision !==
          authority.stream_revision ||
        !sameContextDefinition(definition, nativeView.content.definition_ref)
      )
        throw new CopilotBoundaryError(
          "CONTEXT_CHANGED",
          "The native material basis changed while context was being read. Refresh the conversation.",
        );
      for (const node of nativeView.content.nodes
        .filter(
          (node) => node.layer === "working" || focusKeys.includes(node.key),
        )
        .sort(
          (a, b) =>
            Number(focusKeys.includes(b.key)) -
            Number(focusKeys.includes(a.key)),
        )
        .slice(0, 40)) {
        const nativeText =
          node.material_state !== "available"
            ? "Native bytes are withheld because the exact material basis is stale or unavailable. Its retained reference is not current evidence."
            : node.remote_context?.permitted !== true
              ? "Native material is withheld from this remote role because its source egress rights are restricted or unresolved. The local examiner remains available."
              : node.native_record === undefined
                ? node.summary
                : JSON.stringify({
                    native_record: node.native_record,
                    source_passages: node.source_passages,
                    rights: node.remote_context,
                  });
        const text =
          nativeText.length <= 7500
            ? nativeText
            : `${node.summary}\nThe full native record is available in the examiner and exceeds this conversational excerpt budget.`;
        records.push({
          key: node.key,
          ref: {
            record_id: node.record_ref.record_id,
            revision: node.record_ref.revision,
            record_hash: node.record_ref.record_hash,
          },
          kind: node.semantic_key,
          label: node.label,
          text: `Working material (${node.material_state}); no domain authority or verification.\n${text}`,
          destination: `/projects/${projectId}/graph?selected=${encodeURIComponent(node.key)}`,
          ...(node.remote_context?.permitted === true &&
          node.material_state === "available" &&
          node.native_record !== undefined &&
          nativeText.length <= 7500
            ? (() => {
                const native = node.native_record as Record<string, unknown>;
                const content = native.content as
                  Record<string, unknown> | undefined;
                const wording =
                  typeof native.canonical_text === "string"
                    ? native.canonical_text
                    : content?.statement;
                return typeof wording === "string" &&
                  wording.length > 0 &&
                  wording.length <= 8000
                  ? { reportable_text: wording }
                  : {};
              })()
            : {}),
        });
        for (const passage of node.source_passages ?? []) {
          if (node.material_state !== "available" || !passage.remote_permitted)
            continue;
          const span = passage.span;
          const selector = span.selector;
          const exact =
            selector.selector_type === "text_quote"
              ? selector.quote.exact_text
              : selector.selector_type === "compound"
                ? selector.components.find(
                    (component) => component.component_kind === "text_quote",
                  )?.quote?.exact_text
                : undefined;
          if (exact === undefined || exact.length === 0 || exact.length > 8000)
            continue;
          const key = `passage:${span.source_span_id}@${span.revision}`;
          if (records.some((record) => record.key === key)) continue;
          records.push({
            key,
            ref: {
              record_id: span.source_span_id,
              revision: span.revision,
              record_hash: copilotHash(span),
            },
            kind: "source_span",
            label: `${node.label} · source passage`,
            text: JSON.stringify({
              exact_text: exact,
              verification: span.verification,
              source_ref: passage.project_source_ref,
              rights_ref: passage.rights_ref,
            }),
            reportable_text: exact,
            destination: `/projects/${projectId}/graph?selected=${encodeURIComponent(node.key)}`,
          });
        }
      }
      limitations.push(
        "Native working records are included as exact-schema excerpts. Their candidacy, stale definition basis, and lack of domain authority remain explicit. Only the first 40 working objects are selected.",
      );
      const examinations = await this.persistence.examinations?.read(projectId);
      if (examinations !== undefined) {
        if (examinations.graph.content_hash !== nativeView.content_hash)
          throw new CopilotBoundaryError(
            "CONTEXT_CHANGED",
            "The examination and native graph basis changed during this context read. Refresh before continuing.",
          );
        if (
          binding?.parameters.renderer === "examination_cycles" &&
          examinations.scene !== undefined
        )
          sharedScene = sharedPresentation(examinations.scene, binding);
        if (examinations.scene !== undefined && binding === undefined) {
          const scene = examinations.scene;
          const includedNodes = scene.content.nodes.map(
            ({ key, record_ref, kind, state, affected_axes }) => ({
              key,
              record_ref,
              kind,
              state,
              affected_axes,
            }),
          );
          const sceneExcerpt = () => {
            const keys = new Set(includedNodes.map((item) => item.key));
            const paths = scene.content.relationships.filter(
              (path) => keys.has(path.subject_key) && keys.has(path.object_key),
            );
            return {
              scene_content_hash: scene.content_hash,
              graph_content_hash: scene.content.graph_content_hash,
              nodes: includedNodes,
              relationships: paths,
              omitted_nodes:
                scene.content.omitted_nodes +
                scene.content.nodes.length -
                includedNodes.length,
              omitted_relationships:
                scene.content.omitted_relationships +
                scene.content.relationships.length -
                paths.length,
              has_more_history: scene.content.has_more_history,
              limitations: scene.content.limitations,
              disclosure:
                "Exact identities and paths selected from the local scene. Native labels and any omitted nodes or paths are withheld; no support is inferred from layout.",
            };
          };
          while (
            includedNodes.length > 0 &&
            JSON.stringify(sceneExcerpt()).length > 7500
          )
            includedNodes.pop();
          records.push({
            key: `scene:${scene.content_hash.slice(7, 23)}`,
            ref: {
              record_id: derivePetraId("graph_scene", scene.content_hash),
              revision: 1,
              record_hash: copilotHash(scene),
            },
            kind: "project-examination-scene",
            label: "Examination lineage semantic result",
            destination: `/projects/${projectId}/graph`,
            text: JSON.stringify(sceneExcerpt()),
          });
        }
        const assessments = examinations.records.filter(
          (record) => record.schema_name === "petra.hypothesis-assessment",
        );
        for (const entry of [...examinations.records]
          .reverse()
          .sort((a, b) => {
            const ar = examinationRecordRef(a),
              br = examinationRecordRef(b);
            return (
              Number(
                focusKeys.includes(
                  `examination:${br.record_id}@${br.revision}`,
                ),
              ) -
              Number(
                focusKeys.includes(
                  `examination:${ar.record_id}@${ar.revision}`,
                ),
              )
            );
          })
          .slice(0, 20)) {
          const ref = examinationRecordRef(entry);
          const key = `examination:${ref.record_id}@${ref.revision}`;
          const assessment =
            entry.schema_name === "petra.hypothesis-assessment"
              ? entry
              : entry.schema_name === "petra.hypothesis"
                ? undefined
                : assessments.find(
                    (candidate) =>
                      candidate.hypothesis_assessment_id ===
                        entry.content.assessment_ref.record_id &&
                      candidate.revision ===
                        entry.content.assessment_ref.revision &&
                      copilotHash(candidate) ===
                        entry.content.assessment_ref.record_hash,
                  );
          const targetRef =
            entry.schema_name === "petra.hypothesis"
              ? entry.content.target_claim_ref
              : assessment?.content.target_claim_ref;
          const target =
            targetRef === undefined
              ? undefined
              : nativeView.content.nodes.find(
                  (node) =>
                    copilotHash(node.record_ref) === copilotHash(targetRef),
                );
          const freshness = examinations.freshness.find(
            (value) => copilotHash(value.record_ref) === copilotHash(ref),
          )?.state;
          const canDisclose =
            target?.remote_context?.permitted === true &&
            target.material_state === "available" &&
            (entry.schema_name === "petra.hypothesis" ||
              freshness === "current");
          const bytes = JSON.stringify(entry);
          records.push({
            key,
            ref: {
              record_id: ref.record_id,
              revision: ref.revision,
              record_hash: ref.record_hash,
            },
            kind: entry.schema_name.replace(/^petra\./u, ""),
            label: entry.schema_name
              .replace(/^petra\./u, "")
              .replaceAll("-", " "),
            text:
              canDisclose && bytes.length <= 7500
                ? bytes
                : `Retained examination reference; ${freshness ?? "target_basis_unavailable"}. Native examination content is withheld because its current exact target, egress permission, freshness, or excerpt budget is unavailable.`,
            destination:
              target === undefined
                ? `/projects/${projectId}/graph`
                : `/projects/${projectId}/graph?selected=${encodeURIComponent(target.key)}`,
          });
        }
        limitations.push(
          `The examined graph basis is ${nativeView.content_hash}. Only ${Math.min(20, examinations.records.length)} retained examination records from one bounded history page are selected; more history: ${examinations.has_more}. Human assessment, posture and disposition records retain their own authority. They do not establish Work success or permit the copilot to act.`,
        );
      }
      // Relationship semantics are retained from the same snapshot as native
      // objects. They remain working links, never scientific support inferred
      // from layout, adjacency, or a successful validator.
      for (const edge of nativeView.content.relationships.slice(0, 20)) {
        records.push({
          key: edge.key,
          ref: {
            record_id: edge.record_ref.record_id,
            revision: edge.record_ref.revision,
            record_hash: edge.record_ref.record_hash,
          },
          kind: edge.semantic_key,
          label: edge.predicate,
          text: `Working relationship; no domain authority or verification.\n${JSON.stringify({ predicate: edge.predicate, subject_key: edge.subject_key, object_key: edge.object_key, graph_content_hash: nativeView.content_hash, query: nativeView.content.query, omitted_candidates: nativeView.content.omitted_candidates, omitted_relationships: nativeView.content.omitted_relationships })}`,
          destination: `/projects/${projectId}/graph`,
        });
      }
    }
    if (binding !== undefined && sharedScene === undefined)
      throw new CopilotBoundaryError(
        "SHARED_SCENE_UNAVAILABLE",
        "The displayed semantic scene is no longer available on this authorized read.",
      );
    if (sharedScene !== undefined) {
      records.push({
        key: `scene:${sharedScene.content_hash.slice(7, 23)}`,
        ref: {
          record_id: derivePetraId("graph_scene", sharedScene.content_hash),
          revision: 1,
          record_hash: copilotHash(sharedScene),
        },
        kind: "graph-presentation-context",
        label: "Graph shared with this question",
        destination: `/projects/${projectId}/graph`,
        text: sharedPresentationExcerpt(sharedScene),
      });
      for (const key of sharedScene.content.parameters.selected_keys) {
        if (records.some((record) => record.key === key)) continue;
        const node = sharedScene.content.nodes.find(
          (node) => node.key === key,
        )!;
        records.push({
          key,
          ref: {
            record_id: node.record_ref.record_id,
            revision: node.record_ref.revision,
            record_hash: node.record_ref.record_hash,
          },
          kind: node.kind,
          label: node.kind.slice(0, 500),
          text: `Exact visible endpoint reference (${node.state}); its native bytes are outside the admitted bounded context.`,
          destination: `/projects/${projectId}/graph`,
        });
      }
      limitations.push(
        `This question shares exact scene ${sharedScene.content_hash}, semantic peer ${sharedScene.content.peer_content_hash}, renderer ${sharedScene.content.parameters.renderer}, mode ${sharedScene.content.parameters.mode}. Its bounded metadata excerpt names additional model-context omissions. Layout has no domain authority.`,
      );
    }
    const graph = await this.persistence.relationshipOverlayViews
      ?.getProjectRelationshipOverlayView(projectId)
      .catch((error: unknown) => {
        const code =
          error instanceof Error && "code" in error ? error.code : undefined;
        if (
          code === "PROJECT_RELATIONSHIP_PATH_UNSUPPORTED" ||
          code === "PROJECT_RELATIONSHIP_OVERLAY_PROFILE_UNSUPPORTED"
        )
          return undefined;
        throw error;
      });
    if (graph !== undefined) {
      const position = graph.content.positions.authoritative.authority;
      if (
        graph.project_id !== projectId ||
        position.event_position !== authority.event_position ||
        position.stream_revision !== authority.stream_revision ||
        !sameContextDefinition(
          definition,
          graph.content.profile.project_definition_ref,
        )
      ) {
        throw new CopilotBoundaryError(
          "CONTEXT_CHANGED",
          "Project authority changed while the context was being read. Refresh the conversation.",
        );
      }
      if (
        graph.content.positions.authoritative.projection.state !== "current"
      ) {
        limitations.push(
          "The graph projection is not current. Its nodes have been withheld from model context.",
        );
      } else {
        for (const node of graph.content.nodes.slice(
          0,
          nativeView === undefined ? 40 : 20,
        )) {
          const ref =
            node.layer === "current"
              ? node.owner.record_ref
              : {
                  record_id:
                    node.owner.working_candidate_ref.working_candidate_id,
                  revision: node.owner.working_candidate_ref.revision,
                  record_hash: node.owner.working_candidate_ref.record_hash,
                };
          if (
            records.some(
              (record) =>
                record.ref.record_id === ref.record_id &&
                record.ref.revision === ref.revision,
            )
          )
            continue;
          records.push({
            key: node.node_key,
            ref,
            kind: node.object_term,
            label: node.object_term.slice(0, 500),
            text: "Authoritative graph record reference only. Source text has not been admitted to this remote role by an exact egress-rights binding.",
            destination: `/projects/${projectId}/graph?query=authority-path&layer=${node.layer}&selected=${encodeURIComponent(node.node_key)}`,
          });
        }
        if (graph.content.nodes.length > 40)
          limitations.push(
            "Graph context is limited to the first 40 nodes in the authorized bounded graph response.",
          );
      }
    } else {
      limitations.push(
        "No registered graph evidence selection is currently available for this Project.",
      );
    }
    const working =
      await this.persistence.workingStateSnapshots.getProjectWorkingStateSnapshot(
        projectId,
      );
    if (working !== undefined && nativeView === undefined) {
      if (
        working.project_id !== projectId ||
        working.content.authority.event_position !== authority.event_position ||
        working.content.authority.stream_revision !==
          authority.stream_revision ||
        !sameContextDefinition(
          definition,
          working.content.project_definition_ref,
        )
      ) {
        throw new CopilotBoundaryError(
          "CONTEXT_CHANGED",
          "The working selection changed while context was being read. Refresh the conversation.",
        );
      }
      for (const candidate of working.content.candidates.slice(0, 20)) {
        if (
          records.some(
            (record) =>
              record.ref.record_id === candidate.working_candidate_id &&
              record.ref.revision === candidate.revision,
          )
        )
          continue;
        const native = candidate.profile_object;
        records.push({
          key: `${candidate.working_candidate_id}@${candidate.revision}`,
          ref: {
            record_id: candidate.working_candidate_id,
            revision: candidate.revision,
            record_hash: copilotHash(candidate),
          },
          kind: native.registration.semantic_key,
          label: native.registration.semantic_key,
          text: "Working record reference only. Native bytes are withheld because no exact egress-rights binding is available on this read path.",
          destination: `/projects/${projectId}/profile`,
        });
      }
      limitations.push(
        "Working material retains its native ProjectDefinition kind and has no domain authority. Validation does not approve or promote it.",
      );
    }
    const finalShell =
      await this.persistence.views.getProjectShellView(projectId);
    if (
      finalShell === undefined ||
      copilotHash(contextShellBasis(finalShell)) !==
        copilotHash(contextShellBasis(shell))
    )
      throw new CopilotBoundaryError(
        "CONTEXT_CHANGED",
        "The Project basis changed while assembling this turn. Refresh before asking; no model input was prepared.",
      );
    const finalPermission =
      await this.persistence.copilotPermission?.read(projectId);
    if (finalPermission?.state === "unavailable")
      throw new CopilotBoundaryError(
        "CONVERSATION_PERMISSION_UNAVAILABLE",
        finalPermission.reason,
      );
    const content = {
      schema_name: "petra.copilot-context" as const,
      schema_version: "1.0.0" as const,
      project_id: projectId,
      project_label: project.name.slice(0, 500),
      objective_statement:
        objective?.statement.slice(0, 8000) ??
        "No current outcome has been selected.",
      definition_family: definition.definition_family,
      basis: {
        project_revision: project.revision,
        definition: {
          record_id: definition.project_definition_id,
          revision: definition.revision,
          content_hash: definition.content_hash,
        },
        objective:
          objective === undefined
            ? null
            : {
                record_id: objective.objective_id,
                revision: objective.revision,
                content_hash: objective.content_hash,
              },
        event_position: authority.event_position,
        stream_revision: authority.stream_revision,
      },
      records,
      limitations,
    };
    // Freeze a useful selection within the registered budget before hashing.
    // The omitted count is explicit; no included record is truncated here.
    let omitted = 0;
    content.records.sort(
      (a, b) =>
        (focusKeys.includes(b.key)
          ? 2
          : b.kind === "graph-presentation-context"
            ? 2
            : b.kind === "project-definition-context"
              ? 1
              : 0) -
        (focusKeys.includes(a.key)
          ? 2
          : a.kind === "graph-presentation-context"
            ? 2
            : a.kind === "project-definition-context"
              ? 1
              : 0),
    );
    while (
      content.records.length > 60 ||
      Buffer.byteLength(JSON.stringify(content), "utf8") > 93000
    ) {
      content.records.pop();
      omitted++;
    }
    if (omitted > 0)
      content.limitations.push(
        `${omitted} records were omitted to meet the registered context budget. A missing selected key blocks sending; open a narrower examination before asking about it.`,
      );
    if (
      focusKeys.some(
        (key) => !content.records.some((record) => record.key === key),
      )
    )
      throw new CopilotBoundaryError(
        "STALE_SELECTION",
        "The selected record is outside the current bounded graph or context budget. Choose a current represented object before asking against it.",
      );
    const context = { ...content, content_hash: copilotHash(content) };
    validateCopilotContext(context);
    return {
      context,
      ...(sharedScene === undefined ? {} : { shared_scene: sharedScene }),
    };
  }

  async authorizeConversation(
    projectId: string,
    request: PetraCopilotAuthorityRequest,
  ): Promise<PetraCopilotAuthorityReceipt> {
    await this.assertAccess(projectId);
    if (this.persistence.copilotPermission === undefined)
      throw new CopilotBoundaryError(
        "CONVERSATION_PERMISSION_UNAVAILABLE",
        "The owner conversation permission boundary is unavailable.",
      );
    return this.persistence.copilotPermission.execute(projectId, request);
  }

  async read(
    projectId: string,
    focusKeys: readonly string[] = [],
    binding?: GraphPresentationBinding,
    history?: { limit?: number; cursor?: string },
  ): Promise<{
    authorization?: ConversationPermissionRead;
    history_page?: ConversationHistoryPage["page"];
    owners?: Record<string, ConversationOwnerBinding>;
    shared_scene?: PetraGraphPresentationContext;
    thread_id: string;
    context: CopilotContext;
    turns: CopilotTurn[];
    availability: { state: "ready" | "unavailable"; reason?: string };
  }> {
    const authorization =
      await this.persistence.copilotPermission?.read(projectId);
    if (authorization?.state === "unavailable")
      throw new CopilotBoundaryError(
        "CONVERSATION_PERMISSION_UNAVAILABLE",
        authorization.reason,
      );
    const { context, shared_scene } = await this.contextResult(
      projectId,
      focusKeys,
      binding,
    );
    const scene = shared_scene === undefined ? {} : { shared_scene };
    const thread_id = derivePetraId(
      "thread",
      `copilot:${projectId}:${this.actorId}`,
    );

    if (authorization !== undefined && authorization.state !== "ready")
      return {
        thread_id,
        context,
        ...scene,
        turns: [],
        authorization,
        availability: { state: "unavailable", reason: authorization.reason },
      };
    await (this.runtime?.repository ?? this.persistence.copilotTurns).recover(
      this.runtime?.instanceId ?? "retained-history-reader",
    );
    const historyRead = await this.persistence.copilotHistory?.listPage(
      projectId,
      this.actorId,
      { thread_id, ...history },
    );
    const turns =
      historyRead === undefined
        ? await (
            this.runtime?.repository ?? this.persistence.copilotTurns
          ).list(projectId, this.actorId, thread_id)
        : historyRead.entries.map((entry) => entry.turn);
    return {
      ...(authorization === undefined ? {} : { authorization }),
      thread_id,
      context,
      ...scene,
      turns,
      ...(historyRead === undefined
        ? {}
        : {
            history_page: historyRead.page,
            owners: Object.fromEntries(
              historyRead.entries.map((entry) => [
                entry.turn.run_id,
                entry.owners,
              ]),
            ),
          }),
      availability:
        this.runtime === undefined
          ? { state: "unavailable", reason: this.unavailableReason }
          : { state: "ready" },
    };
  }

  async start(input: {
    threadId: string;
    runId: string;
    question: string;
    request: CopilotRequest;
  }): Promise<CopilotTurn> {
    const runtime = this.runtime;
    // An exact retained retry/replay does not require the old snapshot still
    // to be current. It never invokes another model call.
    const requestHash = copilotHash(input);
    const previous = await (
      runtime?.repository ?? this.persistence.copilotTurns
    ).get(input.request.project_id, this.actorId, input.runId);
    if (previous !== undefined) {
      if (previous.request_hash !== requestHash)
        throw new CopilotBoundaryError(
          "RUN_ID_CONFLICT",
          "This run identity belongs to a different retained question.",
        );
      await this.assertAccess(input.request.project_id);
      return previous;
    }
    if (runtime === undefined)
      throw new CopilotBoundaryError(
        "ROLE_UNAVAILABLE",
        this.unavailableReason,
      );
    const permission = await this.persistence.copilotPermission?.read(
      input.request.project_id,
    );
    if (permission !== undefined && permission.state !== "ready")
      throw new CopilotBoundaryError(
        "CONVERSATION_WORK_NOT_AUTHORIZED",
        permission.reason,
      );
    const { context, shared_scene } = await this.contextResult(
      input.request.project_id,
      input.request.focus_keys,
      input.request.schema_version === "1.1.0"
        ? input.request.shared_scene
        : undefined,
    );
    if (context.content_hash !== input.request.context_hash)
      throw new CopilotBoundaryError(
        "STALE_CONTEXT",
        "Project context changed. Refresh before asking against the new basis.",
      );
    const expectedThread = derivePetraId(
      "thread",
      `copilot:${input.request.project_id}:${this.actorId}`,
    );
    if (input.threadId !== expectedThread)
      throw new CopilotBoundaryError(
        "THREAD_SCOPE",
        "This thread does not belong to the authenticated Project conversation.",
      );
    await runtime.repository.recover(runtime.instanceId);
    const finalPermission = await this.persistence.copilotPermission?.read(
      input.request.project_id,
    );
    if (finalPermission !== undefined && finalPermission.state !== "ready")
      throw new CopilotBoundaryError(
        "CONVERSATION_WORK_NOT_AUTHORIZED",
        finalPermission.reason,
      );
    return runtime.start({
      schema_name: "petra.copilot-turn",
      schema_version: shared_scene === undefined ? "1.0.0" : "1.1.0",
      ...(shared_scene === undefined ? {} : { shared_scene }),
      run_id: input.runId,
      thread_id: input.threadId,
      project_id: input.request.project_id,
      actor_id: this.actorId,
      parent_run_id: input.request.parent_run_id,
      question: input.question,
      context,
      focus_keys: input.request.focus_keys,
      request_hash: requestHash,
      started_at: new Date().toISOString(),
      instance_id: runtime.instanceId,
    });
  }
}
