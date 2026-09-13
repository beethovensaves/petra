# UX-REQ-012 frozen Review candidate-correction integration

Status: bounded Wave 4 human Claim-text correction integration complete; later
Review operations and the cumulative Wave 4 proof remain open
Date: 2026-09-12
Design boundary: `UX-DESIGN-FREEZE-01`
Backend basis: `b6f61943046d11ec44454d9c53d514f5d81b3c37`

## Result

The production Review detail route now exposes **Edit candidate** for the
single-member scientific Review shape whose authenticated 1.2 read supplies one
exact WorkingCandidate, one exact WorkingRelationship, the member identity, and
the exact open ReviewSession lifecycle. A 1.2 read with a non-open lifecycle
shows the control as unavailable; an older read without exact lifecycle and
working bindings does not expose it. The browser does not infer correction
eligibility or authorization from validation, status, candidate text, or
presentation state.

The edit request contains only a caller-owned command identity and idempotency
key; the exact server-supplied ReviewSession, member, WorkingCandidate, and
WorkingRelationship references; and the human-edited canonical Claim text. It
contains no browser-composed Claim scope, basis, authorship, producer, task,
input snapshot, provenance, qualification, validation, lineage, timestamp, or
hash. `ReviewCandidateCorrectionClient.correctFromHumanEdit` validates the
compact request and accepts a response only when its registered records and
resulting identities match the request and each other.

The workbench uses a bundled browser validator for only the five response
contracts consumed by this client. The Vite alias affects the browser build
only; server and package consumers retain the filesystem-backed canonical
registry. The client and validator are loaded when the command first runs, so
the production route does not put the validation bundle on its initial path.

## Interaction and recovery

The candidate editor is an in-place disclosure inside the frozen Candidate
position. Its draft text, open or closed state, and focus are React-local and
create no durable record before submission. Opening focuses the Claim field;
closing returns focus to **Edit candidate** without discarding the draft.

Submitting a changed, nonblank Claim of at most 20000 characters creates one
exact request. While it is pending, the editor is locked, the loaded comparison
remains visible, and other Review commands cannot start. A confirmed matching
result triggers revalidation of the authenticated Review loader. A new result
is labeled **Working correction confirmed**; an idempotent replay is labeled
**Exact correction result recovered** and says that the command was not applied
again. Both states say that correction is not approval, rejection, application,
validation success, or domain authority.

Network and service uncertainty retains the exact request and locks the draft;
**Retry exact correction** resends that same command, idempotency key,
references, and text. An invalid or identity-mismatched success response is not
accepted and offers the same exact reconciliation. Stale references and reused
command or idempotency identities show no correction and require an
authenticated Review reload before a new command. Unauthorized,
unsupported-profile, and other rejected responses remain distinct and claim no
working revision, Review decision, validation result, application, or domain
change. Terminal results move focus to the corresponding status or alert.

## Frozen presentation boundary

The disclosure stays inside **Current and Candidate**, before Material
difference, Origin, Basis, Consequences, and Changes to apply. It reuses Petra's
textarea, buttons, status treatment, minimum control size, responsive stacking,
forced-color borders, and non-color labels. The textarea has a persistent label,
hint, required and error state, character limit, and a local-state explanation.
The status and alert regions remain focusable and use polite or assertive live
announcements according to outcome.

This slice changes no runtime contract, server, persistence, migration, or
backend authority. The exact counterpart's fresh PostgreSQL 18.6 evidence
through V038 remains applicable; no PostgreSQL rerun was required for this
frontend-only integration.

## Verification

All checks use the pinned Node 24.20.0 and npm 11.19.0 toolchain.

- Focused workbench typecheck and production build pass.
- Focused adapter and workbench tests cover the compact typed client, exact
  request shape without client-composed records, bundled response-contract
  validation, local disclosure and draft retention, locked uncertain request,
  new and retained success, stale, unauthorized,
  unsupported-profile, invalid-response, retry-mismatch, uncertain-result, and
  other rejected presentations.
- The complete `npm run verify` repository gate passes generated-contract and
  fixture checks, retrieval-floor checks, formatting, lint, TypeScript and
  Python typechecks, the production workbench build, and all repository test
  suites. The build retains the existing non-failing chunk-size advisory.
- Felicity review replaced wording that could imply validation remained
  untouched and removed an unsupported test-coverage claim. It also clarified
  the difference between an unavailable 1.2 control and an older read that
  cannot expose the control.

The focused tests render the disclosure and every outcome, exercise local state
transitions and exact transport delegation, and instantiate the browser schema
registry. They do not drive focus, announcements, typing, or clicks in a real
browser. Browser keyboard, focus, announcement, touch, text-scaling,
forced-colors, reduced-motion, and responsive behavior remain automation
boundaries for the cumulative Wave 4 proof.

## Remaining boundary

This slice does not add editable Claim scope or material-basis revision, Apply,
Reject, explicit separation, member recovery, scheduled validator rerun, a
second profile renderer, multi-member Review, ProjectBriefView,
CommunicationPlan, direct/model-mediated entry convergence, or the cumulative
Wave 4 runtime proof. It does not establish the Wave 4 exit trace. Wave 4
remains open.
