import { PetraContractRegistry } from "@petra/contracts/validator";
import { useCopilotWorkspace } from "./CopilotWorkspace.js";
import { ExaminationAuthoritySetup } from "./ExaminationAuthoritySetup.js";
import { useEffect, useState } from "react";
import type {
  PetraHypothesis,
  PetraHypothesisAssessment,
  PetraPostureDecision,
  PetraCycleDisposition,
  PetraProjectExaminationRequest,
  PetraProjectExaminationView,
  PetraProjectExaminationReceipt,
  PetraClaim,
} from "@petra/contracts";
import type { ProjectExaminationRecord } from "@petra/core";
import {
  ProjectExaminationClient,
  ExaminationRequestRejected,
  examinationContentHash,
  examinationReference,
} from "@petra/adapters";
type Ref = PetraHypothesis["content"]["target_claim_ref"];
type Node = PetraProjectExaminationView["graph"]["content"]["nodes"][number];
type Draft = {
  examination_graph_hash?: string;
  descriptor: string;
  rationale: string;
  falsifiers: string;
  conclusion: PetraCycleDisposition["content"]["disposition"];
  posture: PetraPostureDecision["content"]["primary_posture"];
  finding: string;
  coverage: "unsearched" | "bounded_search";
  protocol: string;
  unknowns: string;
  criteria: Record<
    string,
    { result: "passed" | "failed" | "unknown"; explanation: string }
  >;
  passageIds: string[];
};
type Decision = {
  phase: "prepared" | "sending" | "unknown";
  request: PetraProjectExaminationRequest;
};
const makeId = (kind: string): string => {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(26));
  return `${kind}_${Array.from(bytes, (byte, i) => alphabet[i === 0 ? byte % 8 : byte % 32]).join("")}`;
};
const lines = (text: string): string[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 50);
const client = () =>
  new ProjectExaminationClient({
    baseUrl: window.location.origin,
    token:
      sessionStorage.getItem("petra.auth.token") ?? "petra-local-development",
  });
const restore = <T,>(key: string, fallback: T): T => {
  try {
    const value = sessionStorage.getItem(key);
    return value === null ? fallback : (JSON.parse(value) as T);
  } catch {
    return fallback;
  }
};
const description = (record: ProjectExaminationRecord): string =>
  record.schema_name === "petra.hypothesis"
    ? `${record.content.ordinal}: ${record.content.descriptor}`
    : record.schema_name === "petra.hypothesis-assessment"
      ? `Examination: ${record.content.axes.find((axis) => axis.axis === "warrant")?.summary.replaceAll("_", " ") ?? "unassessed"}`
      : record.schema_name === "petra.posture-decision"
        ? `Posture: ${record.content.primary_posture}`
        : `Conclusion: ${record.content.disposition.replaceAll("_", " ")}`;
const latest = <T extends ProjectExaminationRecord>(
  records: ProjectExaminationRecord[],
  match: (record: ProjectExaminationRecord) => record is T,
): T | undefined => records.filter(match).at(-1);
const EvidenceIdentity = ({ reference }: { reference: Ref }) => (
  <div className="cycle-exact-reference">
    <p>
      {reference.schema_name.replace("petra.", "")} · revision{" "}
      {reference.revision}
    </p>
    <details>
      <summary>Exact identity</summary>
      <code>{reference.record_id}</code>
      <code>{reference.record_hash}</code>
    </details>
  </div>
);
export const ExaminationRecordDetails = ({
  record,
}: {
  record: ProjectExaminationRecord;
}): React.JSX.Element => (
  <article className="cycle-record">
    <h4>{description(record)}</h4>
    <p>
      Revision {record.revision} ·{" "}
      {new Date(record.created_at).toLocaleString()}
    </p>
    {record.schema_name === "petra.hypothesis" ? (
      <>
        <p>{record.content.rationale}</p>
        <p>
          Development: {record.content.development} · Lifecycle:{" "}
          {record.content.lifecycle}
        </p>
        <EvidenceIdentity reference={record.content.target_claim_ref} />
        <ul>
          {record.content.falsification_conditions.map((condition) => (
            <li key={condition}>{condition}</li>
          ))}
        </ul>
      </>
    ) : record.schema_name === "petra.hypothesis-assessment" ? (
      <>
        <p>
          Perspective: {record.content.perspective.replaceAll("_", " ")} ·
          examined {new Date(record.content.as_of).toLocaleString()}
        </p>
        <dl>
          {record.content.axes.map((axis) => (
            <div key={axis.axis}>
              <dt>{axis.axis.replaceAll("_", " ")}</dt>
              <dd>{axis.summary.replaceAll("_", " ")}</dd>
            </div>
          ))}
        </dl>
        <p>
          Other assessment dimensions remain unassessed. Activity is read from
          Work; development and lifecycle remain with the Hypothesis.
        </p>
        <ul>
          {record.content.criteria.map((criterion) => (
            <li key={criterion.criterion_key}>
              <strong>
                {criterion.criterion_key.replaceAll("_", " ")}:{" "}
                {criterion.result}
              </strong>
              <p>{criterion.explanation}</p>
              <details>
                <summary>Method and retained evidence</summary>
                <p>{criterion.method}</p>
                {criterion.evidence_refs.map((ref) => (
                  <EvidenceIdentity
                    key={`${ref.record_id}@${ref.revision}`}
                    reference={ref}
                  />
                ))}
              </details>
            </li>
          ))}
        </ul>
        <details>
          <summary>Coverage, gaps and limitations</summary>
          <p>{record.content.coverage.protocol}</p>
          <ul>
            {[
              ...record.content.material_unknowns,
              ...record.content.coverage.limitations,
            ].map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </details>
      </>
    ) : record.schema_name === "petra.posture-decision" ? (
      <>
        <p>{record.content.state}</p>
        <ul>
          {record.content.obligations.map((obligation) => (
            <li key={obligation.obligation_id}>
              <strong>{obligation.type_key.replaceAll("_", " ")}</strong> ·{" "}
              {obligation.state}
              <p>{obligation.rationale}</p>
              <p>{obligation.enforcement.replaceAll("_", " ")}</p>
            </li>
          ))}
        </ul>
      </>
    ) : (
      <>
        <p>{record.content.rationale}</p>
        <ul>
          {record.content.unresolved_questions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
        <p>Project judgment within the examined scope.</p>
      </>
    )}
    <details>
      <summary>Inspect exact retained record</summary>
      <pre>{JSON.stringify(record, null, 2)}</pre>
    </details>
  </article>
);

export const HypothesisCycles = ({
  projectId,
  node,
  graphHash,
}: {
  projectId: string;
  node: Node;
  graphHash: string;
}): React.JSX.Element => {
  const workspace = useCopilotWorkspace();
  const storage = `petra.examination.${projectId}.${node.record_ref.record_id}`;
  const [view, setView] = useState<PetraProjectExaminationView>();
  const [records, setRecords] = useState<ProjectExaminationRecord[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<PetraProjectExaminationReceipt>();
  const [decision, setDecision] = useState<Decision | undefined>(() =>
    restore(storage + ".decision", undefined),
  );
  const [draft, setDraft] = useState<Draft>(() =>
    restore(storage + ".draft", {
      descriptor: node.summary.slice(0, 500),
      rationale: "",
      falsifiers: "",
      conclusion: "further_cycle",
      posture: "clarify",
      finding: "scientific.scoped_insufficiency",
      coverage: "unsearched",
      protocol: "",
      unknowns:
        "Independent support and unrepresented alternatives remain unexamined.",
      criteria: {},
      passageIds: [],
    }),
  );
  useEffect(() => {
    sessionStorage.setItem(storage + ".draft", JSON.stringify(draft));
  }, [storage, draft]);
  useEffect(() => {
    if (decision === undefined)
      sessionStorage.removeItem(storage + ".decision");
    else
      sessionStorage.setItem(storage + ".decision", JSON.stringify(decision));
  }, [storage, decision]);
  useEffect(() => {
    const abort = new AbortController();
    void client()
      .read(projectId, 0, abort.signal)
      .then((next) => {
        setView(next);
        setRecords(next.records);
        setError(undefined);
      })
      .catch((failure: unknown) => {
        if (!abort.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "The exact examination is unavailable.",
          );
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [projectId, node.key]);
  const refresh = async () => {
    const next = await client().read(projectId);
    setView(next);
    setRecords(next.records);
    setReceipt(next.receipts.at(-1));
    workspace?.refreshContext();
  };
  const hypothesis = latest(
    records,
    (record): record is PetraHypothesis =>
      record.schema_name === "petra.hypothesis" &&
      record.content.target_claim_ref.record_id === node.record_ref.record_id,
  );
  const assessment = latest(
    records,
    (record): record is PetraHypothesisAssessment =>
      record.schema_name === "petra.hypothesis-assessment" &&
      record.content.subject_ref.record_id === hypothesis?.hypothesis_id,
  );
  const posture = latest(
    records,
    (record): record is PetraPostureDecision =>
      record.schema_name === "petra.posture-decision" &&
      record.content.assessment_ref.record_id ===
        assessment?.hypothesis_assessment_id,
  );
  const disposition = latest(
    records,
    (record): record is PetraCycleDisposition =>
      record.schema_name === "petra.cycle-disposition" &&
      record.content.assessment_ref.record_id ===
        assessment?.hypothesis_assessment_id,
  );
  const assessmentFreshness = view?.freshness.find(
    (item) =>
      item.record_ref.record_id === assessment?.hypothesis_assessment_id &&
      item.record_ref.revision === assessment.revision,
  );
  const currentNode = view?.graph.content.nodes.find(
    (item) =>
      item.record_ref.record_id === node.record_ref.record_id &&
      item.layer === "working",
  );
  const targetCurrent =
    hypothesis !== undefined &&
    hypothesis.content.target_claim_ref.record_hash ===
      currentNode?.record_ref.record_hash;
  const available =
    graphHash === view?.graph.content_hash &&
    view?.authorization.state === "available" &&
    view.profile !== null &&
    view.policy !== null &&
    currentNode?.material_state === "available" &&
    !view.has_more;
  const locked = busy || decision !== undefined;
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  const safe = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Petra could not prepare this exact examination.",
      );
    } finally {
      setBusy(false);
    }
  };
  const prepare = async (
    operation: PetraProjectExaminationRequest["operation"],
    proposedContent: PetraProjectExaminationRequest["proposed_content"],
    prior?: ProjectExaminationRecord,
  ) => {
    if (view === undefined || !available)
      throw new Error(
        "Refresh the exact registered and authorized examination basis first.",
      );
    const commandId = makeId("command");
    const request: PetraProjectExaminationRequest = {
      schema_name: "petra.project-examination-request",
      schema_version: "1.0.0",
      command_id: commandId,
      idempotency_key: `examination:${commandId}`,
      project_id: projectId,
      operation,
      expected_graph_hash: view.graph.content_hash,
      expected_prior_ref:
        prior === undefined ? null : await examinationReference(prior),
      proposed_content: proposedContent,
      review: {
        content_hash: await examinationContentHash(proposedContent),
        reviewed_at: new Date().toISOString(),
        rationale:
          draft.rationale.trim() ||
          "I reviewed the exact proposed content, named criteria, retained basis and scoped consequence shown here.",
      },
    };
    new PetraContractRegistry().assertValid(
      "project-examination-request",
      "1.0.0",
      request,
    );
    setDecision({ phase: "prepared", request });
  };
  const prepareHypothesis = () =>
    safe(async () => {
      const content: PetraHypothesis["content"] =
        hypothesis === undefined
          ? {
              ordinal: `H${1 + Math.max(0, ...records.filter((record): record is PetraHypothesis => record.schema_name === "petra.hypothesis").map((record) => Number(record.content.ordinal.slice(1))))}`,
              descriptor: draft.descriptor.trim(),
              target_claim_ref: currentNode!.record_ref,
              rationale: draft.rationale.trim(),
              falsification_conditions: lines(draft.falsifiers),
              development:
                lines(draft.falsifiers).length > 0 ? "articulated" : "seed",
              lifecycle: "active",
              supersedes_ref: null,
            }
          : {
              ...hypothesis.content,
              target_claim_ref: currentNode!.record_ref,
            };
      await prepare(
        hypothesis === undefined ? "register_hypothesis" : "revise_hypothesis",
        content,
        hypothesis,
      );
    });
  const prepareAssessment = () =>
    safe(async () => {
      if (draft.examination_graph_hash !== view?.graph.content_hash)
        throw new Error(
          "Begin an examination against the current graph. Earlier draft judgments retain their original basis.",
        );
      if (
        !hypothesis ||
        !targetCurrent ||
        !view?.profile ||
        !view.policy ||
        !currentNode?.native_record
      )
        throw new Error(
          "Bind and review the current exact Claim before examining it.",
        );
      const native = currentNode.native_record as unknown as PetraClaim;
      const passages =
        currentNode.source_passages?.filter((passage) =>
          draft.passageIds.includes(passage.span.source_span_id),
        ) ?? [];
      const evidence: Ref[] = [
        currentNode.record_ref,
        ...(await Promise.all(
          passages.map(async (passage) => ({
            schema_name: passage.span.schema_name,
            schema_version: passage.span.schema_version,
            record_id: passage.span.source_span_id,
            revision: passage.span.revision,
            record_hash: await examinationContentHash(passage.span),
          })),
        )),
      ];
      const criteria = view.profile.content.criteria.map((criterion) => {
        const value = draft.criteria[criterion.key] ?? {
          result: "unknown" as const,
          explanation: "This criterion remains unexamined.",
        };
        return {
          criterion_key: criterion.key,
          result: value.result,
          method: criterion.method,
          origin: "human_judgment" as const,
          evidence_refs: value.result === "unknown" ? [] : evidence,
          explanation: value.explanation.trim(),
          limitations: lines(draft.unknowns),
        };
      });
      const findingType = view.profile.content.finding_types.find(
        (finding) => finding.key === draft.finding,
      );
      if (findingType === undefined)
        throw new Error("Select a registered finding meaning.");
      if (
        criteria.some((criterion) => criterion.result !== "unknown") &&
        passages.length === 0
      )
        throw new Error(
          "Select the exact source passages you examined before recording a passed or failed source check.",
        );
      if (draft.protocol.trim() === "")
        throw new Error(
          "Describe the examined source set and its search boundary; unsearched coverage must remain explicit.",
        );
      if (
        criteria.find(
          (criterion) => criterion.criterion_key === "contrary_basis_review",
        )?.result === "passed" &&
        draft.coverage !== "bounded_search"
      )
        throw new Error(
          "A passed contrary-basis check needs a declared bounded search protocol.",
        );
      if (
        findingType.permitted_summaries.some((summary) =>
          [
            "supporting_within_scope",
            "challenging_within_scope",
            "mixed",
          ].includes(summary),
        ) &&
        view.profile.content.criteria.some(
          (criterion) =>
            criterion.required_for_satisfied &&
            !criteria.some(
              (value) =>
                value.criterion_key === criterion.key &&
                value.result === "passed",
            ),
        )
      )
        throw new Error(
          "The registered finding requires every named mandatory check to pass. Record insufficiency or continue examining the gaps.",
        );
      const content: PetraHypothesisAssessment["content"] = {
        subject_ref: await examinationReference(hypothesis),
        target_claim_ref: currentNode.record_ref,
        basis: {
          definition_ref: view.graph.content.definition_ref,
          objective_ref: view.graph.content.objective_ref ?? null,
          graph_content_hash: view.graph.content_hash,
          event_position: view.graph.content.authority.event_position,
          stream_revision: view.graph.content.authority.stream_revision,
          query_kind: "current_registered_working_heads",
        },
        as_of: new Date().toISOString(),
        perspective: "present_day",
        scope: native.scope,
        profile_ref: {
          schema_name: view.profile.schema_name,
          schema_version: view.profile.schema_version,
          record_id: view.profile.assessment_profile_id,
          revision: view.profile.revision,
          record_hash: await examinationContentHash(view.profile),
        },
        policy_ref: {
          schema_name: view.policy.schema_name,
          schema_version: view.policy.schema_version,
          record_id: view.policy.assessment_policy_id,
          revision: view.policy.revision,
          record_hash: await examinationContentHash(view.policy),
        },
        criteria,
        findings: [
          {
            finding_key: "human-scoped-finding",
            type_key: findingType.key,
            axis: findingType.axis,
            explanation: draft.rationale.trim(),
            evidence_refs: evidence,
            criterion_keys: findingType.criterion_keys,
            origin: "human_judgment",
            review_state: "reviewed",
            material_unknowns: lines(draft.unknowns),
            limitations: view.profile.content.limitations,
          },
        ],
        axes: [
          {
            axis: findingType.axis,
            summary: findingType.permitted_summaries[0]!,
            finding_keys: ["human-scoped-finding"],
            material_unknowns: lines(draft.unknowns),
            dependency_refs: evidence,
          },
        ],
        coverage: {
          state: draft.coverage,
          protocol: draft.protocol.trim(),
          source_set_refs: passages.map(
            (passage) => passage.project_source_ref,
          ),
          limitations: lines(draft.unknowns),
        },
        conflicting_refs: [],
        material_unknowns: lines(draft.unknowns),
        origin: "human_judgment",
        review_state: "reviewed",
        prior_assessment_ref:
          assessment === undefined
            ? null
            : await examinationReference(assessment),
        trigger:
          assessment === undefined
            ? "Initial scoped human examination"
            : "Reassessment after a reviewed changed basis or continued inquiry",
      };
      await prepare("assess_hypothesis", content, assessment);
    });
  const preparePosture = () =>
    safe(async () => {
      if (
        !assessment ||
        !view?.policy ||
        assessmentFreshness?.state !== "current"
      )
        throw new Error("A new posture needs the current reviewed assessment.");
      const obligations = view.policy.content.obligation_types.map(
        (registered) => {
          const previous = posture?.content.obligations.find(
            (obligation) => obligation.type_key === registered.key,
          );
          const criteria = assessment.content.criteria.filter((criterion) =>
            registered.criterion_keys.includes(criterion.criterion_key),
          );
          const satisfied =
            registered.criterion_keys.length > 0 &&
            registered.criterion_keys.every((key) =>
              criteria.some(
                (criterion) =>
                  criterion.criterion_key === key &&
                  criterion.result === "passed",
              ),
            );
          return {
            obligation_id: previous?.obligation_id ?? makeId("obligation"),
            revision: (previous?.revision ?? 0) + 1,
            type_key: registered.key,
            creating_finding_key:
              assessment.content.findings[0]?.finding_key ?? null,
            rationale: registered.label,
            enforcement: registered.enforcement,
            criterion_keys: registered.criterion_keys as [string, ...string[]],
            state: satisfied ? ("satisfied" as const) : ("open" as const),
            satisfaction_evidence_refs: satisfied
              ? criteria.flatMap((criterion) => criterion.evidence_refs)
              : [],
            waiver_ref: null,
            work_refs: [],
          };
        },
      );
      const content: PetraPostureDecision["content"] = {
        assessment_ref: await examinationReference(assessment),
        primary_posture: draft.posture,
        profile_ref: assessment.content.profile_ref,
        policy_ref: assessment.content.policy_ref,
        determining_finding_keys: assessment.content.findings.map(
          (finding) => finding.finding_key,
        ),
        material_unknowns: assessment.content.material_unknowns,
        state: "active",
        obligations,
        suggested_work: [],
        expires_at: null,
        human_override_reason: null,
      };
      await prepare("decide_posture", content, posture);
    });
  const prepareDisposition = () =>
    safe(async () => {
      if (
        !assessment ||
        !posture ||
        assessmentFreshness?.state !== "current" ||
        posture.content.assessment_ref.record_hash !==
          (await examinationContentHash(assessment))
      )
        throw new Error(
          "Review a posture for this exact current assessment before concluding the cycle.",
        );
      const content: PetraCycleDisposition["content"] = {
        assessment_ref: await examinationReference(assessment),
        posture_ref: await examinationReference(posture),
        basis: assessment.content.basis,
        disposition: draft.conclusion,
        criterion_keys: assessment.content.criteria.map(
          (criterion) => criterion.criterion_key,
        ),
        finding_keys: assessment.content.findings.map(
          (finding) => finding.finding_key,
        ),
        unresolved_questions: [
          ...new Set([
            ...assessment.content.material_unknowns,
            ...lines(draft.unknowns),
          ]),
        ],
        rationale: draft.rationale.trim(),
        prior_disposition_ref:
          disposition === undefined
            ? null
            : await examinationReference(disposition),
        authority_effect: "scoped_project_judgment",
      };
      await prepare("conclude_cycle", content, disposition);
    });
  const recordDecision = () =>
    safe(async () => {
      if (decision === undefined) return;
      setDecision({ ...decision, phase: "sending" });
      try {
        const result = await client().submit(decision.request);
        setReceipt(result.receipt);
        setDecision(undefined);
        await refresh();
      } catch (failure) {
        setDecision(
          failure instanceof ExaminationRequestRejected
            ? undefined
            : { ...decision, phase: "unknown" },
        );
        throw failure;
      }
    });
  const recover = () =>
    safe(async () => {
      if (decision === undefined) return;
      const result = await client().recover(
        projectId,
        decision.request.command_id,
      );
      if (result === undefined) {
        setDecision({ ...decision, phase: "prepared" });
        setError(
          "The authoritative read found no recorded effect. Review the current basis before retrying this exact command.",
        );
        await refresh();
      } else {
        if (
          result.receipt.content.request_hash !==
          (await examinationContentHash(decision.request))
        )
          throw new Error(
            "The retained command belongs to a different local request.",
          );
        setReceipt(result.receipt);
        setDecision(undefined);
        await refresh();
      }
    });
  if (loading)
    return (
      <section className="hypothesis-cycles" aria-busy="true">
        <p>Reading retained examination cycles…</p>
      </section>
    );
  return (
    <section
      className="hypothesis-cycles"
      aria-label="Hypothesis examination cycles"
    >
      <h3>Examination cycles</h3>
      {error === undefined ? null : <p role="alert">{error}</p>}
      {view === undefined ? (
        <button type="button" onClick={() => void safe(refresh)}>
          Try reading cycles again
        </button>
      ) : (
        <>
          {graphHash !== view.graph.content_hash ? (
            <div role="status">
              <p>
                The displayed graph changed. Refresh its exact material before
                reviewing a new cycle. Your local draft remains in this browser.
              </p>
              <button type="button" onClick={() => window.location.reload()}>
                Refresh examined graph
              </button>
            </div>
          ) : null}
          {!available ? (
            <p>
              {view.authorization.reason}
              {currentNode?.material_state !== "available"
                ? " Exact current native material is required before a new review."
                : ""}
            </p>
          ) : null}
          <ExaminationAuthoritySetup
            key={projectId}
            view={view}
            displayedGraphHash={graphHash}
            onRecorded={refresh}
          />
          {view.has_more ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void safe(async () => {
                  const page = await client().read(
                    projectId,
                    view.next_sequence,
                  );
                  if (page.graph.content_hash !== view.graph.content_hash)
                    throw new Error(
                      "The graph changed while reading history. Refresh the cycle before continuing.",
                    );
                  setRecords((previous) => [...previous, ...page.records]);
                  setView((previous) =>
                    previous === undefined
                      ? page
                      : {
                          ...page,
                          freshness: [...previous.freshness, ...page.freshness],
                        },
                  );
                })
              }
            >
              Read more retained history
            </button>
          ) : null}
          {hypothesis === undefined ? (
            <fieldset disabled={!available || locked}>
              <legend>Frame a Hypothesis from this exact Claim</legend>
              <label>
                Short descriptor
                <input
                  value={draft.descriptor}
                  maxLength={500}
                  onChange={(event) => update("descriptor", event.target.value)}
                />
              </label>
              <label>
                Why examine it?
                <textarea
                  value={draft.rationale}
                  maxLength={4000}
                  onChange={(event) => update("rationale", event.target.value)}
                />
              </label>
              <label>
                What would count against it? One condition per line.
                <textarea
                  value={draft.falsifiers}
                  onChange={(event) => update("falsifiers", event.target.value)}
                />
              </label>
              <button type="button" onClick={() => void prepareHypothesis()}>
                Review Hypothesis
              </button>
            </fieldset>
          ) : (
            <>
              <p>
                <strong>
                  {hypothesis.content.ordinal}: {hypothesis.content.descriptor}
                </strong>
              </p>
              <p>
                Development: {hypothesis.content.development} · Lifecycle:{" "}
                {hypothesis.content.lifecycle}
              </p>
              {!targetCurrent ? (
                <div role="status">
                  <p>
                    The target Claim changed. Earlier examinations keep their
                    original basis.
                  </p>
                  <button
                    type="button"
                    disabled={!available || locked}
                    onClick={() => void prepareHypothesis()}
                  >
                    Review binding to the current Claim
                  </button>
                </div>
              ) : null}
              {assessmentFreshness === undefined ? null : (
                <p role="status">
                  Last examination:{" "}
                  {assessmentFreshness.state.replaceAll("_", " ")}
                  {assessmentFreshness.affected_axes.length > 0
                    ? ` · affected: ${assessmentFreshness.affected_axes.join(", ")}`
                    : ""}
                </p>
              )}
              <details
                open={
                  assessment === undefined ||
                  assessmentFreshness?.state !== "current"
                }
              >
                <summary>
                  {assessment === undefined
                    ? "Examine the evidence"
                    : "Begin the next examination"}
                </summary>
                {draft.examination_graph_hash !== view.graph.content_hash ? (
                  <div role="status">
                    <p>
                      Begin with unknown checks against the current graph.
                      Earlier results remain in retained history.
                    </p>
                    <button
                      type="button"
                      disabled={!available || !targetCurrent || locked}
                      onClick={() =>
                        setDraft((previous) => ({
                          ...previous,
                          examination_graph_hash: view.graph.content_hash,
                          criteria: {},
                          passageIds: [],
                          finding: "scientific.scoped_insufficiency",
                          coverage: "unsearched",
                          protocol: "",
                        }))
                      }
                    >
                      Start examination on this basis
                    </button>
                  </div>
                ) : null}
                <fieldset
                  disabled={
                    !available ||
                    !targetCurrent ||
                    locked ||
                    draft.examination_graph_hash !== view.graph.content_hash
                  }
                >
                  <legend>
                    Named checks against the exact selected evidence
                  </legend>
                  <p>
                    Read the passages above, select the ones you examined, and
                    record your judgment for each named check. Leave an
                    unexamined check unknown.
                  </p>
                  {currentNode?.source_passages?.map((passage, index) => (
                    <label key={passage.span.source_span_id}>
                      <input
                        type="checkbox"
                        checked={draft.passageIds.includes(
                          passage.span.source_span_id,
                        )}
                        onChange={(event) =>
                          update(
                            "passageIds",
                            event.target.checked
                              ? [
                                  ...draft.passageIds,
                                  passage.span.source_span_id,
                                ]
                              : draft.passageIds.filter(
                                  (id) => id !== passage.span.source_span_id,
                                ),
                          )
                        }
                      />
                      Examined passage {index + 1} · revision{" "}
                      {passage.span.revision}
                    </label>
                  ))}
                  {view.profile?.content.criteria.map((criterion) => (
                    <div className="cycle-criterion" key={criterion.key}>
                      <label>
                        {criterion.label}
                        <select
                          value={
                            draft.criteria[criterion.key]?.result ?? "unknown"
                          }
                          onChange={(event) =>
                            update("criteria", {
                              ...draft.criteria,
                              [criterion.key]: {
                                explanation:
                                  draft.criteria[criterion.key]?.explanation ??
                                  "",
                                result: event.target.value as
                                  "passed" | "failed" | "unknown",
                              },
                            })
                          }
                        >
                          <option value="unknown">Unknown — unexamined</option>
                          <option value="passed">
                            Passed within declared scope
                          </option>
                          <option value="failed">
                            Failed within declared scope
                          </option>
                        </select>
                      </label>
                      <p>{criterion.method}</p>
                      <label>
                        Judgment and limitations
                        <textarea
                          value={
                            draft.criteria[criterion.key]?.explanation ?? ""
                          }
                          onChange={(event) =>
                            update("criteria", {
                              ...draft.criteria,
                              [criterion.key]: {
                                result:
                                  draft.criteria[criterion.key]?.result ??
                                  "unknown",
                                explanation: event.target.value,
                              },
                            })
                          }
                        />
                      </label>
                    </div>
                  ))}
                  <label>
                    Coverage
                    <select
                      value={draft.coverage}
                      onChange={(event) =>
                        update(
                          "coverage",
                          event.target.value as Draft["coverage"],
                        )
                      }
                    >
                      <option value="unsearched">Unsearched</option>
                      <option value="bounded_search">Bounded search</option>
                    </select>
                  </label>
                  <label>
                    Source set and search boundary
                    <textarea
                      value={draft.protocol}
                      onChange={(event) =>
                        update("protocol", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Scoped finding
                    <select
                      value={draft.finding}
                      onChange={(event) =>
                        update("finding", event.target.value)
                      }
                    >
                      {view.profile?.content.finding_types.map((finding) => (
                        <option key={finding.key} value={finding.key}>
                          {finding.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Review rationale
                    <textarea
                      value={draft.rationale}
                      maxLength={4000}
                      onChange={(event) =>
                        update("rationale", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Material unknowns and unresolved alternatives, one per line
                    <textarea
                      value={draft.unknowns}
                      onChange={(event) =>
                        update("unknowns", event.target.value)
                      }
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void prepareAssessment()}
                  >
                    Review examination
                  </button>
                </fieldset>
              </details>
              {assessment === undefined ? null : (
                <details
                  open={
                    posture === undefined ||
                    posture.content.assessment_ref.revision !==
                      assessment.revision
                  }
                >
                  <summary>Choose posture and examine obligations</summary>
                  <ExaminationRecordDetails record={assessment} />
                  <fieldset
                    disabled={
                      !available ||
                      locked ||
                      assessmentFreshness?.state !== "current"
                    }
                  >
                    <legend>Next-cycle posture</legend>
                    <label>
                      Primary posture
                      <select
                        value={draft.posture}
                        onChange={(event) =>
                          update(
                            "posture",
                            event.target.value as Draft["posture"],
                          )
                        }
                      >
                        {[
                          "explore",
                          "clarify",
                          "challenge",
                          "discriminate",
                          "reproduce",
                          "consolidate",
                        ].map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </label>
                    <p>
                      Registered obligations remain open until their named
                      criterion evidence passes. A Work result does not satisfy
                      them.
                    </p>
                    <button type="button" onClick={() => void preparePosture()}>
                      Review posture and obligations
                    </button>
                  </fieldset>
                </details>
              )}
              {posture === undefined ? null : (
                <details
                  open={
                    disposition === undefined ||
                    disposition.content.assessment_ref.revision !==
                      assessment?.revision
                  }
                >
                  <summary>Conclude this scoped cycle</summary>
                  <ExaminationRecordDetails record={posture} />
                  <fieldset
                    disabled={
                      !available ||
                      locked ||
                      assessmentFreshness?.state !== "current"
                    }
                  >
                    <legend>Explicit disposition</legend>
                    <label>
                      Conclusion
                      <select
                        value={draft.conclusion}
                        onChange={(event) =>
                          update(
                            "conclusion",
                            event.target.value as Draft["conclusion"],
                          )
                        }
                      >
                        {view.policy?.content.allowed_dispositions.map(
                          (value) => (
                            <option key={value} value={value}>
                              {value.replaceAll("_", " ")}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <label>
                      Rationale
                      <textarea
                        value={draft.rationale}
                        maxLength={4000}
                        onChange={(event) =>
                          update("rationale", event.target.value)
                        }
                      />
                    </label>
                    <p>
                      Material unknowns remain in the conclusion. Open mandatory
                      obligations block support, challenge, or mixed
                      verification.
                    </p>
                    <button
                      type="button"
                      onClick={() => void prepareDisposition()}
                    >
                      Review cycle conclusion
                    </button>
                  </fieldset>
                </details>
              )}
            </>
          )}
          {decision === undefined ? null : (
            <section
              className="cycle-review"
              aria-label="Review exact examination decision"
            >
              <h4>Review this exact decision</h4>
              <p>{decision.request.operation.replaceAll("_", " ")}</p>
              <p>
                This records a human Project judgment against the pinned graph
                and semantic versions. Claim promotion and Work execution retain
                their separate owners.
              </p>
              <p>Review rationale: {decision.request.review.rationale}</p>
              <details open>
                <summary>Proposed content and named basis</summary>
                <CycleProposal content={decision.request.proposed_content} />
              </details>
              <details>
                <summary>Inspect exact command and optimistic basis</summary>
                <pre>{JSON.stringify(decision.request, null, 2)}</pre>
              </details>
              {decision.phase === "prepared" ? (
                <>
                  <button
                    type="button"
                    disabled={
                      busy ||
                      decision.request.expected_graph_hash !==
                        view.graph.content_hash
                    }
                    onClick={() => void recordDecision()}
                  >
                    Record this review
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setDecision(undefined)}
                  >
                    Keep editing
                  </button>
                </>
              ) : (
                <>
                  <p role="status">
                    {decision.phase === "sending"
                      ? "Recording the exact decision…"
                      : "Delivery was interrupted. Its effect is unknown until read."}
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void recover()}
                  >
                    Read recorded outcome
                  </button>
                </>
              )}
            </section>
          )}
          {receipt === undefined ? null : (
            <details className="cycle-receipt">
              <summary>Recorded outcome and receipt</summary>
              <p>
                {receipt.content.operation.replaceAll("_", " ")} ·{" "}
                {new Date(receipt.content.recorded_at).toLocaleString()}
              </p>
              <p>
                Exact retained record: {receipt.content.record_ref.record_id},
                revision {receipt.content.record_ref.revision}
              </p>
              <pre>{JSON.stringify(receipt, null, 2)}</pre>
            </details>
          )}
          <details>
            <summary>Retained cycles and original revisions</summary>
            {records
              .filter((record) =>
                record.schema_name === "petra.hypothesis"
                  ? record.hypothesis_id === hypothesis?.hypothesis_id
                  : record.schema_name === "petra.hypothesis-assessment"
                    ? record.content.subject_ref.record_id ===
                      hypothesis?.hypothesis_id
                    : record.content.assessment_ref.record_id ===
                      assessment?.hypothesis_assessment_id,
              )
              .map((record) => (
                <ExaminationRecordDetails
                  key={`${"hypothesis_id" in record ? record.hypothesis_id : "hypothesis_assessment_id" in record ? record.hypothesis_assessment_id : "posture_decision_id" in record ? record.posture_decision_id : record.cycle_disposition_id}@${record.revision}`}
                  record={record}
                />
              ))}
          </details>
        </>
      )}
    </section>
  );
};
const CycleProposal = ({
  content,
}: {
  content: PetraProjectExaminationRequest["proposed_content"];
}): React.JSX.Element => {
  if ("descriptor" in content)
    return (
      <>
        <p>
          {content.ordinal}: {content.descriptor}
        </p>
        <p>{content.rationale}</p>
        <EvidenceIdentity reference={content.target_claim_ref} />
      </>
    );
  if ("criteria" in content)
    return (
      <>
        <p>
          {content.axes
            .map((axis) => `${axis.axis}: ${axis.summary.replaceAll("_", " ")}`)
            .join(" · ")}
        </p>
        <ul>
          {content.criteria.map((criterion) => (
            <li key={criterion.criterion_key}>
              {criterion.criterion_key.replaceAll("_", " ")}:{" "}
              <strong>{criterion.result}</strong>
              <p>{criterion.explanation}</p>
            </li>
          ))}
        </ul>
        <details open>
          <summary>Exact scope of this judgment</summary>
          {Object.entries(content.scope).map(([key, value]) => (
            <p key={key}>
              <strong>{key.replaceAll("_", " ")}:</strong>{" "}
              {Array.isArray(value)
                ? value.join(", ")
                : typeof value === "object" &&
                    value !== null &&
                    "description" in value
                  ? String((value as Record<string, unknown>).description)
                  : "Unreported"}
            </p>
          ))}
        </details>
        <p>{content.coverage.protocol}</p>
        <ul>
          {content.material_unknowns.map((unknown) => (
            <li key={unknown}>{unknown}</li>
          ))}
        </ul>
      </>
    );
  if ("primary_posture" in content)
    return (
      <>
        <p>
          {content.primary_posture} · {content.state}
        </p>
        <ul>
          {content.obligations.map((obligation) => (
            <li key={obligation.obligation_id}>
              {obligation.type_key.replaceAll("_", " ")}: {obligation.state} ·{" "}
              {obligation.enforcement.replaceAll("_", " ")}
            </li>
          ))}
        </ul>
      </>
    );
  return (
    <>
      <p>{content.disposition.replaceAll("_", " ")}</p>
      <p>{content.rationale}</p>
      <ul>
        {content.unresolved_questions.map((question) => (
          <li key={question}>{question}</li>
        ))}
      </ul>
    </>
  );
};
