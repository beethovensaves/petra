# Communication segment consistency

Date: 2026-09-13
Backend starting commit: `80bceddd99358a6de8842ec0b58801cd312df1d4`
Exact design counterpart inspected: `99ddbb0ef53e9545a208385ebe323de3f474576e`

## Implemented boundary

The renderer-neutral `CommunicationPlanClient` now rejects the two contradictory
responses reproduced in the counterpart's communication-plan conformance report:
a source report relabeled as an action report with no invocation, and declared
orders `[2, 2, 3]`. Recomputing the enclosing content hash does not bypass these
checks. The existing composer already produces the expected metadata.

Every original statement must occupy its original array position with its exact
statement key, unchanged structured content, sequential declared order, and
registered communicative family. The plan schema pins the profile payload to the
installed immutable contract; the client compares against that registered origin
mapping. It does not derive profile meaning from prose or introduce a scientific
origin map in renderer code.

An exact invocation requires one trailing action-report segment with null original
statement and a key naming that invocation's command. Without an invocation,
there can be no additional segment. Missing, fabricated, duplicated, misplaced,
or differently linked action-report segments fail the read. The existing exact
request and current-result linkage checks run before this metadata check.
Rejection does not sort, reclassify, repair, or return a partial replacement plan.

This is validation at the existing client transport boundary. The authenticated
HTTP route still performs its existing schema and Project checks; it does not
claim to reject every schema-valid metadata contradiction before sending a body.
The client rejects those bodies before returning a plan to its caller. No server
runtime, persistence, PostgreSQL query, accepted schema, or generated contract
changes were needed. No frozen component, CSS, browser route, or presentation
fixture changed.

## Preserved scope

D022, UX-REQ-004/021, frozen DB15/DB16, and the original communication-plan report
remain the governing boundaries. Complete and partially preserved compositions
remain readable with language validation `blocked` / `incomplete` and null repair
provenance. A passed preservation finding still makes no language-validation or
authority claim.

The change leaves source/current response and definition bindings, Actor
provenance, source/current delivery, Artifact references, bounded Work History,
and invocation-owned recovery intact. It introduces no command, ledger, retry,
eligibility calculation, or mutation authority. Existing core tests retain the
failed-Work/stopped-delivery and historical-cache cases.

## Evidence and limits

Focused checks on Node 24.20.0 and npm 11.19.0 passed 25 typed-client tests,
five authenticated-route tests, and 15 core communication tests. Twelve new
schema-valid, recomputed-envelope cases cover all three original family mappings,
duplicate and gapped orders, a substituted segment key, and fabricated, missing,
duplicated, wrongly keyed, wrongly classified, or misplaced action segments.

Positive client cases use the existing composer over synthetic source records,
with and without an exactly linked invocation. The partial case retains all three
original families with missing evidence; the complete-preservation case uses one
unresolved-inference statement. Both retain the blocked full-language receipt and
are returned unchanged. These tests do not establish full reference preservation
for every statement family or a newly executed durable invocation lifecycle.

The route tests connect the actual authenticated Hono application to the exported
typed client through injected fetch and a fixture-backed reader. They prove one
successful exact request/response, `Cache-Control: no-store`, and client rejection
of both reproduced contradictions after a schema-valid HTTP 200 response. They
do not exercise PostgreSQL, a browser renderer, or a network socket themselves.
Existing route failures continue to cover authentication, duplicate and mutation
controls, missing response/service, and storage failure. The old storage-failure
test title now describes only what that test executes.

No persistence or PostgreSQL behavior changed, so this slice does not require or
claim a new PostgreSQL integration run. The previous plan report remains the
source for its separately recorded database evidence.

The complete `npm run verify` gate passed: generated contracts and fixtures,
retrieval floor, formatting, lint, TypeScript/Python checks, workbench build,
531 contract, 300 core, 79 adapter, 15 retrieval, 106 server, 231 workbench,
25 Python, and eight handoff tests. Neo4j and S3 each passed three tests; their
seven service-dependent skips supply no new integration evidence. The initial
sandboxed run could not bind localhost sockets in existing server tests. The
complete rerun with socket access passed. `git diff --check` also passed.

Felicity review of this report and the added client error found no material
writing issue. The report distinguishes segment consistency from language
validation, client rejection from HTTP rejection, and fixture-backed transport
evidence from persistence or browser evidence. The engineering review found no
new authority, profile interpretation, recovery ownership, or freeze decision
required by this bounded fix. The existing plan report remains historical
evidence for its own commit and checks.

## Next safe boundary

Design should perform one bounded conformance review of this exact committed
backend slice against its pinned finding and DB15/DB16. Check that the new
rejections close the segment inconsistency prerequisite while valid partial
content and the original ownership and validation limits remain visible.
This handoff authorizes no frozen frontend integration.

Full response-language validation and repair, versioned rendering, task-oriented
accessible presentation, another materially different registered profile, and
cumulative live exit evidence remain open. This slice provides no fresh browser
or assistive-technology evidence, does not close UX1.4-EV01–EV06, and does not
complete Wave 4.
