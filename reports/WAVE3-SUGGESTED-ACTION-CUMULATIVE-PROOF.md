# Wave 3 SuggestedAction cumulative backend proof

Status: backend cumulative lifecycle, renderer-neutral cancellation, and exact
InteractionRun replay bindings passed; frozen-interface replay closure and the
Wave 3 exit assessment remain open
Date: 2026-09-11
Backend replay predecessor: `5d9eb5270f1c1764019f80e968bc222297888e38`
Exact design counterpart: `011b9583653dfbd728672a77bb4bc6ec03329645`
Design boundary: `UX-DESIGN-FREEZE-01`

## Result

`npm run test:wave3:cumulative` now proves the mapped SuggestedAction backend
path from clean stores with one disposable PostgreSQL 18.6 database and one
SeaweedFS S3 artifact store. Flyway validates and applies all 32 migrations
through V032 before the proof starts.

The proof establishes an authenticated Project and retained inquiry result over
the existing authority repositories. It then exercises the exact
`petra.suggested-action-view@1.1.0` preview and the single
`InvokeSuggestedAction` command used by direct and conversational
presentations. Both presentations converge on one immutable invocation receipt
and one deterministic WorkUnit; no presentation-specific command or Work path
is introduced.

The action executor is paused only after canonical Work registration. While the
Work remains running, the proof starts and aborts an AG-UI delivery, verifies
that the Work remains visible and cancellable by server-owned recovery
assessment, and records an immutable connection-aborted replay attempt with:

- no authority reapplication;
- no command reexecution; and
- no durable Work cancellation.

After release, the same Work advances through `requested`, `queued`, `running`,
and `completed` revisions and returns its exact terminal GroundedResponse. The
invocation reread supplies the canonical Work and History destinations and the
then-current recovery assessment: exact-start retry and cancellation are
ineligible, while delivery reconnect, Work inspection, and result inspection
are eligible.

The proof restarts the Petra server against the retained stores and reconnects
the same InteractionRun and connection through the authenticated GET replay
boundary. The terminal response is replayed as delivery attempt two with no
provider or model request and the same result and Work identities. No prompt,
command, action input, or workflow instruction crosses that replay request.
Final persistence cardinalities are exactly one invocation receipt, one
WorkUnit, four Work revisions, and two delivery records.

## Result resolution found by the proof

The clean-start proof exposed one backend read defect in the existing exact
model-result reuse path. Grounded synthesis correctly completed the new action
Work with a canonical output manifest pointing to already retained response
bytes, but the SuggestedAction invocation reader only recognized a
GroundedResponse originally produced by that WorkUnit. The completed action
therefore appeared to have no result even though its terminal manifest named
the exact canonical output.

The reader now resolves that reuse case through the existing ledgers. It first
keeps the direct Work-owned GroundedResponse lookup. For succeeded terminal
Work without that direct record, it validates the exact canonical output
manifest, selects its required `grounded_response` result output, and resolves
one retained GroundedResponse by exact artifact hash and byte size, context
packet, evidence packet, and snapshot identity. Missing or ambiguous retained
authority fails closed. No second Work, result, History, action, or recovery
ledger was added.

The PostgreSQL regression completes an invocation Work with an exact output
manifest that reuses an existing GroundedResponse and verifies the returned
result reference, all four canonical Work revisions, and terminal recovery
eligibility.

## Renderer-neutral cancellation boundary

The existing accepted M1.7 boundary is sufficient for this SuggestedAction
family without a new authority decision. `POST /api/work-units/:runId/cancel`
is bearer-authenticated, resolves one active protocol run to its exact durable
WorkUnit, commits the idempotent `CancelWorkUnit` receipt and cancelled Work
revision before provider interruption, and preserves cancelled interaction
presentation for replay. Its cancellation command is executed by the existing
service identity with the WorkUnit's exact capability. This slice therefore
does not add a second cancellation endpoint, reinterpret the human
`InvokeSuggestedAction` grant as a `CancelWorkUnit` grant, or introduce generic
cancellation of Work that may be shared.

The renderer-neutral Project client now exposes:

- `createSuggestedActionWorkCancellationRequest`, which creates only the
  caller-owned canonical command ID and optional readable reason; and
- `cancelProjectSuggestedActionWork`, which fresh-reads the exact invocation,
  consumes the server-owned cancellation assessment, derives the
  InteractionRun and WorkUnit identities from that view, calls the accepted
  cancellation route, validates the durable cancellation identity and hash,
  and rereads the invocation after the command.

The post-command reread must retain the exact Project, immutable invocation
receipt, invoking human Actor, capability grant, command, InteractionRun, and
History destinations. It must also contain the exact cancelled Work revision
returned by the command and mark cancellation ineligible. Any identity
substitution or incomplete durable response fails closed. Only the cancellation
command ID and optional reason cross from the browser; Project, Actor,
capability, trace, InteractionRun, WorkUnit, receipt, and History identities are
never accepted from client command input.

The fresh assessment supports presentation but is not a client-side authority
calculation. The authenticated runtime remains the final authority for a
completion/cancellation race and exact command redelivery, including a lost
first HTTP response. No React component, CSS, browser route, generated
contract, server authority implementation, or persistence behavior changed in
this slice.

## Renderer-neutral InteractionRun replay boundary

The existing authenticated `GET /api/interactions/:runId` boundary already
restores one durable InteractionRun by exact protocol thread and run
correlation, streams only its retained logical events through the official
AG-UI client, and records an immutable delivery attempt. An `after=0` request is
an explicit full response replay. It does not carry the original prompt or any
command input, call `InvokeSuggestedAction`, start or retry Work, apply domain
authority, or cancel Work.

`PetraInteractionClient.replay` now exposes that existing read boundary without
hand-parsing protocol events. The SuggestedAction-specific renderer-neutral
client adds the narrower frozen-action contract:

- `createSuggestedActionInteractionReplayRequest` creates only a caller-owned
  canonical connection identity and fixes the full-response checkpoint at
  zero;
- `replayProjectSuggestedActionInteraction` fresh-reads the exact immutable
  invocation, consumes only its server-owned `reconnect_delivery` eligibility,
  and derives Project-independent protocol run/thread and Work identities from
  that view;
- the delivery request is an authenticated GET with no body, prompt, command,
  Actor, capability, Work, result, or History input; and
- the post-delivery reread must preserve the immutable invocation, invoking
  Actor, capability grant, command and receipt, InteractionRun, WorkUnit,
  result, retained Work-revision prefix, and History destinations. The replayed
  AG-UI event sequence, trace, Work identity, terminal result, and protocol
  correlation must match those server records or the client fails closed.

The connection request is retained by presentation across uncertain delivery
retries; the runtime remains the sole owner of monotonically numbered delivery
attempts and immutable `InteractionReplayRecord` receipts. This is replay, not
generic Work resume. Ordinary invocation refresh remains a separate read and
does not become replay. No new replay, Work, command, result, recovery, or
History ledger was introduced.

## Reproducible evidence

The passing deterministic proof produced:

- preview `petra.suggested-action-view@1.1.0`, revision 1, with `ready`
  readiness;
- command `command_60K5HN6KZC4848WJ014QYVWFJJ` and deterministic Work
  `work_unit_70ZPECQS0K461NQ3P81XS2AKP1`;
- terminal result
  `grounded_response_42CTYK1NNGKG1VDPSRFB3X0HH9`, revision 1;
- direct/conversational `direct_and_conversational_same_command` convergence;
- aborted delivery attempt 1 and retained restart replay attempt 2; and
- exact durable counts of 1 invocation, 1 Work, 4 Work revisions, and 2
  deliveries.

The provider in this proof is a deterministic double constrained to the exact
certified model catalog and recorded output. This proves Petra's runtime and
persistence contracts; it does not replace the separate managed-provider
certification gate.

## Frozen-interface boundary and remaining evidence

No React component, CSS, browser route, or presentation fixture changed in this
backend slice. Inspection of exact counterpart
`011b9583653dfbd728672a77bb4bc6ec03329645` confirms that the action's supplied
History destination is authenticated and runtime-backed and that the frozen
action region binds the exact retry-stable `CancelWorkUnit` client. One
presentation-only boundary remains and cannot be closed without crossing
design authority: **Refresh exact state** correctly remains an ordinary
invocation reread, but the frozen action region does not yet expose the separate
eligible InteractionRun replay client.

The Wave 3 exit gate therefore remains open. Design must bind this exact replay
behavior through the frozen interface without fixture fallback or client-side
authority calculations, retain ordinary refresh as reread-only, and run the
mapped cumulative live proof plus the full exit assessment. This backend proof
is the handoff evidence for that bounded design integration.

## Verification

- `npm run test:wave3:cumulative`: passed through the authenticated GET replay
  client on clean PostgreSQL 18.6 and SeaweedFS stores after all 32 migrations;
  the retained cardinalities remained one invocation, one WorkUnit, four Work
  revisions, and two exact delivery attempts.
- `npm run test:postgres:integration`: passed all 111 PostgreSQL tests across 15
  files after all 32 migrations in the preceding persistence-changing backend
  slice; this read/client-only slice changes no persistence behavior.
- Focused pinned-Node checks pass the package build, workbench and server
  typechecks, all 31 adapter tests, all 102 workbench tests, and all 65 server
  tests. The server suite requires its ordinary loopback permission.
- `npm run verify`: passed generated-contract and fixture checks, the retrieval
  floor, repository formatting and lint, TypeScript and Python typechecks, the
  production build, 878 passing JavaScript/TypeScript tests with seven
  integration-only skips, 25 Python tests, and all six handoff automation
  tests. The production build retained the existing non-failing chunk-size
  advisory.
