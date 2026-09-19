# Petra user-operation coverage

Status: binding delivery inventory for automated Waves 6–8

## Finding

DB18 mapped user intent at the surface and flow level, but delivery did not keep
an operation-level ledger. Routes and semantic presentations could therefore
pass while required controls remained disabled, local-only, or absent.

The executable inventory in
`scripts/ui-operation-inventory.json` now maps 116 atomic user operations to all
14 DB18 surfaces, all 18 accepted flows, all four end-to-end paths, all 23
runtime request boundaries, a visible control, a route, an interaction kind, a
runtime owner, a delivery milestone, and the current implementation state.
Distinct actions such as
retry, resume, and start again—or remove from Project and delete local copy—have
separate entries so one working action cannot conceal another missing action.
`npm run audit:ui-operations` fails if any accepted surface, flow, or request is
missing from that inventory.

## Current baseline

| State | Operations | Meaning |
| --- | ---: | --- |
| Live | 43 | A visible control appears to reach its production boundary. Exact runtime ownership and executed evidence still have to be attached before a milestone gate passes. |
| Partial | 31 | Part of the operation works, but a required command, state, return, or recovery path is absent. |
| Presentation only | 9 | The UI demonstrates presentation with local or fixture state. |
| Unavailable | 22 | The accepted operation is shown as disabled or unavailable. |
| Missing | 11 | The accepted operation has no discoverable control. |

Wave 6 owns 97 core operations. Forty-three are currently live and 54 are not
yet usable. Material gaps include Project creation, objective framing, profile
binding, source registration and removal, Review rejection, Work input and
steering, cancellation and each distinct recovery action, the Petra composer,
durable interrupt responses, visible model readiness, usable profile-taxonomy
inspection, personal-setting persistence, and an in-product test/reset path.

## Wave 6 backend contract baseline

`scripts/wave6-operation-contract-baseline.json` reconciles all 97 Wave 6
operations against the production query or command, authorization boundary,
persistence owner, and recovery behavior present at backend commit
`869cae6aea9fdc4cccf197ed905d7c17160f5492`. The coverage audit now fails when
an operation is omitted, duplicated, points at an undefined owner, omits one of
those four contract dimensions, or loses the required `UX-REQ-001`–`016` and
`020`–`023` scope.

| Backend owner status | Operations | Baseline meaning |
| --- | ---: | --- |
| Owned | 52 | A named production query or command owns the server-side contract. UI completion and executed evidence remain separate gates. |
| Partial | 19 | A production boundary exists but cannot yet supply the complete operation. Every row names the missing runtime owner. |
| Missing | 18 | No production owner supplies the operation. Every row names the command, query, composition, or design owner still required. |
| Client-owned | 8 | The accepted boundary is intentionally browser-local and must not gain domain authority or server persistence. |

The 18 ownerless operations are Project create, import, and entry recovery;
Objective framing; source registration, reuse, and processing start; Review
rejection; saved Graph questions; Work input, steering, priority, retry, resume,
and start-again; profile binding; the design-owned in-product guide; and the
bounded representative-Project reset. The baseline deliberately does not fill
the inventory's `runtime_owner` field for an incomplete operation, promote an
operation to `live`, or attach unexecuted evidence. Subsequent delivery slices
must close the recorded owner gap before the milestone gate may treat that row
as complete.

### Slice 3 registered-profile update

The registered-profile runtime closes the backend owner gaps for Project
creation, profile binding, complete taxonomy inspection, and the profile-owned
Project map. The bounded reset transaction is now backend-owned but remains
partial until the representative-data setup, stable-URL reset control, and
guide are integrated. The current backend ledger is therefore 56 owned, 18
partial, 15 missing, and 8 intentionally client-owned operations. No operation
was promoted to `live`, and no design-control evidence was attached by this
backend slice.

### Slice 7 Work-operations update

The composed Work boundary now owns exact operation reads plus authenticated,
idempotent start, required-input response, steering, priority, cancellation,
and eligible retry commands. It reuses canonical WorkUnit lifecycle authority,
binds durable reconnect/replay paths where an InteractionRun exists, and
returns exact GroundedResponse and WorkerOutputManifest destinations.

Resume and start again now have explicit server-owned assessments but remain
partial: no compatible-checkpoint transition or workflow-specific fresh-input
rebinding command is registered. The current backend ledger is 66 owned, 14
partial, 9 missing, and 8 intentionally client-owned operations. Runtime-owner
fields are populated for the Work rows, but their UI state and evidence remain
unchanged for the design-owned checkpoint.

Wave 7 owns 15 atomic Composition operations. None is currently live:
collection creation, durable editing and save, contextual Petra work,
provenance inspection, revision comparison and restore, validation and render,
copy and download, and promotion through Review are presentation-only,
unavailable, or missing.

Wave 8 owns the four remaining governed Project-control and registered
profile-tool operations, then reruns the complete inventory as one application.

## Exit rules

An operation counts as delivered only when all of the following are true:

1. a person can discover and invoke it from the owning task surface;
2. the control reaches the registered production query or command;
3. pending, success, partial, failed, stale, unavailable, and recovery outcomes
   required by its contract appear in the owning UI;
4. direct and Petra-mediated entry use the same identity and command;
5. context and focus return to the originating task;
6. a task-based browser run records the command, result, and retained artifact;
7. the inventory entry is marked `live`, names its exact runtime owner, and
   cites executed evidence with command, artifact, and tested boundary.

The milestone commands enforce cumulative coverage:

- `npm run gate:wave6:user-testable`
- `npm run gate:wave7:composition`
- `npm run gate:wave8:application`

These commands intentionally fail until every operation due by that milestone is
live and carries executed evidence. Automated workers cannot satisfy the final
user-owned acceptance record for any of these waves.
