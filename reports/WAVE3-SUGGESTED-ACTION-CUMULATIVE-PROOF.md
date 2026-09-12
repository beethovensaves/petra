# Wave 3 SuggestedAction cumulative proof

Status: backend cumulative lifecycle and frozen runtime Work History destination
passed; replay and cancellation-control closure remains open
Date: 2026-09-11
Backend proof commit: `03cb39341f5503abbcaa5c3a13d3a68f2c5aba04`
Design integration basis: `b295ade37e17f6182d7b47758aa22e11d608c6f4`
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

## Frozen-interface Work History binding

The action's supplied History destination now carries its immutable command
receipt identity beside the supplied `petra.work-unit` target. The existing
History browser route recognizes only that complete three-part runtime identity
and rereads `petra.suggested-action-invocation-view@1.0.0` through the existing
authenticated client. It rejects duplicate, partial, invalid, or substituted
Project, command, destination, receipt, Work, and revision-sequence identities
without rendering fixture state.

After the exact History and Work destinations match the reread invocation, the
frozen History layout presents the canonical WorkUnit revisions, exact command
receipt and Work identity, current result posture, InteractionRun delivery
posture, server-owned recovery assessment, and contract limitations. It does
not derive recovery eligibility, authority effect, readiness, or a substitute
History order. The separate supplied Work destination still opens the canonical
Work detail.

The general and selected causal-episode History routes retain their existing
provider. That unrelated fixture boundary is never used as a fallback for this
action-owned runtime destination: any incomplete or mismatched action History
deep link fails closed.

Focused pinned-Node workbench typecheck and all 116 workbench tests pass. The
new evidence covers exact authenticated loader transport, server-destination
matching, canonical revision order and current-head matching, no-fallback
failure behavior, semantic link identity, recovery passthrough, landmark and
heading associations, and frozen narrow-layout reuse.

## Remaining frozen-interface evidence

The exact backend proof and runtime History mapping leave two distinct
presentation controls open:

- action refresh rereads the exact invocation and does not initiate the
  contract's InteractionRun replay; and
- cancellation eligibility is rendered from the server assessment, but the
  action region does not bind the existing authorized cancellation command.

The Wave 3 exit gate therefore remains open. Design must bind the accepted
eligible recovery/reconnect behavior through the frozen interface without
client-side authority calculations, then extend the cumulative live proof
through those exact interface controls. The route intentionally does not make
an invocation reread look like replay and does not turn a server eligibility
assessment into an unbound cancellation button.

## Verification

- `npm run test:wave3:cumulative`: passed on clean PostgreSQL 18.6 and SeaweedFS
  stores after all 32 migrations.
- `npm run test:postgres:integration`: passed all 111 PostgreSQL tests across 15
  files after all 32 migrations.
- `npm run verify`: passed generated-contract and fixture checks, the retrieval
  floor, repository formatting and lint, TypeScript and Python typechecks, the
  production build, 898 JavaScript/TypeScript tests with seven integration-only
  skips, 25 Python tests, and all six handoff automation tests. The production
  build retained the existing non-failing chunk-size advisory.
