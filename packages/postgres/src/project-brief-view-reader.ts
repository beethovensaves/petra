import { createHash } from "node:crypto";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";
import type {
  PetraProjectBriefReadView,
  PetraProjectInquiryLink,
  PetraProjectDefinition,
  PetraProjectObjective,
  ProjectBriefContent,
  ProjectBriefContentV11,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  ProjectBriefError,
  assertProjectBriefIntegrity,
  projectBriefSnapshotMaterial,
  type ProjectBriefRequest,
  type ProjectBriefViewReader,
} from "@petra/core";
import { readResearchBriefSynthesis } from "./research-brief-synthesis-reader.js";
import { PostgresProjectShellViewReader } from "./project-shell-view-reader.js";
import { PostgresProjectSourceViewReader } from "./project-source-view-reader.js";
import { PostgresProjectReviewViewReader } from "./project-review-view-reader.js";
import { PostgresProjectWorkViewReader } from "./project-work-view-reader.js";
import { PostgresProjectHistoryViewReader } from "./project-history-view-reader.js";
import { PostgresSuggestedActionViewReader } from "./suggested-action-view-reader.js";

const hash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const LIMIT = 20;

/** One derived view, with no Brief persistence or mutation authority. */
export class PostgresProjectBriefViewReader implements ProjectBriefViewReader {
  constructor(
    readonly pool: Pool,
    readonly contracts = new PetraContractRegistry(),
  ) {}

  async getProjectBriefView(
    projectId: string,
    request: ProjectBriefRequest = {},
  ): Promise<PetraProjectBriefReadView | undefined> {
    if (
      !/^project_[0-9A-HJKMNP-TV-Z]{26}$/u.test(projectId) ||
      Object.keys(request).some(
        (key) =>
          ![
            "expected_snapshot_hash",
            "baseline_event_id",
            "baseline_record_hash",
          ].includes(key),
      ) ||
      (request.expected_snapshot_hash !== undefined &&
        !/^sha256:[0-9a-f]{64}$/u.test(request.expected_snapshot_hash))
    ) {
      throw new ProjectBriefError(
        "PROJECT_BRIEF_REQUEST_INVALID",
        "Brief reads require an exact Project and an optional content hash.",
      );
    }
    if (
      (request.baseline_event_id === undefined) !==
        (request.baseline_record_hash === undefined) ||
      (request.baseline_event_id !== undefined &&
        !/^event_[0-9A-HJKMNP-TV-Z]{26}$/u.test(request.baseline_event_id)) ||
      (request.baseline_record_hash !== undefined &&
        !/^sha256:[0-9a-f]{64}$/u.test(request.baseline_record_hash))
    )
      throw new ProjectBriefError(
        "PROJECT_BRIEF_REQUEST_INVALID",
        "Comparison requires an exact baseline event and record hash.",
      );
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const time = await client.query<{ read_at: Date }>(
        "SELECT transaction_timestamp() AS read_at",
      );
      const readAt = time.rows[0]!.read_at.toISOString();
      const shell = await new PostgresProjectShellViewReader(
        this.pool,
        this.contracts,
      ).readShellInSnapshot(client, readAt, projectId);
      if (shell === undefined) {
        await client.query("COMMIT");
        return undefined;
      }
      const row = (
        await client.query<{ definition: unknown; objective: unknown }>(
          `SELECT definition.payload AS definition, objective.payload AS objective
           FROM petra.project_definition_revisions definition
           LEFT JOIN petra.project_objective_focus focus ON focus.project_id = definition.project_id
           LEFT JOIN petra.project_objective_revisions objective
             ON objective.project_id = focus.project_id AND objective.objective_id = focus.objective_id
            AND objective.revision = focus.objective_revision AND objective.content_hash = focus.objective_content_hash
          WHERE definition.project_id = $1 AND definition.project_definition_id = $2 AND definition.revision = $3 AND definition.content_hash = $4`,
          [
            projectId,
            shell.content.definition.project_definition_id,
            shell.content.definition.revision,
            shell.content.definition.content_hash,
          ],
        )
      ).rows[0];
      if (row?.objective == null)
        throw new ProjectBriefError(
          "PROJECT_BRIEF_UNSUPPORTED",
          "This first Brief requires a current registered Objective.",
        );
      this.contracts.assertValid("project-definition", "1.0.0", row.definition);
      this.contracts.assertValid("project-objective", "1.0.0", row.objective);
      const definition = row.definition as PetraProjectDefinition;
      const objective = row.objective as PetraProjectObjective;
      const version = this.assertProfile(definition, objective, projectId);
      const history = await new PostgresProjectHistoryViewReader(
        this.pool,
        this.contracts,
      ).readRecentHistoryInSnapshot(client, readAt, projectId);
      if (history === undefined)
        throw new ProjectBriefError(
          "PROJECT_BRIEF_CORRUPT",
          "The Brief lost its Project History owner.",
        );
      let comparison: ProjectBriefContent["comparison"] = {
        state: "current_only",
        reason:
          "No comparison baseline was requested. This view records current observations only.",
      };
      if (request.baseline_event_id !== undefined) {
        const baseline = history.content.changes.find(
          (change) =>
            change.event_ref.event_id === request.baseline_event_id &&
            change.event_ref.record_hash === request.baseline_record_hash,
        );
        if (baseline === undefined)
          throw new ProjectBriefError(
            "PROJECT_BRIEF_BASELINE_UNAVAILABLE",
            "The exact baseline is outside the canonical recent-ten History window for this Project.",
          );
        comparison = {
          state: "recent_history_interval",
          baseline: baseline.event_ref,
          through: history.content.authority,
          changes: history.content.changes.filter(
            (change) =>
              change.event_ref.stream_revision >
              baseline.event_ref.stream_revision,
          ) as typeof history.content.changes,
          limitation:
            "This comparison covers canonical domain events after the exact baseline in the recent-ten History window. It does not reconstruct prior Objective, Work, candidate, source, dependency, or projection snapshots. Work completion and projection catch-up remain separate current observations.",
        };
      }
      const attention: ProjectBriefContent["attention"] =
        shell.content.attention.map((item) => ({
          item_id: item.attention_id,
          owner: "shell",
          owner_content_hash: shell.content_hash,
          consequence_class:
            shell.content.projection.state === "blocked"
              ? "integrity"
              : "projection_lag",
          reason: item.consequence,
          resolution: "inspect_canonical_owner",
          deferral: "preserves_underlying_condition",
          acknowledgment: "client_local",
        }));
      const reviewIds = await client.query<{ review_session_id: string }>(
        `SELECT head.review_session_id FROM petra.review_sessions head
           JOIN petra.review_session_revisions revision ON revision.review_session_id = head.review_session_id AND revision.revision = head.current_revision
          WHERE head.project_id = $1 AND revision.lifecycle = 'open'
            AND (revision.objective_id IS NULL OR revision.objective_id = $2)
          ORDER BY head.review_session_id LIMIT $3`,
        [projectId, objective.objective_id, LIMIT + 1],
      );
      const reviews: Array<ProjectBriefContent["reviews"][number]> = [];
      const reviewReader = new PostgresProjectReviewViewReader(
        this.pool,
        this.contracts,
      );
      for (const id of reviewIds.rows.slice(0, LIMIT)) {
        const composed = await reviewReader.readReviewInSnapshot(
          client,
          readAt,
          projectId,
          id.review_session_id,
        );
        if (composed === undefined)
          throw new ProjectBriefError(
            "PROJECT_BRIEF_CORRUPT",
            "An open Review disappeared within the Brief snapshot.",
          );
        const reviewObjective = composed.session.content.objective_ref;
        if (
          reviewObjective !== undefined &&
          (reviewObjective.objective_id !== objective.objective_id ||
            reviewObjective.revision !== objective.revision ||
            reviewObjective.content_hash !== objective.content_hash)
        )
          throw new ProjectBriefError(
            "PROJECT_BRIEF_STALE",
            "An open Review is bound to a different Objective revision. Refresh or revise it through its owning Review boundary.",
          );
        reviews.push(composed.view);
        if (composed.view.content.session.status !== "completed")
          attention.push({
            item_id: id.review_session_id,
            owner: "review",
            owner_content_hash: composed.view.content_hash,
            consequence_class: "review_decision",
            reason: `Review reports ${composed.view.content.session.status_label}. Inspect its complete member outcomes; this observation grants no action eligibility.`,
            resolution: "inspect_canonical_owner",
            deferral: "preserves_underlying_condition",
            acknowledgment: "client_local",
          });
      }
      const links = await client.query<{
        payload: PetraProjectInquiryLink;
        record_hash: string;
        project_inquiry_link_id: string;
      }>(
        `SELECT payload, record_hash, project_inquiry_link_id FROM petra.project_inquiry_links
          WHERE project_id = $1 AND objective_id = $2 AND objective_revision = $4 AND objective_content_hash = $5 ORDER BY project_inquiry_link_id LIMIT $3`,
        [
          projectId,
          objective.objective_id,
          LIMIT + 1,
          objective.revision,
          objective.content_hash,
        ],
      );
      const work: Array<ProjectBriefContent["work"][number]> = [];
      const nextSteps: Array<ProjectBriefContent["next_steps"][number]> = [];
      const workReader = new PostgresProjectWorkViewReader(
        this.pool,
        this.contracts,
      );
      const actionReader = new PostgresSuggestedActionViewReader(
        this.pool,
        this.contracts,
      );
      const workIds = new Set<string>();
      for (const link of links.rows.slice(0, LIMIT)) {
        this.contracts.assertValid(
          "project-inquiry-link",
          "1.0.0",
          link.payload,
        );
        if (
          hash(link.payload) !== link.record_hash ||
          hash(link.payload.content) !== link.payload.content_hash
        )
          throw new ProjectBriefError(
            "PROJECT_BRIEF_CORRUPT",
            "The inquiry link hash does not match its retained record.",
          );
        const target = link.payload.content.target;
        if (target.target_kind === "work" && target.work_unit_ref !== undefined)
          workIds.add(target.work_unit_ref.work_unit_id);
        if (target.target_kind === "result" && target.bearing === "addresses") {
          const action = await actionReader.readActionInSnapshot(
            client,
            readAt,
            projectId,
            link.project_inquiry_link_id,
          );
          if (action === undefined)
            throw new ProjectBriefError(
              "PROJECT_BRIEF_CORRUPT",
              "The linked action owner is unavailable.",
            );
          nextSteps.push(action);
        }
      }
      for (const id of workIds) {
        const view = await workReader.readWorkInSnapshot(
          client,
          readAt,
          projectId,
          id,
        );
        if (view === undefined || view.content.view_kind !== "detail")
          throw new ProjectBriefError(
            "PROJECT_BRIEF_CORRUPT",
            "The linked Work owner is unavailable.",
          );
        work.push(view);
        if (view.content.summary.attention.state === "needs_attention")
          attention.push({
            item_id: id,
            owner: "work",
            owner_content_hash: view.content_hash,
            consequence_class: "work_interruption",
            reason: view.content.summary.attention.reason,
            resolution: "inspect_canonical_owner",
            deferral: "preserves_underlying_condition",
            acknowledgment: "client_local",
          });
      }
      const sources = await this.readScientificSources(
        client,
        readAt,
        projectId,
        definition,
      );
      const order = {
        integrity: 0,
        review_decision: 1,
        work_interruption: 2,
        projection_lag: 3,
      };
      attention.sort(
        (a, b) =>
          order[a.consequence_class] - order[b.consequence_class] ||
          a.item_id.localeCompare(b.item_id),
      );
      const retainedLinks = links.rows
        .slice(0, LIMIT)
        .map((row) => row.payload) as ProjectBriefContent["inquiry_links"];
      const profilePayload:
        | ProjectBriefContent["profile_payload"]
        | ProjectBriefContentV11["profile_payload"] =
        version === "1.0.0"
          ? sources
          : {
              ...sources,
              schema_version: "1.1.0",
              current_state: await readResearchBriefSynthesis(
                client,
                this.contracts,
                projectId,
                retainedLinks,
                links.rows.length > LIMIT ? "partial" : "complete",
              ),
            };
      const content = {
        shell,
        definition,
        objective,
        orientation: {
          statement: objective.content.statement,
          basis: "exact_current_objective",
        },
        section_order: [
          "current_focus",
          "attention",
          "comparison",
          "current_state",
          "work",
          "next_steps",
          "recent_decisions",
        ],
        inquiry_links: links.rows
          .slice(0, LIMIT)
          .map((row) => row.payload) as ProjectBriefContent["inquiry_links"],
        attention,
        reviews: reviews as ProjectBriefContent["reviews"],
        work: work as ProjectBriefContent["work"],
        next_steps: nextSteps as ProjectBriefContent["next_steps"],
        recent_decisions: history,
        comparison,
        profile_payload: profilePayload,
        profile_registration: definition.content.registrations.find(
          (entry) =>
            entry.registration_kind === "extension" &&
            entry.semantic_key === "scientific.research-brief",
        )!,
        coverage: {
          state: "partial",
          limitations: [
            "Attention covers projection observations, open Reviews for this Objective or Project, and linked Work interruptions. The first returned item leads only within this coverage; no global priority or eligibility is asserted.",
            `Review coverage is ${reviewIds.rows.length > LIMIT ? "partial" : "complete"} for the selected open-session query, with a limit of ${LIMIT}. Deferred and closed Reviews remain available through Review and History.`,
            `Inquiry-link coverage is ${links.rows.length > LIMIT ? "partial" : "complete"} for this Objective, with a limit of ${LIMIT}. Work comes only from retained inquiry links; completion is operational and does not establish an applied finding.`,
            "Next steps preserve the existing inspect-result SuggestedAction owner and its freshness. No preferred action or new Work recommendation is inferred.",
            "Recent decisions preserve the canonical recent-ten History window, including its effect and recovery limits. The event interval does not reconstruct historical Work or Brief state. No acknowledgment or deferral is persisted by this read.",
          ],
        },
      } as ProjectBriefContent | ProjectBriefContentV11;
      // Time-dependent owner observations retain their exact read_at. Hashes bind this complete read.
      const view = {
        schema_name: "petra.project-brief-view",
        schema_version: version,
        project_id: projectId,
        content,
        content_hash: hash(content),
        snapshot_hash: hash(projectBriefSnapshotMaterial(content)),
        read_at: readAt,
      } as PetraProjectBriefReadView;
      this.contracts.assertValid("project-brief-view", version, view);
      await assertProjectBriefIntegrity(
        view,
        projectId,
        (value) => Promise.resolve(hash(value)),
        this.contracts.entries.find(
          (entry) =>
            entry.name === "research-brief-payload" &&
            entry.version === version,
        )!.canonical_sha256,
      );
      if (
        request.expected_snapshot_hash !== undefined &&
        request.expected_snapshot_hash !== view.snapshot_hash
      )
        throw new ProjectBriefError(
          "PROJECT_BRIEF_STALE",
          "The requested Brief content is no longer the current observation. Read the current Brief explicitly.",
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

  private assertProfile(
    definition: PetraProjectDefinition,
    objective: PetraProjectObjective,
    projectId: string,
  ): "1.0.0" | "1.1.0" {
    const bindings = definition.content.registrations.filter(
      (entry) =>
        entry.registration_kind === "extension" &&
        entry.semantic_key === "scientific.research-brief",
    );
    const version = bindings[0]?.contract.version;
    const registered = this.contracts.entries.find(
      (entry) =>
        entry.name === "research-brief-payload" && entry.version === version,
    );
    if (
      (version !== "1.0.0" && version !== "1.1.0") ||
      registered === undefined ||
      definition.definition_family !== "petra.scientific-evidence" ||
      !definition.content.supported_places.includes("brief") ||
      bindings.length !== 1 ||
      bindings[0]!.contract.name !== "petra.research-brief-payload" ||
      bindings[0]!.contract.content_hash !== registered.canonical_sha256 ||
      objective.content.objective_kind !== "scientific.research-question"
    )
      throw new ProjectBriefError(
        "PROJECT_BRIEF_UNSUPPORTED",
        "No exact registered scientific Brief payload is available for this ProjectDefinition and Objective.",
      );
    if (
      definition.project_id !== projectId ||
      objective.project_id !== projectId ||
      objective.project_definition_ref.project_definition_id !==
        definition.project_definition_id ||
      objective.project_definition_ref.revision !== definition.revision ||
      objective.project_definition_ref.content_hash !==
        definition.content_hash ||
      hash(objective.content) !== objective.content_hash
    )
      throw new ProjectBriefError(
        "PROJECT_BRIEF_STALE",
        "The current Objective must bind the exact current ProjectDefinition.",
      );
    return version;
  }

  private async readScientificSources(
    client: PoolClient,
    readAt: string,
    projectId: string,
    definition: PetraProjectDefinition,
  ): Promise<ProjectBriefContent["profile_payload"]> {
    const ids = await client.query<{ project_source_id: string }>(
      "SELECT project_source_id FROM petra.project_sources WHERE project_id = $1 ORDER BY project_source_id LIMIT $2",
      [projectId, LIMIT + 1],
    );
    const reader = new PostgresProjectSourceViewReader(
      this.pool,
      this.contracts,
    );
    const sources: Array<
      ProjectBriefContent["profile_payload"]["sources"][number]
    > = [];
    for (const id of ids.rows.slice(0, LIMIT)) {
      const source = await reader.readSourceInSnapshot(
        client,
        readAt,
        projectId,
        id.project_source_id,
      );
      if (source === undefined)
        throw new ProjectBriefError(
          "PROJECT_BRIEF_CORRUPT",
          "A registered source lost its exact basis chain.",
        );
      const binding = source.content.binding.project_definition_ref;
      if (
        binding.record_id !== definition.project_definition_id ||
        binding.revision !== definition.revision ||
        binding.content_hash !== definition.content_hash
      )
        throw new ProjectBriefError(
          "PROJECT_BRIEF_STALE",
          "A source binding belongs to a different ProjectDefinition revision.",
        );
      sources.push(source);
    }
    return {
      schema_name: "petra.research-brief-payload",
      schema_version: "1.0.0",
      sources: sources as ProjectBriefContent["profile_payload"]["sources"],
      source_coverage: ids.rows.length > LIMIT ? "partial" : "complete",
      limitations: [
        "Source observations preserve exact copies, rights, basis, and limitations. They do not establish support for the current Objective.",
        "No assessment of Hypothesis standing, the evidence frontier, material disagreements, or inquiry understanding is available in this Brief. Their absence is not evidence of agreement or completeness.",
      ],
    };
  }
}
