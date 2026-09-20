import { ProjectSourceReuseClientError } from "@petra/adapters";
import type {
  PetraProjectSourceReuseOptionsView,
  PetraProjectSourceReuseReceipt,
  PetraProjectSourceReuseRecoveryView,
  PetraProjectSourceReuseRequest,
} from "@petra/contracts";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router";

import { PetraButton } from "../design-system/primitives.js";
import {
  createSourceReuseRequest,
  projectSourceReuseClient,
  sourceReuseCandidateKey,
  sourceReuseMembershipDuplicate,
  sourceReuseOptionsChanged,
  sourceReuseOutcomeUnknown,
  sourceReusePermissionLost,
} from "./source-reuse.js";

type SourceReuseClient = Pick<
  ReturnType<typeof projectSourceReuseClient>,
  "getOptions" | "reuse" | "assessRecovery"
>;

export interface SourceReuseCompletion {
  readonly projectId: string;
  readonly projectSourceId: string;
  readonly receipt: PetraProjectSourceReuseReceipt;
}

interface SourceReuseActionFailure {
  readonly kind: "duplicate" | "permission" | "rejected" | "stale" | "unknown";
  readonly title: string;
  readonly message: string;
  readonly code?: string;
  readonly selectedTitle?: string;
}

const humanize = (value: string): string =>
  value
    .replaceAll("_", " ")
    .replace(/^./u, (first) => first.toLocaleUpperCase());

const publishedDate = (
  value: PetraProjectSourceReuseOptionsView["candidates"][number]["display"]["published_date"],
): string | undefined => value?.value;

const errorCode = (error: unknown): string | undefined =>
  error instanceof ProjectSourceReuseClientError ? error.code : undefined;

const loadFailureCopy = (
  error: unknown,
): { title: string; message: string; code?: string } => {
  const code = errorCode(error);
  if (sourceReusePermissionLost(error)) {
    return {
      title: "Source reuse access changed",
      message:
        "Petra can no longer read permitted existing sources for this Project. Your Sources task remains unchanged. Restore access, then try again.",
      ...(code === undefined ? {} : { code }),
    };
  }
  return {
    title: "Existing sources could not be loaded",
    message:
      "Petra could not read the current permitted choices. No source was linked, and your Sources task remains unchanged.",
    ...(code === undefined ? {} : { code }),
  };
};

const actionFailureCopy = (
  error: unknown,
  selectedTitle: string,
): SourceReuseActionFailure => {
  const code = errorCode(error);
  if (sourceReuseMembershipDuplicate(error)) {
    return {
      kind: "duplicate",
      title: "This source is already linked",
      message:
        "Petra re-read the permitted choices. Review the refreshed Sources collection before choosing another source.",
      ...(code === undefined ? {} : { code }),
      selectedTitle,
    };
  }
  if (sourceReusePermissionLost(error)) {
    return {
      kind: "permission",
      title: "Source reuse access changed",
      message:
        "The selected source or this Project is no longer permitted for reuse. Petra re-read the available choices; no success is assumed.",
      ...(code === undefined ? {} : { code }),
      selectedTitle,
    };
  }
  if (sourceReuseOptionsChanged(error)) {
    return {
      kind: "stale",
      title: "The reviewed source choice changed",
      message:
        "Petra re-read the current source, Project, profile role, and copy permissions. Confirm a current choice before trying again.",
      ...(code === undefined ? {} : { code }),
      selectedTitle,
    };
  }
  if (sourceReuseOutcomeUnknown(error)) {
    return {
      kind: "unknown",
      title: "Source reuse outcome not confirmed",
      message:
        "Petra did not receive a trustworthy result. Keep this reviewed request unchanged while Petra checks its durable effect.",
      ...(code === undefined ? {} : { code }),
      selectedTitle,
    };
  }
  return {
    kind: "rejected",
    title: "Source reuse was not applied",
    message:
      "Petra rejected this reviewed request. Your selected source and Project role remain available for correction or another attempt.",
    ...(code === undefined ? {} : { code }),
    selectedTitle,
  };
};

export const SourceReuseAvailability = ({
  view,
  sourceTerm,
}: {
  view: PetraProjectSourceReuseOptionsView;
  sourceTerm: string;
}): React.JSX.Element | null => {
  if (view.availability.state === "available") return null;
  const allLinked =
    view.availability.reason === "all_permitted_sources_already_linked";
  const unsupported = view.availability.reason === "profile_unsupported";
  const rolesUnavailable =
    view.availability.reason === "source_roles_unavailable";
  return (
    <section
      className="source-reuse-availability"
      data-state={view.availability.reason}
      aria-labelledby="source-reuse-availability-title"
    >
      <p className="reference-panel-kicker">
        {unsupported ? "Profile boundary" : "Current permitted collection"}
      </p>
      <h3 id="source-reuse-availability-title">
        {allLinked
          ? `Every permitted ${sourceTerm} is already linked`
          : unsupported
            ? "This Project profile is not supported for source reuse"
            : rolesUnavailable
              ? "No registered Project role can receive this source"
              : `No permitted ${sourceTerm} is available to reuse`}
      </h3>
      <p>{view.availability.message}</p>
      <p>
        {allLinked
          ? `${view.counts.already_linked} permitted ${view.counts.already_linked === 1 ? "copy is" : "copies are"} already in this Project.`
          : unsupported
            ? "Petra did not invent roles or fallback terminology for this profile."
            : rolesUnavailable
              ? "Inspect the Project profile or choose Add source when a registered role becomes available."
              : "Add a new reviewed copy, or return after another permitted copy becomes available."}
      </p>
    </section>
  );
};

const SourceReuseReceipt = ({
  receipt,
  roleLabel,
  sourceTerm,
  sourceQuery,
  destinationFailure,
}: {
  receipt: PetraProjectSourceReuseReceipt;
  roleLabel: string;
  sourceTerm: string;
  sourceQuery: string;
  destinationFailure?: string;
}): React.JSX.Element => {
  const destinationQuery = new URLSearchParams({
    from: "sources",
    semanticKey: "petra.project-source",
    selected: receipt.destination.project_source_id,
    revision: String(receipt.project_source_ref.revision),
    recordHash: receipt.project_source_ref.record_hash,
  });
  if (sourceQuery.trim().length > 0) {
    destinationQuery.set("sourceQuery", sourceQuery);
  }
  return (
    <section
      className="source-registration-receipt source-reuse-receipt"
      aria-labelledby="source-reuse-complete"
    >
      <header>
        <div>
          <p className="reference-panel-kicker">Existing copy linked</p>
          <h2 id="source-reuse-complete">
            {humanize(sourceTerm)} added to this Project
          </h2>
          <p>{receipt.effect.summary}</p>
        </div>
      </header>
      {destinationFailure === undefined ? null : (
        <div className="source-registration-error" role="alert">
          <strong>Automatic return was interrupted.</strong>
          <span>{destinationFailure}</span>
        </div>
      )}
      <dl>
        <div>
          <dt>Project role</dt>
          <dd>{roleLabel}</dd>
        </div>
        <div>
          <dt>Effect</dt>
          <dd>Existing permitted copy linked · meaning authority unchanged</dd>
        </div>
      </dl>
      <div className="source-registration-actions">
        <Link
          className="reference-primary-link"
          to={`/projects/${receipt.destination.project_id}/sources/${receipt.destination.project_source_id}?${destinationQuery}`}
        >
          Inspect reused {sourceTerm}
        </Link>
        <Link
          className="reference-text-link"
          to={`/projects/${receipt.destination.project_id}/sources${
            sourceQuery.trim().length === 0
              ? ""
              : `?${new URLSearchParams({ query: sourceQuery })}`
          }`}
        >
          Return to Sources
        </Link>
      </div>
    </section>
  );
};

const recoveryHeading = (
  effect: PetraProjectSourceReuseRecoveryView["effect"],
): string =>
  effect.state === "effect_confirmed"
    ? "Source reuse effect confirmed"
    : effect.state === "outcome_unknown"
      ? "Source reuse outcome is still unknown"
      : "Source reuse cannot be verified";

export const SourceReusePanel = ({
  projectId,
  sourceTerm,
  sourceQuery = "",
  onCancel,
  onComplete,
  client,
}: {
  projectId: string;
  sourceTerm: string;
  sourceQuery?: string;
  onCancel: () => void;
  onComplete?: (completion: SourceReuseCompletion) => void | Promise<void>;
  client?: SourceReuseClient;
}): React.JSX.Element => {
  const [resolvedClient] = useState<SourceReuseClient>(
    () => client ?? projectSourceReuseClient(),
  );
  const [options, setOptions] = useState<PetraProjectSourceReuseOptionsView>();
  const [loading, setLoading] = useState(true);
  const [loadFailure, setLoadFailure] = useState<{
    title: string;
    message: string;
    code?: string;
  }>();
  const [selectedCandidateKey, setSelectedCandidateKey] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedTitle, setSelectedTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeRequest, setActiveRequest] =
    useState<PetraProjectSourceReuseRequest>();
  const [actionFailure, setActionFailure] =
    useState<SourceReuseActionFailure>();
  const [assessment, setAssessment] =
    useState<PetraProjectSourceReuseRecoveryView>();
  const [assessing, setAssessing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string>();
  const [receipt, setReceipt] = useState<PetraProjectSourceReuseReceipt>();
  const [receiptRoleLabel, setReceiptRoleLabel] = useState(
    "Registered Project role",
  );
  const [destinationFailure, setDestinationFailure] = useState<string>();
  const initiallyReadProject = useRef<string | undefined>(undefined);

  const reloadOptions = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadFailure(undefined);
    try {
      const view = await resolvedClient.getOptions(projectId);
      setOptions(view);
      setSelectedRole(
        (current) => current || view.source_roles[0]?.semantic_key || "",
      );
    } catch (error) {
      setOptions(undefined);
      setLoadFailure(loadFailureCopy(error));
    } finally {
      setLoading(false);
    }
  }, [projectId, resolvedClient]);

  useEffect(() => {
    if (initiallyReadProject.current === projectId) return;
    initiallyReadProject.current = projectId;
    void reloadOptions();
  }, [projectId, reloadOptions]);

  const complete = async (
    confirmedReceipt: PetraProjectSourceReuseReceipt,
  ): Promise<void> => {
    setReceipt(confirmedReceipt);
    setReceiptRoleLabel(
      options?.source_roles.find(
        (role) => role.semantic_key === confirmedReceipt.membership.source_role,
      )?.label ?? "Registered Project role",
    );
    setDestinationFailure(undefined);
    try {
      await onComplete?.({
        projectId: confirmedReceipt.destination.project_id,
        projectSourceId: confirmedReceipt.destination.project_source_id,
        receipt: confirmedReceipt,
      });
    } catch {
      setDestinationFailure(
        "The source is linked, but Petra could not refresh and open it automatically. Use the exact inspection link below; your Sources filter is preserved.",
      );
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (options === undefined) return;
    const candidate = options.candidates.find(
      (option) => sourceReuseCandidateKey(option) === selectedCandidateKey,
    );
    const reviewedTitle = candidate?.display.title ?? selectedTitle;
    setSelectedTitle(reviewedTitle);
    setSubmitting(true);
    setActionFailure(undefined);
    setAssessment(undefined);
    setRecoveryError(undefined);
    let request: PetraProjectSourceReuseRequest | undefined;
    try {
      request = createSourceReuseRequest({
        view: options,
        candidateKey: selectedCandidateKey,
        sourceRole: selectedRole,
      });
      setActiveRequest(request);
      const result = await resolvedClient.reuse(projectId, request);
      await complete(result.receipt);
    } catch (error) {
      const failure = actionFailureCopy(error, reviewedTitle);
      setActionFailure(failure);
      if (failure.kind !== "unknown") setActiveRequest(undefined);
      if (
        failure.kind === "stale" ||
        failure.kind === "duplicate" ||
        failure.kind === "permission"
      ) {
        await reloadOptions();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const assess = async (): Promise<void> => {
    if (activeRequest === undefined) return;
    setAssessing(true);
    setRecoveryError(undefined);
    try {
      const result = await resolvedClient.assessRecovery(
        projectId,
        activeRequest,
      );
      setAssessment(result);
      if (result.effect.state === "effect_confirmed") {
        await complete(result.effect.receipt);
      }
    } catch {
      setRecoveryError(
        "Petra could not check the durable effect. Keep this request unchanged and try the read-only check again.",
      );
    } finally {
      setAssessing(false);
    }
  };

  const retry = async (): Promise<void> => {
    if (activeRequest === undefined) return;
    setRetrying(true);
    setRecoveryError(undefined);
    try {
      const result = await resolvedClient.reuse(projectId, activeRequest);
      await complete(result.receipt);
    } catch (error) {
      const failure = actionFailureCopy(error, selectedTitle);
      if (failure.kind === "unknown") {
        setRecoveryError(
          "The exact retry still has no trustworthy result. Check the durable effect again before taking another action.",
        );
        setAssessment(undefined);
      } else {
        setActionFailure(failure);
        setActiveRequest(undefined);
        setAssessment(undefined);
        if (
          failure.kind === "stale" ||
          failure.kind === "duplicate" ||
          failure.kind === "permission"
        ) {
          await reloadOptions();
        }
      }
    } finally {
      setRetrying(false);
    }
  };

  if (receipt !== undefined) {
    return (
      <SourceReuseReceipt
        receipt={receipt}
        roleLabel={receiptRoleLabel}
        sourceTerm={sourceTerm}
        sourceQuery={sourceQuery}
        {...(destinationFailure === undefined ? {} : { destinationFailure })}
      />
    );
  }

  const selectedCandidate = options?.candidates.find(
    (option) => sourceReuseCandidateKey(option) === selectedCandidateKey,
  );
  const selectedRegisteredRole = options?.source_roles.find(
    ({ semantic_key: semanticKey }) => semanticKey === selectedRole,
  );
  const recoveryLocked =
    actionFailure?.kind === "unknown" && activeRequest !== undefined;
  const canSubmit =
    options?.availability.state === "available" &&
    selectedCandidate !== undefined &&
    selectedRegisteredRole !== undefined &&
    !recoveryLocked;

  return (
    <section
      className="source-registration-panel source-reuse-panel"
      aria-labelledby="source-reuse-title"
    >
      <header>
        <div>
          <p className="reference-panel-kicker">Existing permitted copy</p>
          <h2 id="source-reuse-title">Use existing {sourceTerm}</h2>
          <p>
            Choose a copy Petra already permits you to reuse, then choose its
            registered role in this Project. Petra will link the existing
            identity and bytes without cloning them.
          </p>
        </div>
        <PetraButton variant="quiet" onClick={onCancel}>
          Close
        </PetraButton>
      </header>

      {loading ? (
        <p className="source-reuse-loading" role="status">
          Reading permitted existing sources…
        </p>
      ) : null}

      {loadFailure === undefined ? null : (
        <section
          className="source-registration-error source-reuse-load-failure"
          role="alert"
          aria-labelledby="source-reuse-load-failure-title"
        >
          <strong id="source-reuse-load-failure-title">
            {loadFailure.title}
          </strong>
          <span>{loadFailure.message}</span>
          <PetraButton variant="secondary" onClick={() => void reloadOptions()}>
            Try reading choices again
          </PetraButton>
          {loadFailure.code === undefined ? null : (
            <details>
              <summary>Technical detail</summary>
              <code>{loadFailure.code}</code>
            </details>
          )}
        </section>
      )}

      {options === undefined ? null : (
        <>
          <section
            className="source-reuse-profile"
            aria-labelledby="source-reuse-profile-title"
          >
            <p className="reference-panel-kicker">Current Project profile</p>
            <h3 id="source-reuse-profile-title">{options.profile.label}</h3>
            <p>{options.profile.purpose}</p>
          </section>

          <SourceReuseAvailability view={options} sourceTerm={sourceTerm} />

          {actionFailure === undefined ? null : (
            <section
              className="source-registration-error source-reuse-action-failure"
              data-state={actionFailure.kind}
              role="alert"
              aria-labelledby="source-reuse-action-failure-title"
            >
              <strong id="source-reuse-action-failure-title">
                {actionFailure.title}
              </strong>
              <span>{actionFailure.message}</span>
              {actionFailure.selectedTitle === undefined ? null : (
                <span>
                  Retained choice:{" "}
                  <strong>{actionFailure.selectedTitle}</strong>
                </span>
              )}
              {actionFailure.code === undefined ? null : (
                <details>
                  <summary>Technical detail</summary>
                  <code>{actionFailure.code}</code>
                </details>
              )}
            </section>
          )}

          {recoveryLocked ? (
            <section
              className="source-registration-recovery source-reuse-recovery"
              aria-labelledby="source-reuse-recovery-title"
            >
              <header>
                <p className="reference-panel-kicker">Read-only recovery</p>
                <h3 id="source-reuse-recovery-title">
                  {assessment === undefined
                    ? "Check the retained command before retrying"
                    : recoveryHeading(assessment.effect)}
                </h3>
              </header>
              {assessment === undefined ? (
                <PetraButton
                  variant="secondary"
                  busy={assessing}
                  busyLabel="Checking source reuse"
                  onClick={() => void assess()}
                >
                  Check source reuse effect
                </PetraButton>
              ) : assessment.effect.state === "outcome_unknown" ? (
                <div>
                  <p>
                    No owned receipt was observed. Petra permits one exact retry
                    with the same command and idempotency identities.
                  </p>
                  <PetraButton
                    variant="primary"
                    busy={retrying}
                    busyLabel="Retrying exact source reuse"
                    onClick={() => void retry()}
                  >
                    Retry exact source reuse
                  </PetraButton>
                </div>
              ) : assessment.effect.state === "unavailable_to_verify" ? (
                <div>
                  <p>
                    Petra cannot verify this retained command. It will not be
                    retried. Re-read the permitted choices before starting a new
                    review.
                  </p>
                  <PetraButton
                    variant="secondary"
                    onClick={() => void reloadOptions()}
                  >
                    Re-read existing sources
                  </PetraButton>
                </div>
              ) : null}
              {recoveryError === undefined ? null : (
                <p className="source-registration-recovery__error" role="alert">
                  {recoveryError}
                </p>
              )}
            </section>
          ) : null}

          {options.availability.state !== "available" ? null : (
            <form onSubmit={(event) => void submit(event)}>
              <fieldset disabled={submitting || recoveryLocked}>
                <legend>Choose an existing {sourceTerm}</legend>
                <p className="source-registration-fieldset-note">
                  {options.counts.permitted} permitted{" "}
                  {options.counts.permitted === 1 ? "copy" : "copies"} ·{" "}
                  {options.counts.already_linked} already linked
                </p>
                <div className="source-reuse-candidates">
                  {options.candidates.map((candidate) => {
                    const key = sourceReuseCandidateKey(candidate);
                    const date = publishedDate(
                      candidate.display.published_date,
                    );
                    return (
                      <label className="source-reuse-candidate" key={key}>
                        <input
                          type="radio"
                          name="source-reuse-candidate"
                          value={key}
                          checked={selectedCandidateKey === key}
                          onChange={() => setSelectedCandidateKey(key)}
                        />
                        <span className="source-reuse-candidate__content">
                          <strong>{candidate.display.title}</strong>
                          <span>
                            {candidate.display.contributors.join(", ")}
                          </span>
                          <span>
                            {candidate.display.version_label} ·{" "}
                            {humanize(candidate.display.publication_status)}
                            {date === undefined ? "" : ` · ${date}`}
                          </span>
                          <span>
                            From {candidate.display.origin_project_name} ·{" "}
                            {candidate.display.origin_source_role.label}
                            {candidate.display.origin_membership_status ===
                            "excluded"
                              ? " · Origin link excluded"
                              : ""}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset disabled={submitting || recoveryLocked}>
                <legend>Choose its role in this Project</legend>
                <label
                  className="petra-field"
                  htmlFor="source-reuse-project-role"
                >
                  <span className="petra-field__label">
                    Project role
                    <span className="petra-field__required">Required</span>
                  </span>
                  <select
                    className="petra-field__control petra-control--comfortable"
                    id="source-reuse-project-role"
                    value={selectedRole}
                    required
                    onChange={(event) =>
                      setSelectedRole(event.currentTarget.value)
                    }
                  >
                    {options.source_roles.map((role) => (
                      <option value={role.semantic_key} key={role.semantic_key}>
                        {role.label} — {role.meaning}
                      </option>
                    ))}
                  </select>
                </label>
              </fieldset>

              <section
                className="source-reuse-review"
                aria-labelledby="source-reuse-review-title"
              >
                <p className="reference-panel-kicker">Before linking</p>
                <h3 id="source-reuse-review-title">Review the exact effect</h3>
                <p>
                  Petra will add one Project membership for the selected
                  existing copy. Its canonical identity, stored bytes, and
                  meaning authority stay unchanged.
                </p>
              </section>

              <div className="source-registration-actions">
                <PetraButton
                  type="submit"
                  variant="primary"
                  busy={submitting}
                  busyLabel={`Linking ${sourceTerm}`}
                  {...(canSubmit
                    ? {}
                    : {
                        unavailable: {
                          reason:
                            "Choose one current existing source and one registered Project role.",
                        },
                      })}
                >
                  Use existing {sourceTerm}
                </PetraButton>
                <PetraButton variant="quiet" onClick={onCancel}>
                  Cancel
                </PetraButton>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
};
