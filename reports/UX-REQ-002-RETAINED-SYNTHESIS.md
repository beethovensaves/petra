# Current state: retained scientific synthesis

Date: 2026-09-13
Backend starting commit: `ca7c723f421c3f652937483cdd31942a44a10099`
Exact integrated design commit: `f4fd39d0373b6c973d092b91687d9baf20932c6f`
Authority: [UX-REQ-002](UX-BACKEND-HANDOFF.md#ux-req-002--task-oriented-profile-resolved-projectbriefview),
[frozen DB07](PETRA-UX-DESIGN-BRIEF.md#db07--project-brief), and the
[design conformance review](UX-REQ-002-PROJECT-BRIEF-CONFORMANCE.md).

## Supported synthesis

The opt-in `petra.research-brief-payload@1.1.0` adds a bounded Current state
composition of existing scientific synthesis outputs. The Brief reads each
successful model call's typed output unchanged. Source reports, Petra synthesis,
and unresolved inference retain their separate origins, exact evidence references,
limitations, and resolution requirements. This read starts no model call or Work.

Selection uses immutable `ProjectInquiryLink` records anchored to the exact current
Objective revision. The existing scientific adapter admits GroundedResponse
results only with bearing `addresses`; that association does not establish
admissible inquiry basis, accepted findings, or inquiry resolution. This slice
uses that accepted boundary and adds no stronger bearing or authority owner.

Each returned synthesis preserves:

- its exact inquiry-link identity, with the complete link retained in the Brief;
- the exact linked GroundedResponse, including Artifact, model, producing Work,
  InteractionRun, dependency, terminal, and original evidence-snapshot references;
- the currently stored GroundedResponse revision, including cache invalidation
  and its recorded causes, separately from the linked revision;
- the complete immutable ContextPacket and EvidencePacket, including exact object
  and source-span references, source-access limitations, selection traces,
  omissions, exclusions, coverage, and original freshness observations; and
- the successful model call's complete `model-synthesist-output@1.0.0`, bound by
  the GroundedResponse's `model_output_hash`.

The existing owners therefore support a synopsis of retained addressing results.
They do not yet support authoritative current inquiry understanding or a merged
assessment of scientific standing. Multiple results remain separately attributable;
this read does not reconcile disagreements, rank interpretations, or select a
preferred result. Hypothesis development and standing remain M3.

## Version, snapshot, and coverage boundary

`project-brief-view@1.1.0` binds the new payload. The existing authenticated endpoint
resolves 1.0 or 1.1 from the exact `scientific.research-brief` registration and its
installed schema hash. Both original 1.0 schemas remain unchanged. No existing
ProjectDefinition is revised automatically. Unknown versions, mismatched hashes,
and unsupported profiles fail closed. The typed client supports both versions and
still requires the caller's installed payload schema hash.

All additional reads use the Brief's existing PostgreSQL `REPEATABLE READ READ ONLY`
transaction. No table, migration, ledger, command, or mutation contract is added.
The complete retained synthesis composition contributes to `snapshot_hash`:
changing a current response revision invalidates a previously requested Brief
snapshot without rewriting the linked output or its original evidence snapshot.

Coverage names the addressing results in the returned current-Objective links.
The link query retains its twenty-record bound, shared with Work links, and
reports whether that query was truncated. Every returned addressing link has one
complete synthesis entry. Empty results establish only that no addressing result
was returned within that query. They cannot establish absence of relevant evidence
or unresolved questions. Source-inventory coverage and each packet's original
coverage remain separate observations.

A reusable response is not a claim that its original evidence snapshot represents
the complete current Project. An invalidated response remains inspectable with its
original statements and the current invalidation record. The reader checks exact
stored owner hashes, successful model-call validation, output identity, Project and
producing-Work bindings, packet snapshots, and statement-to-packet references. These
checks preserve recorded evidence; they do not reassess scientific truth or grant
permission to act.

## Verification and design handoff

Node 24.20.0 and npm 11.19.0 were used throughout. The two focused Brief route
tests passed. The complete `npm run verify` gate passed, including 515 contract,
240 core, 54 adapter, 101 server, and 211 workbench tests, plus the remaining
repository checks. The gate retains seven expected service-dependent skips;
these are not claimed as executed integration cases.

`npm run test:postgres:integration` passed 153 tests in 16 files on a fresh
PostgreSQL store after migrations V001–V041. The runner completed disposal with
zero labeled resources remaining. Both Brief versions were exercised through the
authenticated route and typed client with empty synthesis coverage, complete
Review/source preservation, stable retries, and rejected mismatched bindings.
The retained-output cases preserve all three statement origins and exact packet
records; the input is checked with the existing GroundedSynthesisValidator.
Tampered output, packet snapshots, evidence basis, cross-Project current responses,
duplicate or omitted synthesis entries, and missing Work/action entries fail.
A canonical compensating reversal and GroundedResponse invalidation produce a new
Brief snapshot after reader reconstruction, while preserving the original linked
response and output. Repeated reads create no additional response revisions,
commands, or events. The existing concurrent-commit composition cases also pass.

The first PostgreSQL run exposed a test-fixture mismatch: its model call contained
only a source report. The fixture setup now includes and validates synthesis and
unresolved inference for these cases. Initial lint findings were corrected before
the successful complete gate. No failed check remains open.

Felicity review found no material writing issue in this report's bounded claims.
The report distinguishes retained model synthesis from authoritative current
understanding, original evidence snapshots from historical Brief snapshots, and
query coverage from scientific completeness. The design review's existing
presentation findings remain open. No live browser rendering, accessibility,
direct/model-mediated convergence, or UX1.4-EV01–EV06 closure is claimed here.

Design's next bounded task is to review and map this supported synthesis subset
within Current state, preserving its explicit limitations. Register both 1.1
schemas and their dependencies in the browser validator before consumption. Keep
statement origin, per-result evidence snapshot, current cache observation, exact
basis, and query coverage visible or inspectable. A linked result's addressing
bearing must not become an accepted finding or an assessment that the Objective
is resolved. The two versions require their respective installed payload hashes.

This slice changes no frozen component, CSS, browser route, or presentation
fixture. It does not enable the fixture-backed History event-detail route for live
references. Attention ranking, preferred recommendations, newly completed Work,
historical Brief snapshots, CommunicationPlan, another profile, and the cumulative
live interface proof remain separate work. Wave 4 remains open.
