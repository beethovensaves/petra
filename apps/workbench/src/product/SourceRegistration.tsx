import { useState, type FormEvent } from "react";
import type {
  PetraProjectSourceRegistrationReceipt,
  PetraProjectSourceRegistrationRecoveryView,
  PetraProjectSourceRegistrationRequest,
} from "@petra/contracts";
import { Link } from "react-router";

import {
  PetraButton,
  PetraTextArea,
  PetraTextField,
} from "../design-system/primitives.js";
import {
  assessSourceRegistrationRecovery,
  createSourceRegistrationRequest,
  executeSourceRegistration,
  sourceRegistrationMaterialFromFile,
  sourceRegistrationOutcomeUnknown,
  type SourceRegistrationContext,
  type SourceRegistrationDraft,
} from "./source-registration.js";

type WorkKind = SourceRegistrationDraft["workKind"];
type IdentityStatus = SourceRegistrationDraft["identityStatus"];
type AuthorKind = SourceRegistrationDraft["authorKind"];
type PublicationStatus = SourceRegistrationDraft["publicationStatus"];
type LicenseStatus = SourceRegistrationDraft["licenseStatus"];
type AccessBasis = SourceRegistrationDraft["accessBasis"];
type DecisionStatus = SourceRegistrationDraft["decisionStatus"];
type ArtifactKind =
  PetraProjectSourceRegistrationRequest["material"]["artifact_kind"];
type Permission = keyof SourceRegistrationDraft["permissions"];
type Condition = SourceRegistrationDraft["conditions"][number];

interface SourceRegistrationFields {
  title: string;
  workKind: WorkKind;
  identityStatus: IdentityStatus;
  authors: string;
  authorKind: AuthorKind;
  versionLabel: string;
  publicationStatus: PublicationStatus;
  metadataSourceName: string;
  metadataSourceRecordId: string;
  metadataRetrievedAt: string;
  artifactKind: ArtifactKind;
  sourceLocation: string;
  licenseStatus: LicenseStatus;
  observedLicenseIdentifier: string;
  accessBasis: AccessBasis;
  decisionStatus: DecisionStatus;
  permissions: SourceRegistrationDraft["permissions"];
  conditions: Condition[];
  requiredNotices: string;
  authorizationReference: string;
  rightsRationale: string;
  rightsObservedAt: string;
  policyVersion: string;
  sourceRole: string;
  reviewedAt: string;
}

const initialFields = (
  context: SourceRegistrationContext,
): SourceRegistrationFields => ({
  title: "",
  workKind: "journal_article",
  identityStatus: "provisional",
  authors: "",
  authorKind: "person",
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
  sourceRole: context.sourceRoles[0]?.semanticKey ?? "",
  reviewedAt: "",
});

const workKinds: ReadonlyArray<[WorkKind, string]> = [
  ["journal_article", "Journal article"],
  ["conference_paper", "Conference paper"],
  ["preprint", "Preprint"],
  ["thesis", "Thesis"],
  ["book", "Book"],
  ["chapter", "Book chapter"],
  ["other", "Other"],
];

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

const conditions: ReadonlyArray<[Condition, string]> = [
  ["attribution", "Attribution"],
  ["notice", "License notice"],
  ["noncommercial", "Noncommercial use"],
  ["share_alike", "Share alike"],
  ["no_derivatives", "No derivatives"],
];

const messageFrom = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : "Petra did not return a source registration result.";

const lines = (value: string): string[] =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

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

export const SourceRegistrationReceipt = ({
  receipt,
  recovered = false,
  roleLabel,
}: {
  receipt: PetraProjectSourceRegistrationReceipt;
  recovered?: boolean;
  roleLabel?: string;
}): React.JSX.Element => (
  <section
    className="source-registration-receipt"
    aria-labelledby="source-registration-complete"
  >
    <header>
      <div>
        <p className="reference-panel-kicker">
          {recovered ? "Recovered registration" : "Registration retained"}
        </p>
        <h2 id="source-registration-complete">Source added to this Project</h2>
        <p>{receipt.effect.summary}</p>
      </div>
    </header>
    <dl>
      <div>
        <dt>Project role</dt>
        <dd>{roleLabel ?? receipt.membership.source_role}</dd>
      </div>
      <div>
        <dt>Copy</dt>
        <dd>{receipt.material.artifact_ref.media_type}</dd>
      </div>
      <div>
        <dt>Effect</dt>
        <dd>Registered and linked · meaning authority unchanged</dd>
      </div>
      <div>
        <dt>Recorded</dt>
        <dd>{receipt.recorded_at}</dd>
      </div>
    </dl>
    <div className="source-registration-actions">
      <Link
        className="reference-primary-link"
        to={`/projects/${receipt.destination.project_id}/sources/${receipt.destination.project_source_id}?${new URLSearchParams(
          { from: "sources" },
        )}`}
      >
        Inspect registered source
      </Link>
      <Link
        className="reference-text-link"
        to={`/projects/${receipt.destination.project_id}/sources`}
      >
        Return to Sources
      </Link>
    </div>
    <details>
      <summary>Technical receipt</summary>
      <dl>
        <div>
          <dt>Receipt</dt>
          <dd>
            <code>{receipt.receipt_id}</code>
          </dd>
        </div>
        <div>
          <dt>Project source</dt>
          <dd>
            <code>{receipt.project_source_ref.project_source_id}</code>
          </dd>
        </div>
        <div>
          <dt>Registered role</dt>
          <dd>
            <code>{receipt.membership.source_role}</code>
          </dd>
        </div>
        <div>
          <dt>Rights decision</dt>
          <dd>
            <code>{receipt.material.rights_decision_ref.record_id}</code>
          </dd>
        </div>
      </dl>
    </details>
  </section>
);

const recoveryHeading = (
  effect: PetraProjectSourceRegistrationRecoveryView["effect"],
): string =>
  effect.state === "effect_confirmed"
    ? "Registration effect confirmed"
    : effect.state === "outcome_unknown"
      ? "Registration outcome is still unknown"
      : "Registration cannot be verified";

export const SourceRegistrationPanel = ({
  context,
  sourceTerm,
  onCancel,
}: {
  context: SourceRegistrationContext;
  sourceTerm: string;
  onCancel: () => void;
}): React.JSX.Element => {
  const [fields, setFields] = useState(() => initialFields(context));
  const [file, setFile] = useState<File>();
  const [submitting, setSubmitting] = useState(false);
  const [activeRequest, setActiveRequest] =
    useState<PetraProjectSourceRegistrationRequest>();
  const [receipt, setReceipt] =
    useState<PetraProjectSourceRegistrationReceipt>();
  const [recovered, setRecovered] = useState(false);
  const [failure, setFailure] = useState<{
    message: string;
    outcomeUnknown: boolean;
  }>();
  const [assessment, setAssessment] =
    useState<PetraProjectSourceRegistrationRecoveryView>();
  const [assessing, setAssessing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string>();

  const setField = <Key extends keyof SourceRegistrationFields>(
    key: Key,
    value: SourceRegistrationFields[Key],
  ): void => setFields((current) => ({ ...current, [key]: value }));

  const draft = (): SourceRegistrationDraft => ({
    title: fields.title,
    workKind: fields.workKind,
    identityStatus: fields.identityStatus,
    authorNames: lines(fields.authors),
    authorKind: fields.authorKind,
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
    sourceRole: fields.sourceRole,
    reviewedAt: fields.reviewedAt,
  });

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setFailure(undefined);
    setAssessment(undefined);
    setRecoveryError(undefined);
    let request: PetraProjectSourceRegistrationRequest | undefined;
    try {
      if (file === undefined) throw new TypeError("Choose a source file.");
      const material = await sourceRegistrationMaterialFromFile(
        file,
        fields.artifactKind,
      );
      request = createSourceRegistrationRequest({
        context,
        draft: draft(),
        material,
      });
      setActiveRequest(request);
      const result = await executeSourceRegistration(context, request);
      setReceipt(result.receipt);
      setRecovered(false);
    } catch (error) {
      setFailure({
        message: messageFrom(error),
        outcomeUnknown:
          request !== undefined && sourceRegistrationOutcomeUnknown(error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const assess = async (): Promise<void> => {
    if (activeRequest === undefined) return;
    setAssessing(true);
    setRecoveryError(undefined);
    try {
      const result = await assessSourceRegistrationRecovery(
        context,
        activeRequest,
      );
      setAssessment(result);
      if (result.effect.state === "effect_confirmed") {
        setReceipt(result.effect.receipt);
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
      const result = await executeSourceRegistration(context, activeRequest);
      setReceipt(result.receipt);
      setRecovered(false);
    } catch (error) {
      const outcomeUnknown = sourceRegistrationOutcomeUnknown(error);
      if (outcomeUnknown) {
        setRecoveryError(messageFrom(error));
      } else {
        setFailure({ message: messageFrom(error), outcomeUnknown: false });
        setAssessment(undefined);
      }
    } finally {
      setRetrying(false);
    }
  };

  if (receipt !== undefined) {
    const roleLabel = context.sourceRoles.find(
      (role) => role.semanticKey === receipt.membership.source_role,
    )?.label;
    return (
      <SourceRegistrationReceipt
        receipt={receipt}
        recovered={recovered}
        {...(roleLabel === undefined ? {} : { roleLabel })}
      />
    );
  }

  const registrationLocked =
    failure?.outcomeUnknown === true && activeRequest !== undefined;
  const effect = assessment?.effect;

  return (
    <section
      className="source-registration-panel"
      aria-labelledby="source-registration-title"
    >
      <header>
        <div>
          <p className="reference-panel-kicker">New Project source</p>
          <h2 id="source-registration-title">Review and add {sourceTerm}</h2>
          <p>
            Register one new copy with its identity, copy-specific rights, and
            exact Project role. Petra will resolve authority, storage, and
            retained record identities after you submit.
          </p>
        </div>
        <PetraButton variant="quiet" onClick={onCancel}>
          Close
        </PetraButton>
      </header>

      {failure === undefined ? null : (
        <div className="source-registration-error" role="alert">
          <strong>
            {failure.outcomeUnknown
              ? "Registration outcome not confirmed."
              : "Registration was not applied."}
          </strong>
          <span>{failure.message}</span>
          <span>
            Your reviewed fields and selected file remain in this form.
          </span>
        </div>
      )}

      {registrationLocked ? (
        <section
          className="source-registration-recovery"
          aria-labelledby="source-registration-recovery-title"
        >
          <header>
            <p className="reference-panel-kicker">Read-only recovery</p>
            <h3 id="source-registration-recovery-title">
              {effect === undefined
                ? "Check the retained command before retrying"
                : recoveryHeading(effect)}
            </h3>
          </header>
          {effect === undefined ? (
            <PetraButton
              variant="secondary"
              busy={assessing}
              busyLabel="Checking registration"
              onClick={() => void assess()}
            >
              Check registration effect
            </PetraButton>
          ) : effect.state === "outcome_unknown" ? (
            <div>
              <p>
                No owned receipt was observed. Petra permits one exact retry
                using the same command and idempotency identities.
              </p>
              <PetraButton
                variant="primary"
                busy={retrying}
                busyLabel="Retrying exact registration"
                onClick={() => void retry()}
              >
                Retry exact registration
              </PetraButton>
            </div>
          ) : effect.state === "unavailable_to_verify" ? (
            <div>
              <p>
                Petra cannot verify this retained command: {effect.reason}.
                Re-read Sources before starting a new review.
              </p>
              <Link
                className="reference-text-link"
                to={`/projects/${context.projectId}/sources`}
              >
                Return to Sources
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
        <fieldset disabled={registrationLocked || submitting}>
          <legend>Reviewed source identity</legend>
          <div className="source-registration-grid">
            <PetraTextField
              label="Title"
              value={fields.title}
              required
              onChange={(event) => setField("title", event.currentTarget.value)}
            />
            <SelectField
              id="source-registration-work-kind"
              label="Work kind"
              value={fields.workKind}
              onChange={(value) => setField("workKind", value as WorkKind)}
            >
              {workKinds.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
            <PetraTextArea
              label="Authors"
              hint="One reviewed name per line; the selected author kind applies to every name."
              value={fields.authors}
              required
              onChange={(event) =>
                setField("authors", event.currentTarget.value)
              }
            />
            <SelectField
              id="source-registration-author-kind"
              label="Author kind"
              value={fields.authorKind}
              onChange={(value) => setField("authorKind", value as AuthorKind)}
            >
              <option value="person">Person</option>
              <option value="organization">Organization</option>
              <option value="consortium">Consortium</option>
            </SelectField>
            <SelectField
              id="source-registration-identity-status"
              label="Identity status"
              value={fields.identityStatus}
              onChange={(value) =>
                setField("identityStatus", value as IdentityStatus)
              }
            >
              <option value="provisional">Provisional</option>
              <option value="resolved">Resolved</option>
              <option value="disputed">Disputed</option>
            </SelectField>
            <PetraTextField
              label="Version label"
              placeholder="Accepted manuscript, edition 2…"
              value={fields.versionLabel}
              required
              onChange={(event) =>
                setField("versionLabel", event.currentTarget.value)
              }
            />
            <SelectField
              id="source-registration-publication-status"
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
              hint="Where you inspected this identity."
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

        <fieldset disabled={registrationLocked || submitting}>
          <legend>Exact material</legend>
          <div className="source-registration-grid">
            <PetraTextField
              label="Source file"
              hint="The selected bytes are hashed before submission."
              type="file"
              required
              onChange={(event) => setFile(event.currentTarget.files?.[0])}
            />
            <SelectField
              id="source-registration-artifact-kind"
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

        <fieldset disabled={registrationLocked || submitting}>
          <legend>Copy-specific rights</legend>
          <p className="source-registration-fieldset-note">
            These choices apply to this exact file. They do not establish the
            work’s meaning or transfer authority to Petra.
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
              id="source-registration-license-status"
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
                hint="The license name or SPDX identifier you observed."
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
              id="source-registration-access-basis"
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
              id="source-registration-decision-status"
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
              {conditions.map(([condition, label]) => (
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

        <fieldset disabled={registrationLocked || submitting}>
          <legend>Project membership review</legend>
          <div className="source-registration-grid">
            <SelectField
              id="source-registration-role"
              label="Project source role"
              value={fields.sourceRole}
              hint="Only roles registered by this exact Project profile appear."
              onChange={(value) => setField("sourceRole", value)}
            >
              {context.sourceRoles.map((role) => (
                <option key={role.semanticKey} value={role.semanticKey}>
                  {role.label} — {role.meaning}
                </option>
              ))}
            </SelectField>
            <PetraTextField
              label="Review completed at"
              hint="Your reviewed local date and time; Petra stores it in UTC."
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
            busyLabel="Registering source"
          >
            Register and link source
          </PetraButton>
          <PetraButton variant="quiet" onClick={onCancel}>
            Cancel
          </PetraButton>
        </div>
      </form>
    </section>
  );
};
