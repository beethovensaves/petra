# Wave 3 SuggestedAction cumulative proof

Status: full Wave 3 exit rule demonstrated in one cumulative live runtime,
production workbench client/controller, and frozen React rendering proof;
cumulative verification passed
Date: 2026-09-12
Backend replay counterpart: `f1d32ffdae8515956859ff4be2b19b87da8c6e05`
Exact design predecessor: `011b9583653dfbd728672a77bb4bc6ec03329645`
Design boundary: `UX-DESIGN-FREEZE-01`

## Result

`npm run test:wave3:cumulative` now proves the mapped SuggestedAction backend
path from clean stores with one disposable PostgreSQL 18.6 database and one
SeaweedFS S3 artifact store. Flyway validates and applies all 32 migrations
through V032 before the proof starts.

The proof establishes an authenticated Project and retained inquiry result over
the existing authority repositories. Vite then loads the production workbench
data client, shared `SuggestedWorkAction` controller, and frozen React
components. The client reads the live `petra.suggested-action-view@1.1.0`
preview, and both presentation variants render the same shared component. The
proof then calls that component's invocation controller twice with one retained
`InvokeSuggestedAction` request. The attempts converge on one immutable
invocation receipt and one deterministic WorkUnit; no presentation-specific
command or Work path is introduced.

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

The proof restarts the Petra server against the retained stores and calls the
production workbench replay controller. That controller rereads current
recovery, reconnects the same InteractionRun and connection through the
authenticated GET replay boundary, verifies the SDK result against the
post-delivery invocation reread, and publishes only that verified pair. The
terminal response is replayed as delivery attempt two with no provider or model
request and the same result and Work identities. No prompt, command, action
input, or workflow instruction crosses that replay request. Final persistence
cardinalities are exactly one invocation receipt, one WorkUnit, four Work
revisions, and two delivery records.

The proof renders the shared frozen direct and conversational action region
from the live ready preview and again from the terminal invocation. It verifies
the exact command, Work History, Work and History destinations, and current
recovery in both presentations. It also renders the retained SDK messages and
terminal result in the labelled replay region. No prompt, invocation command,
Work request, or fixture response is resubmitted or substituted by the
presentation.

The live interface portion executes production React modules under Vite
server-side rendering. It does not drive a browser DOM or pointer event. The
workbench interaction suite separately checks controller retries, adverse
states, control exposure, accessibility markup, and narrow-layout behavior; the
production build verifies browser bundling.

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
first HTTP response. That backend slice changed no React component, CSS,
browser route, generated contract, server authority implementation, or
persistence behavior.

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

The same process also recorded that the production workbench
`getProjectSuggestedWorkAction`, `attemptSuggestedActionInvocation`, and
`attemptSuggestedActionInteractionReplay` boundaries executed successfully;
both frozen presentations rendered live ready and terminal state; and the
retained response rendered from the verified SDK replay.

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

## Frozen-interface cancellation binding

The shared direct and conversational `SuggestedWorkAction` presentation now
exposes **Cancel exact Work** only inside the returned `cancel_work` recovery
item when that exact item is `eligible` and names `CancelWorkUnit`. The control
does not infer eligibility from Work state, action state, time, or any other
client-visible field. Ineligible, commandless, or unbound recovery items create
no cancellation control or keyboard stop.

The control calls `createSuggestedActionWorkCancellationRequest` once and
retains that exact caller-owned command across uncertain retries. It then calls
`cancelProjectSuggestedActionWork` with the immutable invocation command. The
presentation replaces its invocation state only with the client result, whose
post-command invocation reread has already verified Project, Actor, capability,
invocation receipt and command, InteractionRun, WorkUnit, cancellation, and
History identities. A rejected or unverified attempt leaves the displayed
invocation unchanged and reports only the returned failure; it never claims
that cancellation occurred.

The cancellation button uses the existing destructive-action treatment, names
the exact command in machine-readable markup, takes its accessible description
from the server-supplied eligibility reason, exposes a busy label, and prevents
concurrent refresh. No route, fixture fallback, shared-Work cancellation,
client-side capability calculation, or backend authority changed. Ordinary
**Refresh exact state** still only rereads the invocation and does not claim
InteractionRun replay.

## Frozen-interface InteractionRun replay binding

The shared direct and conversational `SuggestedWorkAction` presentation exposes
**Replay exact response** only inside the exact returned
`reconnect_delivery` recovery item when that item is `eligible` and carries no
command. The control does not infer replay eligibility from Work state,
operation state, result availability, delivery posture, time, or any other
client-visible field. Ineligible, command-bound, or unbound recovery items
create no replay control.

The control calls `createSuggestedActionInteractionReplayRequest` once and
retains that exact caller-owned connection and full-response checkpoint across
uncertain delivery retries. It then calls
`replayProjectSuggestedActionInteraction` with the immutable invocation command
identity. A rejected or unverified attempt preserves both the displayed
invocation and any previously verified replay result; only the verified client
result publishes its post-replay invocation reread and SDK-derived messages.

The returned messages render in a labelled **Exact retained response** region
with their SDK message and role identities. The presentation supplies no
fixture fallback and does not inspect protocol events to calculate authority,
eligibility, result identity, Work identity, or completion. The renderer-neutral
client owns those checks against the fresh server reread and fails closed on
identity substitution.

**Refresh exact state** remains a separately labelled ordinary invocation
reread. It never calls replay and is never labelled as replay. Replay does not
resubmit the prompt, `InvokeSuggestedAction`, or Work; it is not generic resume
and does not add another History or replay ledger. The existing retry-stable
**Cancel exact Work** behavior is unchanged. Both replay and cancellation use
their existing recovery items, share busy-state exclusion with refresh, reuse
the frozen narrow recovery grid, and take their accessible descriptions from
the exact server-supplied reasons.

Focused evidence covers direct and conversational rendering, eligible-only
exposure, ineligible and inconsistent adverse states, one retained connection
across a failed and successful delivery attempt, verified-only publication,
exact SDK message rendering, labelled status and response regions, busy-state
exclusion, and long-message wrapping at the frozen narrow breakpoint.

## Wave 3 exit assessment

The authoritative exit rule is satisfied:

> One exact action can start bounded Work, preserve interruption state, return a
> result, and expose its history and eligible recovery without client-side
> authority calculations.

The cumulative live proof starts one deterministic WorkUnit through the shared
workbench `InvokeSuggestedAction` controller used by direct and conversational
presentation,
retains an aborted delivery without cancelling or reexecuting Work, advances the
same Work through four canonical revisions, returns its exact retained
GroundedResponse, and replays the terminal response after a server restart. The
runtime reread supplies the Work and History destinations plus exact recovery
assessment. The frozen interface is rendered from those live values and
delegates replay and cancellation validation to its renderer-neutral clients;
it adds no authority calculation or fixture fallback for the demonstrated
path.

The exact live cardinalities remain one invocation receipt, one WorkUnit, four
Work revisions, and two immutable delivery attempts. The separate
managed-provider certification gate and the packet's permanent exclusions are
unchanged; they are not omissions in this Wave 3 exit rule. No Wave 3
presentation, action, Work, History, result, replay, or recovery closure remains
open.

## Verification

- Pinned Node 24.20.0 and npm 11.19.0 were used for every JavaScript and
  TypeScript check.
- The focused package build, workbench typecheck, all 31 adapter tests, and 61
  targeted renderer-neutral client and frozen action tests passed.
- `npm run verify` passed generated-contract and fixture checks, the retrieval
  floor, repository formatting and lint, TypeScript and Python typechecks, the
  production build, 908 passing JavaScript/TypeScript tests with seven
  integration-only skips, 25 Python tests, and all six handoff automation
  tests. The production build retained the existing non-failing chunk-size
  advisory.
- `npm run test:wave3:cumulative` passed on clean PostgreSQL 18.6 and SeaweedFS
  stores after all 32 migrations. It executed the production workbench preview,
  shared invocation and replay controllers, and frozen React renderers against
  that live runtime. It demonstrated the shared direct/conversational command
  boundary, exact retained-request convergence, delivery interruption, server
  restart, full terminal replay, no Work reexecution, four canonical Work
  revisions, runtime History destinations, and server-owned recovery
  eligibility.
- The preceding persistence-changing backend slice passed all 111 PostgreSQL
  integration tests across 15 files. This replay integration changes no
  persistence or PostgreSQL behavior; the current cumulative proof nevertheless
  revalidated the demonstrated path against newly migrated real stores.
