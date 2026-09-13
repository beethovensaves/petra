# Wave 4 cumulative live exit trace

Status: fixed Wave 4 closure item 45 passed; the cumulative production browser
trace and final backend and design audits remain open
Date: 2026-09-13
Backend starting commit: `bcce8fb7697955e67200d1ea01e3529d45269815`
Exact design counterpart inspected:
`2d77f2dc0dfe491f79e5b5948fd7779b59b7b4ea`

## Result

The cumulative backend trace now carries one human-produced scientific
WorkingCandidate from durable admission through the production working-state
and relationship-overlay routes, a durable and resumable Review, the exact
manual checkpoint, one authoritative application, a changed Brief snapshot,
and retained History. Two production-server restarts preserve every exact
identity. Replaying the same Apply request after the second restart returns the
three stored command results as replays and creates no duplicate effect.

The trace also carries one controlled-writing Requirement and its GOVERNS
relationship through the shared working-state and Review owners. That Review
returns `petra.project-review-view@1.3.0`, retains its exact human provenance,
has no ChangeSet, and reports `apply_available: false`. The trace stops there:
no controlled-writing Apply request is prepared or submitted.

No production authority implementation changed in this slice. The new
`test:wave4:cumulative` harness composes existing contracts, repositories,
server routes, renderer-neutral clients, and production typed data boundaries
on disposable stores. It adds no
candidate, Review, ChangeSet, Approval, command, event, projection, Brief,
History, Work, interaction, or recovery ledger.

## Fresh-store production path

The harness starts disposable PostgreSQL 18.6 and Neo4j 2026.07.1 stores,
applies and validates Flyway migrations V001 through V043, seeds exact
registered profile records through their production repositories, and starts
the production HTTP server with its normal Project-shell persistence factory.
The scientific current-authority path is projected through
`ScientificGraphProjector` into Neo4j before the working candidate is read.

The live trace then exercises these authenticated clients, typed data
boundaries, and production routes:

- `ProjectWorkingStateClient` for the scientific and controlled-writing
  working snapshots;
- the production workbench `loadProjectRelationshipOverlay` client against the
  PostgreSQL/Neo4j relationship-overlay route;
- the production workbench `loadProjectReviewSession` and lifecycle command
  clients for the scientific Review;
- the versioned Review 1.3 server response and installed contract validator for
  the controlled-writing Review;
- `ReviewSessionApplyClient` for preparation and submission of the scientific
  manual checkpoint;
- `ProjectBriefClient` for the scientific Brief before and after Apply; and
- the production workbench `getRecentProjectHistory` client for canonical
  retained History.

An unauthenticated working-state read returns 401. Reads use the configured
bearer token, and every demonstrated command resolves to the single configured
human Actor on the server. Client requests carry no Actor, grant, policy,
profile meaning, or conversational authorization.

## Scientific candidate, overlay, and provenance

The selected scientific candidate is
`working_candidate_131W6GBBPYDG1CX0FSQKX1RJ10`; its exact working
relationship is
`working_relationship_5MV0X9MX2PGD1T6W4AE42AC5DT`. Both are durable revision
1 records bound to the current scientific ProjectDefinition, Objective,
WorkUnit, source span, input snapshot, profile registrations, validation
receipts, origin, basis, and provenance.

The candidate retains producer kind `human`, Actor
`actor_01ARZ3NDEKTSV4RRFFQ69G5FAV`, and contribution kind `direct_edit`.
Admission retry returns the same candidate record without another working
identity or revision. Working-state reads return the candidate and relationship
unchanged and continue to state that they have no domain, Review-decision,
mutation, or validation-derived authority.

The relationship overlay uses the live scientific current-authority path from
Neo4j and the live working records from PostgreSQL. It returns both task-sized
working candidate pairs whose ASSERTS subjects occur in the selected
authoritative provenance path. The graph payload and its textual peer have
equal relationship cardinality, and the response keeps the current
authoritative projection position separate from the non-authoritative working
snapshot. Browser rendering remains outside this trace.

## Resumable Review and exact manual checkpoint

ReviewSession `review_session_01K4D000000000000000000004` begins at revision
1 with two independently atomic members. The production lifecycle client
defers it to revision 2 and reopens it at revision 3. Both lifecycle receipts
are durable and produce no domain event. A production Review read after each
command returns the exact lifecycle and revision, so the Review can resume
without reconstructing membership from presentation state.

The Apply client prepares the complete selected-member commitment against the
open revision 3 Review. The checkpoint binds the authenticated human and exact
current grants for SubmitChangeSet, RecordApproval, and ApplyChangeSet. Its
ReviewPolicy is explicitly `not_applicable`; no delegated, automatic, model,
or conversational decision is introduced. The prepared commitment hash in the
recorded trace is
`sha256:7dc53c1a3a6bb783895222a36866caa27cfd7f3e5cac6fe921ea38a683a48cd8`,
and its exact ChangeSet is `change_set_7ZZ4RV19DJZ8QYDS2QNW44FFVF`.

The server is shut down after preparation and restarted against the retained
stores. The same exact checkpoint is then submitted with one explicit human
decision time. SubmitChangeSet, RecordApproval, and ApplyChangeSet each report
`executed`. The selected member reports `applied`; a second member with its own
previously rejected ChangeSet remains `rejected`. The Review does not report
the independent rejected outcome as successful or apply part of that member's
atomic ChangeSet.

After another server restart, the same request returns the same completed
result with all three steps marked `replayed`. The retry uses the original
request, commitment, command identities, ChangeSet, Approval, and exact Review
revision. No missing suffix is synthesized and no operation is executed twice.

## Brief, History, and restart identity

The scientific Brief snapshot changes from
`sha256:21eec822e76f2e1c470f246f3207043a3efec6f815a60c1b24d02f74ece43f3b`
before Apply to
`sha256:d3cb75fa56ffd3d9c618aafdff2397f4a4a24869869be179825e1a6e27208449`
after Apply. A read after the second restart returns the same latter snapshot.
The resulting Brief retains the complete Review member set, including the
separate applied and rejected outcomes, and composes the current scientific
source basis rather than creating a Brief record.

Recent History retains the three exact event-producing commands from the
manual checkpoint. Their event identities in the recorded trace are:

- `event_01M2EAGA7RHDQD1EP9C8T14Z5Q`;
- `event_01M2EAGA66BBXC20WKPQSJF5KA`; and
- `event_01M2EAGA4WGTY1SKW6FV6Y36P7`.

The post-restart History content hash matches the post-Apply read. History
continues to use the existing command, event, target, effect, recovery, and
semantic-destination records; the harness creates no parallel audit trail.

Caller-designated direct and model-mediated reads run before and after restart
through the same authenticated contracts. They converge on these stored
content hashes:

- scientific working state:
  `sha256:3480461df13abdb17d5dfa7215b31f08217ab9e2feb7b67122cff5013028b51f`;
- scientific open Review revision 3:
  `sha256:aabf827b58598fe9a739688c25dc33a6dc4da1ecb9da04c05f64cc1a236aab7e`;
- controlled-writing working state:
  `sha256:e0e506c6189e89828761a4bb1d916db064bbb5fb790fe9ea14b3ed67142fa1e0`;
  and
- controlled-writing Review:
  `sha256:cc233891efc14f972fa36eb68ea5315ef5db5bf2af74c10cb07778510cb397a1`.

This proves identity convergence at the established direct/model-mediated read
seam: changing the caller designation and restarting the server does not fork
the stored candidate, Review, or working-state identity. It is not an
end-to-end model invocation or conversational transport test. The harness does
not accept conversational approval or claim that a model executed Apply. The
human-produced candidate, shared server records, and exact human checkpoint
remain the only demonstrated path.

## Exact durable cardinalities

After the second restart and exact Apply replay, the disposable stores contain:

| Record family | Scientific Project | Controlled-writing Project |
| --- | ---: | ---: |
| WorkingCandidate identities | 2 | 1 |
| WorkingCandidate revisions | 2 | 1 |
| WorkingRelationship identities | 2 | 1 |
| WorkingRelationship revisions | 2 | 1 |
| ReviewSession identities | 1 | 1 |
| ReviewSession revisions | 3 | 1 |
| Review lifecycle receipts | 2 | 0 |
| Profile Requirements | 0 | 1 |
| Profile governing relationships | 0 | 1 |
| ChangeSets | 3 | 0 |
| Approvals | 3 | 0 |
| Command executions | 10 | 0 |
| Domain events | 8 | 0 |
| Neo4j graph outboxes | 2 | 0 |

The scientific totals include one applied baseline pair used by the live
authoritative overlay, one independently rejected candidate pair, the selected
candidate's manual checkpoint, and two no-domain-effect Review lifecycle
commands. Counts taken immediately after Apply and again after restart replay
are exactly equal. The controlled-writing Project retains one Requirement, one
GOVERNS record, one WorkingCandidate, one WorkingRelationship, and one
ReviewSession revision, with zero ChangeSets, command executions, or domain
events.

## Verification and limits

Pinned Node 24.20.0 and npm 11.19.0 were selected explicitly. The focused
`npm run test:wave4:cumulative` run passed after applying and validating all 43
migrations. It exercised real PostgreSQL and Neo4j services, the production
server across two retained-state restarts, the named typed clients, exact
working admission replay, Review defer/reopen, checkpoint execution and replay,
Brief/History reads, paired-profile reads, provenance assertions, and the
cardinality checks above.

The complete `npm run verify` repository gate passed with generated contracts
and fixtures current, the fixed retrieval benchmark unchanged, formatting,
lint, type checks, and the production workbench build clean, and 536 contract,
300 core, 81 adapter, 15 retrieval, 3 Neo4j, 3 S3, 106 server, 231 workbench,
25 Python, and 8 handoff tests passing. The Neo4j suite retained 1 expected
skip and the S3 suite retained 6 expected skips. The separate
`npm run test:postgres:integration` gate applied and validated migrations V001
through V043 on a fresh PostgreSQL 18.6 store and passed all 155 tests in 16
files. The complete gate required local-loopback permission for its server
conformance tests; after the sandbox-only `listen EPERM` was removed, the same
gate passed without a repository change.

This backend slice does not merge or reproduce the design counterpart. It does
not exercise a browser, frozen React rendering, focus return, keyboard, touch,
200% text, forced colors, or reduced motion. The controlled-writing Graph
transport remains scientific-only, so this trace makes no controlled-writing
overlay claim. The Review 1.3 response is validated at the server/contract
boundary; consuming it through the exact design counterpart and proving no
fixture fallback in a production browser are closure item 46.

## Felicity review

Felicity review found three material clarity risks in the draft, all corrected
here. The final report distinguishes token-authenticated reads from
server-resolved command identity, graph/textual response parity from browser
rendering, and direct/model-mediated read-seam convergence from an external
model or conversational transport run. It does not claim item 46 browser
evidence, controlled-writing Graph transport, controlled-writing Apply, or
Wave 4 completion.

## Next safe boundary

Perform exactly closure item 46, owned by design: exercise the frozen workbench
against the production clients/controllers and live server responses for this
cumulative trace without fixture fallback. Cover ordinary and exception
Review, independent outcomes, return and focus, complete textual parity,
keyboard, touch, text scaling, forced colors, reduced motion, and non-color
meaning. State the exact browser/server transport boundary and do not add a
controlled-writing Apply or Brief path.
