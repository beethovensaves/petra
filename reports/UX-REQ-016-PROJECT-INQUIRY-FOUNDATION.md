# UX-REQ-016 Project inquiry foundation

Status: ProjectDefinition-owned inquiry-role mapping and exact Work/result linkage passed; composed reads and broader profile adapters remain open
Date: 2026-09-08
Design boundary: `UX-DESIGN-FREEZE-01`

## Result

Petra can now declare that an existing Project-domain record fulfills the
product role of a line of inquiry and can link that exact anchor to Work and
results. It does not add a universal `Inquiry` object. The initial adapter maps
the scientific definition's registered `scientific.research-question` role to
the existing revisioned `ProjectObjective` representation.

`petra.project-inquiry-role@1.0.0` is owned by one exact ProjectDefinition
revision. It binds the inquiry semantic key to the exact registered Objective
contract and requires a matching definition term in the `focus` family. A
different Project may map the role to another valid representation in a later
adapter; neither the scientific example nor any reusable template controls the
kernel architecture.

## Identity and linkage boundary

The inquiry's stable identity and authored status remain those of its mapped
domain anchor. For the initial adapter, that is the exact ProjectObjective
revision. The role record only declares how Petra interprets that record in
cross-surface inquiry composition; it does not wrap, copy, or replace it.

`petra.project-inquiry-link@1.0.0` records immutable many-to-many associations
from an exact inquiry anchor to either:

- an exact WorkUnit revision whose relationship is `addresses`; or
- an exact typed result, its declared bearing, and its exact producing Work
  when applicable.

An inquiry therefore exists with zero links, may accumulate links to many Work
tasks, and may share one Work task or result with other inquiry anchors without
duplicating the Work identity.

Work lifecycle is deliberately absent from inquiry meaning. Completion,
cancellation, progress, and priority cannot change the Objective's authored
status or imply resolution. The first result adapter accepts only an exact
GroundedResponse with bearing `addresses`, because GroundedResponse declares no
authority effect. Attempts to relabel it as `admissible_basis` or
`accepted_finding` fail closed until an appropriate authority adapter exists.

## PostgreSQL authority

Flyway V023 adds contiguous inquiry-role revisions and immutable inquiry links.
Database constraints and semantic guards bind the exact Project,
ProjectDefinition, role record, Objective revision, WorkUnit revision, result,
producing Work, actor, content hashes, and stored record hashes. Direct SQL
cannot mutate role revisions or link records, substitute another Project, use a
stale role revision for new links, or overstate a GroundedResponse's authority.

The repository validates each contract and RFC 8785 hash, preserves idempotent
registration, rejects identity and revision conflicts, and returns no record
across Project scope.

## Verification

The disposable PostgreSQL 18.6 suite applies V001 through V023 and passes all
98 cases. Its inquiry proof covers zero Work, two Work tasks on one inquiry,
one Work task shared across two inquiries, an exact addressing result, retained
active inquiry status after Work completion, cross-Project absence, unsupported
authority bearing, and immutable SQL records.

Contract generation and validation pass 336 TypeScript cases. Strict
Python/Pydantic validation and RFC 8785 content-hash parity pass all 25 worker
cases. The complete repository gate passes with 667 always-on tests and seven
expected service-dependent skips.

## Remaining UX-REQ-016 work

- a bounded inquiry collection/detail view that composes original and current
  framing, authored status, related Objective dependencies, open questions,
  basis, limitations, exact Work/result links, and authority position;
- Project Work read integration that exposes exact inquiry anchors without
  changing Work lifecycle or inferring resolution;
- frozen Brief, Details, Graph, Petra, and Work composition without adding a
  new primary destination or changing the frozen layout;
- additional ProjectDefinition-valid representation adapters, including
  non-Objective records and linked sets where their semantics require them;
- typed basis and accepted-finding adapters whose authority can support those
  stronger result bearings;
- working-candidate, Review, recommendation, focus, and semantic-change command
  paths; and
- paired-profile `UX-FX28` evidence for criteria, alternatives,
  method/interpretation, and optional Hypothesis-centered inquiry roles.

The immediate next slice is the exact collection/detail read and its Work
linkage composition. That read must keep authored inquiry status, advisory
reasoning order, and operational Work state visibly separate.
