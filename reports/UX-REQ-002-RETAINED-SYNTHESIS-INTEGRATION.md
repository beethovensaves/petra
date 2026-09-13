# Retained synthesis in the Project Brief

Date: 2026-09-13
Design starting commit: `f4fd39d0373b6c973d092b91687d9baf20932c6f`
Exact integrated backend commit: `f128a026edb0dff5a5e7b86a0d724bf45c74a724`
Authority: [UX-REQ-002](UX-BACKEND-HANDOFF.md#ux-req-002--task-oriented-profile-resolved-projectbriefview),
[frozen DB07](PETRA-UX-DESIGN-BRIEF.md#db07--project-brief), the
[first conformance review](UX-REQ-002-PROJECT-BRIEF-CONFORMANCE.md), and the
[retained synthesis read](UX-REQ-002-RETAINED-SYNTHESIS.md).

## Bounded integration

The production Brief route now consumes the authenticated `ProjectBriefClient`
read and renders its supported observations in DB07's seven-section order.
Current state presents each retained addressing result separately, with its
original statements, statement origins, evidence references, limitations, and
unresolved-inference resolution requirement. This is a partial Brief mapping;
it does not establish full DB07 acceptance or close Wave 4.

The route no longer uses shell-derived attention or a shell read position as
its Brief composition. Its captured Objective, definition, projection, Review,
Work, inquiry links, sources, actions, and History remain inspectable. The shell
can have a separate read position; the page explicitly distinguishes it from
the Brief snapshot. The existing fixture `BriefSurface` remains available to
the reference tests, but the production `BriefRoute` cannot fall back to it.

| DB07 role | Implemented observation and limit |
| --- | --- |
| Current focus | Exact Objective statement, read time, snapshot hash, and visible partial-coverage limitations; full profile, Objective, authority, and projection records in disclosure. |
| Needs your attention | Server order, first returned observation expanded, native exclusive disclosure for remaining observations, exact owner records, and all returned Review manifests. Empty coverage says only that no items were returned. No recommendation is inferred from a reason or array position. |
| What changed | Current-only reason and explicit unavailability of historical Brief comparison. The renderer can preserve an already supplied event interval, but this route accepts no comparison controls and never silently substitutes a current-only read for one. |
| Current state | Separate retained results and statement origins; linked and current response revisions; current cache state; original evidence snapshot; complete inquiry links, output, packet basis, omissions, exclusions, freshness, and source observations in disclosures. Query coverage, source coverage, and original packet coverage remain distinct. |
| Work | Complete returned Work revisions, execution outcomes, and result provenance are inspectable. This bounded mapping does not manufacture a newly-completed subset or claim inquiry resolution from completion. Dedicated active-Work summaries remain further interface work. |
| Next steps | Returned inspect-result action titles and reasons with their exact snapshot records. An explicit selection reads a current preview through the existing action loader; that preview is labeled as a separate observation with its own basis and freshness. No preferred recommendation or ranking is inferred. |
| Recent decisions | Returned recent-ten effect summaries and complete event, command, actor, outcome, and recovery records. No fixture-backed event-detail link or Revert execution is enabled. |

Packet and owner disclosures use complete textual JSON records. They preserve
inspection coverage, but are not a claim that every owner has a dedicated
task-oriented detail presentation. No client calculation merges interpretations,
assesses Hypothesis standing, grants admissible inquiry basis, accepts findings,
resolves an inquiry, creates Work, or changes authority. Opening a disclosure
does not make another request.

## Browser registration and failure boundary

Both Brief versions and their research payloads are registered with the full
transitive schema dependency set in the browser validator. Version dispatch
reads only the envelope version before validation, selects the installed schema,
and hashes its canonical JSON. The typed client then validates the same single
authenticated response, including its exact profile and snapshot bindings.
The response's claimed registration hash is never used as the trusted hash.

Installed payload hashes, checked against the accepted contract registry:

- `research-brief-payload@1.0.0`:
  `sha256:c35f42c95d1b0b8829d1c2e5a187c7f324ff2b340823d4840623b07aff699839`
- `research-brief-payload@1.1.0`:
  `sha256:974650429696adcb0fc823e75a6036579d705489131bc92a3558c517fac36709`

The 1.0 mapping explicitly states that retained synthesis is unavailable in
that registered version. No ProjectDefinition is opted in or revised by the
frontend. Missing registration or Objective, unauthorized reads, unsupported
versions, stale bindings, corrupt records, and service failures fail visibly.
The user can reload to retry; this slice adds no cached-view retention or
historical Brief ledger. Projects without an authoritative Brief registration
therefore see an unavailable read, not a fabricated or automatically upgraded
Brief.

## Verification and writing review

Node 24.20.0 and npm 11.19.0 were used throughout. The four focused suites passed
102 tests, including 20 new Brief cases. The complete `npm run verify` gate
passed, including 515 contract, 240 core, 54 adapter, 101 server, and 231
workbench tests, plus the remaining repository checks. Seven service-dependent
skips in the ordinary gate are not counted as executed integration cases.

`npm run test:postgres:integration` passed 153 tests in 16 files on a fresh store
after migrations V001–V041, and the runner verified disposal with zero labeled
resources remaining. This covers the integrated backend reader changes; the
design additions change no persistence or PostgreSQL behavior. Those cases
exercise both Brief versions, retained original synthesis and invalidation,
snapshot-consistent concurrent reads, and canonical application/History updates.

The focused loader, Brief rendering, reference rendering, and interface-recovery
suites exercise successful reads, retries, explicit current action selection,
unsupported comparison controls, HTTP failures, and resealed Objective, profile,
statement, packet, omitted-result, omitted-action, and cross-Project mismatches.
They also check origin labels, retained invalidation, exact packet identities,
bounded empty language, and the absence of live History links.

The mounted Chrome harness uses the production loader, typed client, browser
schema registry, `BriefRoute`, and frozen rendering styles with synthetic
transport only. It checks the seven headings, origin headings in the
accessibility tree, keyboard and touch packet disclosure, retained focus,
no extra disclosure requests, 44px touch targets, 375px at 200% text scaling,
forced colors, reduced motion, and visible HTTP 422 failure without fallback.
The touch harness waits for viewport scrolling to settle before injecting input.
Run it with the workbench on port 4314, an isolated Chrome CDP page on 9434,
and `node apps/workbench/test/project-brief-browser.mjs`.

Felicity review found no material overclaim in the backend retained-synthesis
report. The earlier conformance findings are addressed on the new production
path: empty attention is bounded, inspection reasons are not recommendations,
and current-only observations are not labeled as baseline changes. This report
retains the limits of the raw-record disclosures and synthetic browser transport.

## Next safe boundary

Backend can inspect the accepted `UX-REQ-021` and DB15/DB16 owners for one bounded,
ProjectDefinition-resolved CommunicationPlan and language-validation receipt
around an existing response and one linked recommendation or action report.
Reuse the exact GroundedResponse, output, SuggestedAction, Work, event, and
validation owners. If the registered terminology, discourse, force, or validator
contract is insufficient, return the precise dependency or decision instead of
inventing it. Communication must not grant authority or reinterpret an addressing
result as an accepted finding. No frontend edit is requested in that backend slice.

Remaining separate work includes richer task-oriented Brief disclosures and Work
summaries, current-only failure retention, authoritative comparison and newly
completed Work, preferred actions, live History navigation, full Brief coverage,
CommunicationPlan, another materially different registered profile, and the
cumulative live exit trace. This slice does not join PostgreSQL persistence to
browser automation, exercise direct/model-mediated identity convergence, or
close UX1.4-EV01–EV06. Wave 4 remains open.
