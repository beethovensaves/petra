# UX-REQ-003 SuggestedAction preview and exact Work invocation

Status: bounded Wave 3 Work-starting action, exact invocation, frozen action
mapping, authenticated runtime Work History destination, cancellation,
InteractionRun replay, and cumulative exit evidence passed; broader action
families remain outside this increment
Date: 2026-09-12
Design boundary: `UX-DESIGN-FREEZE-01`

## Result

Petra now exposes two revisioned, Project-scoped SuggestedAction previews from
the same retained inquiry-result authority. The 1.0 read-only action remains
unchanged. The new `petra.suggested-action-view@1.1.0` action can start one
bounded grounded-synthesis Work task, but only after an authenticated exact
invocation.

The Work action is deterministically identified from its immutable action kind
and exact basis. Its revision hash covers the ProjectDefinition, Objective,
inquiry-result link, GroundedResponse, snapshot, context packet, evidence
packet, fixed prompt, execution profile, resource limits, and result posture.
Current dependency and grant readiness are recomposed beside that immutable
revision. If any exact input is no longer current, the server rejects the old
reference and returns the regenerated current preview.

## Runtime and authority

`InvokeSuggestedAction` is registered in `petra.capability-grant@1.2.0`.
Readiness is `ready` only when all bound records are exact and current and the
authenticated Actor has exactly one active Project-scoped grant. The client
cannot supply an Actor, grant, Project, WorkUnit, interaction, or trace
identity.

`petra.suggested-action-invocation-request@1.0.0` carries only the command and
idempotency identities, inquiry-result link, expected action revision and hash,
the fixed `current_graph` depth, and submission time. The server reconstructs
the complete basis, resolves the principal and grant, and stores an immutable
`petra.suggested-action-invocation@1.0.0` receipt in PostgreSQL. The receipt
binds one deterministic WorkUnit and one interaction correlation to the exact
command fingerprint. Repeating the same command or idempotency key converges on
that receipt and Work; conflicting reuse fails closed.

The coordinator is the public command seam for both direct and conversational
callers. It starts the existing grounded-synthesis interaction rather than a
parallel executor. Before provider work, the executor verifies that its plan
uses the receipt's exact Project, ProjectDefinition, Objective, snapshot,
context packet, and evidence packet. Work registration then records the human
Actor and exact invocation grant and creates an eight-entry immutable input
manifest covering the prompt and seven retained authority records. A failure
before durable Work registration may retry that same invocation; ordinary
interaction replay cannot rerun completed Work.

Delivery interruption does not cancel Work. Reconnect uses the exact
InteractionRun replay path, while explicit cancellation remains the existing
authorized `CancelWorkUnit` command. The action's resource limits are the
grounded workflow's hard limits: one attempt, one worker, 120 seconds, 4 MB of
output, 4,096 input tokens, and 1,600 output tokens. No monetary cost is
expected for the certified local profile, and the preview does not claim a
duration estimate.

## Result, History, and recovery

`petra.suggested-action-invocation-view@1.0.0` composes current command state
from the immutable receipt and existing runtime authority. It exposes:

- pending or exact current WorkUnit identity and execution state;
- the GroundedResponse result when one exists, without granting it scientific
  authority;
- the InteractionRun identity needed for exact replay;
- canonical WorkUnit revisions as History, plus typed Work and History
  destinations; and
- five server-owned recovery assessments: retry the exact start, reconnect
  delivery, cancel when currently eligible, inspect Work, and inspect the
  result. Work and History destinations remain separate typed navigation.

Petra does not persist a second Work, result, or History ledger. WorkUnit,
WorkerInputManifest, GroundedResponse, InteractionRun, and their existing
revisions remain canonical.

The action's typed invocation names the existing inquiry-detail contract and
exact Objective reference rather than a browser route. The frozen Brief adapter
maps that typed read without changing its meaning or treating it as a command.

## Frozen action-region integration

The existing **Next steps** region now consumes the authenticated
`petra.suggested-action-view@1.0.0` query. The default Brief path reads the
server-owned current Objective and its exact inquiry detail. It requests a
SuggestedAction only when that current inquiry has exactly one result link, so
the browser never ranks links or invents a recommendation. An explicit exact
`inquiry_result_link_id` may select the same preview without fixture fallback.
No action region is rendered when there is no current Objective or when zero or
multiple result links leave the selection unsupported by current server
authority.

The preview keeps the action identity, revision, content hash, ProjectDefinition,
Objective, inquiry-result link, GroundedResponse, snapshot, declared Work basis,
read authority, readiness reason, and prerequisites intact. It also shows the
exact included scope, exclusions, missing information, reuse and authority
effect, capability posture, and no-Work duration, cost, interrupt, approval, and
cancellation consequences. These values come from the action view; the client
does not derive readiness, priority, capability, cost, or authority.

A ready action exposes only the contract-declared
`get_project_inquiry_detail` authenticated read. The loader obtains the exact
Objective from the returned invocation, then verifies the inquiry detail against
the action's ProjectDefinition, Objective, link, result, and any producing Work
references before rendering it in the same Brief region. A stale action is
disabled, keeps the server reason and prerequisites visible, and performs no
substitute read or Work request. The preview and inquiry detail both state that
the GroundedResponse has no authority effect and does not resolve the authored
inquiry.

The same **Next steps** region now also requests the 1.1 Work-starting action
through `getProjectSuggestedWorkAction`. It preserves the exact SuggestedAction
reference, Objective and retained basis, source result, context and evidence
packets, prompt hash, bounded resource limits, execution profile, invocation
contract, and supplied `ready`, `stale`, or `unavailable` posture. It presents
cost and limits as supplied values and neither orders action families nor
derives authority, grant, readiness, priority, reversibility, recovery, or
Project meaning.

The shared `SuggestedWorkAction` component supplies both the direct Brief and
conversational Petra presentations. Both call
`attemptSuggestedActionInvocation`, which retains one request while delegating
to `invokeProjectSuggestedAction` with the same `InvokeSuggestedAction`
contract. The request builder
creates only the caller-owned command ID, idempotency key, submission time, and
exact action fields; it does not send Actor, grant, Project, Work, interaction,
or trace authority. An uncertain retry retains the same request identity. A
server 409 regeneration is accepted only when its Project and inquiry-result
link match the selected action, then clears the old request and requires review
of the replacement preview.

The returned or reread invocation maps its exact receipt, deterministic pending
or current Work identity, operation state, result reference and authority
effect, InteractionRun delivery posture, canonical Work revisions, Work and
History destinations, and all five supplied recovery assessments. The client
does not recompute eligibility. A refresh rereads the exact invocation command;
it does not claim to perform InteractionRun replay.

The shared action presentation exposes **Cancel exact Work** only when the
returned `cancel_work` assessment is `eligible` and names `CancelWorkUnit`.
It does not infer eligibility from Work or action state. The component creates
one caller-owned cancellation command, retains it across exact retries, and
calls the existing authenticated cancellation route through
`cancelProjectSuggestedActionWork`. The displayed invocation changes only to
the client's verified post-command reread. Failures leave the prior invocation
visible and do not claim cancellation. The exact Project, Actor, capability,
invocation command and receipt, InteractionRun, WorkUnit, cancellation, and
History identities stay bound to runtime authority; no generic shared-Work
cancellation was introduced.

The Petra route accepts the exact inquiry-result link and optional invocation
command in its URL, rereads both runtime views, and rejects cross-action
composition. The History destination retains the supplied Work semantic
identity and immutable invocation command receipt in the browser URL. The
History loader rereads that invocation through the authenticated typed client,
accepts only its exact Work and History destinations, receipt, Work head, and
strictly ordered canonical revision sequence, and fails closed without fixture
fallback on partial or substituted identity. The frozen History regions render
those revisions with the supplied result, InteractionRun, recovery, and
limitation state; they do not derive authority or eligibility. Other History
entry paths retain their separately owned provider.

## Authenticated APIs and typed client

The authenticated boundaries are:

- `GET /api/queries/projects/:projectId/suggested-actions?inquiry_result_link_id=:linkId&action_kind=run_grounded_synthesis`
- `POST /api/commands/projects/:projectId/suggested-actions/:suggestedActionId/invoke`
- `GET /api/queries/projects/:projectId/suggested-action-invocations/:commandId`
- `GET /api/interactions/:runId?thread_id=:threadId&connection_id=:connectionId&after=0`
- `POST /api/work-units/:runId/cancel`

The renderer-neutral workbench client verifies the returned Project, link,
action, command, cancellation, InteractionRun, WorkUnit, receipt, capability,
Actor, and History identities. It passes the exact action reference back
unchanged and contains no authority calculation. The frozen Brief and Petra
presentations share that client boundary.

## Verification

Pinned Node 24.20.0 `npm run verify` passes generated-contract and fixture
checks, the retrieval floor, repository formatting and lint, TypeScript and
Python typechecks, the production build, 908 JavaScript/TypeScript tests with
seven integration-only skips, 25 Python tests, and all six handoff automation
tests. The workbench contributes 126 passing tests, including one focused test
that verifies the shared invocation controller retains the exact request across
presentation attempts. The production build retains the existing non-failing
chunk-size advisory.

The disposable PostgreSQL 18.6 integration previously passed all 111
persistence tests across 15 files after applying V001 through V032. The current
cumulative proof applies the same 32 migrations to fresh PostgreSQL and
SeaweedFS stores and exercises the live workbench preview, invocation, reread,
interruption, restart, replay, History, recovery, and rendering path. This
closure change does not alter persistence behavior.

## Closure and remaining scope

The bounded Wave 3 `UX-REQ-003` increment and the Wave 3 exit gate are closed.
The cumulative proof now loads the production workbench client and shared
`SuggestedWorkAction` controller through Vite, reads the live preview, invokes
the shared controller with one retained exact retry, renders both frozen
presentation variants from live ready and terminal authority, and replays the exact
InteractionRun through the presentation's replay controller after a server
restart. The retained response, canonical Work History, destinations, and
server-owned recovery state are rendered without fixture fallback or client
authority calculation.

This executable interface check uses the production React modules under Vite
server-side rendering; it does not drive a browser DOM or pointer event. The
workbench interaction tests separately exercise controller behavior, adverse
states, accessible control binding, and responsive markup, while the production
build verifies browser bundling. Other action families, adjustable depth,
priority, steering, pause/resume, and generalized budget or cost policy remain
outside this bounded Wave 3 increment.
