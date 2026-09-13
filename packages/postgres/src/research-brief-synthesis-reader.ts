import { createHash } from "node:crypto";
import { canonicalize } from "json-canonicalize";
import type { PoolClient } from "pg";
import type {
  PetraContextPacket,
  PetraEvidencePacket,
  PetraGroundedResponse,
  PetraProjectInquiryLink,
  PetraResearchBriefPayloadV11,
  PetraSynthesistModelCall,
  ResearchBriefRetainedSynthesis,
} from "@petra/contracts";
import type { PetraContractRegistry } from "@petra/contracts/validator";
import { ProjectBriefError } from "@petra/core";

const hash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

/** Scientific adapter: reads existing synthesis owners in the Brief's transaction. */
export const readResearchBriefSynthesis = async (
  client: PoolClient,
  contracts: PetraContractRegistry,
  projectId: string,
  links: readonly PetraProjectInquiryLink[],
  linkCoverage: "complete" | "partial",
): Promise<PetraResearchBriefPayloadV11["current_state"]> => {
  const read = async <T extends { content: unknown; content_hash: string }>(
    name: string,
    version: string,
    sql: string,
    values: readonly unknown[],
  ): Promise<T> => {
    const row = (
      await client.query<{ payload: unknown; record_hash: string }>(sql, [
        ...values,
      ])
    ).rows[0];
    if (row === undefined)
      throw new ProjectBriefError(
        "PROJECT_BRIEF_CORRUPT",
        "A retained synthesis owner is unavailable in the Brief snapshot.",
      );
    contracts.assertValid(name, version, row.payload);
    const record = row.payload as T;
    if (
      row.record_hash !== hash(record) ||
      record.content_hash !== hash(record.content)
    )
      throw new ProjectBriefError(
        "PROJECT_BRIEF_CORRUPT",
        "A retained synthesis owner failed its stored-record hash check.",
      );
    return record;
  };
  const syntheses: ResearchBriefRetainedSynthesis[] = [];
  for (const link of links) {
    const target = link.content.target;
    if (target.target_kind !== "result") continue;
    if (
      target.bearing !== "addresses" ||
      target.result_ref.schema_name !== "petra.grounded-response" ||
      target.result_ref.schema_version !== "1.0.0"
    )
      throw new ProjectBriefError(
        "PROJECT_BRIEF_UNSUPPORTED",
        "This scientific synthesis adapter requires exact addressing GroundedResponse links.",
      );
    const ref = target.result_ref;
    const response = await read<PetraGroundedResponse>(
      "grounded-response",
      "1.0.0",
      `SELECT payload, record_hash FROM petra.grounded_response_revisions
       WHERE project_id = $1 AND grounded_response_id = $2 AND revision = $3 AND content_hash = $4 AND record_hash = $5`,
      [
        projectId,
        ref.record_id,
        ref.revision,
        ref.content_hash,
        ref.record_hash,
      ],
    );
    const current = await read<PetraGroundedResponse>(
      "grounded-response",
      "1.0.0",
      `SELECT revision.payload, revision.record_hash FROM petra.grounded_responses head
       JOIN petra.grounded_response_revisions revision ON revision.grounded_response_id = head.grounded_response_id AND revision.revision = head.current_revision
       WHERE head.project_id = $1 AND head.grounded_response_id = $2`,
      [projectId, ref.record_id],
    );
    const c = response.content;
    const context = await read<PetraContextPacket>(
      "context-packet",
      "1.0.0",
      "SELECT payload, record_hash FROM petra.context_packets WHERE project_id = $1 AND context_packet_id = $2 AND content_hash = $3",
      [
        projectId,
        c.context_packet_ref.context_packet_id,
        c.context_packet_ref.content_hash,
      ],
    );
    const evidence = await read<PetraEvidencePacket>(
      "evidence-packet",
      "1.0.0",
      "SELECT payload, record_hash FROM petra.evidence_packets WHERE project_id = $1 AND evidence_packet_id = $2 AND content_hash = $3",
      [
        projectId,
        c.evidence_packet_ref.evidence_packet_id,
        c.evidence_packet_ref.content_hash,
      ],
    );
    const call = await read<PetraSynthesistModelCall>(
      "model-call",
      "1.1.0",
      "SELECT payload, record_hash FROM petra.model_calls WHERE model_call_id = $1",
      [c.execution_ref.model_call_id],
    );
    if (
      call.content.outcome !== "success" ||
      call.content.output === undefined ||
      call.content.validation.some((result) => result.outcome !== "pass") ||
      call.model_call_id !== c.execution_ref.model_call_id ||
      call.content.model_request_id !== c.execution_ref.model_request_id ||
      call.content.deployment.model_deployment_id !==
        c.execution_ref.model_deployment_id ||
      hash(call.content.output) !== c.model_output_hash ||
      call.content.input.context_packet_ref.context_packet_id !==
        context.context_packet_id ||
      call.content.input.context_packet_ref.content_hash !==
        context.content_hash ||
      call.content.input.evidence_packet_ref.evidence_packet_id !==
        evidence.evidence_packet_id ||
      call.content.input.evidence_packet_ref.content_hash !==
        evidence.content_hash
    )
      throw new ProjectBriefError(
        "PROJECT_BRIEF_CORRUPT",
        "The retained synthesis does not match its successful validated model call and exact packets.",
      );
    syntheses.push({
      project_inquiry_link_id: link.project_inquiry_link_id,
      linked_response: response,
      current_response: current,
      context_packet: context,
      evidence_packet: evidence,
      output: call.content.output,
    });
  }
  return {
    syntheses:
      syntheses as PetraResearchBriefPayloadV11["current_state"]["syntheses"],
    coverage: {
      scope: "addressing_results_in_returned_current_objective_links",
      state: linkCoverage,
      link_limit: 20,
    },
    limitations: [
      "These retained model-produced syntheses address the exact current Objective through authored inquiry links. They are not accepted findings, admissible inquiry basis, or an assessment that the inquiry is resolved.",
      "Each synthesis retains its original evidence snapshot, statement origins, basis, omissions, and limitations. The Brief observes its current response revision and cache state; reusable does not mean a complete or current scientific picture of the Project.",
      "Coverage is limited to addressing results in the returned current-Objective links. No returned result does not establish that no relevant evidence or unresolved question exists. Syntheses are not merged, ranked, or selected as preferred interpretations.",
      "Hypothesis standing, evidence-frontier and cross-result disagreement assessments, and authoritative inquiry understanding remain unavailable. Source inventory coverage is separate from each synthesis packet's coverage.",
    ],
  };
};
