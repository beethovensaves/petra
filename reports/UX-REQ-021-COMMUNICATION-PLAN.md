# First scientific communication plan and scoped receipt

Date: 2026-09-13
Backend starting commit: `f8314be210d3df8c1a271e503af1b9c44944a287`
Exact design counterpart inspected: `3a5772eb2b98be06710077987a5dd814e314898c`
Authority: D022, UX-REQ-004/021, frozen DB15/DB16, the communication-owner and
resolver reports, and the counterpart's communication-resolver conformance report.

## Implemented boundary

`communication-plan@1.0.0` and `communication-validation-receipt@1.0.0` add a
read-only scientific composition around one exact retained GroundedResponse and,
when supplied, one exactly linked SuggestedAction invocation. No communication
store, command, or independent authority ledger is created. The first receipt
always reports language validation as `blocked` and `incomplete`: its executed
structured-preservation checks do not establish full response-language validity.
No response repair is implemented or claimed.

The authenticated endpoint is
`GET /api/queries/projects/:projectId/communication`. It requires `response_id`,
`response_revision`, `response_content_hash`, and `response_record_hash`.
`command_id` selects the exact invocation; omission returns explicit missing
linkage. `locale` defaults to exact `en`; other locales fail closed.
`expected_definition_hash` optionally guards the current composition definition.
Repeated or unknown controls are rejected. The renderer-neutral
`CommunicationPlanClient` checks the response schema, installed composition hashes,
content hash, exact requested Project, response, invocation, and definition
bindings, and unchanged source output and statement content. The production server configures the reader through Project shell
persistence. No frozen React, CSS, browser route, or presentation fixture changed.

D022's bearer authentication and exact Project scope establish read visibility.
The reader does not resolve a command principal or treat capability grants as
read permission. It reads canonical owners in one PostgreSQL repeatable-read,
read-only transaction. The existing invocation reader now exposes its composition
inside a caller-owned transaction; its standalone endpoint retains its transaction
wrapper and existing recovery behavior. A deny-only command authorizer prevents
this communication composition from acquiring mutation authority.

## Preserved facts and limits

The plan includes the exact source response and its separately observed current
revision, original ContextPacket and EvidencePacket, original model call/output,
Artifact identity, attributable Actor records, and available exact scientific
records from the original Project packet. Stored record hashes, content hashes,
model-request completion, model certification/deployment, and the source Work
revision are checked through their existing owners. A unique exact product turn
retains its thread and original definition binding. Missing or ambiguous turn
linkage is explicit; protocol identity cannot replace it.

The original Artifact's hash, media type, and byte size remain unchanged. This
reader does not fetch object-store bytes or re-render the original answer. Original
statement text, order, origin subtype, evidence selections, SourceSpan selections,
limitations, resolution requirements, and packet coverage remain inspectable in
the canonical output and ordered segments. Missing or inconsistent segment evidence
blocks that segment's preservation check while other segments remain available.
Corrupt required owners fail the whole read.

The installed ProfileCommunicationResolver supplies shared families and exact
reference labels. Labels retain canonical identity, revision, hash, textual peer,
and explicit generic-fallback limitations. Original scientific records remain
available alongside them. Reference source-language resolution is unavailable in
this first adapter; no translation validation is claimed. Structured force,
conditions, inference rule, and author decision remain unavailable in the source
schema; the original content is retained rather than interpreted into new fields.
The recording service Actor is not attributed as the source author or approving
human.

Current definition and profile-contract bindings belong to this composition.
Original prompt and gateway-validator observations remain in the model call.
Unrecorded source-time communication, terminology, and renderer versions remain
unrecorded. The original evidence snapshot, current response cache state, and
current authority read position retain separate meanings. An invalidated current
response does not rewrite its earlier retained content.

A linked action report carries the canonical immutable command receipt, Work
execution state and terminal outcome, result availability, bounded Work History,
and current owning recovery assessment. The source response's delivery record
and the current invocation's delivery record are separate fields, including when
an invocation reuses an earlier result. Failed Work, available results, and stopped
delivery do not collapse into success. `retry_exact_start` remains the existing
owner's pre-registration operation; communication creates no retry eligibility.
History retains the existing first-100-revisions limit. Projection is explicitly
`not_observed`; the authority position is not a projection completion claim.

The receipt names the checks executed and preserves their findings. Full family,
reference-language, producer-attribution-language, force, condition, action-language,
progressive-language, and accessible-text equivalence checks remain
`not_performed`. The schema rejects fabricated `passed` or `repaired` receipt
outcomes and non-null repair provenance. Segment preservation is a narrower
integrity observation, not permission to present the segment as language-validated.

Repeated reads preserve unchanged canonical observations; transaction timestamps
can change. When an invocation is present its owning view also carries a read
timestamp, so the enclosing content hash can change without a changed result or
new authority record. No durable communication identity or lifecycle is inferred
from a read timestamp.

## Verification and review

Node 24.20.0 and npm 11.19.0 were used. The focused communication suites
passed 15 core, 11 typed-client, and two authenticated-route tests. They cover
partial preservation, missing linkage, mismatched Project/response/Artifact/Actor/
packet/delivery identities, unsupported locales and validators, retained historical
cache invalidation, failed Work, stopped delivery, exact client request bindings,
and rejection of fabricated language-validation outcomes.

The complete `npm run verify` gate passed: 531 contract, 300 core, 65 adapter,
15 retrieval, 103 server, 231 workbench, 25 Python, and eight handoff tests. Neo4j
and S3 each passed three tests; their seven service-dependent skips are not
integration evidence. The gate initially found lint issues and missing Python
contract parity. The fixes include preservation of required null values so that
explicit unavailable linkage and repair provenance survive Python round trips.
The focused Python contract suite passed all 11 tests, and the complete rerun
passed.

`npm run test:postgres:integration` passed 154 tests in 16 files on a fresh store
after migrations V001–V041. The runner completed disposal with no remaining
labeled resources. Communication cases exercise exact source owners, all three
preserved statement families, a linked completed invocation, source-time thread
revision 1 alongside composition definition revision 2, mismatched and unsupported
requests, unchanged owner cardinalities across repeated reads and reader restart,
and a concurrent definition revision. That concurrent revision remains outside
the in-flight snapshot; the following read rejects its unsupported registration.
Core tests supply the failed-Work/stopped-delivery combination; this report does
not claim that combined lifecycle was newly executed through PostgreSQL.
`git diff --check` passed. Markdown is excluded from repository formatting checks
and received the separate writing review below.

The engineering pass checked implicit authority, duplicate ledgers, Actor
attribution, source/current identity separation, partial outcomes, and fixture
fallback. It added exact original model-request, certification, Work, and
thread-definition checks and kept invocation recovery inside its existing owner.
The client review added regression cases for recomputed-envelope substitutions
of original model output, segment text, packet content, and the current Project.
Felicity review of this report and the new API/receipt language found no material
writing issue within the stated scope. In particular, `preservation: passed` is
explicitly distinguished from the blocked language receipt, and an Artifact
reference is not described as freshly fetched byte evidence.

## Next safe boundary

Design may perform one bounded conformance review of this committed runtime slice
against the pinned resolver handoff and DB15/DB16. Review the missing/ambiguous
linkage, reference fallback, separate source/current delivery, partial preservation,
blocked language receipt, and explicit projection limitation before proposing a
frozen frontend integration. This backend slice authorizes no frontend integration.

Full response-language validation and repair, richer source-language resolution,
versioned rendering, task-oriented accessible presentation, another materially
different profile, and cumulative live exit evidence remain later work. This slice
provides no fresh browser or assistive-technology evidence and does not close
UX1.4-EV01–EV06 or Wave 4.
