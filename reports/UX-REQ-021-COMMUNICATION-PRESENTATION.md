# Communication presentation: frozen workbench conformance

Date: 2026-09-13
Design starting commit: `d30deea4b802e5d69050f3eaf5ba164dbf187a1b`
Exact backend counterpart inspected: `5e220d06855d31f2a146e995979c30fcae99afe3`
Communication runtime included through: `67d140fd6804c7ac303d858217beacd2b9be8179`
Prerequisite design closeout: `78c37dfb8e36f9df35e5ae4eef356992f6048606`

## Disposition

The frozen Petra workbench now reads the validated scientific
`CommunicationPlan` through the production `CommunicationPlanClient` and
presents its complete textual peer. The route binds the exact response
identity, revision, content hash, record hash, locale, and optional command and
definition hashes. Duplicate, incomplete, invalid, or mixed communication and
ambient SuggestedAction controls fail before an authority read. A dedicated
communication read does not silently add an unrelated latest Project thread.

The presentation keeps the plan's returned segment order and registered
communicative families, original text, exact references and source-span
selections, statement force, conditions, limitations, structured-preservation
result, and language-validation result. It separately presents source and
current response state, cache and delivery observations, action command, Work,
result, current action delivery, recovery assessment, complete validation
receipt, coverage, omissions, provenance, renderer, and read-position
bindings.

A blocked receipt is an assertive visible alert: the record says that language
validation is blocked, full response-language validation is incomplete, no
repair was recorded, and the record is not a validated answer. Passed
structured preservation remains visible per segment but never replaces or
softens that blocked outcome. The composition is explicitly read-only and
grants no command, Review, recovery, or Project authority.

No consequential product, architecture, authority, information-hierarchy, or
freeze decision remains open in this slice. The change is limited to frozen
frontend registry closure, route loading, presentation, responsive and
accessibility behavior, tests, browser fixtures, and this report. No backend
contract, server, persistence, migration, or backend authority file changed.

## Production boundary and failure behavior

The existing `/projects/:projectId/petra` workbench route still owns the
`loadProjectPetra` loader and `PetraSurface` renderer. When explicit
communication controls are present, the loader invokes the production typed
client. The browser contract registry supplies the installed schemas and exact
contract hashes that the client requires to validate the full returned graph.
The renderer receives only a plan that has passed the client's schema, request,
owner, original-content, segment consistency, invocation-result, and installed
contract checks.

The browser proof observed exactly one authenticated communication request and
no fixture or component fallback. An HTTP 422 response rendered the route's
visible error boundary and no communication record. The test harness supplied
synthetic HTTP transport around the accepted records, but it used the
production workbench loader, typed client, browser schema validation, and
frozen renderer. It did not replace their validation or presentation logic.

## Browser and textual evidence

Real headless Chrome through the DevTools protocol reproduced an action-linked
plan with four ordered families: attributed report, Petra assessment,
inference, and action report. The first two statements remained visibly blocked
for structured preservation while the later two passed. Exact Claim,
Assertion, SourceSpan, and command identities remained readable. The action
report kept the failed operation, completed/worker-failed Work, available result
with no authority effect, cancelled current delivery, recovery eligibility, and
limitations as separate observations.

The same browser run proved:

- keyboard Enter toggles the complete validation receipt without losing focus;
- Tab advances to the exact-record disclosure and Enter opens it;
- a 375 CSS-pixel viewport at 200% root text size has no horizontal document
  overflow;
- the recovery disclosure has a 44 CSS-pixel target and opens through an
  emulated touch sequence;
- forced colors retain a visible notice border;
- reduced motion collapses transition duration;
- preservation states include visible words and symbols instead of depending
  on color; and
- the accessibility tree contains headings for all four communicative
  families.

This is complete textual parity for the bounded scientific plan exercised
here. It does not claim a successful language validator, repair, controlled-
writing presentation, or controlled-writing Apply path.

## Verification and limits

Pinned Node 24.20.0 and npm 11.19.0 were selected explicitly.

- Workbench TypeScript checking passed.
- The focused loader and renderer suite passed 71 tests across two files.
- The production workbench build passed.
- The Chrome interaction and accessibility matrix passed all checks listed
  above, including visible failure without fallback.
- `git diff --check` passed.
- The complete `npm run verify` gate passed: 534 contract, 300 core, 81 adapter,
  15 retrieval, 106 server, 235 workbench, 25 Python, and eight handoff tests
  passed. Neo4j and S3 each passed three tests; their seven service-dependent
  skips provide no integration evidence. The initial sandboxed gate could not
  bind existing server tests to `127.0.0.1`; the complete rerun with localhost
  socket access passed.

This slice changes no persistence or PostgreSQL behavior, so no new PostgreSQL
integration run is required. Browser transport was synthetic and did not run a
live server or PostgreSQL store. The evidence also does not cover a physical
touch device, a full assistive-technology session, the paired-profile Review,
or the cumulative production browser/server trace. Those limits prevent this
slice from independently closing `UX1.4-EV01` through `UX1.4-EV06` or Wave 4.

## Felicity review

Felicity review covered this report and the new user-facing communication copy.
It found two consequential clarity risks and they were corrected: raw `none`
no longer renders as the unnatural “None authority effect,” and a standalone
communication record no longer labels its side panel as an active task context.
The blocked-validation notice now describes retained information without
phrasing it as an unsupported recovery instruction. No material meaning,
reasoning, structure, audience-fit, or natural-voice issue remains after those
corrections.

## Next safe boundary

Perform exactly closure item 43: compose the registered controlled-writing
candidate and governing relationship through the same durable ReviewSession
kernel as the scientific member. Keep scientific and controlled-writing
semantics distinct, and do not invent a writing mutation command, ChangeSet
operation, approval, or Apply path. Do not begin the paired-profile frontend
mapping in that backend slice.
