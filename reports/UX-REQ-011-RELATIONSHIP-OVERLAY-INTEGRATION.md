# UX-REQ-011 frozen relationship-overlay integration

Status: bounded Wave 4 frozen-interface integration and repository verification
passed
Date: 2026-09-12
Design boundary: `UX-DESIGN-FREEZE-01`
Backend basis: `d66a22e4c66858c7aabdd8518e3814a7509041cf`

## Result

The production Graph route now requests
`petra.project-relationship-overlay-view@1.0.0` through the authenticated typed
workbench client. When a Project has no overlay, the same route retains the
existing authenticated current-authority relationship view with Working and
Historical explicitly unavailable. It never substitutes a presentation fixture.

The adapter passes server-supplied question, scope, labels, object and
relationship summaries, direction, meaning, basis, validation summaries,
counts, omissions, limitations, and the complete textual peer into the frozen
Graph model. It does not derive profile meaning from semantic keys, raw
predicates, validation outcomes, visibility, selection, or projection state.

## Frozen presentation mapping

The existing Current, Working, and Historical layer controls remain in their
frozen location. Runtime profile labels replace the generic Current and Working
labels when an overlay is present. Current-authority objects remain visibly and
textually marked as Current while they provide context inside the Working
overlay; Working objects and relationships use both text and a dashed treatment.
Forced-colors mode retains the dashed distinction.

Graph and Text remain peer representations of one server result. The Text view
lists every returned object and relationship for the selected layer, including
relationship direction, meaning, scope, basis, validation summary, and working
endpoint posture. The Graph view exposes the same relationship details to
assistive technology and shows working posture on the affected object. Counts,
omissions, and limitations remain visible below either representation.

The view presents three positions separately:

- the authoritative Project event and stream position;
- the graph projection checkpoint, represented position, observed position,
  target sequences, and pending count; and
- the working snapshot hash, read time, and authoritative base position.

Layout choice, node selection, disclosure, focus, and graph navigation history
remain React-local presentation state. No browser state is sent to the query or
used to grant authority.

## Exact superseded endpoint

The conformance fixture advances one WorkingCandidate from revision 1 to
revision 2 while retaining a WorkingRelationship whose target is revision 1.
The adapter joins relationships only by the server-supplied `target_node_key`,
checks that the relationship and target node have the same endpoint posture,
and renders **Referenced earlier working revision — not current**. It does not
redirect the edge to revision 2.

The adapter also fails closed when a relationship endpoint is missing, the
working relationship and target posture differ, a textual-peer member differs
from its rendered member, returned counts disagree with the member arrays, the
authoritative focus reference is absent, or the fixed non-authority and
client-local boundary values differ.

## Authority boundary

The integration remains read-only. It states that Working records are not
Project authority and that validation, visibility, selection, and projection do
not grant authority. It creates no ReviewSession, ChangeSet, Approval, command,
event, projection, History, or recovery record. No Review action is rendered
because the overlay supplies no Review composition or safe Review destination.

## Verification

Node 24.20.0 evidence passes:

- workbench TypeScript typecheck;
- `project-data.test.ts` and `review-graph.test.tsx`, including the production
  route, runtime current-only fallback, exact non-current endpoint, mismatched
  textual peer and posture rejection, complete text rendering, separate
  positions, and non-color layer meaning.

The complete `npm run verify` gate passes generated-contract and fixture checks,
the retrieval floor, formatting, lint, TypeScript and Python typechecks, the
production workbench build, and every always-on test. Test totals are 462
contract tests, 216 core tests, 31 adapter tests, 15 retrieval tests, 3 Neo4j
tests with 1 integration-only skip, 3 S3 tests with 6 integration-only skips, 68
server tests, 133 workbench tests, 25 Python tests, and 8 handoff automation
tests. The production build retains the existing non-failing chunk-size
advisory.

This design slice changes no contract, server, persistence, migration, or
PostgreSQL behavior, so it does not require a new real-PostgreSQL run.

## Remaining boundary

This slice integrates one registered scientific relationship overlay. It does
not establish paired-profile neutrality, historical-authority composition,
comparison, expansion, continuation, ReviewSession composition or commands,
ProjectBriefView, CommunicationPlan, or the Wave 4 exit trace. Those boundaries
remain open and must not be inferred from this Graph integration.
