import { createHash, randomBytes } from "node:crypto";

import type {
  ChangeOperation as PetraChangeOperation,
  ChangeOperationV110 as PetraChangeOperationV110,
  PetraApproval,
  PetraAssertion,
  PetraChangeSetRecord,
  PetraClaim,
  PetraCommandEnvelopeRecord,
  PetraDomainEventRecord,
  PetraOutboxRecordRecord,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";

import { createPetraId, petraIdKind } from "./identity.js";

export type EvidenceProposalErrorCode =
  | "CLAIM_PROPOSAL_NOT_QUARANTINED"
  | "ASSERTION_PROPOSAL_NOT_QUARANTINED"
  | "CLAIM_ID_ALREADY_PROPOSED"
  | "ASSERTION_ID_ALREADY_PROPOSED"
  | "INITIAL_REVISION_REQUIRED"
  | "SCOPE_ACCOUNTING_INVALID"
  | "CLAIM_BASIS_MISMATCH"
  | "SOURCE_SPAN_NOT_REGISTERED"
  | "SOURCE_SPAN_UNRESOLVED"
  | "SOURCE_WORK_VERSION_MISMATCH"
  | "VALIDATOR_FAILED"
  | "ABSTRACT_SCOPE_VIOLATION"
  | "BASIS_CLAIM_NOT_REGISTERED"
  | "BASIS_ASSERTION_NOT_REGISTERED"
  | "ASSERTS_ENDPOINT_MISMATCH"
  | "ASSERTS_KIND_MISMATCH"
  | "ASSERTION_SOURCE_SPAN_REQUIRED"
  | "ASSERTION_SOURCE_SPAN_NOT_IN_CLAIM"
  | "SCIENTIFIC_RELATION_SCOPE_REQUIRED"
  | "SCIENTIFIC_RELATION_PROVENANCE_REQUIRED";

export class EvidenceProposalError extends Error {
  readonly code: EvidenceProposalErrorCode;

  constructor(code: EvidenceProposalErrorCode, message: string) {
    super(message);
    this.name = "EvidenceProposalError";
    this.code = code;
  }
}

export type ChangeControlErrorCode =
  | "COMMAND_NOT_AUTHORIZED"
  | "IDEMPOTENCY_KEY_REUSED"
  | "COMMAND_ID_REUSED"
  | "CHANGE_SET_ID_REUSED"
  | "APPROVAL_ID_REUSED"
  | "CHANGE_SET_NOT_SUBMITTED"
  | "CHANGE_SET_STATE_INVALID"
  | "CHANGE_SET_HASH_MISMATCH"
  | "CHANGE_SET_PROJECT_MISMATCH"
  | "CHANGE_SET_PROPOSER_MISMATCH"
  | "CHANGE_SET_OPERATION_SET_INVALID"
  | "CHANGE_SET_COMPENSATION_REQUIRED"
  | "CHANGE_SET_COMPENSATION_INVALID"
  | "CHANGE_SET_TARGET_MISMATCH"
  | "CHANGE_SET_RISK_TIER_INVALID"
  | "APPROVAL_ACTOR_MISMATCH"
  | "APPROVAL_SUBJECT_MISMATCH"
  | "APPROVAL_NOT_REGISTERED"
  | "APPROVAL_NOT_GRANTED"
  | "APPROVAL_CONDITIONS_UNSATISFIED"
  | "CHANGE_SET_NOT_REGISTERED"
  | "CHANGE_SET_ALREADY_APPLIED"
  | "CHANGE_SET_ALREADY_REVERTED"
  | "STALE_TARGET_REVISION"
  | "TARGET_AUTHORITY_MISMATCH";

export class ChangeControlError extends Error {
  readonly code: ChangeControlErrorCode;

  constructor(code: ChangeControlErrorCode, message: string) {
    super(message);
    this.name = "ChangeControlError";
    this.code = code;
  }
}

type DeepReadonly<Value> = Value extends (...args: never[]) => unknown
  ? Value
  : Value extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : Value extends object
      ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
      : Value;

type EvidenceSourceSpan = {
  readonly parsed_document_id: string;
  readonly verification: { readonly status: string };
};

type EvidenceParsedDocument = {
  readonly work_version_id: string;
};

type ChangeOperation = PetraChangeOperation | PetraChangeOperationV110;

type PromoteClaimChange = Extract<
  ChangeOperation,
  { operation_kind: "promote_claim" }
>;

type PromoteAssertionChange = Extract<
  ChangeOperation,
  { operation_kind: "promote_assertion" }
>;

type RetractClaimChange = Extract<
  ChangeOperation,
  { operation_kind: "retract_claim" }
>;

type RetractAssertionChange = Extract<
  ChangeOperation,
  { operation_kind: "retract_assertion" }
>;

type PetraCommandRecord = PetraCommandEnvelopeRecord["command"];

export interface EvidenceSourceResolver {
  getSourceSpan(sourceSpanId: string): EvidenceSourceSpan | undefined;
  getParsedDocument(
    parsedDocumentId: string,
  ): EvidenceParsedDocument | undefined;
}

type EvidenceClaimBasis =
  | {
      readonly basis_kind: "source";
      readonly work_version_id: string;
      readonly source_span_ids: readonly string[];
    }
  | { readonly basis_kind: "synthesis" | "researcher" };

export interface EvidenceProposalResolver extends EvidenceSourceResolver {
  getClaim(claimId: string): { readonly basis: EvidenceClaimBasis } | undefined;
  getAssertion(assertionId: string): object | undefined;
}

export interface CommandAuthorizationRequest {
  readonly actor: PetraCommandEnvelopeRecord["actor"];
  readonly capabilityGrantId: string;
  readonly commandName:
    | PetraCommandRecord["command_name"]
    | "ExcludeProjectSource"
    | "RestoreProjectSource"
    | "CreateProjectSourceReplacement"
    | "RetractProjectSourceReplacement"
    | "InvokeSuggestedAction"
    | "DeferReviewSession"
    | "ReopenReviewSession";
  readonly projectId: string;
}

export interface CommandAuthorizer {
  authorize(request: CommandAuthorizationRequest): boolean;
}

export interface DomainRecordFactory {
  nextId(kind: "event" | "outbox"): string;
  now(): string;
}

export type ChangeSetDerivedState =
  "submitted" | "approved" | "rejected" | "applied" | "conflicted" | "reverted";

export type ChangeControlCommandResult =
  | {
      readonly outcome: "submitted";
      readonly command_id: string;
      readonly change_set_id: string;
      readonly change_set_state: "submitted";
    }
  | {
      readonly outcome: "approval_recorded";
      readonly command_id: string;
      readonly change_set_id: string;
      readonly change_set_state: "approved" | "rejected";
      readonly approval_id: string;
    }
  | {
      readonly outcome: "applied";
      readonly command_id: string;
      readonly change_set_id: string;
      readonly change_set_state: "applied";
      readonly approval_id: string;
      readonly claim_id: string;
      readonly claim_revision: number;
      readonly assertion_id: string;
      readonly assertion_revision: number;
      readonly applied_at: string;
    }
  | {
      readonly outcome: "reverted";
      readonly command_id: string;
      readonly change_set_id: string;
      readonly change_set_state: "applied";
      readonly compensates_change_set_id: string;
      readonly approval_id: string;
      readonly claim_id: string;
      readonly claim_revision: number;
      readonly assertion_id: string;
      readonly assertion_revision: number;
      readonly applied_at: string;
    };

type StoredCommandExecution = {
  fingerprint: string;
  outcome:
    | { kind: "success"; result: ChangeControlCommandResult }
    | {
        kind: "failure";
        code: ChangeControlErrorCode;
        message: string;
      };
};

type AuthorityTransactionSnapshot = {
  claims: Map<string, DeepReadonly<PetraClaim>>;
  assertions: Map<string, DeepReadonly<PetraAssertion>>;
  claimHistory: Map<string, Map<number, DeepReadonly<PetraClaim>>>;
  assertionHistory: Map<string, Map<number, DeepReadonly<PetraAssertion>>>;
  changeSets: Map<string, DeepReadonly<PetraChangeSetRecord>>;
  changeSetStates: Map<string, ChangeSetDerivedState>;
  approvals: Map<string, DeepReadonly<PetraApproval>>;
  appliedChangeSets: Set<string>;
  eventCount: number;
  outboxCount: number;
  eventPosition: number;
  outboxPosition: number;
  projectStreamRevisions: Map<string, number>;
  targetSequences: Map<string, number>;
};

const SCOPE_DIMENSIONS = [
  "population",
  "language",
  "task",
  "model_family",
  "dataset",
  "intervention_or_exposure",
  "comparator",
  "outcome",
  "setting",
  "temporal_boundary",
] as const;

const ABSTRACT_ONLY_BROAD_CLAIM_KINDS = new Set<PetraClaim["claim_kind"]>([
  "descriptive",
  "comparative",
  "theoretical",
]);

const SCIENTIFIC_RELATION_PREDICATES = new Set<PetraAssertion["predicate"]>([
  "SUPPORTS",
  "CONTRADICTS",
  "QUALIFIES",
  "ADOPTS",
  "DIRECTLY_TESTS",
  "EXTENDS",
  "REFRAMES",
  "CHALLENGES",
  "CRITIQUES_METHOD",
  "INTERPRETS",
  "REPLICATES",
  "FAILS_TO_REPLICATE",
]);

const immutableCopy = <Value>(value: Value): DeepReadonly<Value> => {
  const copy = structuredClone(value);
  const freeze = (member: unknown): void => {
    if (
      typeof member !== "object" ||
      member === null ||
      Object.isFrozen(member)
    ) {
      return;
    }
    for (const child of Object.values(member)) freeze(child);
    Object.freeze(member);
  };
  freeze(copy);
  return copy as DeepReadonly<Value>;
};

const actorMatches = (
  left: PetraCommandEnvelopeRecord["actor"],
  right: PetraCommandEnvelopeRecord["actor"],
): boolean =>
  left.actor_id === right.actor_id && left.actor_kind === right.actor_kind;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const encodeBase32 = (value: bigint, length: number): string => {
  let remaining = value;
  let encoded = "";
  for (let index = 0; index < length; index += 1) {
    encoded = ULID_ALPHABET[Number(remaining & 31n)] + encoded;
    remaining >>= 5n;
  }
  return encoded;
};

const systemUlid = (): string => {
  const timestamp = encodeBase32(BigInt(Date.now()), 10);
  const random = BigInt(`0x${randomBytes(10).toString("hex")}`);
  return `${timestamp}${encodeBase32(random, 16)}`;
};

const SYSTEM_DOMAIN_RECORD_FACTORY: DomainRecordFactory = {
  nextId: (kind) => createPetraId(kind, systemUlid()),
  now: () => new Date().toISOString(),
};

const replaceMap = <Key, Value>(
  target: Map<Key, Value>,
  source: ReadonlyMap<Key, Value>,
): void => {
  target.clear();
  for (const [key, value] of source) target.set(key, value);
};

const validateInitialRevision = (revision: number): void => {
  if (revision !== 1) {
    throw new EvidenceProposalError(
      "INITIAL_REVISION_REQUIRED",
      "A quarantine proposal must begin at revision 1.",
    );
  }
};

const validateScopeAccounting = (scope: PetraClaim["scope"]): void => {
  const unreported = new Set<string>(scope.unreported_dimensions);
  if (unreported.size !== scope.unreported_dimensions.length) {
    throw new EvidenceProposalError(
      "SCOPE_ACCOUNTING_INVALID",
      "Scientific scope repeats an unreported dimension.",
    );
  }

  for (const dimension of SCOPE_DIMENSIONS) {
    const reported = scope[dimension] !== undefined;
    if (reported === unreported.has(dimension)) {
      throw new EvidenceProposalError(
        "SCOPE_ACCOUNTING_INVALID",
        `Scientific scope must mark ${dimension} exactly once as reported or unreported.`,
      );
    }
  }
};

const sourceSpanIds = (assertion: PetraAssertion): string[] =>
  assertion.provenance_refs.flatMap((provenance) =>
    provenance.provenance_kind === "source_span"
      ? [provenance.source_span_id]
      : [],
  );

const validateClaimSemantics = (
  claim: PetraClaim,
  resolver: EvidenceProposalResolver,
): void => {
  if (claim.authority.zone !== "quarantine") {
    throw new EvidenceProposalError(
      "CLAIM_PROPOSAL_NOT_QUARANTINED",
      "Claims may enter the evidence registry only as quarantine proposals; promotion is a separate reviewed command.",
    );
  }
  validateScopeAccounting(claim.scope);

  if (claim.basis.basis_kind === "source") {
    if (claim.normalization_status === "composed") {
      throw new EvidenceProposalError(
        "CLAIM_BASIS_MISMATCH",
        "A source-derived Claim cannot be marked composed.",
      );
    }
    for (const result of claim.basis.validator_results) {
      if (result.outcome === "fail") {
        throw new EvidenceProposalError(
          "VALIDATOR_FAILED",
          `Claim validator ${result.validator_name} failed with ${result.code}.`,
        );
      }
    }
    for (const sourceSpanId of claim.basis.source_span_ids) {
      const span = resolver.getSourceSpan(sourceSpanId);
      if (span === undefined) {
        throw new EvidenceProposalError(
          "SOURCE_SPAN_NOT_REGISTERED",
          `SourceSpan ${sourceSpanId} is not registered.`,
        );
      }
      if (span.verification.status === "unresolved") {
        throw new EvidenceProposalError(
          "SOURCE_SPAN_UNRESOLVED",
          `SourceSpan ${sourceSpanId} is unresolved and cannot ground a Claim.`,
        );
      }
      const document = resolver.getParsedDocument(span.parsed_document_id);
      if (document?.work_version_id !== claim.basis.work_version_id) {
        throw new EvidenceProposalError(
          "SOURCE_WORK_VERSION_MISMATCH",
          `SourceSpan ${sourceSpanId} does not belong to WorkVersion ${claim.basis.work_version_id}.`,
        );
      }
    }
    if (
      claim.basis.source_scope === "abstract_only" &&
      (claim.basis.detail_level !== "broad" ||
        !ABSTRACT_ONLY_BROAD_CLAIM_KINDS.has(claim.claim_kind))
    ) {
      throw new EvidenceProposalError(
        "ABSTRACT_SCOPE_VIOLATION",
        "Abstract-only evidence may ground only broad descriptive, comparative, or theoretical Claims.",
      );
    }
    return;
  }

  if (claim.normalization_status !== "composed") {
    throw new EvidenceProposalError(
      "CLAIM_BASIS_MISMATCH",
      "A synthesized or researcher-proposed Claim must be marked composed.",
    );
  }
  if (claim.basis.basis_kind === "synthesis") {
    for (const claimId of claim.basis.basis_claim_ids) {
      if (resolver.getClaim(claimId) === undefined) {
        throw new EvidenceProposalError(
          "BASIS_CLAIM_NOT_REGISTERED",
          `Synthesis basis Claim ${claimId} is not registered.`,
        );
      }
    }
    for (const assertionId of claim.basis.basis_assertion_ids) {
      if (resolver.getAssertion(assertionId) === undefined) {
        throw new EvidenceProposalError(
          "BASIS_ASSERTION_NOT_REGISTERED",
          `Synthesis basis Assertion ${assertionId} is not registered.`,
        );
      }
    }
  }
};

/** Validate one initial Claim proposal without storing it. */
export const validateClaimProposal = (
  claim: PetraClaim,
  resolver: EvidenceProposalResolver,
): void => {
  validateInitialRevision(claim.revision);
  validateClaimSemantics(claim, resolver);
};

/** Validate one additive quarantine Claim correction without storing it. */
export const validateWorkingClaimRevision = (
  claim: PetraClaim,
  resolver: EvidenceProposalResolver,
): void => {
  if (claim.revision <= 1) {
    throw new EvidenceProposalError(
      "INITIAL_REVISION_REQUIRED",
      "A working Claim correction must advance an existing quarantine revision.",
    );
  }
  validateClaimSemantics(claim, resolver);
};

const validateAssertionSemantics = (
  assertion: PetraAssertion,
  resolver: EvidenceProposalResolver,
): void => {
  if (assertion.authority.zone !== "quarantine") {
    throw new EvidenceProposalError(
      "ASSERTION_PROPOSAL_NOT_QUARANTINED",
      "Assertions may enter the evidence registry only as quarantine proposals; promotion is a separate reviewed command.",
    );
  }
  validateScopeAccounting(assertion.scope);

  const spanIds = sourceSpanIds(assertion);
  for (const spanId of spanIds) {
    const span = resolver.getSourceSpan(spanId);
    if (span === undefined) {
      throw new EvidenceProposalError(
        "SOURCE_SPAN_NOT_REGISTERED",
        `Assertion SourceSpan ${spanId} is not registered.`,
      );
    }
    if (span.verification.status === "unresolved") {
      throw new EvidenceProposalError(
        "SOURCE_SPAN_UNRESOLVED",
        `Assertion SourceSpan ${spanId} is unresolved.`,
      );
    }
  }
  if (assertion.assertion_kind === "source_stated" && spanIds.length === 0) {
    throw new EvidenceProposalError(
      "ASSERTION_SOURCE_SPAN_REQUIRED",
      "A source-stated Assertion must cite at least one exact SourceSpan.",
    );
  }

  if (assertion.predicate === "ASSERTS") {
    if (
      petraIdKind(assertion.subject_id) !== "work_version" ||
      assertion.object.object_kind !== "entity" ||
      petraIdKind(assertion.object.entity_id) !== "claim"
    ) {
      throw new EvidenceProposalError(
        "ASSERTS_ENDPOINT_MISMATCH",
        "ASSERTS must connect a WorkVersion subject to a Claim object.",
      );
    }
    if (
      assertion.assertion_kind !== "source_stated" &&
      assertion.assertion_kind !== "source_native"
    ) {
      throw new EvidenceProposalError(
        "ASSERTS_KIND_MISMATCH",
        "ASSERTS must be source-stated or source-native.",
      );
    }
    const claim = resolver.getClaim(assertion.object.entity_id);
    if (claim === undefined || claim.basis.basis_kind !== "source") {
      throw new EvidenceProposalError(
        "ASSERTS_ENDPOINT_MISMATCH",
        "ASSERTS must target a registered source-derived Claim.",
      );
    }
    const sourceBasis = claim.basis;
    if (sourceBasis.work_version_id !== assertion.subject_id) {
      throw new EvidenceProposalError(
        "SOURCE_WORK_VERSION_MISMATCH",
        "The ASSERTS subject must be the WorkVersion that grounds its Claim.",
      );
    }
    if (
      spanIds.length === 0 ||
      spanIds.some((spanId) => !sourceBasis.source_span_ids.includes(spanId))
    ) {
      throw new EvidenceProposalError(
        "ASSERTION_SOURCE_SPAN_NOT_IN_CLAIM",
        "ASSERTS provenance must cite a SourceSpan that grounds the target Claim.",
      );
    }
  }

  if (
    SCIENTIFIC_RELATION_PREDICATES.has(assertion.predicate) &&
    assertion.scope_comparison === undefined
  ) {
    throw new EvidenceProposalError(
      "SCIENTIFIC_RELATION_SCOPE_REQUIRED",
      `${assertion.predicate} requires an explicit comparison of scientific scope.`,
    );
  }
  if (
    SCIENTIFIC_RELATION_PREDICATES.has(assertion.predicate) &&
    !assertion.provenance_refs.some(
      (provenance) =>
        provenance.provenance_kind === "source_span" ||
        provenance.provenance_kind === "structured_field" ||
        (provenance.provenance_kind === "record" &&
          ["run", "result", "analysis"].includes(provenance.role)),
    )
  ) {
    throw new EvidenceProposalError(
      "SCIENTIFIC_RELATION_PROVENANCE_REQUIRED",
      `${assertion.predicate} requires exact source or experimental provenance.`,
    );
  }
};

/** Validate one initial Assertion proposal without storing it. */
export const validateAssertionProposal = (
  assertion: PetraAssertion,
  resolver: EvidenceProposalResolver,
): void => {
  validateInitialRevision(assertion.revision);
  validateAssertionSemantics(assertion, resolver);
};

/** Validate one additive quarantine Assertion correction without storing it. */
export const validateWorkingAssertionRevision = (
  assertion: PetraAssertion,
  resolver: EvidenceProposalResolver,
): void => {
  if (assertion.revision <= 1) {
    throw new EvidenceProposalError(
      "INITIAL_REVISION_REQUIRED",
      "A working Assertion correction must advance an existing quarantine revision.",
    );
  }
  validateAssertionSemantics(assertion, resolver);
};

export class InMemoryEvidenceRegistry {
  readonly #sourceResolver: EvidenceSourceResolver;
  readonly #commandAuthorizer: CommandAuthorizer;
  readonly #domainRecordFactory: DomainRecordFactory;
  readonly #claims = new Map<string, DeepReadonly<PetraClaim>>();
  readonly #assertions = new Map<string, DeepReadonly<PetraAssertion>>();
  readonly #claimHistory = new Map<
    string,
    Map<number, DeepReadonly<PetraClaim>>
  >();
  readonly #assertionHistory = new Map<
    string,
    Map<number, DeepReadonly<PetraAssertion>>
  >();
  readonly #changeSets = new Map<string, DeepReadonly<PetraChangeSetRecord>>();
  readonly #changeSetStates = new Map<string, ChangeSetDerivedState>();
  readonly #approvals = new Map<string, DeepReadonly<PetraApproval>>();
  readonly #appliedChangeSets = new Set<string>();
  readonly #commandById = new Map<string, StoredCommandExecution>();
  readonly #commandByIdempotencyKey = new Map<string, StoredCommandExecution>();
  readonly #events: DeepReadonly<PetraDomainEventRecord>[] = [];
  readonly #outbox: DeepReadonly<PetraOutboxRecordRecord>[] = [];
  readonly #projectStreamRevisions = new Map<string, number>();
  readonly #targetSequences = new Map<string, number>();
  #eventPosition = 0;
  #outboxPosition = 0;

  constructor(
    sourceResolver: EvidenceSourceResolver,
    commandAuthorizer: CommandAuthorizer = { authorize: () => false },
    domainRecordFactory: DomainRecordFactory = SYSTEM_DOMAIN_RECORD_FACTORY,
  ) {
    this.#sourceResolver = sourceResolver;
    this.#commandAuthorizer = commandAuthorizer;
    this.#domainRecordFactory = domainRecordFactory;
  }

  get claimCount(): number {
    return this.#claims.size;
  }

  get assertionCount(): number {
    return this.#assertions.size;
  }

  get changeSetCount(): number {
    return this.#changeSets.size;
  }

  get approvalCount(): number {
    return this.#approvals.size;
  }

  get eventCount(): number {
    return this.#events.length;
  }

  get outboxCount(): number {
    return this.#outbox.length;
  }

  getClaim(claimId: string): DeepReadonly<PetraClaim> | undefined {
    return this.#claims.get(claimId);
  }

  getAssertion(assertionId: string): DeepReadonly<PetraAssertion> | undefined {
    return this.#assertions.get(assertionId);
  }

  getClaimRevision(
    claimId: string,
    revision: number,
  ): DeepReadonly<PetraClaim> | undefined {
    return this.#claimHistory.get(claimId)?.get(revision);
  }

  getAssertionRevision(
    assertionId: string,
    revision: number,
  ): DeepReadonly<PetraAssertion> | undefined {
    return this.#assertionHistory.get(assertionId)?.get(revision);
  }

  getChangeSet(
    changeSetId: string,
  ): DeepReadonly<PetraChangeSetRecord> | undefined {
    return this.#changeSets.get(changeSetId);
  }

  getApproval(approvalId: string): DeepReadonly<PetraApproval> | undefined {
    return this.#approvals.get(approvalId);
  }

  getChangeSetState(changeSetId: string): ChangeSetDerivedState | undefined {
    return this.#changeSetStates.get(changeSetId);
  }

  getEvents(): readonly DeepReadonly<PetraDomainEventRecord>[] {
    return Object.freeze([...this.#events]);
  }

  getOutboxRecords(
    target?: PetraOutboxRecordRecord["target"],
  ): readonly DeepReadonly<PetraOutboxRecordRecord>[] {
    return Object.freeze(
      target === undefined
        ? [...this.#outbox]
        : this.#outbox.filter((record) => record.target === target),
    );
  }

  proposeClaim(claim: PetraClaim): DeepReadonly<PetraClaim> {
    if (claim.authority.zone !== "quarantine") {
      throw new EvidenceProposalError(
        "CLAIM_PROPOSAL_NOT_QUARANTINED",
        "Claims may enter the evidence registry only as quarantine proposals; promotion is a separate reviewed command.",
      );
    }
    validateInitialRevision(claim.revision);
    if (this.#claims.has(claim.claim_id)) {
      throw new EvidenceProposalError(
        "CLAIM_ID_ALREADY_PROPOSED",
        `Claim ${claim.claim_id} is already proposed.`,
      );
    }
    validateClaimProposal(claim, this.#proposalResolver());

    const registered = immutableCopy(claim);
    this.#claims.set(claim.claim_id, registered);
    this.#claimHistory.set(claim.claim_id, new Map([[1, registered]]));
    return registered;
  }

  proposeAssertion(assertion: PetraAssertion): DeepReadonly<PetraAssertion> {
    if (assertion.authority.zone !== "quarantine") {
      throw new EvidenceProposalError(
        "ASSERTION_PROPOSAL_NOT_QUARANTINED",
        "Assertions may enter the evidence registry only as quarantine proposals; promotion is a separate reviewed command.",
      );
    }
    validateInitialRevision(assertion.revision);
    if (this.#assertions.has(assertion.assertion_id)) {
      throw new EvidenceProposalError(
        "ASSERTION_ID_ALREADY_PROPOSED",
        `Assertion ${assertion.assertion_id} is already proposed.`,
      );
    }
    validateAssertionProposal(assertion, this.#proposalResolver());

    const registered = immutableCopy(assertion);
    this.#assertions.set(assertion.assertion_id, registered);
    this.#assertionHistory.set(
      assertion.assertion_id,
      new Map([[1, registered]]),
    );
    return registered;
  }

  proposeEvidencePair(input: {
    readonly claim: PetraClaim;
    readonly assertion: PetraAssertion;
  }): {
    readonly claim: DeepReadonly<PetraClaim>;
    readonly assertion: DeepReadonly<PetraAssertion>;
  } {
    const snapshot = this.#captureAuthorityTransaction();
    try {
      const claim = this.proposeClaim(input.claim);
      const assertion = this.proposeAssertion(input.assertion);
      return immutableCopy({ claim, assertion });
    } catch (error) {
      this.#restoreAuthorityTransaction(snapshot);
      throw error;
    }
  }

  #proposalResolver(): EvidenceProposalResolver {
    return {
      getSourceSpan: (sourceSpanId) =>
        this.#sourceResolver.getSourceSpan(sourceSpanId),
      getParsedDocument: (parsedDocumentId) =>
        this.#sourceResolver.getParsedDocument(parsedDocumentId),
      getClaim: (claimId) => this.#claims.get(claimId),
      getAssertion: (assertionId) => this.#assertions.get(assertionId),
    };
  }

  executeCommand(
    envelope: PetraCommandEnvelopeRecord,
  ): ChangeControlCommandResult {
    if (
      !this.#commandAuthorizer.authorize({
        actor: envelope.actor,
        capabilityGrantId: envelope.capability_grant_id,
        commandName: envelope.command.command_name,
        projectId: envelope.project_id,
      })
    ) {
      throw new ChangeControlError(
        "COMMAND_NOT_AUTHORIZED",
        `Capability ${envelope.capability_grant_id} does not authorize ${envelope.command.command_name}.`,
      );
    }

    const fingerprint = canonicalHash(envelope);
    const idempotent = this.#commandByIdempotencyKey.get(
      envelope.idempotency_key,
    );
    if (idempotent !== undefined) {
      if (idempotent.fingerprint !== fingerprint) {
        throw new ChangeControlError(
          "IDEMPOTENCY_KEY_REUSED",
          "The idempotency key is already bound to different command content.",
        );
      }
      return this.#replayStoredExecution(idempotent);
    }
    const byCommandId = this.#commandById.get(envelope.command_id);
    if (byCommandId !== undefined) {
      if (byCommandId.fingerprint !== fingerprint) {
        throw new ChangeControlError(
          "COMMAND_ID_REUSED",
          `Command ID ${envelope.command_id} is already bound to different content.`,
        );
      }
      return this.#replayStoredExecution(byCommandId);
    }

    const snapshot = this.#captureAuthorityTransaction();
    try {
      const result = this.#executeUnseenCommand(envelope);
      this.#appendEventAndOutbox(envelope, result);
      const frozenResult = immutableCopy(result);
      const execution: StoredCommandExecution = {
        fingerprint,
        outcome: { kind: "success", result: frozenResult },
      };
      this.#commandById.set(envelope.command_id, execution);
      this.#commandByIdempotencyKey.set(envelope.idempotency_key, execution);
      return frozenResult;
    } catch (error) {
      if (this.#isDurableConflict(envelope, error)) {
        try {
          this.#appendConflictEventAndOutbox(envelope, error);
        } catch (recordError) {
          this.#restoreAuthorityTransaction(snapshot);
          throw recordError;
        }
        const execution: StoredCommandExecution = {
          fingerprint,
          outcome: {
            kind: "failure",
            code: error.code,
            message: error.message,
          },
        };
        this.#commandById.set(envelope.command_id, execution);
        this.#commandByIdempotencyKey.set(envelope.idempotency_key, execution);
        throw new ChangeControlError(error.code, error.message);
      }
      this.#restoreAuthorityTransaction(snapshot);
      throw error;
    }
  }

  #replayStoredExecution(
    execution: StoredCommandExecution,
  ): ChangeControlCommandResult {
    if (execution.outcome.kind === "success") {
      return execution.outcome.result;
    }
    throw new ChangeControlError(
      execution.outcome.code,
      execution.outcome.message,
    );
  }

  #executeUnseenCommand(
    envelope: PetraCommandEnvelopeRecord,
  ): ChangeControlCommandResult {
    switch (envelope.command.command_name) {
      case "SubmitChangeSet":
        return this.#submitChangeSet(envelope, envelope.command.change_set);
      case "RecordApproval":
        return this.#recordApproval(envelope, envelope.command.approval);
      case "ApplyChangeSet":
        return this.#applyChangeSet(envelope, envelope.command);
    }
  }

  #submitChangeSet(
    envelope: PetraCommandEnvelopeRecord,
    changeSet: PetraChangeSetRecord,
  ): ChangeControlCommandResult {
    if (changeSet.revision !== 1 || changeSet.state !== "submitted") {
      throw new ChangeControlError(
        "CHANGE_SET_NOT_SUBMITTED",
        "The first ChangeSet contract accepts only submitted revision 1 proposals.",
      );
    }
    if (this.#changeSets.has(changeSet.change_set_id)) {
      throw new ChangeControlError(
        "CHANGE_SET_ID_REUSED",
        `ChangeSet ID ${changeSet.change_set_id} is already registered.`,
      );
    }
    if (
      changeSet.content.project_id !== envelope.project_id ||
      envelope.project_id.length === 0
    ) {
      throw new ChangeControlError(
        "CHANGE_SET_PROJECT_MISMATCH",
        "The command and ChangeSet must name the same Project.",
      );
    }
    if (!actorMatches(changeSet.content.proposed_by, envelope.actor)) {
      throw new ChangeControlError(
        "CHANGE_SET_PROPOSER_MISMATCH",
        "The submitting command actor must be the recorded ChangeSet proposer.",
      );
    }
    if (canonicalHash(changeSet.content) !== changeSet.content_hash) {
      throw new ChangeControlError(
        "CHANGE_SET_HASH_MISMATCH",
        "The ChangeSet content does not match its RFC 8785 content hash.",
      );
    }
    if (changeSet.content.risk_tier !== "R2") {
      throw new ChangeControlError(
        "CHANGE_SET_RISK_TIER_INVALID",
        "Scientific authority promotion must be classified as R2.",
      );
    }

    if (this.#isReversalChangeSet(changeSet)) {
      if (
        changeSet.schema_version !== "1.1.0" ||
        changeSet.content.compensates_change_set_id === undefined
      ) {
        throw new ChangeControlError(
          "CHANGE_SET_COMPENSATION_REQUIRED",
          "A reversal must use ChangeSet 1.1 and name the applied ChangeSet it compensates.",
        );
      }
      const pair = this.#reversalPair(changeSet);
      this.#validateReversalTargets(changeSet, pair.claim, pair.assertion);
    } else {
      if (
        "compensates_change_set_id" in changeSet.content &&
        changeSet.content.compensates_change_set_id !== undefined
      ) {
        throw new ChangeControlError(
          "CHANGE_SET_COMPENSATION_INVALID",
          "A promotion cannot name a compensated ChangeSet.",
        );
      }
      const pair = this.#promotionPair(changeSet);
      this.#validatePromotionTargets(changeSet, pair.claim, pair.assertion);
    }

    const registered = immutableCopy(changeSet);
    this.#changeSets.set(changeSet.change_set_id, registered);
    this.#changeSetStates.set(changeSet.change_set_id, "submitted");
    return {
      outcome: "submitted",
      command_id: envelope.command_id,
      change_set_id: changeSet.change_set_id,
      change_set_state: "submitted",
    };
  }

  #recordApproval(
    envelope: PetraCommandEnvelopeRecord,
    approval: PetraApproval,
  ): ChangeControlCommandResult {
    if (approval.revision !== 1) {
      throw new ChangeControlError(
        "APPROVAL_SUBJECT_MISMATCH",
        "The first Approval contract accepts only revision 1 decisions.",
      );
    }
    if (this.#approvals.has(approval.approval_id)) {
      throw new ChangeControlError(
        "APPROVAL_ID_REUSED",
        `Approval ID ${approval.approval_id} is already registered.`,
      );
    }
    if (
      approval.decided_by.actor_kind !== "human" ||
      envelope.actor.actor_kind !== "human" ||
      !actorMatches(approval.decided_by, envelope.actor)
    ) {
      throw new ChangeControlError(
        "APPROVAL_ACTOR_MISMATCH",
        "The command actor must be the human who made the Approval decision.",
      );
    }
    const changeSet = this.#changeSets.get(approval.subject.change_set_id);
    if (changeSet === undefined) {
      throw new ChangeControlError(
        "CHANGE_SET_NOT_REGISTERED",
        `ChangeSet ${approval.subject.change_set_id} is not registered.`,
      );
    }
    if (this.#changeSetStates.get(changeSet.change_set_id) !== "submitted") {
      throw new ChangeControlError(
        "CHANGE_SET_NOT_SUBMITTED",
        "Only a submitted ChangeSet without a prior decision may receive an Approval.",
      );
    }
    if (
      envelope.project_id !== changeSet.content.project_id ||
      approval.subject.change_set_revision !== changeSet.revision ||
      approval.subject.change_set_content_hash !== changeSet.content_hash
    ) {
      throw new ChangeControlError(
        "APPROVAL_SUBJECT_MISMATCH",
        "Approval must bind the exact registered ChangeSet project, revision, and content hash.",
      );
    }

    const registered = immutableCopy(approval);
    this.#approvals.set(approval.approval_id, registered);
    const state = approval.decision === "approved" ? "approved" : "rejected";
    this.#changeSetStates.set(changeSet.change_set_id, state);
    return {
      outcome: "approval_recorded",
      command_id: envelope.command_id,
      change_set_id: changeSet.change_set_id,
      change_set_state: state,
      approval_id: approval.approval_id,
    };
  }

  #applyChangeSet(
    envelope: PetraCommandEnvelopeRecord,
    command: Extract<PetraCommandRecord, { command_name: "ApplyChangeSet" }>,
  ): ChangeControlCommandResult {
    const changeSet = this.#changeSets.get(command.change_set_id);
    if (changeSet === undefined) {
      throw new ChangeControlError(
        "CHANGE_SET_NOT_REGISTERED",
        `ChangeSet ${command.change_set_id} is not registered.`,
      );
    }
    if (this.#appliedChangeSets.has(changeSet.change_set_id)) {
      throw new ChangeControlError(
        "CHANGE_SET_ALREADY_APPLIED",
        `ChangeSet ${changeSet.change_set_id} has already been applied.`,
      );
    }
    if (
      envelope.project_id !== changeSet.content.project_id ||
      command.change_set_revision !== changeSet.revision ||
      command.change_set_content_hash !== changeSet.content_hash ||
      canonicalHash(changeSet.content) !== changeSet.content_hash
    ) {
      throw new ChangeControlError(
        "CHANGE_SET_HASH_MISMATCH",
        "ApplyChangeSet must name the exact registered ChangeSet revision and content hash.",
      );
    }
    const approval = this.#approvals.get(command.approval_id);
    if (
      approval === undefined ||
      approval.revision !== command.approval_revision
    ) {
      throw new ChangeControlError(
        "APPROVAL_NOT_REGISTERED",
        "ApplyChangeSet must name an exact registered Approval revision.",
      );
    }
    if (
      approval.subject.change_set_id !== changeSet.change_set_id ||
      approval.subject.change_set_revision !== changeSet.revision ||
      approval.subject.change_set_content_hash !== changeSet.content_hash
    ) {
      throw new ChangeControlError(
        "APPROVAL_SUBJECT_MISMATCH",
        "The Approval does not bind the ChangeSet being applied.",
      );
    }
    if (approval.decision !== "approved") {
      throw new ChangeControlError(
        "APPROVAL_NOT_GRANTED",
        "A rejected ChangeSet cannot be applied.",
      );
    }
    if (approval.conditions.length > 0) {
      throw new ChangeControlError(
        "APPROVAL_CONDITIONS_UNSATISFIED",
        "Conditional approvals require explicit condition-satisfaction evidence before application.",
      );
    }
    if (this.#changeSetStates.get(changeSet.change_set_id) !== "approved") {
      throw new ChangeControlError(
        "CHANGE_SET_STATE_INVALID",
        "ApplyChangeSet requires the ChangeSet to be in its derived approved state.",
      );
    }
    if (
      envelope.actor.actor_kind !== "human" ||
      !actorMatches(approval.decided_by, envelope.actor)
    ) {
      throw new ChangeControlError(
        "APPROVAL_ACTOR_MISMATCH",
        "The applying actor must be the human bound to this initial Approval path.",
      );
    }

    if (this.#isReversalChangeSet(changeSet)) {
      return this.#applyReversal(envelope, changeSet, approval);
    }

    const pair = this.#promotionPair(changeSet);
    let currentClaim: DeepReadonly<PetraClaim>;
    let currentAssertion: DeepReadonly<PetraAssertion>;
    try {
      ({ claim: currentClaim, assertion: currentAssertion } =
        this.#validatePromotionTargets(changeSet, pair.claim, pair.assertion));
    } catch (error) {
      if (
        error instanceof ChangeControlError &&
        (error.code === "STALE_TARGET_REVISION" ||
          error.code === "TARGET_AUTHORITY_MISMATCH")
      ) {
        this.#changeSetStates.set(changeSet.change_set_id, "conflicted");
      }
      throw error;
    }

    const promotion = {
      zone: "trusted" as const,
      review_state: "human_accepted" as const,
      promotion: {
        change_set_id: changeSet.change_set_id,
        approval_basis: {
          approval_kind: "human" as const,
          approval_id: approval.approval_id,
          approved_by: structuredClone(approval.decided_by),
        },
        applied_at: envelope.submitted_at,
      },
    };
    const promotedClaim = structuredClone(currentClaim) as PetraClaim;
    promotedClaim.revision += 1;
    promotedClaim.authority = structuredClone(promotion);
    const promotedAssertion = structuredClone(
      currentAssertion,
    ) as PetraAssertion;
    promotedAssertion.revision += 1;
    promotedAssertion.authority = structuredClone(promotion);
    const storedClaim = immutableCopy(promotedClaim);
    const storedAssertion = immutableCopy(promotedAssertion);

    this.#claims.set(promotedClaim.claim_id, storedClaim);
    this.#assertions.set(promotedAssertion.assertion_id, storedAssertion);
    this.#claimHistory
      .get(promotedClaim.claim_id)
      ?.set(promotedClaim.revision, storedClaim);
    this.#assertionHistory
      .get(promotedAssertion.assertion_id)
      ?.set(promotedAssertion.revision, storedAssertion);
    this.#appliedChangeSets.add(changeSet.change_set_id);
    this.#changeSetStates.set(changeSet.change_set_id, "applied");

    return {
      outcome: "applied",
      command_id: envelope.command_id,
      change_set_id: changeSet.change_set_id,
      change_set_state: "applied",
      approval_id: approval.approval_id,
      claim_id: promotedClaim.claim_id,
      claim_revision: promotedClaim.revision,
      assertion_id: promotedAssertion.assertion_id,
      assertion_revision: promotedAssertion.revision,
      applied_at: envelope.submitted_at,
    };
  }

  #applyReversal(
    envelope: PetraCommandEnvelopeRecord,
    changeSet: DeepReadonly<PetraChangeSetRecord>,
    approval: DeepReadonly<PetraApproval>,
  ): ChangeControlCommandResult {
    if (
      changeSet.schema_version !== "1.1.0" ||
      changeSet.content.compensates_change_set_id === undefined
    ) {
      throw new ChangeControlError(
        "CHANGE_SET_COMPENSATION_REQUIRED",
        "A reversal must name the applied ChangeSet it compensates.",
      );
    }
    const pair = this.#reversalPair(changeSet);
    let currentClaim: DeepReadonly<PetraClaim>;
    let currentAssertion: DeepReadonly<PetraAssertion>;
    try {
      ({ claim: currentClaim, assertion: currentAssertion } =
        this.#validateReversalTargets(changeSet, pair.claim, pair.assertion));
    } catch (error) {
      if (
        error instanceof ChangeControlError &&
        (error.code === "STALE_TARGET_REVISION" ||
          error.code === "TARGET_AUTHORITY_MISMATCH")
      ) {
        this.#changeSetStates.set(changeSet.change_set_id, "conflicted");
      }
      throw error;
    }

    const rejectedAuthority = {
      zone: "quarantine" as const,
      review_state: "human_rejected" as const,
    };
    const rejectedClaim = structuredClone(currentClaim) as PetraClaim;
    rejectedClaim.revision += 1;
    rejectedClaim.authority = structuredClone(rejectedAuthority);
    const rejectedAssertion = structuredClone(
      currentAssertion,
    ) as PetraAssertion;
    rejectedAssertion.revision += 1;
    rejectedAssertion.authority = structuredClone(rejectedAuthority);
    const storedClaim = immutableCopy(rejectedClaim);
    const storedAssertion = immutableCopy(rejectedAssertion);

    this.#claims.set(rejectedClaim.claim_id, storedClaim);
    this.#assertions.set(rejectedAssertion.assertion_id, storedAssertion);
    this.#claimHistory
      .get(rejectedClaim.claim_id)
      ?.set(rejectedClaim.revision, storedClaim);
    this.#assertionHistory
      .get(rejectedAssertion.assertion_id)
      ?.set(rejectedAssertion.revision, storedAssertion);
    this.#appliedChangeSets.add(changeSet.change_set_id);
    this.#changeSetStates.set(changeSet.change_set_id, "applied");
    this.#changeSetStates.set(
      changeSet.content.compensates_change_set_id,
      "reverted",
    );

    return {
      outcome: "reverted",
      command_id: envelope.command_id,
      change_set_id: changeSet.change_set_id,
      change_set_state: "applied",
      compensates_change_set_id: changeSet.content.compensates_change_set_id,
      approval_id: approval.approval_id,
      claim_id: rejectedClaim.claim_id,
      claim_revision: rejectedClaim.revision,
      assertion_id: rejectedAssertion.assertion_id,
      assertion_revision: rejectedAssertion.revision,
      applied_at: envelope.submitted_at,
    };
  }

  #appendEventAndOutbox(
    envelope: PetraCommandEnvelopeRecord,
    result: ChangeControlCommandResult,
  ): void {
    let event: PetraDomainEventRecord["event"] | undefined;
    let schemaVersion: PetraDomainEventRecord["schema_version"] = "1.0.0";
    let targets: PetraOutboxRecordRecord["target"][] = ["interface_authority"];
    switch (result.outcome) {
      case "submitted": {
        const changeSet = this.#changeSets.get(result.change_set_id);
        if (changeSet === undefined) {
          throw new Error(
            "Submitted ChangeSet disappeared before event append.",
          );
        }
        event = {
          event_type: "change_set.submitted",
          payload: { change_set: structuredClone(changeSet) },
        } as PetraDomainEventRecord["event"];
        schemaVersion = changeSet.schema_version;
        break;
      }
      case "approval_recorded": {
        const approval = this.#approvals.get(result.approval_id);
        if (approval === undefined) {
          throw new Error("Recorded Approval disappeared before event append.");
        }
        const changeSet = this.#changeSets.get(result.change_set_id);
        if (changeSet === undefined) {
          throw new Error(
            "Approved ChangeSet disappeared before event append.",
          );
        }
        event = {
          event_type: "approval.recorded",
          payload: {
            approval: structuredClone(approval) as PetraApproval,
            derived_change_set_state: result.change_set_state,
          },
        };
        schemaVersion = changeSet.schema_version;
        break;
      }
      case "applied": {
        const changeSet = this.#changeSets.get(result.change_set_id);
        const approval = this.#approvals.get(result.approval_id);
        const claim = this.#claims.get(result.claim_id);
        const assertion = this.#assertions.get(result.assertion_id);
        if (
          changeSet === undefined ||
          approval === undefined ||
          claim === undefined ||
          assertion === undefined
        ) {
          throw new Error(
            "Applied authority state disappeared before event append.",
          );
        }
        event = {
          event_type: "change_set.applied",
          payload: {
            change_set_id: changeSet.change_set_id,
            change_set_revision: 1,
            change_set_content_hash: changeSet.content_hash,
            approval_id: approval.approval_id,
            approval_revision: 1,
            prior_claim_revision: result.claim_revision - 1,
            claim: structuredClone(claim) as PetraClaim,
            prior_assertion_revision: result.assertion_revision - 1,
            assertion: structuredClone(assertion) as PetraAssertion,
          },
        };
        schemaVersion = changeSet.schema_version;
        targets = ["neo4j_graph", "interface_authority"];
        break;
      }
      case "reverted": {
        const changeSet = this.#changeSets.get(result.change_set_id);
        const approval = this.#approvals.get(result.approval_id);
        const claim = this.#claims.get(result.claim_id);
        const assertion = this.#assertions.get(result.assertion_id);
        if (
          changeSet === undefined ||
          approval === undefined ||
          claim === undefined ||
          assertion === undefined
        ) {
          throw new Error(
            "Reverted authority state disappeared before event append.",
          );
        }
        event = {
          event_type: "change_set.reverted",
          payload: {
            change_set_id: changeSet.change_set_id,
            change_set_revision: 1,
            change_set_content_hash: changeSet.content_hash,
            compensates_change_set_id: result.compensates_change_set_id,
            approval_id: approval.approval_id,
            approval_revision: 1,
            prior_claim_revision: result.claim_revision - 1,
            claim: structuredClone(claim) as PetraClaim,
            prior_assertion_revision: result.assertion_revision - 1,
            assertion: structuredClone(assertion) as PetraAssertion,
          },
        };
        schemaVersion = "1.1.0";
        targets = ["neo4j_graph", "interface_authority"];
        break;
      }
    }
    if (event === undefined) {
      throw new Error("Command result did not produce a domain event.");
    }
    this.#appendDomainEvent(envelope, event, targets, schemaVersion);
  }

  #isDurableConflict(
    envelope: PetraCommandEnvelopeRecord,
    error: unknown,
  ): error is ChangeControlError {
    return (
      envelope.command.command_name === "ApplyChangeSet" &&
      error instanceof ChangeControlError &&
      (error.code === "STALE_TARGET_REVISION" ||
        error.code === "TARGET_AUTHORITY_MISMATCH") &&
      this.#changeSetStates.get(envelope.command.change_set_id) === "conflicted"
    );
  }

  #appendConflictEventAndOutbox(
    envelope: PetraCommandEnvelopeRecord,
    error: ChangeControlError,
  ): void {
    if (
      envelope.command.command_name !== "ApplyChangeSet" ||
      (error.code !== "STALE_TARGET_REVISION" &&
        error.code !== "TARGET_AUTHORITY_MISMATCH")
    ) {
      throw new Error("Only a detected application conflict may be recorded.");
    }
    const changeSet = this.#changeSets.get(envelope.command.change_set_id);
    if (changeSet === undefined) {
      throw new Error("Conflicted ChangeSet disappeared before event append.");
    }
    const reversal = this.#isReversalChangeSet(changeSet);
    const pair = reversal
      ? this.#reversalPair(changeSet)
      : this.#promotionPair(changeSet);
    const claim = this.#claims.get(pair.claim.target_id);
    const assertion = this.#assertions.get(pair.assertion.target_id);
    if (claim === undefined || assertion === undefined) {
      throw new Error("A conflicted target disappeared before event append.");
    }
    this.#appendDomainEvent(
      envelope,
      reversal
        ? {
            event_type: "change_set.reversal_conflicted",
            payload: {
              change_set_id: changeSet.change_set_id,
              change_set_revision: 1,
              change_set_content_hash: changeSet.content_hash,
              compensates_change_set_id:
                changeSet.schema_version === "1.1.0" &&
                changeSet.content.compensates_change_set_id !== undefined
                  ? changeSet.content.compensates_change_set_id
                  : changeSet.change_set_id,
              conflict_code: error.code,
              targets: [
                {
                  target_kind: "claim",
                  target_id: claim.claim_id,
                  expected_revision: pair.claim.base_revision,
                  actual_revision: claim.revision,
                  expected_zone: "trusted",
                  actual_zone: claim.authority.zone,
                },
                {
                  target_kind: "assertion",
                  target_id: assertion.assertion_id,
                  expected_revision: pair.assertion.base_revision,
                  actual_revision: assertion.revision,
                  expected_zone: "trusted",
                  actual_zone: assertion.authority.zone,
                },
              ],
            },
          }
        : {
            event_type: "change_set.conflicted",
            payload: {
              change_set_id: changeSet.change_set_id,
              change_set_revision: 1,
              change_set_content_hash: changeSet.content_hash,
              conflict_code: error.code,
              targets: [
                {
                  target_kind: "claim",
                  target_id: claim.claim_id,
                  expected_revision: pair.claim.base_revision,
                  actual_revision: claim.revision,
                  expected_zone: "quarantine",
                  actual_zone: claim.authority.zone,
                },
                {
                  target_kind: "assertion",
                  target_id: assertion.assertion_id,
                  expected_revision: pair.assertion.base_revision,
                  actual_revision: assertion.revision,
                  expected_zone: "quarantine",
                  actual_zone: assertion.authority.zone,
                },
              ],
            },
          },
      ["interface_authority"],
      reversal ? "1.1.0" : "1.0.0",
    );
  }

  #appendDomainEvent(
    envelope: PetraCommandEnvelopeRecord,
    event: PetraDomainEventRecord["event"],
    targets: readonly PetraOutboxRecordRecord["target"][],
    schemaVersion: PetraDomainEventRecord["schema_version"],
  ): void {
    const eventId = this.#domainRecordFactory.nextId("event");
    if (petraIdKind(eventId) !== "event") {
      throw new Error("DomainRecordFactory returned a non-event ID.");
    }
    const recordedAt = this.#domainRecordFactory.now();
    const eventPosition = this.#eventPosition + 1;
    const streamRevision =
      (this.#projectStreamRevisions.get(envelope.project_id) ?? 0) + 1;
    const domainEvent = {
      schema_name: "petra.domain-event",
      schema_version: schemaVersion,
      event_id: eventId,
      event_position: eventPosition,
      stream_type: "project",
      stream_id: envelope.project_id,
      stream_revision: streamRevision,
      project_id: envelope.project_id,
      actor: structuredClone(envelope.actor),
      occurred_at: envelope.submitted_at,
      recorded_at: recordedAt,
      correlation_id: envelope.correlation_id,
      causation_id: envelope.command_id,
      command_id: envelope.command_id,
      idempotency_key: envelope.idempotency_key,
      capability_grant_id: envelope.capability_grant_id,
      event: structuredClone(event),
    } as PetraDomainEventRecord;
    const storedEvent = immutableCopy(domainEvent);
    const nextSequences = new Map(this.#targetSequences);
    const pendingOutbox = targets.map((target, index) => {
      const sequenceKey = `${target}:${envelope.project_id}`;
      const targetSequence = (nextSequences.get(sequenceKey) ?? 0) + 1;
      nextSequences.set(sequenceKey, targetSequence);
      const outboxId = this.#domainRecordFactory.nextId("outbox");
      if (petraIdKind(outboxId) !== "outbox") {
        throw new Error("DomainRecordFactory returned a non-outbox ID.");
      }
      const outboxRecord = {
        schema_name: "petra.outbox-record",
        schema_version: schemaVersion,
        outbox_id: outboxId,
        outbox_position: this.#outboxPosition + index + 1,
        target,
        target_sequence: targetSequence,
        partition_key: envelope.project_id,
        deduplication_key: `${target}:${eventId}`,
        enqueued_at: recordedAt,
        message: {
          message_kind: "domain_event",
          event: structuredClone(domainEvent),
        },
      } as PetraOutboxRecordRecord;
      return immutableCopy(outboxRecord);
    });

    this.#eventPosition = eventPosition;
    this.#outboxPosition += pendingOutbox.length;
    this.#projectStreamRevisions.set(envelope.project_id, streamRevision);
    replaceMap(this.#targetSequences, nextSequences);
    this.#events.push(storedEvent);
    this.#outbox.push(...pendingOutbox);
  }

  #captureAuthorityTransaction(): AuthorityTransactionSnapshot {
    return {
      claims: new Map(this.#claims),
      assertions: new Map(this.#assertions),
      claimHistory: new Map(
        [...this.#claimHistory].map(([id, history]) => [id, new Map(history)]),
      ),
      assertionHistory: new Map(
        [...this.#assertionHistory].map(([id, history]) => [
          id,
          new Map(history),
        ]),
      ),
      changeSets: new Map(this.#changeSets),
      changeSetStates: new Map(this.#changeSetStates),
      approvals: new Map(this.#approvals),
      appliedChangeSets: new Set(this.#appliedChangeSets),
      eventCount: this.#events.length,
      outboxCount: this.#outbox.length,
      eventPosition: this.#eventPosition,
      outboxPosition: this.#outboxPosition,
      projectStreamRevisions: new Map(this.#projectStreamRevisions),
      targetSequences: new Map(this.#targetSequences),
    };
  }

  #restoreAuthorityTransaction(snapshot: AuthorityTransactionSnapshot): void {
    replaceMap(this.#claims, snapshot.claims);
    replaceMap(this.#assertions, snapshot.assertions);
    replaceMap(this.#claimHistory, snapshot.claimHistory);
    replaceMap(this.#assertionHistory, snapshot.assertionHistory);
    replaceMap(this.#changeSets, snapshot.changeSets);
    replaceMap(this.#changeSetStates, snapshot.changeSetStates);
    replaceMap(this.#approvals, snapshot.approvals);
    this.#appliedChangeSets.clear();
    for (const changeSetId of snapshot.appliedChangeSets) {
      this.#appliedChangeSets.add(changeSetId);
    }
    this.#events.length = snapshot.eventCount;
    this.#outbox.length = snapshot.outboxCount;
    this.#eventPosition = snapshot.eventPosition;
    this.#outboxPosition = snapshot.outboxPosition;
    replaceMap(this.#projectStreamRevisions, snapshot.projectStreamRevisions);
    replaceMap(this.#targetSequences, snapshot.targetSequences);
  }

  #isReversalChangeSet(changeSet: DeepReadonly<PetraChangeSetRecord>): boolean {
    return this.#changeOperations(changeSet).some(
      (operation) =>
        operation.operation_kind === "retract_claim" ||
        operation.operation_kind === "retract_assertion",
    );
  }

  #promotionPair(changeSet: DeepReadonly<PetraChangeSetRecord>): {
    claim: DeepReadonly<PromoteClaimChange>;
    assertion: DeepReadonly<PromoteAssertionChange>;
  } {
    const operations = this.#changeOperations(changeSet);
    const claimOperations = operations.filter(
      (operation): operation is DeepReadonly<PromoteClaimChange> =>
        operation.operation_kind === "promote_claim",
    );
    const assertionOperations = operations.filter(
      (operation): operation is DeepReadonly<PromoteAssertionChange> =>
        operation.operation_kind === "promote_assertion",
    );
    const claim = claimOperations[0];
    const assertion = assertionOperations[0];
    if (
      operations.length !== 2 ||
      claimOperations.length !== 1 ||
      assertionOperations.length !== 1 ||
      claim === undefined ||
      assertion === undefined
    ) {
      throw new ChangeControlError(
        "CHANGE_SET_OPERATION_SET_INVALID",
        "The first scientific promotion ChangeSet must contain exactly one Claim and one Assertion operation.",
      );
    }
    return {
      claim,
      assertion,
    };
  }

  #reversalPair(changeSet: DeepReadonly<PetraChangeSetRecord>): {
    claim: DeepReadonly<RetractClaimChange>;
    assertion: DeepReadonly<RetractAssertionChange>;
  } {
    const operations = this.#changeOperations(changeSet);
    const claimOperations = operations.filter(
      (operation): operation is DeepReadonly<RetractClaimChange> =>
        operation.operation_kind === "retract_claim",
    );
    const assertionOperations = operations.filter(
      (operation): operation is DeepReadonly<RetractAssertionChange> =>
        operation.operation_kind === "retract_assertion",
    );
    const claim = claimOperations[0];
    const assertion = assertionOperations[0];
    if (
      operations.length !== 2 ||
      claimOperations.length !== 1 ||
      assertionOperations.length !== 1 ||
      claim === undefined ||
      assertion === undefined
    ) {
      throw new ChangeControlError(
        "CHANGE_SET_OPERATION_SET_INVALID",
        "A scientific authority reversal must contain exactly one Claim and one Assertion retraction.",
      );
    }
    return {
      claim,
      assertion,
    };
  }

  #changeOperations(
    changeSet: DeepReadonly<PetraChangeSetRecord>,
  ): readonly DeepReadonly<ChangeOperation>[] {
    // JSON Schema conditionals preserve the runtime operation union, but the
    // generated 1.1 type intersects it with `unknown[]`. Normalize that
    // generator artifact once at this contract boundary.
    return changeSet.content
      .operations as readonly DeepReadonly<ChangeOperation>[];
  }

  #validateReversalTargets(
    changeSet: DeepReadonly<PetraChangeSetRecord>,
    claimOperation: DeepReadonly<RetractClaimChange>,
    assertionOperation: DeepReadonly<RetractAssertionChange>,
  ): {
    claim: DeepReadonly<PetraClaim>;
    assertion: DeepReadonly<PetraAssertion>;
  } {
    if (
      changeSet.schema_version !== "1.1.0" ||
      changeSet.content.compensates_change_set_id === undefined
    ) {
      throw new ChangeControlError(
        "CHANGE_SET_COMPENSATION_REQUIRED",
        "A reversal must name the promotion ChangeSet it compensates.",
      );
    }
    const compensatedId = changeSet.content.compensates_change_set_id;
    const compensated = this.#changeSets.get(compensatedId);
    if (compensated === undefined || this.#isReversalChangeSet(compensated)) {
      throw new ChangeControlError(
        "CHANGE_SET_COMPENSATION_INVALID",
        "The compensated ChangeSet must be a registered promotion.",
      );
    }
    const compensatedState = this.#changeSetStates.get(compensatedId);
    if (compensatedState === "reverted") {
      throw new ChangeControlError(
        "CHANGE_SET_ALREADY_REVERTED",
        `ChangeSet ${compensatedId} has already been reversed.`,
      );
    }
    if (compensatedState !== "applied") {
      throw new ChangeControlError(
        "CHANGE_SET_COMPENSATION_INVALID",
        "Only an applied promotion ChangeSet may be reversed.",
      );
    }
    const promoted = this.#promotionPair(compensated);
    if (
      promoted.claim.target_id !== claimOperation.target_id ||
      promoted.assertion.target_id !== assertionOperation.target_id
    ) {
      throw new ChangeControlError(
        "CHANGE_SET_COMPENSATION_INVALID",
        "A reversal must target the exact Claim and Assertion promoted by the compensated ChangeSet.",
      );
    }

    const claim = this.#claims.get(claimOperation.target_id);
    const assertion = this.#assertions.get(assertionOperation.target_id);
    if (claim === undefined || assertion === undefined) {
      throw new ChangeControlError(
        "CHANGE_SET_TARGET_MISMATCH",
        "Every reversal target must exist in current scientific authority.",
      );
    }
    if (
      claim.revision !== claimOperation.base_revision ||
      assertion.revision !== assertionOperation.base_revision
    ) {
      throw new ChangeControlError(
        "STALE_TARGET_REVISION",
        "At least one reversal target has changed since the impact preview.",
      );
    }
    if (
      claim.authority.zone !== "trusted" ||
      assertion.authority.zone !== "trusted" ||
      claim.authority.review_state !== "human_accepted" ||
      assertion.authority.review_state !== "human_accepted" ||
      claim.authority.promotion.change_set_id !== compensatedId ||
      assertion.authority.promotion.change_set_id !== compensatedId ||
      claimOperation.before.zone !== "trusted" ||
      claimOperation.before.review_state !== "human_accepted" ||
      assertionOperation.before.zone !== "trusted" ||
      assertionOperation.before.review_state !== "human_accepted" ||
      claimOperation.after.zone !== "quarantine" ||
      claimOperation.after.review_state !== "human_rejected" ||
      assertionOperation.after.zone !== "quarantine" ||
      assertionOperation.after.review_state !== "human_rejected"
    ) {
      throw new ChangeControlError(
        "TARGET_AUTHORITY_MISMATCH",
        "The targets are no longer the trusted pair created by the compensated promotion.",
      );
    }
    if (
      assertion.predicate !== "ASSERTS" ||
      assertion.object.object_kind !== "entity" ||
      assertion.object.entity_id !== claim.claim_id
    ) {
      throw new ChangeControlError(
        "CHANGE_SET_TARGET_MISMATCH",
        "The reversal pair must contain a Claim and its corresponding ASSERTS Assertion.",
      );
    }
    const affected = new Set(changeSet.content.impact.affected_object_ids);
    if (
      affected.size !== 2 ||
      !affected.has(claim.claim_id) ||
      !affected.has(assertion.assertion_id)
    ) {
      throw new ChangeControlError(
        "CHANGE_SET_TARGET_MISMATCH",
        "The reversal impact preview must name exactly the Claim and Assertion being retracted.",
      );
    }
    return { claim, assertion };
  }

  #validatePromotionTargets(
    changeSet: DeepReadonly<PetraChangeSetRecord>,
    claimOperation: DeepReadonly<PromoteClaimChange>,
    assertionOperation: DeepReadonly<PromoteAssertionChange>,
  ): {
    claim: DeepReadonly<PetraClaim>;
    assertion: DeepReadonly<PetraAssertion>;
  } {
    const claim = this.#claims.get(claimOperation.target_id);
    const assertion = this.#assertions.get(assertionOperation.target_id);
    if (claim === undefined || assertion === undefined) {
      throw new ChangeControlError(
        "CHANGE_SET_TARGET_MISMATCH",
        "Every ChangeSet promotion target must already exist in quarantine.",
      );
    }
    if (
      claim.revision !== claimOperation.base_revision ||
      assertion.revision !== assertionOperation.base_revision
    ) {
      throw new ChangeControlError(
        "STALE_TARGET_REVISION",
        "At least one ChangeSet target has changed since the impact preview.",
      );
    }
    if (
      claim.authority.zone !== "quarantine" ||
      assertion.authority.zone !== "quarantine" ||
      claim.authority.review_state !== claimOperation.before.review_state ||
      assertion.authority.review_state !==
        assertionOperation.before.review_state
    ) {
      throw new ChangeControlError(
        "TARGET_AUTHORITY_MISMATCH",
        "The target authority state no longer matches the ChangeSet before-state.",
      );
    }
    if (
      assertion.predicate !== "ASSERTS" ||
      assertion.object.object_kind !== "entity" ||
      assertion.object.entity_id !== claim.claim_id
    ) {
      throw new ChangeControlError(
        "CHANGE_SET_TARGET_MISMATCH",
        "The promotion pair must contain a Claim and its corresponding ASSERTS Assertion.",
      );
    }
    const affected = new Set(changeSet.content.impact.affected_object_ids);
    if (
      affected.size !== 2 ||
      !affected.has(claim.claim_id) ||
      !affected.has(assertion.assertion_id)
    ) {
      throw new ChangeControlError(
        "CHANGE_SET_TARGET_MISMATCH",
        "The impact preview must name exactly the Claim and Assertion changed by this ChangeSet.",
      );
    }
    return { claim, assertion };
  }
}
