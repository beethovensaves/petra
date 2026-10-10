import type {
  PetraClaim,
  PetraAssertion,
  PetraControlledWritingRequirement,
  PetraProjectSemanticGraphView,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { HypothesisCycles } from "./HypothesisCycles.js";

type Node = PetraProjectSemanticGraphView["content"]["nodes"][number];
type Props = { node: Node; projectId: string; graphHash: string };
type Examiner = {
  render: (props: Props) => React.JSX.Element;
  continuation?: (props: Props) => React.JSX.Element;
};
const contracts = new PetraContractRegistry();
const scope = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(scope).join(", ");
  if (
    typeof value === "object" &&
    value !== null &&
    "description" in value &&
    typeof value.description === "string"
  )
    return value.description;
  return "The retained scope fields are available in Inspect.";
};

const claimExaminer: Examiner = {
  render: ({ node }) => {
    const claim = node.native_record as unknown as PetraClaim;
    return (
      <div data-examiner="scientific-claim">
        <p>{claim.canonical_text}</p>
        <dl>
          <dt>Representation</dt>
          <dd>{claim.normalization_status.replaceAll("_", " ")}</dd>
          <dt>Review</dt>
          <dd>
            {claim.authority.review_state.replaceAll("_", " ")} ·{" "}
            {claim.authority.zone}
          </dd>
          <dt>Basis</dt>
          <dd>{claim.basis.basis_kind.replaceAll("_", " ")}</dd>
        </dl>
        {claim.basis.basis_kind === "source" ? (
          <>
            <p>
              <strong>Attribution:</strong> {claim.basis.attribution}
            </p>
            <p>
              <strong>Source stance:</strong>{" "}
              {claim.basis.source_stance.replaceAll("_", " ")} ·{" "}
              {claim.basis.modality}
              {claim.basis.negated ? " · negated" : ""}
            </p>
            <p>
              <strong>Source extent:</strong>{" "}
              {claim.basis.source_scope.replaceAll("_", " ")}
            </p>
          </>
        ) : (
          <p>
            The represented reasoning is an inference. Its premise and
            derivation references remain separate from source wording.
          </p>
        )}
        <details>
          <summary>Evidence scope and unreported dimensions</summary>
          {Object.entries(claim.scope).map(([name, value]) => (
            <p key={name}>
              <strong>{name.replaceAll("_", " ")}:</strong> {scope(value)}
            </p>
          ))}
        </details>
      </div>
    );
  },
  continuation: (props) => <HypothesisCycles {...props} />,
};
const assertionExaminer: Examiner = {
  render: ({ node }) => {
    const assertion = node.native_record as unknown as PetraAssertion;
    return (
      <div data-examiner="scientific-assertion">
        <p>{assertion.rationale ?? node.summary}</p>
        <p>
          <strong>Recorded relationship:</strong> {assertion.predicate}
        </p>
        <p>
          <strong>Origin:</strong>{" "}
          {assertion.assertion_kind.replaceAll("_", " ")}
        </p>
        <p>
          <strong>Review:</strong>{" "}
          {assertion.authority.review_state.replaceAll("_", " ")} ·{" "}
          {assertion.authority.zone}
        </p>
        <details>
          <summary>Relationship scope and provenance</summary>
          {Object.entries(assertion.scope ?? {}).map(([name, value]) => (
            <p key={name}>
              <strong>{name.replaceAll("_", " ")}:</strong> {scope(value)}
            </p>
          ))}
          <p>
            {assertion.provenance_refs.length} retained provenance references. A
            recorded predicate carries its registered meaning; placement in the
            graph adds no evidentiary force.
          </p>
        </details>
      </div>
    );
  },
};
const writingRequirementExaminer: Examiner = {
  render: ({ node }) => {
    const requirement =
      node.native_record as unknown as PetraControlledWritingRequirement;
    return (
      <div data-examiner="writing-requirement">
        <p>{requirement.content.statement}</p>
        <p>
          <strong>Writing requirement:</strong>{" "}
          {requirement.content.requirement_kind}
        </p>
        <p>
          Examine how this requirement governs the intended writing and its
          authority sources. A proposed requirement still needs the applicable
          Review decision.
        </p>
        <details>
          <summary>What this requirement applies to</summary>
          <p>
            {requirement.content.applies_to_refs.length} exact retained
            references define its scope. Each reference names its original
            revision.
          </p>
          <ul>
            {requirement.content.applies_to_refs.map((ref) => (
              <li key={`${ref.record_id}@${ref.revision}`}>
                {ref.schema_name.replace(/^petra\./u, "").replaceAll("-", " ")}{" "}
                · revision {ref.revision}
              </li>
            ))}
          </ul>
        </details>
      </div>
    );
  },
};

// The shared graph/Workspace resolves an exact record contract and role. Domain
// components own their examination language and consequential continuation.
const examiners = new Map<string, Examiner>([
  ["petra.claim@1.0.0", claimExaminer],
  ["petra.claim@1.1.0", claimExaminer],
  ["petra.claim@1.2.0", claimExaminer],
  ["petra.assertion@1.0.0", assertionExaminer],
  ["petra.controlled-writing-requirement@1.0.0", writingRequirementExaminer],
]);
export const nativeExamination = (
  props: Props,
): {
  body: React.JSX.Element;
  continuation?: React.JSX.Element;
} => {
  const { node } = props;
  if (
    node.native_record === undefined ||
    node.material_state === "metadata_only"
  )
    return {
      body: (
        <p>
          {node.summary} The exact record identity is represented; native
          material is unavailable in this bounded query.
        </p>
      ),
    };
  const examiner = examiners.get(
    `${node.record_ref.schema_name}@${node.record_ref.schema_version}`,
  );
  if (examiner === undefined)
    return {
      body: (
        <p role="status">
          This record is retained, but its exact schema version has no
          registered examination component. Its native fields remain available
          in Inspect.
        </p>
      ),
    };
  try {
    contracts.assertValid(
      node.record_ref.schema_name.replace(/^petra\./u, ""),
      node.record_ref.schema_version,
      node.native_record,
    );
  } catch {
    return {
      body: (
        <p role="status">
          The native material does not satisfy its exact examination contract.
          Refresh or inspect the retained identity before proceeding.
        </p>
      ),
    };
  }
  return {
    body: examiner.render(props),
    ...(node.layer === "working" && examiner.continuation !== undefined
      ? { continuation: examiner.continuation(props) }
      : {}),
  };
};
