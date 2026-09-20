import type {
  PetraProjectSourceRevisionReceipt,
  PetraProjectSourceRevisionRecoveryView,
  PetraProjectSourceRevisionRequest,
} from "@petra/contracts";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";

import {
  PetraButton,
  PetraTextArea,
  PetraTextField,
} from "../design-system/primitives.js";
import {
  createProjectSourceReplacement,
  executeProjectSourceLifecycleCommand,
  ProjectDataError,
  type CreateProjectSourceReplacementResponse,
  type ProjectSourceLifecycleCommandResponse,
} from "./project-data.js";
import {
  sourceRegistrationMaterialFromFile,
  type SourceRegistrationMaterial,
} from "./source-registration.js";
import {
  createSourceRevisionCommandIdentity,
  createSourceRevisionRequest,
  projectSourceRevisionClient,
  sourceLifecycleReceiptRef,
  sourceRevisionConflict,
  sourceRevisionErrorCode,
  sourceRevisionOutcomeUnknown,
  sourceRevisionPermissionLost,
  type SourceRevisionContext,
  type SourceRevisionDraft,
} from "./source-revision.js";

type RevisionClient = Pick<
  ReturnType<typeof projectSourceRevisionClient>,
  "addRevision" | "assessRecovery"
>;
type ArtifactKind =
  PetraProjectSourceRevisionRequest["material"]["artifact_kind"];
type PublicationStatus = SourceRevisionDraft["publicationStatus"];
type LicenseStatus = SourceRevisionDraft["licenseStatus"];
type AccessBasis = SourceRevisionDraft["accessBasis"];
type DecisionStatus = SourceRevisionDraft["decisionStatus"];
type Permission = keyof SourceRevisionDraft["permissions"];
type Condition = SourceRevisionDraft["conditions"][number];

interface SourceRevisionFields {
  readonly versionLabel: string;
  readonly publicationStatus: PublicationStatus;
  readonly metadataSourceName: string;
  readonly metadataSourceRecordId: string;
  readonly metadataRetrievedAt: string;
  readonly artifactKind: ArtifactKind;
  readonly sourceLocation: string;
  readonly licenseStatus: LicenseStatus;
  readonly observedLicenseIdentifier: string;
  readonly accessBasis: AccessBasis;
  readonly decisionStatus: DecisionStatus;
  readonly permissions: SourceRevisionDraft["permissions"];
  readonly conditions: Condition[];
  readonly requiredNotices: string;
  readonly authorizationReference: string;
  readonly rightsRationale: string;
  readonly rightsObservedAt: string;
  readonly policyVersion: string;
  readonly replacementRationale: string;
  readonly reviewedAt: string;
}

interface SourceRevisionOutcome {
  readonly receipt: PetraProjectSourceRevisionReceipt;
  readonly applied: boolean;
}

const initialFields = (): SourceRevisionFields => ({
  versionLabel: "",
  publicationStatus: "unknown",
  metadataSourceName: "",
  metadataSourceRecordId: "",
  metadataRetrievedAt: "",
  artifactKind: "pdf",
  sourceLocation: "",
  licenseStatus: "unknown",
  observedLicenseIdentifier: "",
  accessBasis: "user_supplied",
  decisionStatus: "unknown",
  permissions: {
    store_raw_bytes: false,
    parse: false,
    index: false,
    embed: false,
    send_selected_text_remotely: false,
    quote_publicly: false,
    redistribute_artifact: false,
  },
  conditions: [],
  requiredNotices: "",
  authorizationReference: "",
  rightsRationale: "",
  rightsObservedAt: "",
  policyVersion: "",
  replacementRationale: "",
  reviewedAt: "",
});

const publicationStatuses: ReadonlyArray<[PublicationStatus, string]> = [
  ["unknown", "Unknown"],
  ["preprint", "Preprint"],
  ["peer_reviewed", "Peer reviewed"],
  ["accepted", "Accepted"],
  ["corrected", "Corrected"],
  ["retracted", "Retracted"],
];

const artifactKinds: ReadonlyArray<[ArtifactKind, string]> = [
  ["pdf", "PDF"],
  ["html", "HTML"],
  ["structured_text", "Structured text"],
  ["dataset", "Dataset"],
  ["code", "Code"],
  ["image", "Image"],
];

const permissionLabels: ReadonlyArray<[Permission, string]> = [
  ["store_raw_bytes", "Store this exact copy"],
  ["parse", "Parse its content"],
  ["index", "Index its content"],
  ["embed", "Create embeddings"],
  ["send_selected_text_remotely", "Send selected text to a remote model"],
  ["quote_publicly", "Quote it in public output"],
  ["redistribute_artifact", "Redistribute the copy"],
];

const conditionLabels: ReadonlyArray<[Condition, string]> = [
  ["attribution", "Attribution"],
  ["notice", "License notice"],
  ["noncommercial", "Noncommercial use"],
  ["share_alike", "Share alike"],
  ["no_derivatives", "No derivatives"],
];

const lines = (value: string): string[] =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

const messageFrom = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : "Petra did not return a source-version result.";

const SelectField = ({
  id,
  label,
  value,
  onChange,
  children,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  hint?: string;
}): React.JSX.Element => (
  <label className="petra-field" htmlFor={id}>
    <span className="petra-field__label">
      {label}
      <span className="petra-field__required">Required</span>
    </span>
    {hint === undefined ? null : (
      <span className="petra-field__hint" id={`${id}-hint`}>
        {hint}
      </span>
    )}
    <select
      className="petra-field__control petra-control--comfortable"
      id={id}
      value={value}
      required
      aria-describedby={hint === undefined ? undefined : `${id}-hint`}
      onChange={(event) => onChange(event.currentTarget.value)}
    >
      {children}
    </select>
  </label>
);

interface RevisionFailure {
  readonly kind: "authorization" | "conflict" | "rejected" | "unknown";
  readonly message: string;
  readonly code?: string;
}

const revisionFailure = (error: unknown): RevisionFailure => {
  const code = sourceRevisionErrorCode(error);
  return {
    kind: sourceRevisionPermissionLost(error)
      ? "authorization"
      : sourceRevisionConflict(error)
        ? "conflict"
        : sourceRevisionOutcomeUnknown(error)
          ? "unknown"
          : "rejected",
    message: messageFrom(error),
    ...(code === undefined ? {} : { code }),
  };
};

const failureHeading: Record<RevisionFailure["kind"], string> = {
  authorization: "Source-version access changed",
  conflict: "The exact source state changed",
  rejected: "The new version was not retained",
  unknown: "Source-version outcome not confirmed",
};

const recoveryHeading = (
  effect: PetraProjectSourceRevisionRecoveryView["effect"],
): string =>
  effect.state === "effect_confirmed"
    ? "Source-version effect confirmed"
    : effect.state === "outcome_unknown"
      ? "Source-version outcome is still unknown"
      : effect.reason === "command_identity_conflict"
        ? "This command identity belongs to different input"
        : "This command is not owned by the signed-in actor";

interface GovernedStepFailure {
  readonly message: string;
  readonly retryLabel: string;
}

const governedStepFailure = (
  error: unknown,
  retryLabel: string,
): GovernedStepFailure => ({
  message:
    error instanceof ProjectDataError &&
    (error.status === 401 || error.status === 403)
      ? "The signed-in actor is not authorized for this separate governed command. The preceding retained effect is unchanged."
      : error instanceof ProjectDataError && error.status === 409
        ? "Current source authority changed before this separate command. No later effect is assumed; re-open the exact source before retrying."
        : "Petra could not confirm this separate governed command. Its preceding retained effects remain visible and unchanged.",
  retryLabel,
});

export const SourceRevisionReceiptPanel = ({
  receipt,
  applied,
  recovered = false,
  taskReturnPath,
  executeExclusion = executeProjectSourceLifecycleCommand,
  executeReplacement = createProjectSourceReplacement,
}: {
  receipt: PetraProjectSourceRevisionReceipt;
  applied: boolean;
  recovered?: boolean;
  taskReturnPath: string;
  executeExclusion?: typeof executeProjectSourceLifecycleCommand;
  executeReplacement?: typeof createProjectSourceReplacement;
}): React.JSX.Element => {
  const [exclusionInput, setExclusionInput] =
    useState<Parameters<typeof executeProjectSourceLifecycleCommand>[0]>();
  const [exclusion, setExclusion] =
    useState<ProjectSourceLifecycleCommandResponse>();
  const [excluding, setExcluding] = useState(false);
  const [exclusionFailure, setExclusionFailure] =
    useState<GovernedStepFailure>();
  const [replacementInput, setReplacementInput] =
    useState<Parameters<typeof createProjectSourceReplacement>[0]>();
  const [replacement, setReplacement] =
    useState<CreateProjectSourceReplacementResponse>();
  const [replacing, setReplacing] = useState(false);
  const [replacementFailure, setReplacementFailure] =
    useState<GovernedStepFailure>();

  const exclude = async (): Promise<void> => {
    const handoff = receipt.replacement_handoff.exclude_predecessor;
    const identity = createSourceRevisionCommandIdentity("exclude");
    const input =
      exclusionInput ??
      ({
        projectId: receipt.project_id,
        projectSourceId: receipt.predecessor_source_ref.project_source_id,
        commandId: identity.commandId,
        idempotencyKey: identity.idempotencyKey,
        requestedAction: handoff.requested_action,
        expectedSourceRef: structuredClone(handoff.expected_source_ref),
        reason: handoff.reason,
      } as const);
    setExclusionInput(input);
    setExcluding(true);
    setExclusionFailure(undefined);
    try {
      setExclusion(await executeExclusion(input));
    } catch (error) {
      setExclusionFailure(
        governedStepFailure(error, "Retry exact predecessor exclusion"),
      );
    } finally {
      setExcluding(false);
    }
  };

  const replace = async (): Promise<void> => {
    if (exclusion === undefined) return;
    const resultingPredecessor = exclusion.receipt.content.resulting_source_ref;
    if (resultingPredecessor.status !== "excluded") {
      setReplacementFailure({
        message:
          "Petra did not return an exact excluded predecessor. No replacement relationship was attempted.",
        retryLabel: "Re-read predecessor exclusion",
      });
      return;
    }
    const handoff = receipt.replacement_handoff.create_replacement;
    const identity = createSourceRevisionCommandIdentity("replace");
    const input =
      replacementInput ??
      ({
        projectId: receipt.project_id,
        commandId: identity.commandId,
        idempotencyKey: identity.idempotencyKey,
        replacementKind: "newer_source_version" as const,
        replacedSourceRef: {
          ...structuredClone(resultingPredecessor),
          status: "excluded" as const,
        },
        replacementSourceRef: structuredClone(handoff.replacement_source_ref),
        exclusionReceiptRef: await sourceLifecycleReceiptRef(exclusion.receipt),
        rationale: handoff.rationale,
      } as const);
    setReplacementInput(input);
    setReplacing(true);
    setReplacementFailure(undefined);
    try {
      setReplacement(await executeReplacement(input));
    } catch (error) {
      setReplacementFailure(
        governedStepFailure(error, "Retry exact replacement relationship"),
      );
    } finally {
      setReplacing(false);
    }
  };

  const outcome = recovered ? "recovered" : applied ? "applied" : "replayed";
  const destinationQuery = new URLSearchParams({
    from: "sources",
    semanticKey: "petra.project-source",
    selected: receipt.successor_source_ref.project_source_id,
    revision: String(receipt.successor_source_ref.revision),
    recordHash: receipt.successor_source_ref.record_hash,
  });

  return (
    <section
      className="source-registration-receipt source-revision-receipt"
      aria-labelledby="source-revision-complete"
      data-revision-outcome={outcome}
    >
      <header>
        <div>
          <p className="reference-panel-kicker">
            {recovered
              ? "Recovered durable effect"
              : applied
                ? "New version retained"
                : "Retained request replayed"}
          </p>
          <h2 id="source-revision-complete">
            {recovered
              ? "The new version is confirmed"
              : applied
                ? "New immutable version added"
                : "This exact version was already added"}
          </h2>
          <p>{receipt.effect.summary}</p>
        </div>
      </header>
      <div className="source-revision-boundary" role="status">
        <strong>The earlier version has not been replaced.</strong>
        <p>
          Petra retained a distinct successor. Excluding the earlier version and
          recording their replacement relationship are separate governed
          decisions below.
        </p>
      </div>
      <dl>
        <div>
          <dt>New version</dt>
          <dd>{receipt.material.origin.original_filename}</dd>
        </div>
        <div>
          <dt>Earlier version</dt>
          <dd>Still active until you run the separate exclusion</dd>
        </div>
        <div>
          <dt>Recorded</dt>
          <dd>{receipt.recorded_at}</dd>
        </div>
      </dl>

      <section
        className="source-revision-governed-step"
        aria-labelledby="source-revision-exclusion-title"
        data-state={
          exclusion === undefined
            ? exclusionFailure === undefined
              ? "ready"
              : "failed"
            : exclusion.applied
              ? "applied"
              : "replayed"
        }
      >
        <p className="reference-panel-kicker">Separate command · 1 of 2</p>
        <h3 id="source-revision-exclusion-title">Exclude earlier version</h3>
        <p>
          Stop ordinary new use of the exact predecessor while retaining its
          identity, history, material, representation, and provenance.
        </p>
        {exclusion === undefined ? (
          <PetraButton
            variant="secondary"
            busy={excluding}
            busyLabel="Excluding earlier version"
            onClick={() => void exclude()}
          >
            {exclusionFailure?.retryLabel ??
              "Review and exclude earlier version"}
          </PetraButton>
        ) : (
          <p role="status">
            <strong>
              {exclusion.applied
                ? "Earlier version excluded."
                : "Earlier-version exclusion replayed."}
            </strong>{" "}
            Its retained history and material remain available.
          </p>
        )}
        {exclusionFailure === undefined ? null : (
          <p className="source-registration-error" role="alert">
            {exclusionFailure.message}
          </p>
        )}
      </section>

      <section
        className="source-revision-governed-step"
        aria-labelledby="source-revision-replacement-title"
        data-state={
          replacement === undefined
            ? replacementFailure === undefined
              ? exclusion === undefined
                ? "waiting"
                : "ready"
              : "failed"
            : replacement.applied
              ? "applied"
              : "replayed"
        }
      >
        <p className="reference-panel-kicker">Separate command · 2 of 2</p>
        <h3 id="source-revision-replacement-title">
          Record newer-version relationship
        </h3>
        <p>
          Create the governed supersession relationship only after the exact
          predecessor exclusion has a retained receipt.
        </p>
        {replacement === undefined ? (
          <PetraButton
            variant="secondary"
            busy={replacing}
            busyLabel="Recording replacement"
            onClick={() => void replace()}
            {...(exclusion === undefined
              ? {
                  unavailable: {
                    reason:
                      "The exact predecessor exclusion must be retained first.",
                    prerequisite: "A retained ExcludeProjectSource receipt.",
                  },
                }
              : {})}
          >
            {replacementFailure?.retryLabel ?? "Record version replacement"}
          </PetraButton>
        ) : (
          <p role="status">
            <strong>
              {replacement.applied
                ? "Newer-version relationship recorded."
                : "Newer-version relationship replayed."}
            </strong>{" "}
            Both source identities and the exclusion receipt remain retained.
          </p>
        )}
        {replacementFailure === undefined ? null : (
          <p className="source-registration-error" role="alert">
            {replacementFailure.message}
          </p>
        )}
      </section>

      <div className="source-registration-actions">
        <Link
          className="reference-primary-link"
          to={`/projects/${encodeURIComponent(receipt.project_id)}/sources/${encodeURIComponent(receipt.destination.project_source_id)}?${destinationQuery}`}
        >
          Inspect new version
        </Link>
        <Link className="reference-text-link" to={taskReturnPath}>
          Return to the exact source task
        </Link>
      </div>
      <details>
        <summary>Technical receipt</summary>
        <dl>
          <div>
            <dt>Revision receipt</dt>
            <dd>
              <code>{receipt.receipt_id}</code>
            </dd>
          </div>
          <div>
            <dt>Earlier Project source</dt>
            <dd>
              <code>{receipt.predecessor_source_ref.project_source_id}</code>
            </dd>
          </div>
          <div>
            <dt>New Project source</dt>
            <dd>
              <code>{receipt.successor_source_ref.project_source_id}</code>
            </dd>
          </div>
        </dl>
      </details>
    </section>
  );
};

export const SourceRevisionPanel = ({
  context,
  sourceTitle,
  sourceRevision,
  taskReturnPath,
  onCancel,
  client,
  executeExclusion,
  executeReplacement,
}: {
  context: SourceRevisionContext;
  sourceTitle: string;
  sourceRevision: string;
  taskReturnPath: string;
  onCancel: () => void;
  client?: RevisionClient;
  executeExclusion?: typeof executeProjectSourceLifecycleCommand;
  executeReplacement?: typeof createProjectSourceReplacement;
}): React.JSX.Element => {
  const [resolvedClient] = useState<RevisionClient>(
    () => client ?? projectSourceRevisionClient(),
  );
  const [fields, setFields] = useState<SourceRevisionFields>(initialFields);
  const [file, setFile] = useState<File>();
  const [submitting, setSubmitting] = useState(false);
  const [activeRequest, setActiveRequest] =
    useState<PetraProjectSourceRevisionRequest>();
  const [result, setResult] = useState<SourceRevisionOutcome>();
  const [recovered, setRecovered] = useState(false);
  const [failure, setFailure] = useState<RevisionFailure>();
  const [assessment, setAssessment] =
    useState<PetraProjectSourceRevisionRecoveryView>();
  const [assessing, setAssessing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string>();

  const setField = <Key extends keyof SourceRevisionFields>(
    key: Key,
    value: SourceRevisionFields[Key],
  ): void => setFields((current) => ({ ...current, [key]: value }));

  const draft = (): SourceRevisionDraft => ({
    versionLabel: fields.versionLabel,
    publicationStatus: fields.publicationStatus,
    metadataSourceName: fields.metadataSourceName,
    ...(fields.metadataSourceRecordId.length === 0
      ? {}
      : { metadataSourceRecordId: fields.metadataSourceRecordId }),
    metadataRetrievedAt: fields.metadataRetrievedAt,
    sourceLocation: fields.sourceLocation,
    licenseStatus: fields.licenseStatus,
    ...(fields.licenseStatus === "known"
      ? {
          observedLicense: {
            identifier: fields.observedLicenseIdentifier,
            source: "user_declaration" as const,
          },
        }
      : {}),
    accessBasis: fields.accessBasis,
    decisionStatus: fields.decisionStatus,
    permissions: fields.permissions,
    conditions: fields.conditions,
    requiredNotices: lines(fields.requiredNotices),
    ...(fields.authorizationReference.length === 0
      ? {}
      : { authorizationReference: fields.authorizationReference }),
    rightsRationale: fields.rightsRationale,
    rightsObservedAt: fields.rightsObservedAt,
    policyVersion: fields.policyVersion,
    replacementRationale: fields.replacementRationale,
    reviewedAt: fields.reviewedAt,
  });

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setFailure(undefined);
    setAssessment(undefined);
    setRecoveryError(undefined);
    let request: PetraProjectSourceRevisionRequest | undefined;
    try {
      if (file === undefined)
        throw new TypeError("Choose the new version file.");
      const material: SourceRegistrationMaterial =
        await sourceRegistrationMaterialFromFile(file, fields.artifactKind);
      request = createSourceRevisionRequest({
        context,
        draft: draft(),
        material,
      });
      setActiveRequest(request);
      const next = await resolvedClient.addRevision(
        context.projectId,
        context.currentSourceRef.project_source_id,
        request,
      );
      setResult({ receipt: next.receipt, applied: next.applied });
      setRecovered(false);
    } catch (error) {
      setFailure(revisionFailure(error));
    } finally {
      setSubmitting(false);
    }
  };

  const assess = async (): Promise<void> => {
    if (activeRequest === undefined) return;
    setAssessing(true);
    setRecoveryError(undefined);
    try {
      const next = await resolvedClient.assessRecovery(
        context.projectId,
        context.currentSourceRef.project_source_id,
        activeRequest,
      );
      setAssessment(next);
      if (next.effect.state === "effect_confirmed") {
        setResult({ receipt: next.effect.receipt, applied: false });
        setRecovered(true);
      }
    } catch (error) {
      setRecoveryError(messageFrom(error));
    } finally {
      setAssessing(false);
    }
  };

  const retry = async (): Promise<void> => {
    if (activeRequest === undefined) return;
    setRetrying(true);
    setRecoveryError(undefined);
    try {
      const next = await resolvedClient.addRevision(
        context.projectId,
        context.currentSourceRef.project_source_id,
        activeRequest,
      );
      setResult({ receipt: next.receipt, applied: next.applied });
      setRecovered(false);
    } catch (error) {
      const nextFailure = revisionFailure(error);
      if (nextFailure.kind === "unknown") {
        setRecoveryError(nextFailure.message);
      } else {
        setFailure(nextFailure);
        setAssessment(undefined);
        setActiveRequest(undefined);
      }
    } finally {
      setRetrying(false);
    }
  };

  if (result !== undefined) {
    return (
      <SourceRevisionReceiptPanel
        receipt={result.receipt}
        applied={result.applied}
        recovered={recovered}
        taskReturnPath={taskReturnPath}
        {...(executeExclusion === undefined ? {} : { executeExclusion })}
        {...(executeReplacement === undefined ? {} : { executeReplacement })}
      />
    );
  }

  const revisionLocked =
    failure?.kind === "unknown" && activeRequest !== undefined;
  const effect = assessment?.effect;

  return (
    <section
      className="source-registration-panel source-revision-panel"
      aria-labelledby="source-revision-title"
    >
      <header>
        <div>
          <p className="reference-panel-kicker">New immutable version</p>
          <h2 id="source-revision-title">Add new version</h2>
          <p>
            Add reviewed bytes for the same work as{" "}
            <strong>{sourceTitle}</strong>. Petra retains a distinct active
            source and leaves {sourceRevision} unchanged until you separately
            govern replacement.
          </p>
        </div>
        <PetraButton variant="quiet" onClick={onCancel}>
          Close
        </PetraButton>
      </header>

      {failure === undefined ? null : (
        <div
          className="source-registration-error"
          role="alert"
          data-failure-kind={failure.kind}
        >
          <strong>{failureHeading[failure.kind]}.</strong>
          <span>{failure.message}</span>
          <span>
            Your reviewed fields and selected file remain in this exact source
            task. No replacement is inferred.
          </span>
          {failure.code === undefined ? null : <code>{failure.code}</code>}
          {failure.kind === "conflict" || failure.kind === "authorization" ? (
            <Link
              className="reference-text-link"
              to={taskReturnPath}
              reloadDocument
            >
              Re-read exact source authority
            </Link>
          ) : null}
        </div>
      )}

      {revisionLocked ? (
        <section
          className="source-registration-recovery"
          aria-labelledby="source-revision-recovery-title"
        >
          <header>
            <p className="reference-panel-kicker">Read-only recovery</p>
            <h3 id="source-revision-recovery-title">
              {effect === undefined
                ? "Check the retained command before retrying"
                : recoveryHeading(effect)}
            </h3>
          </header>
          {effect === undefined ? (
            <PetraButton
              variant="secondary"
              busy={assessing}
              busyLabel="Checking source-version effect"
              onClick={() => void assess()}
            >
              Check source-version effect
            </PetraButton>
          ) : effect.state === "outcome_unknown" ? (
            <div>
              <p>
                No owned receipt was observed. Petra permits one exact retry
                using the same command, idempotency identity, bytes, rights, and
                replacement review.
              </p>
              <PetraButton
                variant="primary"
                busy={retrying}
                busyLabel="Retrying exact source version"
                onClick={() => void retry()}
              >
                Retry exact source version
              </PetraButton>
            </div>
          ) : effect.state === "unavailable_to_verify" ? (
            <div>
              <p>
                Petra cannot verify this command under the signed-in actor. No
                effect or replacement is assumed.
              </p>
              <Link className="reference-text-link" to={taskReturnPath}>
                Return to the exact source task
              </Link>
            </div>
          ) : null}
          {recoveryError === undefined ? null : (
            <p className="source-registration-recovery__error" role="alert">
              {recoveryError}
            </p>
          )}
        </section>
      ) : null}

      <form onSubmit={(event) => void submit(event)}>
        <fieldset disabled={revisionLocked || submitting}>
          <legend>Reviewed version identity</legend>
          <p className="source-registration-fieldset-note">
            The current Project, ProjectDefinition, and active predecessor are
            bound from authenticated reads; the form cannot substitute them.
          </p>
          <div className="source-registration-grid">
            <PetraTextField
              label="Version label"
              placeholder="Corrected manuscript, edition 2…"
              value={fields.versionLabel}
              required
              onChange={(event) =>
                setField("versionLabel", event.currentTarget.value)
              }
            />
            <SelectField
              id="source-revision-publication-status"
              label="Publication status"
              value={fields.publicationStatus}
              onChange={(value) =>
                setField("publicationStatus", value as PublicationStatus)
              }
            >
              {publicationStatuses.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
            <PetraTextField
              label="Metadata source"
              hint="Where you inspected this version identity."
              value={fields.metadataSourceName}
              required
              onChange={(event) =>
                setField("metadataSourceName", event.currentTarget.value)
              }
            />
            <PetraTextField
              label="Metadata record ID"
              value={fields.metadataSourceRecordId}
              onChange={(event) =>
                setField("metadataSourceRecordId", event.currentTarget.value)
              }
            />
            <PetraTextField
              label="Metadata observed at"
              hint="Your reviewed local date and time; Petra stores it in UTC."
              type="datetime-local"
              value={fields.metadataRetrievedAt}
              required
              onChange={(event) =>
                setField("metadataRetrievedAt", event.currentTarget.value)
              }
            />
          </div>
        </fieldset>

        <fieldset disabled={revisionLocked || submitting}>
          <legend>Exact new material</legend>
          <div className="source-registration-grid">
            <PetraTextField
              label="New version file"
              hint="The selected bytes are hashed before submission."
              type="file"
              required
              onChange={(event) => setFile(event.currentTarget.files?.[0])}
            />
            <SelectField
              id="source-revision-artifact-kind"
              label="Material kind"
              value={fields.artifactKind}
              onChange={(value) =>
                setField("artifactKind", value as ArtifactKind)
              }
            >
              {artifactKinds.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
          </div>
        </fieldset>

        <fieldset disabled={revisionLocked || submitting}>
          <legend>Copy-specific rights</legend>
          <p className="source-registration-fieldset-note">
            Review rights for these exact new bytes. Prior-version rights are
            not copied or weakened automatically.
          </p>
          <div className="source-registration-grid">
            <PetraTextField
              label="Source location"
              hint="The URI where this exact copy was obtained."
              type="url"
              value={fields.sourceLocation}
              required
              onChange={(event) =>
                setField("sourceLocation", event.currentTarget.value)
              }
            />
            <SelectField
              id="source-revision-license-status"
              label="License status"
              value={fields.licenseStatus}
              onChange={(value) =>
                setField("licenseStatus", value as LicenseStatus)
              }
            >
              <option value="unknown">Unknown</option>
              <option value="known">Known</option>
              <option value="restricted">Restricted</option>
            </SelectField>
            {fields.licenseStatus !== "known" ? null : (
              <PetraTextField
                label="Observed license identifier"
                value={fields.observedLicenseIdentifier}
                required
                onChange={(event) =>
                  setField(
                    "observedLicenseIdentifier",
                    event.currentTarget.value,
                  )
                }
              />
            )}
            <SelectField
              id="source-revision-access-basis"
              label="Access basis"
              value={fields.accessBasis}
              onChange={(value) =>
                setField("accessBasis", value as AccessBasis)
              }
            >
              <option value="user_supplied">User supplied</option>
              <option value="open_license">Open license</option>
              <option value="public_repository">Public repository</option>
              <option value="subscription">Subscription</option>
              <option value="permission">Permission</option>
              <option value="unknown">Unknown</option>
            </SelectField>
            <SelectField
              id="source-revision-decision-status"
              label="Rights decision status"
              value={fields.decisionStatus}
              onChange={(value) =>
                setField("decisionStatus", value as DecisionStatus)
              }
            >
              <option value="unknown">Unknown</option>
              <option value="verified">Verified</option>
              <option value="inferred">Inferred</option>
              <option value="conflicting">Conflicting</option>
              <option value="restricted">Restricted</option>
            </SelectField>
          </div>
          <div className="source-registration-checks">
            <fieldset>
              <legend>Permitted uses</legend>
              {permissionLabels.map(([permission, label]) => (
                <label key={permission}>
                  <input
                    type="checkbox"
                    checked={fields.permissions[permission]}
                    required={permission === "store_raw_bytes"}
                    onChange={(event) =>
                      setField("permissions", {
                        ...fields.permissions,
                        [permission]: event.currentTarget.checked,
                      })
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Conditions</legend>
              {conditionLabels.map(([condition, label]) => (
                <label key={condition}>
                  <input
                    type="checkbox"
                    checked={fields.conditions.includes(condition)}
                    onChange={(event) =>
                      setField(
                        "conditions",
                        event.currentTarget.checked
                          ? [...fields.conditions, condition]
                          : fields.conditions.filter(
                              (candidate) => candidate !== condition,
                            ),
                      )
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
          </div>
          <div className="source-registration-grid">
            <PetraTextArea
              label="Required notices"
              hint="One exact notice per line."
              value={fields.requiredNotices}
              onChange={(event) =>
                setField("requiredNotices", event.currentTarget.value)
              }
            />
            <PetraTextField
              label="Authorization reference"
              value={fields.authorizationReference}
              onChange={(event) =>
                setField("authorizationReference", event.currentTarget.value)
              }
            />
            <PetraTextArea
              label="Rights rationale"
              value={fields.rightsRationale}
              required
              onChange={(event) =>
                setField("rightsRationale", event.currentTarget.value)
              }
            />
            <PetraTextField
              label="Rights observed at"
              type="datetime-local"
              value={fields.rightsObservedAt}
              required
              onChange={(event) =>
                setField("rightsObservedAt", event.currentTarget.value)
              }
            />
            <PetraTextField
              label="Rights policy version"
              value={fields.policyVersion}
              required
              onChange={(event) =>
                setField("policyVersion", event.currentTarget.value)
              }
            />
          </div>
        </fieldset>

        <fieldset disabled={revisionLocked || submitting}>
          <legend>Governed replacement review</legend>
          <p className="source-registration-fieldset-note">
            This review is retained with the intake. It does not exclude the
            earlier version or create the relationship; those remain explicit
            receipt-bound controls after intake.
          </p>
          <div className="source-registration-grid">
            <PetraTextArea
              label="Why this is the newer version"
              value={fields.replacementRationale}
              required
              onChange={(event) =>
                setField("replacementRationale", event.currentTarget.value)
              }
            />
            <PetraTextField
              label="Replacement reviewed at"
              type="datetime-local"
              value={fields.reviewedAt}
              required
              onChange={(event) =>
                setField("reviewedAt", event.currentTarget.value)
              }
            />
          </div>
        </fieldset>

        <div className="source-registration-actions">
          <PetraButton
            type="submit"
            variant="primary"
            busy={submitting}
            busyLabel="Adding new version"
          >
            Add new immutable version
          </PetraButton>
          <PetraButton variant="quiet" onClick={onCancel}>
            Cancel
          </PetraButton>
        </div>
      </form>
    </section>
  );
};
