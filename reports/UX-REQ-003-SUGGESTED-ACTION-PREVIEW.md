# UX-REQ-003 SuggestedAction preview and exact Work invocation

Status: backend Work-starting action family and exact invocation passed;
frozen-interface mapping and cumulative live exit proof remain open
Date: 2026-09-11
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
- five server-owned recovery assessments: inspect Work, inspect History,
  reconnect delivery, cancel when currently eligible, and regenerate the
  action.

Petra does not persist a second Work, result, or History ledger. WorkUnit,
WorkerInputManifest, GroundedResponse, InteractionRun, and their existing
revisions remain canonical.

## Authenticated APIs and typed client

The authenticated boundaries are:

- `GET /api/queries/projects/:projectId/suggested-actions?inquiry_result_link_id=:linkId&action_kind=run_grounded_synthesis`
- `POST /api/commands/projects/:projectId/suggested-actions/:suggestedActionId/invoke`
- `GET /api/queries/projects/:projectId/suggested-action-invocations/:commandId`

The renderer-neutral workbench client verifies the returned Project, link,
action, and command identities. It passes the exact action reference back
unchanged and contains no authority calculation or presentation decision. No
frozen component, stylesheet, browser route, or fixture-backed surface changed
in this backend slice.

## Verification

The focused contract suite passed 443 tests, core passed 216, the server route
suite passed 24, the renderer-neutral client suite passed 29, and the Python
contract mirror passed 11. Those checks cover exact preview derivation,
authorization, stale regeneration, idempotency, command receipt immutability,
input registration, interaction correlation, result/History/recovery
composition, and client identity guards.

The disposable PostgreSQL 18.6 integration applied all 32 migrations and
passed 111 persistence tests across 15 files. The complete `npm run verify`
gate then passed generation and fixture checks, the retrieval floor,
formatting, lint, TypeScript and Python typechecks, the workbench production
build, 879 JavaScript/TypeScript tests with seven integration-only skips, and
25 Python tests.

## Remaining UX-REQ-003 work

This backend slice does not close `UX-REQ-003` or the Wave 3 exit gate. Design
must map the Work-starting 1.1 preview and invocation view into the frozen
action region, invoke the renderer-neutral command client without fixture
fallback, and demonstrate the live start/result/History/recovery path. The
remaining accessibility, responsive, reconnect, cancellation, stale, and
adverse-state evidence also stays open. Other action families, adjustable
depth, priority, steering, pause/resume, and generalized budget or cost policy
are outside this bounded slice.
