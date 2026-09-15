# Wave 4 cumulative production browser trace

Status: fixed closure item 46 passed; the backend adversarial authority audit
and final design exit audit remain open
Date: 2026-09-14
Design starting commit: `195c8072af143d605a82e8a738acb14a2826e827`
Exact backend counterpart inspected:
`b9506065eb2fc57fce55ea8de6413f0ac9c7d72e`

## Result

The frozen Petra workbench completed the cumulative scientific path against
live production server routes backed by fresh PostgreSQL 18.6 and Neo4j
2026.07.1 stores. The path rendered the working relationship overlay, ordinary
and exception Review members, the exact source and return target, the manual
Apply checkpoint, independent applied and rejected outcomes, the changed Brief,
and its complete recent History window. After the first server restart, the
selected identities converged. After Apply, the second restart retained the
exact changed Brief snapshot and returned three replayed command observations
without a duplicate effect.

The same browser run rendered the stored controlled-writing Review through the
shared Review route. It exposed Requirement and governing-link records while
keeping commitment preparation and Apply unavailable. The run did not request
or add a controlled-writing Apply, Brief, ChangeSet operation, Approval, command,
event, or projection path.

The live overlay found one design-owned conformance defect before the passing
run: its authoritative focus is the returned Assertion relationship, while the
client mapper had accepted only an authoritative node focus. The mapper now
resolves one exact current node directly or one exact current relationship to
that relationship's returned target node. A missing, mismatched, dangling, or
ambiguous focus still fails closed. No predicate or authority meaning is
calculated in the client.

Source return had a second design-owned fixture dependency. The Review link now
carries the exact Review and basis identities into the source route, and the
return route uses only those identities. It no longer consults the reference
Review fixture. The Project shell restores keyboard focus to the exact returned
basis after the production Review reload.

No consequential product, architecture, authority, information-hierarchy, or
freeze decision remains open in this slice. No backend contract, server,
persistence, migration, or backend authority file changed.

## Browser/server transport boundary

`npm run test:wave4:browser` runs the exact counterpart cumulative harness from
`scripts/test-wave4-cumulative-integration.mjs` through a temporary,
fail-closed instrumented copy. It adds browser steps at named harness boundaries
and deletes that copy after the run; it does not modify the tracked backend
harness.

The browser side is an isolated headless Google Chrome process controlled
through the Chrome DevTools protocol. An ephemeral Vite SPA server loads the
ordinary workbench entry, router, route loaders, browser contract registry,
typed clients, controllers, and frozen React renderers. Its same-origin
middleware reverse-proxies only `/api/*` and `/health` to the currently active
ephemeral production server, forwarding the bearer credential and request body,
then returning the upstream status, bytes, and safe response headers without
substituting response data. The server URL callback follows the restart before
Apply; the cumulative harness later performs a second restart for replay.

The cumulative harness creates the test records in fresh stores. Those records
are setup, not response fixtures: every demonstrated browser read and mutation
crosses the workbench route and live server route. The browser trace asserts a
200 relationship-overlay response and rejects use of the legacy
relationship-view fallback on that Graph path. It also observes authenticated
Project, Review, source, prepare, Apply, and Brief traffic. The updated Brief is
the server-composed `ProjectBriefView`; its embedded recent-decisions window is
rendered directly, and the workbench makes no second `/history/recent` read.

This boundary is production client/controller and server-route evidence, but
the browser assets are delivered by Vite rather than a deployed static host.
The complete repository gate separately builds the production workbench bundle.

## Interaction, parity, and accessibility evidence

The passing Chrome run established the following bounded evidence:

- the visual Graph and complete textual peer contain the same object and
  relationship cardinalities as the live overlay response;
- the textual peer retains object and relationship labels, meaning, scope,
  basis, direction, validation, and working-authority wording;
- keyboard Enter toggles the text peer, selects the exception and ordinary
  Review members, opens the exact source, returns to Review, and prepares the
  commitment while retaining expected focus;
- the source return restores both the exact URL fragment and focus to the
  server-returned Review basis;
- the accessibility tree exposes the Review member, comparison, Basis,
  Consequences, and Decision headings, the Origin definition term, and the
  announced status role;
- at a 375 CSS-pixel viewport and 200% root text size, the prepared Review has
  no horizontal document overflow;
- the Apply target is at least 44 CSS pixels high and one synthesized touch tap
  sends exactly one Apply request;
- forced colors retain visible validation and selected-member boundaries;
- reduced motion collapses the Apply control's transition duration; and
- Current, Candidate, validation, and Apply meaning remain present as text and
  do not depend on color.

The Apply response presents every member outcome without describing the whole
Review as applied: the ordinary member is applied, the exception member remains
rejected, and the applied ChangeSet's effect is separately confirmed. The
updated Brief renders every summary in the eight-record server-returned History
window, including the three new command-event effects, with the same returned
cardinality.

## Durable evidence

The integrated passing trace retained these exact outcome facts across two
production-server restarts:

- scientific Review revisions: 1, 2, and 3;
- Apply observations: three `executed` steps;
- restart observations: three `replayed` steps;
- Review outcomes: `applied` and `rejected`;
- scientific working candidates and revisions: 2 and 2;
- scientific working relationships and revisions: 2 and 2;
- scientific Reviews and revisions: 1 and 3;
- scientific ChangeSets, Approvals, commands, events, and graph outboxes: 3,
  3, 10, 8, and 2;
- controlled-writing working candidates, relationships, and Reviews: 1, 1,
  and 1; and
- controlled-writing ChangeSets, commands, and events: 0, 0, and 0.

The scientific Brief snapshot changed after Apply and remained byte-identical
after restart. Caller-designated scientific working and Review reads, and
controlled-writing working and Review reads, converged on their exact content
hashes. Those repeated authenticated reads exercise one shared caller seam; they
do not execute an external model, a natural-conversation candidate path, a
model-mediated command, or that command's resulting revision.

## Verification and limits

Pinned Node 24.20.0 was selected explicitly.

- Focused workbench TypeScript checking passed.
- The focused Project-data, workbench-return, and Review/Graph suite passed 108
  tests across three files.
- Focused ESLint passed for every changed TypeScript, TSX, and browser-harness
  file.
- `npm run test:wave4:browser` passed the fresh-store production browser trace,
  including its complete cumulative persistence, restart, replay, and durable
  cardinality assertions.
- `git diff --check` and the complete `npm run verify` gate passed on the final
  tree.

The trace uses Chromium touch emulation, not a physical touch device, and CDP's
accessibility tree, not a full assistive-technology session. It is one browser
engine rather than a cross-browser matrix. The controlled-writing
relationship-overlay transport remains scientific-only, so controlled writing
is demonstrated live from stored candidate through Review 1.3 only. A
controlled-writing Graph, Apply, and Brief are not claimed. The standalone
History route is outside this demonstrated path; the live Brief renderer shows
the complete server-supplied recent History window.

These boundaries do not invalidate closure item 46, but they prevent this slice
from declaring Wave 4 complete before the required backend item 47 and final
design item 48 audits.

## Felicity review

Felicity review covered this report and the changed return behavior. The final
pass found two material precision risks and corrected them: the draft collapsed
the pre-Apply and post-Apply restart evidence into one claim, and it overstated
which proxy headers are forwarded. The final language distinguishes live server
evidence from setup records, Vite delivery, and browser emulation; limits
caller-designated read convergence to the tested seam; separates Review outcomes
from ChangeSet effects; names the controlled-writing and History limits; and
makes no Wave-complete claim. No material meaning, reasoning, structure,
audience-fit, or natural-voice issue remains.

## Next safe boundary

Perform exactly closure item 47, owned by backend: audit the cumulative evidence
for implicit authority, lost provenance, cross-Project leakage, duplicate
ledgers or effects, stale replay, scientific hard-coding, fixture fallback, and
unsupported completeness. Fix material backend findings only, rerun the
complete gate and fresh PostgreSQL integration, and do not declare completion
if a required proof is absent. Do not begin the final design exit audit in that
backend slice.
