# UX-REQ-016 Project inquiry read

Status: first live collection/detail and frozen Work-linkage slice passed; broader inquiry semantics and commands remain partial
Date: 2026-09-08
Design boundary: `UX-DESIGN-FREEZE-01`

## Result

Petra now exposes ProjectDefinition-mapped inquiry anchors through a bounded
Project collection and exact detail read. The implementation uses the existing
ProjectObjective as the scientific profile's inquiry identity; it does not add
a universal Inquiry record or make the scientific mapping mandatory for other
Project definitions.

The authenticated API provides:

- `GET /api/queries/projects/:projectId/inquiries`, with bounded pagination and
  optional authored-status and exact WorkUnit filters; and
- `GET /api/queries/projects/:projectId/inquiries/:objectiveId`, keyed by the
  mapped Objective identity.

Both responses conform to `petra.project-inquiry-view@1.0.0` and carry the exact
current ProjectDefinition reference, canonical content hash, read timestamp,
and repeatable-read authority position.

## Meaning and lifecycle boundary

The collection reports each inquiry's original and current authored framing,
authored status, parent and dependency coverage, exact Work/result link counts,
current operational Work counts, and its Brief semantic destination. An
inquiry with no Work remains visible. Many Work tasks may address one inquiry,
and one Work task may address several inquiries.

Authored inquiry status and operational Work state remain separate. A completed
WorkUnit is reported as completed, but it does not mark an active inquiry
satisfied. The contract names this boundary `authored_status_only`.

Exact detail adds complete retained Objective framing revisions, related parent
and dependency records, exact inquiry-link records, linked Work revisions and
their current WorkUnit revisions, and exact typed result links. The initial
GroundedResponse adapter can report only that a result `addresses` the inquiry.
It cannot supply admissible basis, an accepted finding, resolution, or a
recommendation.

Current understanding, admissible basis, recommendation, and semantic commands
remain explicitly unavailable because no owning authority records exist for
them. The active authored framing may be shown as an open question, but Petra
does not infer a richer question set.

## PostgreSQL and API behavior

The PostgreSQL reader runs each collection or detail request in a read-only
repeatable-read transaction. Before returning data, it reproduces and validates
the exact ProjectDefinition, inquiry-role mapping, Objective revisions,
ProjectInquiryLink records, WorkUnit revisions, GroundedResponse result, stored
record hashes, and Project authority position. Cross-Project identities return
no record, invalid bounds fail closed, and an absent current definition mapping
or unsupported Brief destination is not borrowed from another profile.

The server rejects unknown or repeated query parameters, invalid limits and
cursors, invalid authored statuses, malformed WorkUnit filters, and malformed
Objective identities. It validates the final response contract and verifies
that the reader returned the requested Project, view kind, query, and inquiry
identity.

## Frozen Work integration

The existing frozen Work collection and detail surfaces now consume the inquiry
read without changing their CSS, layout, route structure, or component
hierarchy. The Work collection obtains exact inquiry details so its existing
inquiry-path cards can use real many-to-many Work links. Exact Work detail uses
the inquiry collection's WorkUnit filter to show every returned inquiry that
the selected Work task addresses.

The browser labels inquiry state as authored state, shows operational counts
separately, and does not synthesize a recommendation. Work outside the current
bounded page is disclosed rather than counted as absent. The pre-existing
fixture presentation remains available only as conformance data; live Project
routes use the authorized APIs.

## Verification

The focused increment passes:

- 339 TypeScript contract, registry, generation, hash, and fixture cases;
- 25 strict Python/Pydantic worker cases, including both inquiry views and
  RFC 8785 content-hash parity;
- 98 real PostgreSQL 18.6 cases after Flyway V001 through V023;
- 41 server cases, including authenticated inquiry collection/detail routes;
  and
- 84 frozen-workbench cases, including live inquiry-to-Work composition.

The complete repository gate passes with 671 always-on tests and seven expected
service-dependent skips, together with generated-contract/hash checks, the M1
retrieval-floor check, formatting, lint, TypeScript/Python type checks, and the
production workbench build.

The PostgreSQL proof covers zero Work, two Work tasks on one inquiry, shared
Work across two inquiries, Work-filtered collection reads, exact addressing
results, retained active authored status after operational completion,
cross-Project absence, invalid query rejection, and immutable authority.

## Remaining UX-REQ-016 work

This slice does not close the neutral requirement. Remaining work includes:

- other ProjectDefinition-valid single-record or linked-set inquiry adapters;
- authoritative current-understanding and admissible-basis records;
- accepted-finding adapters with explicit authority effects;
- evidence-backed recommendation and ordering records that remain advisory;
- create, revise, focus, link, and unlink commands with impact and recovery;
- broader Brief, Details, Graph, Petra, Review, and profile-tool composition;
- paired-profile `UX-FX28` coverage for criteria, alternatives,
  method/interpretation, and optional Hypothesis-centered roles; and
- the remaining accessibility, responsive, recovery, and participant gates.

Wave 2 can now proceed from read-spine construction to the next durable record
or lifecycle slice without reopening the design freeze.
