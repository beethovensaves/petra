# Wave 3 SuggestedAction cumulative backend proof

Status: backend cumulative lifecycle and renderer-neutral cancellation binding
passed; frozen-interface cancellation and replay closure remains open
Date: 2026-09-11
Backend proof basis: `03cb39341f5503abbcaa5c3a13d3a68f2c5aba04`
Exact design counterpart: `d32175d288ee0effb8df524d6781d6160e95a06f`
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
the same InteractionRun and connection. The terminal response is replayed as
delivery attempt two with no provider or model request and the same result and
Work identities. Final persistence cardinalities are exactly one invocation
receipt, one WorkUnit, four Work revisions, and two delivery records.

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
`d32175d288ee0effb8df524d6781d6160e95a06f` confirms that the action's supplied
History destination is now authenticated and runtime-backed. Two
presentation-only boundaries remain and cannot be closed without crossing
design authority:

- action refresh rereads the exact invocation and does not initiate the
  contract's InteractionRun replay; and
- cancellation eligibility is rendered from the server assessment, but the
  frozen action region does not yet bind the new renderer-neutral client to its
  existing control.

The Wave 3 exit gate therefore remains open. Design must bind the accepted
cancellation client and InteractionRun replay behavior through the frozen
interface, without fixture fallback or client-side authority calculations, and
run the mapped cumulative live proof. This backend proof is the handoff evidence
for that bounded design integration.

## Verification

- `npm run test:wave3:cumulative`: passed on clean PostgreSQL 18.6 and SeaweedFS
  stores after all 32 migrations.
- `npm run test:postgres:integration`: passed all 111 PostgreSQL tests across 15
  files after all 32 migrations.
- Focused pinned-Node checks for this slice passed the workbench typecheck, all
  100 workbench tests, both interaction-runtime cancellation tests, and all 19
  server conformance tests. The server suite required its ordinary loopback
  permission.
- `npm run verify`: passed generated-contract and fixture checks, the retrieval
  floor, repository formatting and lint, TypeScript and Python typechecks, the
  production build, 875 passing JavaScript/TypeScript tests with seven
  integration-only skips, 25 Python tests, and all six handoff automation
  tests. The production build retained the existing non-failing chunk-size
  advisory.
