# Wave 4 final adversarial authority audit

Status: fixed closure item 47 passed; one backend read-integrity finding was
corrected; closure item 48 remains required; current evidence does not support
declaring Wave 4 complete
Date: 2026-09-14
Backend starting commit: `b9506065eb2fc57fce55ea8de6413f0ac9c7d72e`
Exact design counterpart inspected:
`fb810a3ea16c391cdd20a5cbbb87901438abf943`

## Result

The cumulative scientific path remains live through production server routes
and renderer-neutral typed clients: a durable human-produced WorkingCandidate
and WorkingRelationship enter a resumable ReviewSession, the authenticated
human's exact manual checkpoint applies one complete ChangeSet, the Brief
changes, History retains the command events, and restart replay creates no
duplicate effect. The controlled-writing Requirement and GOVERNS relationship
use the same working and Review kernels and stop before Apply.

The adversarial pass found one material backend read-integrity defect. The
Project working-state snapshot reader checked a stored row's outer record hash
but did not check the WorkingCandidate or WorkingRelationship's own
`content_hash`. A corrupted row could therefore be resealed at the storage-row
and snapshot-envelope levels while changed nested provenance retained a stale
self-hash. The typed client checked the snapshot content hash and identity
bindings but did not independently reject that stale nested self-hash.

The server reader now verifies each current working record's canonical
self-hash, Project identity, and exact current ProjectDefinition reference in
addition to the row hash and indexed definition columns. It fails a lost
self-hash as stored-record corruption and an identity rebind as stale
definition state. The renderer-neutral typed client also recomputes every
nested working-record content hash before returning the snapshot. A disposable
PostgreSQL corruption test reseals the outer row after changing provenance and
proves the read fails closed; the client test reseals the outer snapshot and
proves the same failure at the transport boundary.

No contract, migration, command, event, projection, Review, Brief, History,
Work, interaction, communication, or recovery ledger was added. No frozen
React component, CSS file, browser route, or presentation fixture changed.

## Adversarial findings

| Risk | Evidence inspected | Assessment |
| --- | --- | --- |
| Implicit authority | Manual Review preparation and Apply boundary, capability checks, controlled-writing Review payload, item 45 trace, and item 46 browser trace | No material finding. The demonstrated mutation still requires the authenticated human checkpoint and exact current Review, working heads, ChangeSet, grants, and snapshot. `ReviewPolicy` remains not applicable; controlled-writing Apply remains unavailable. |
| Lost provenance | Working admission, working snapshot server/client, Review composition, cumulative restart reads | Material finding fixed. Nested working provenance and all other self-hashed working fields now fail closed if an outer row or snapshot is resealed around changed content. |
| Cross-Project leakage | Working snapshot query and row constraints, Project Review and Brief queries, profile-owned references, typed-client identity checks, existing mismatch tests | No remaining material finding. Reads select by Project, authoritative rows retain Project columns and payload checks, composed records are compared with the requested Project, and the strengthened snapshot reader directly checks each payload's Project and ProjectDefinition binding. |
| Duplicate ledgers or effects | Working and Review repositories, manual checkpoint composition, ChangeSet/Approval/command/event owners, recovery view, cumulative durable counts | No material finding. The path composes accepted owners. The fresh trace retained three executed Apply steps and returned those same three as replayed after restart without adding commands, events, approvals, ChangeSets, or graph outboxes. |
| Stale replay | Exact-current guards, lifecycle revisions, Apply idempotency, restart sequence, Brief and History after restart | No material finding. Two production-server restarts retained Review revision 3 and the post-Apply Brief hash; exact replay returned prior results and stale current-state mismatches remain rejected. |
| Scientific hard-coding | Working profile dispatch, V042 controlled-writing adapter, V043 paired-profile Review composition, Review 1.2/1.3 reader branches, scientific relationship overlay | No material shared-kernel finding. Scientific Claim/ASSERTS and controlled-writing Requirement/GOVERNS remain distinct registered adapters. The scientific-only relationship overlay is an explicit bounded adapter, not a generic kernel claim; controlled writing is not silently cast as science. Scientific ProjectDefinition registration hashes remain definition-owned exact identities, while item 41 explicitly installs canonical registry hashes for the controlled-writing contracts. This audit does not rewrite one rule into the other. |
| Fixture fallback | Production server sources, cumulative harness, exact item 46 browser harness and report | No fallback appears on the demonstrated Wave 4 path. Accepted fixtures seed the disposable stores; browser reads and mutations cross the ordinary workbench clients/controllers and live production routes. The item 46 trace rejects the legacy relationship-view fallback. This is not a repository-wide claim that all older test or grounded-synthesis workflows are fixture-free. |
| Unsupported completeness | Items 41–46 reports, cumulative scripts, item 46 browser/server boundary, `UX1.4-EV01`–`EV06` definitions | Material evidence limit remains and is stated below. No backend report may turn caller labels, setup records, Vite delivery, Chrome emulation, or a scientific-only overlay into broader proof. |

## Fresh-store evidence

The final PostgreSQL integration created a fresh PostgreSQL 18.6 store,
validated and applied migrations V001 through V043, and passed all 156 tests in
16 files. The two new adversarial cases are the PostgreSQL stored-provenance
self-hash rejection and the typed-client lost-provenance rejection. Existing
coverage continues to exercise unauthorized, stale, mismatched, unsupported,
retry, partial-outcome, atomicity, and cross-Project failures.

A separate fresh cumulative run used PostgreSQL 18.6 and Neo4j 2026.07.1. It
started the production server, restarted it twice, read the production routes
through the typed clients, deferred and reopened the scientific Review, applied
the exact human checkpoint, updated the Brief, retained History, and replayed
without duplicate effects. Its final cardinalities remained:

- scientific working candidates and revisions: 2 and 2;
- scientific working relationships and revisions: 2 and 2;
- scientific ReviewSessions and revisions: 1 and 3;
- scientific ChangeSets, Approvals, commands, events, and graph outboxes: 3,
  3, 10, 8, and 2;
- controlled-writing working candidates, relationships, and ReviewSessions: 1,
  1, and 1; and
- controlled-writing ChangeSets, commands, and events: 0, 0, and 0.

The scientific member outcomes remained independently `applied` and
`rejected`. The controlled-writing Review returned `apply_available: false` and
stopped before Apply.

## Counterpart evidence and exact limits

The exact pushed design commit completed item 46 against backend
`b9506065eb2fc57fce55ea8de6413f0ac9c7d72e`. Its headless Chrome trace used the
ordinary Vite-served workbench entry, production route loaders, typed clients,
controllers, frozen renderers, and a same-origin proxy to the live ephemeral
server. It covered ordinary and exception members, independent outcomes,
source return and focus, graph/text parity, keyboard, touch emulation, 200% text,
forced colors, reduced motion, and non-color meaning.

That evidence is bounded. Vite served the assets rather than a deployed static
host. It used one Chrome engine, synthesized touch, and the CDP accessibility
tree rather than a physical device or full assistive-technology session. The
controlled-writing path is demonstrated from stored candidate through Review,
not through Graph, Apply, or Brief. The standalone History route is not part of
the browser path; the Brief renders its server-supplied recent History window.

More importantly, the cumulative backend trace labels repeated authenticated
reads as direct and model-mediated caller seams. Its own report correctly says
that it does not execute an external model or conversational transport. It does
not demonstrate a model-mediated command or its resulting revision. The item
46 browser trace starts from seeded records and likewise does not exercise the
natural-conversation path. The evidence reviewed for item 47 therefore does not
by itself satisfy the natural-conversation record named by `UX1.4-EV01` or the
direct-versus-model-mediated candidate, Review, command, and revision trace
named by `UX1.4-EV03`. Closure item 48 must not declare those proofs complete
from caller labels alone. If it cannot identify or execute the missing exact
evidence, it must leave Wave 4 open rather than widen the claim.

## Verification

Pinned Node 24.20.0 and npm 11.19.0 were selected explicitly.

- The focused Project working-state typed-client suite passed two tests.
- Complete TypeScript and Python typechecking passed.
- `npm run test:postgres:integration` passed all 156 tests in 16 files after
  applying all 43 migrations to a fresh PostgreSQL 18.6 store.
- `npm run test:wave4:cumulative` passed against fresh PostgreSQL 18.6 and
  Neo4j 2026.07.1 stores through two production-server restarts.
- `git diff --check` and the complete `npm run verify` repository gate passed
  on the final tree.

## Felicity review

Felicity review corrected three consequential precision risks in the draft.
The final assessment distinguishes nested record integrity from the outer
snapshot envelope, seed fixtures from response fallback, and caller-designated
read convergence from an external model or conversational command trace. It
also separates the live human-produced exit path from the broader EV01/EV03
evidence requirement and does not describe item 47, item 46, or the cumulative
trace as Wave completion.

## Next safe boundary

Perform exactly closure item 48, owned by design: rerun the material browser
checks, inspect every Wave 4 report and user-facing claim with Felicity, and
verify the authoritative exit trace against `UX1.4-EV01` through `EV06`. Fix
material design findings only. Treat the missing natural-conversation and
external model-mediated command/revision traces above as evidence gaps, not as
proof supplied by caller labels. Declare `wave_complete` only if exact evidence
resolves every required criterion and both branches are pushed; otherwise
return the precise unmet proof without changing backend authority or inventing
a later-wave deferral.
