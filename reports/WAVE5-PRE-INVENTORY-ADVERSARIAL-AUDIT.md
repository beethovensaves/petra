# Wave 5 pre-inventory adversarial audit

Status: passed after two material backend fixes. Wave 5 remains open pending the
Slice 24 evidence inventory and the protected closure reserve.

## Finding fixed

The cumulative trace could Apply and compensate a scientific ChangeSet, but a
fresh server process could no longer read the originating Review. The
`change_sets.current_state` row correctly became `reverted`, while
`petra.project-review-view@1.2.0` represents the outcome of the Review-owned
promotion path and does not admit that later History-owned state. The reader
copied `reverted` into the Review contract, which failed closed with
`PROJECT_REVIEW_READ_FAILED`.

`PostgresProjectReviewViewReader` now treats a compensated promotion as
`applied` in the originating Review. This preserves the Review decision and
keeps the member terminal. Project History remains the owner of the later
compensation, its `change_set.reverted` event, and current effect. The change
does not relabel the active graph edge: the cumulative trace still verifies
that the governed Revert removes the promoted authority and that exact replay
does not duplicate an effect.

The Wave 5 trace now reads and validates that Review after restart and retains
its content hash beside the Working and Focused Graph hashes and durable row
counts. Route failures include their structured response in the test
diagnostic so a future contract failure identifies the actual boundary.

A stricter live-browser rerun then exposed a separate impact-binding defect.
History event targets for Claim and Assertion revisions can omit
`record_hash`; Project History supplies that hash through the registered
semantic target assessment resolved from immutable PostgreSQL authority. The
focused analysis composer required the hash directly on the event target and
rejected this lawful production representation. It now accepts either a direct
target hash or the matching registered `resolved_target_ref`, while still
requiring exact object ID, revision, and record hash. A regression test proves
that a mismatched resolved hash fails closed.

The cumulative integration executable also retained an idle development
dependency handle after every awaited shutdown and Docker-resource check. It
now exits explicitly after successful verified cleanup, preventing a completed
wave trace from leaving the controller waiting indefinitely.

## Critic checks

| Risk | Result | Evidence and boundary |
| --- | --- | --- |
| Direct Neo4j coupling | Passed | The production server owns Neo4j setup. The focused query uses the `GraphStore` boundary for bounded membership, then resolves records, definition, authority, snapshot, provenance, and projection position from PostgreSQL. Workbench production source imports no Neo4j driver. |
| Renderer authority | Passed | Focused requests and action previews reject unrecognized fields and accept no coordinates, layout, pan, zoom, or gestures. Preview composition is read-only and delegates later effects to existing Review, History, or Work owners. |
| Hard-coded scientific meaning | Passed | Object, relationship, task, action, and expansion semantics resolve through the exact bound `ProjectDefinition`. The fresh-store trace exercises scientific and controlled-writing profiles. Unsupported registrations fail closed. |
| Cross-Project leakage | Passed | Focused routes bind the authenticated path Project, PostgreSQL reads include that Project identity, graph reads receive the same Project, and returned records and checkpoints are checked against it. The trace retains exact cross-view identities within one Project. |
| False completeness | Passed | Scope reports `complete_for_scope`, `capped`, or partial states and retains explicit capped, filtered, hidden, restricted, unknown, and out-of-scope omissions. The audit makes no whole-Project or universal-knowledge claim. |
| Stale response replacement | Passed | The production exploration and Details controllers bind request, presentation, snapshot, and selection identities. Browser evidence exercises a deliberately late response and retains the newer state and selection. |
| Lost provenance | Passed | Focused members and paths retain exact record revisions and hashes, basis and SourceSpan destinations, origin, authority layer, snapshot, and projection position. The fresh-store trace resolves the same Work, Claim, Assertion, and SourceSpan across production reads. |
| Duplicate effects | Passed | The cumulative run executes restart, reconnect, exact command replay, and compensation replay. It compares durable command, event, ChangeSet, output, and projection-outbox cardinalities and records `duplicate_effects: false`. |
| Local-state promotion | Passed | Current, working, historical, cached, running, proposed, stale, applied, and projection states remain separate. Renderer selection and layout create no command or authority record. PostgreSQL remains the domain authority. |

## Verification

- `npm run test:wave5:cumulative` passed on fresh PostgreSQL, Neo4j, and
  S3-compatible stores with Node 24.20.0 and no external model call. It also
  passed the production reconnect and abort/cancel trace, PostgreSQL authority
  integration, Neo4j projection integration, and the AG-UI production-import
  audit.
- The retained observation is
  `reports/WAVE5-PAIRED-PROFILE-CUMULATIVE-OBSERVATION.json`. Its restart record
  now contains `review_content_hash_after` and confirms no duplicate effect.
- `npm run test:wave5:browser` subsequently passed the authenticated live
  impact route in Chrome. It retained the exact event and response hashes,
  dependency inventory, explicit consequence availability, and normal
  post-cleanup process exit.
- Native screen-reader evaluation was outside the accepted test boundary and
  was not run.

## Remaining boundary

This audit closes Slice 23 only. Slice 24 must reconcile all 25 frozen evidence
records against their invoked commands and retained artifacts, apply Felicity
to Wave 5 report and product language, and identify weak evidence before any
closure claim. The reserve slices remain protected for findings from that
inventory and final reruns.
