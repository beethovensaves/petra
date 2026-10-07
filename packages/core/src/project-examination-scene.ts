import type {
  PetraProjectExaminationScene,
  PetraProjectExaminationView,
} from "@petra/contracts";
import { copilotHash } from "./project-copilot.js";
import { examinationRecordRef } from "./hypothesis-examination.js";
type Content = PetraProjectExaminationScene["content"];
type Ref = Content["nodes"][number]["record_ref"];
/** Derived view only: cycle lineage stays outside the examined graph hash, so
 * recording a judgment cannot invalidate the basis it just examined. */
export const buildProjectExaminationScene = (
  view: Omit<PetraProjectExaminationView, "scene">,
): PetraProjectExaminationScene => {
  const nodes = new Map<string, Content["nodes"][number]>();
  const identities = new Map<string, string>();
  const edges = new Map<string, Content["relationships"][number]>();
  const add = (
    key: string,
    ref: Ref,
    kind: string,
    label: string,
    state: Content["nodes"][number]["state"],
    axes: string[] = [],
  ) => {
    nodes.set(key, {
      key,
      record_ref: ref,
      kind,
      label: label.slice(0, 500),
      state,
      affected_axes: axes as Content["nodes"][number]["affected_axes"],
    });
    if (!identities.has(copilotHash(ref)))
      identities.set(copilotHash(ref), key);
    return key;
  };
  const reference = (ref: Ref) =>
    identities.get(copilotHash(ref)) ??
    add(
      `reference:${ref.record_id}@${ref.revision}`,
      ref,
      ref.schema_name,
      `${ref.schema_name.replace(/^petra\./u, "")} · revision ${ref.revision}`,
      "reference",
    );
  const link = (
    subject: string,
    predicate: Content["relationships"][number]["predicate"],
    ref: Ref,
  ) => {
    const object = reference(ref);
    const key = `${subject}:${predicate}:${object}`;
    edges.set(key, {
      key,
      subject_key: subject,
      object_key: object,
      predicate,
    });
  };
  for (const node of view.graph.content.nodes)
    add(
      node.key,
      node.record_ref,
      node.semantic_key,
      node.label,
      node.layer === "working" ? "working" : "reference",
    );
  for (const record of view.records) {
    const ref = examinationRecordRef(record);
    const freshness = view.freshness.find(
      (item) => copilotHash(item.record_ref) === copilotHash(ref),
    );
    const label =
      record.schema_name === "petra.hypothesis"
        ? `${record.content.ordinal}: ${record.content.descriptor}`
        : record.schema_name === "petra.hypothesis-assessment"
          ? `Examination · ${record.content.axes.find((axis) => axis.axis === "warrant")?.summary.replaceAll("_", " ") ?? "unassessed"}`
          : record.schema_name === "petra.posture-decision"
            ? `Posture · ${record.content.primary_posture}`
            : `Conclusion · ${record.content.disposition.replaceAll("_", " ")}`;
    add(
      `examination:${ref.record_id}@${ref.revision}`,
      ref,
      record.schema_name,
      label,
      freshness?.state ?? "unassessed",
      freshness?.affected_axes ?? [],
    );
  }
  for (const record of view.records) {
    const key = reference(examinationRecordRef(record));
    if (record.schema_name === "petra.hypothesis") {
      link(key, "targets", record.content.target_claim_ref);
      if (record.content.supersedes_ref !== null)
        link(key, "supersedes", record.content.supersedes_ref);
    } else {
      if (record.schema_name !== "petra.cycle-disposition") {
        link(key, "pins_profile", record.content.profile_ref);
        link(key, "pins_policy", record.content.policy_ref);
      }
      if (record.schema_name === "petra.hypothesis-assessment") {
        link(key, "assesses", record.content.subject_ref);
        link(key, "targets", record.content.target_claim_ref);
        for (const criterion of record.content.criteria)
          for (const ref of criterion.evidence_refs)
            link(key, "uses_evidence", ref);
        if (record.content.prior_assessment_ref !== null)
          link(key, "supersedes", record.content.prior_assessment_ref);
      } else if (record.schema_name === "petra.posture-decision") {
        link(key, "has_posture", record.content.assessment_ref);
        for (const obligation of record.content.obligations)
          for (const ref of obligation.satisfaction_evidence_refs)
            link(key, "satisfies", ref);
      } else {
        link(key, "concludes", record.content.assessment_ref);
        link(key, "has_posture", record.content.posture_ref);
        if (record.content.prior_disposition_ref !== null)
          link(key, "prior_disposition", record.content.prior_disposition_ref);
      }
    }
  }
  for (const receipt of view.receipts) {
    if (receipt.content.prior_ref !== null)
      link(
        reference(receipt.content.record_ref),
        "supersedes",
        receipt.content.prior_ref,
      );
  }
  const selected = [...nodes.values()]
    .sort(
      (a, b) =>
        Number(b.key.startsWith("examination:")) -
          Number(a.key.startsWith("examination:")) ||
        a.key.localeCompare(b.key),
    )
    .slice(0, 250);
  const keys = new Set(selected.map((node) => node.key));
  const relationships = [...edges.values()]
    .filter((edge) => keys.has(edge.subject_key) && keys.has(edge.object_key))
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(0, 500);
  const content: Content = {
    graph_content_hash: view.graph.content_hash,
    nodes: selected,
    relationships,
    omitted_nodes: nodes.size - selected.length,
    omitted_relationships: edges.size - relationships.length,
    has_more_history: view.has_more,
    limitations: [
      "This is a bounded derived scene of exact native material and retained examination lineage. Drawing a link creates no new relationship, verification, permission, or completed Work.",
      "Reference nodes may lie outside this history page or current working graph. Currentness is computed against the examined graph; earlier assessment content remains immutable.",
      "Only explicit criteria evidence and recorded obligation evidence form evidence links. Labels and layout provide navigation, never scientific support.",
    ],
  };
  return {
    schema_name: "petra.project-examination-scene",
    schema_version: "1.0.0",
    project_id: view.project_id,
    content,
    content_hash: copilotHash(content),
  };
};
