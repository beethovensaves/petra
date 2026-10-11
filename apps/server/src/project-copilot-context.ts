import {
  CopilotBoundaryError,
  copilotHash,
  type CopilotContext,
} from "@petra/core";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  PetraProjectDefinition,
  PetraProjectShellView,
  PetraProjectInquiryView,
  PetraProjectWorkReadView,
} from "@petra/contracts";

const contracts = new PetraContractRegistry();
type Shell = Pick<PetraProjectShellView, "project_id" | "content">;
type DefinitionRef = Shell["content"]["definition"];
type Record = CopilotContext["records"][number];

export function sameContextDefinition(
  expected: DefinitionRef,
  actual: {
    revision: number;
    content_hash: string;
    record_id?: string;
    project_definition_id?: string;
  },
): boolean {
  return (
    (actual.record_id ?? actual.project_definition_id) ===
      expected.project_definition_id &&
    actual.revision === expected.revision &&
    actual.content_hash === expected.content_hash
  );
}

export function contextShellBasis(shell: Shell) {
  return {
    project_id: shell.project_id,
    project: shell.content.project,
    definition: shell.content.definition,
    objective: shell.content.current_objective ?? null,
    authority: shell.content.authority,
  };
}

export function exactDefinitionContext(
  shell: Shell,
  definition: PetraProjectDefinition | undefined,
): Record {
  if (definition === undefined)
    throw new CopilotBoundaryError(
      "CONTEXT_DEFINITION_UNAVAILABLE",
      "The exact Project definition is unavailable. Refresh before asking.",
    );
  try {
    contracts.assertValid("project-definition", "1.0.0", definition);
  } catch {
    throw new CopilotBoundaryError(
      "CONTEXT_DEFINITION_INVALID",
      "The exact Project definition failed its registered contract.",
    );
  }
  if (
    definition.project_id !== shell.project_id ||
    !sameContextDefinition(shell.content.definition, definition) ||
    definition.definition_family !==
      shell.content.definition.definition_family ||
    copilotHash(definition.content) !== definition.content_hash
  )
    throw new CopilotBoundaryError(
      "CONTEXT_CHANGED",
      "The exact Project definition identity, revision or content changed during this context read.",
    );
  const registrations = [...definition.content.registrations];
  const terms = [...definition.content.terms];
  const omittedFlows = [...definition.content.omitted_flows];
  const excerpt = () => ({
    authority: "definition_semantics_only",
    definition_ref: shell.content.definition,
    registrations,
    terms,
    supported_places: definition.content.supported_places,
    omitted_flows: omittedFlows,
    omitted_registrations:
      definition.content.registrations.length - registrations.length,
    omitted_terms: definition.content.terms.length - terms.length,
    omitted_flow_descriptions:
      definition.content.omitted_flows.length - omittedFlows.length,
    disclosure:
      "Exact declared contracts and meanings; registration alone proves no installed examiner, executable workflow, source egress permission, command authority or completed inquiry. Omitted entries are unavailable to this turn.",
  });
  while (Buffer.byteLength(JSON.stringify(excerpt()), "utf8") > 7500) {
    if (terms.length) terms.pop();
    else if (registrations.length) registrations.pop();
    else if (omittedFlows.length) omittedFlows.pop();
    else
      throw new CopilotBoundaryError(
        "CONTEXT_DEFINITION_BUDGET",
        "The exact definition metadata exceeds the context budget.",
      );
  }
  return {
    key: "project-definition",
    kind: "project-definition-context",
    label: "Declared Project meaning",
    ref: {
      record_id: definition.project_definition_id,
      revision: definition.revision,
      record_hash: copilotHash(definition),
    },
    text: JSON.stringify(excerpt()),
    destination: `/projects/${shell.project_id}/profile`,
  };
}

export function projectActivityContext(
  shell: Shell,
  inquiries: PetraProjectInquiryView | undefined,
  work: PetraProjectWorkReadView | undefined,
): { records: Record[]; limitations: string[] } {
  const records: Record[] = [],
    limitations: string[] = [];
  for (const view of [inquiries, work]) {
    if (view === undefined) continue;
    try {
      contracts.assertValid(
        view.schema_name.replace(/^petra\./u, ""),
        view.schema_version,
        view,
      );
    } catch {
      throw new CopilotBoundaryError(
        "CONTEXT_ACTIVITY_INVALID",
        "Inquiry or Work metadata failed its registered contract.",
      );
    }
    if (
      view.project_id !== shell.project_id ||
      view.content.view_kind !== "collection" ||
      !sameContextDefinition(
        shell.content.definition,
        view.content.project_definition_ref,
      ) ||
      view.content.project_definition_ref.definition_family !==
        shell.content.definition.definition_family ||
      copilotHash(view.content) !== view.content_hash ||
      view.content.authority.event_position !==
        shell.content.authority.event_position ||
      view.content.authority.stream_revision !==
        shell.content.authority.stream_revision
    )
      throw new CopilotBoundaryError(
        "CONTEXT_CHANGED",
        "Inquiry or Work metadata belongs to a different Project or snapshot. Refresh the conversation.",
      );
  }
  if (inquiries?.content.view_kind === "collection") {
    let oversized = 0;
    for (const inquiry of inquiries.content.inquiries) {
      // Metadata avoids disclosing unclassified source-derived wording or result bytes.
      const text = JSON.stringify({
        role_ref: inquiry.role.role_ref,
        semantic_key: inquiry.role.semantic_key,
        authored_status: inquiry.authored_status,
        resolution_boundary: inquiry.resolution_boundary,
        dependency_count: inquiry.dependency_count,
        linked_work_count: inquiry.linked_work_count,
        linked_result_count: inquiry.linked_result_count,
        operational_work: inquiry.operational_work,
        authority: "authored_status_only",
        disclosure:
          "Framing and result text are withheld on this metadata path. Work completion does not resolve this inquiry.",
      });
      if (text.length > 7500) {
        oversized++;
        continue;
      }
      records.push({
        key: `inquiry:${inquiry.inquiry_anchor_ref.objective_id}@${inquiry.inquiry_anchor_ref.revision}`,
        ref: {
          record_id: inquiry.inquiry_anchor_ref.objective_id,
          revision: inquiry.inquiry_anchor_ref.revision,
          record_hash: inquiry.inquiry_anchor_ref.record_hash,
        },
        kind: "project-inquiry-context",
        label: "Inquiry status and exact links",
        text,
        destination: `/projects/${shell.project_id}/brief`,
      });
    }
    limitations.push(
      `Inquiry context includes ${inquiries.content.inquiries.length - oversized} metadata entries; ${oversized} oversized entries withheld. ${inquiries.content.page.total_count - inquiries.content.page.returned_count} entries lie outside this bounded page; more available: ${inquiries.content.page.has_more}. Inquiry framing and result text are not admitted as source evidence.`,
    );
  } else
    limitations.push(
      "Inquiry metadata is unavailable on this read; no resolved inquiry or missing inquiry is inferred.",
    );
  if (work?.content.view_kind === "collection") {
    let conversational = 0;
    for (const task of work.content.tasks) {
      if (
        ["petra.copilot.answer", "petra.copilot.adopt-history"].includes(
          task.workflow.workflow_name,
        )
      ) {
        conversational++;
        continue;
      }
      records.push({
        key: `work:${task.work_unit_ref.work_unit_id}@${task.work_unit_ref.revision}`,
        ref: {
          record_id: task.work_unit_ref.work_unit_id,
          revision: task.work_unit_ref.revision,
          record_hash: task.work_unit_ref.record_hash,
        },
        kind: "project-work-context",
        label: "Work lifecycle metadata",
        text: JSON.stringify({
          workflow: task.workflow,
          state: task.execution.state,
          terminal_outcome: task.execution.terminal_outcome ?? null,
          attempt: task.execution.attempt,
          reported_output_count: task.reported_output_count,
          authority: "operational_only",
          disclosure:
            "Task wording, failure text, inputs, proposed changes and output bytes are withheld. Success establishes no domain verification, accepted finding or resolved inquiry.",
        }),
        destination: `/projects/${shell.project_id}/work/${task.work_unit_ref.work_unit_id}`,
      });
    }
    limitations.push(
      `Work context contains lifecycle metadata from a bounded page; ${work.content.page.total_count - work.content.page.returned_count} entries lie outside this page; more available: ${work.content.page.has_more}. ${conversational} conversational Work entries are excluded here because exact prior-turn input is separately bound by the conversation manifest. Work proposals and packet/output bytes require their own exact authorized read and are not silently substituted.`,
    );
  } else
    limitations.push(
      "Work metadata is unavailable on this read; no execution, proposal or output is inferred.",
    );
  return { records, limitations };
}
