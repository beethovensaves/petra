# D020 scientific Review recovery assessment

Status: bounded backend assessment verified; frozen presentation and Wave 4 closure remain open
Date: 2026-09-12
Backend starting commit: `22205fed1c344e6710e802029a734931aaec5895`
Exact design counterpart: `0933ddd40366935d74dd65c6fd946bd5f0ec5b39`
Authority: [D020](../decisions/D020-read-first-review-member-recovery.md)

## Read-only runtime boundary

The authenticated endpoint
`GET /api/queries/projects/:projectId/reviews/:reviewSessionId/recovery-assessment`
composes the current scientific working Review into the versioned
`petra.review-recovery-assessment@1.0.0` contract. The caller supplies only
`expected_revision` and `expected_content_hash`. Stale Review identities fail
with 409; unsupported subjects fail closed. Extra parameters, duplicate
parameters, member subsets, Actor assertions, and operation instructions are
rejected before the read. Authentication uses the existing single-user bearer
boundary. The response has `Cache-Control: no-store`.

The PostgreSQL adapter reads the exact ReviewSession, its complete working
composition, current working heads, ChangeSets, normalized operations,
Approvals, command envelopes, terminal command results, events, and projection
observations in one `REPEATABLE READ READ ONLY` transaction. Applied ChangeSets
compose the existing Project History recovery assessment through that same
transaction and configured History principal. History retains compensation
eligibility and grant authority. Its assessment content and hash are included
without copying its rules or creating a new History owner.

The result retains the canonical ReviewSession and Review view content,
including exact candidate bindings, WorkingCandidate and relationship records,
producer, task, basis, provenance, qualifications, validation, and return
context. It has a content-derived assessment identity, producer and rule
versions, reconciliation and observation times, explicit member/ChangeSet/
operation counts, freshness, and thirteen preservation inventory categories.
Task availability and exhaustive prior authority are explicitly unverified;
client navigation and unsent edits are outside this inventory. An unavailable
projection checkpoint remains unavailable.

Assessment content identity excludes the read timestamps. Repeated reads of
unchanged canonical observations, including a newly constructed reader, return
the same assessment identity and content. A new canonical observation can
change that identity even when the durable ReviewSession revision is unchanged.

## Atomicity, effect, and action boundary

Every ChangeSet touching an exact member binding is considered, including
larger units that the existing scientific pair preview omits. A ChangeSet with
operations or member bindings outside complete Review coverage fails closed.
A completely covered operation set outside the existing two-operation
Claim-ASSERTS promotion owner is unsupported. This slice does not introduce a
multi-pair execution owner or change Review admission rules.

The atomic manifest retains each associated ChangeSet and all affected member
identities. Members without a ChangeSet remain explicit in the unbound list and
complete Review content. A member may have multiple associated attempts; its
Review outcome is reported separately from each ChangeSet's effect. Independent
Review members can therefore retain different outcomes without a whole-session
success claim.

An exact application event establishes the whole ChangeSet's historical
application effect. Current compensation facts remain in the composed History
assessment. An exact owning conflict event establishes atomic non-application
for that attempt. Neither a missing event nor a timeout, terminal failure,
waiting Review outcome, or lagging projection alone establishes no effect.
Unresolved effect evidence remains unknown. Stale working heads and authority
snapshots are reported separately from the exact current Review identity.

This contract requires an empty action list. Applied and rejected members have
no retry offer; stale or conflicted members require their existing refresh or
revision owner. Pending or unobserved attempts have no inferred execution
state or retry permission. An approved, current Review with unknown effect
reports status reconciliation. A retained failed command provides no safe new
attempt: its owning idempotency behavior does not authorize a new identity or
redelivery through this read.

The assessment decides, validates, approves, rejects, applies, reverts,
projects, and mutates nothing. It creates no command, receipt, recovery ledger,
or execution descriptor. Its `next_step` values are read explanations, never
operation eligibility or dispatch instructions.

## Typed presentation boundary

`ReviewRecoveryAssessmentClient.assess` provides the same renderer-neutral GET
to direct and model-mediated callers. Transport tests exercise identical reads;
production browser and model wiring remain outside this slice. Its shared
response validator checks requested identity, content
hashes, member and operation coverage, associated ChangeSets, counts, freshness,
and inventory completeness. The server uses the same identity and manifest
validation before returning a response. Neither layer calculates effect or
action eligibility.

No frozen React component, CSS, browser route, presentation fixture,
accessibility test, or design report changed. The accepted contract fixture is
used by backend tests only and is not a production fallback. Design must still
connect the read to the existing frozen Recovery affordance and present the
complete atomic groups, observations, unknowns, and preservation limits. No
execution control follows from this version's empty action list.

## Verification and limits

Verification uses Node 24.20.0 and npm 11.19.0.

- All 23 focused contract, typed-client, and server-route checks pass, covering authenticated
  exact GET, repeat reads through both caller paths, invalid and stale inputs,
  unsupported or incomplete evidence, response mismatches, unknown fields,
  forbidden actions, omitted ChangeSets, and truncated atomic operation lists.
- Fresh PostgreSQL integration applies and validates V001–V040 in the disposable
  PostgreSQL 18.6 service; all 136 tests pass. Review tests cover unbound members, independent ordinary
  and exception outcomes, rejected decisions, unknown waiting effects, a
  canonical failed/no-effect conflict alongside an applied attempt, projection
  lag, corrupt hashes and command results, incomplete atomic coverage, retained
  cardinalities, and content identity across reader reconstruction.
- The concurrent-write check appends a new Review revision while History is
  being composed. The active read still observes its original revision in a
  read-only transaction; the next read rejects the old expected identity.
- The complete `npm run verify` repository gate passes generated-contract and
  fixture checks, the retrieval floor, formatting, lint, TypeScript and Python
  typechecks, the production workbench build, repository tests, and handoff
  automation. Server tests require localhost-listener access. The build retains
  the existing non-failing chunk-size advisory.

The critic pass identified two material risks and tightened the implementation:
using blocked validation as a proxy for stale working heads, and accepting
rehashed responses that omitted an associated ChangeSet. Freshness now reads
canonical heads directly; response validation requires every associated group
and every affected member. Command fingerprints, results, normalized operations,
and exact event links are checked rather than inferred from display status.

Felicity review keeps the claims limited to canonical query and typed transport
convergence. These tests do not demonstrate a real model turn, rendered Recovery
interaction, browser accessibility, paired-profile conformance, or the cumulative
Wave 4 exit trace. ProjectBriefView, CommunicationPlan, broader recovery
execution, and the cumulative live proof remain later slices. Wave 4 remains
open.
