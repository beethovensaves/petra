# UX-REQ-014 Project Work read

Status: first live collection/detail slice passed; broader orchestration remains partial
Date: 2026-09-08
Design boundary: `UX-DESIGN-FREEZE-01`

## Result

Petra now exposes a Project-scoped Work collection and exact WorkUnit detail
through one additive, versioned read contract. The read composes existing
WorkUnit, WorkerInputManifest, WorkerOutputManifest, ProjectDefinition, and
semantic-location authority. It does not introduce another Work lifecycle.

The same view is available through the authenticated server and the frozen Work
collection/detail routes. No CSS, layout system, or component hierarchy was
redesigned.

## Contract and authority boundary

`petra.project-work-view@1.0.0` is a discriminated collection/detail contract.
Every response carries the exact ProjectDefinition reference, a canonical
content hash, read time, and repeatable-read authority position.

The collection provides:

- a bounded limit, opaque continuation cursor, and optional lifecycle filter;
- exact WorkUnit identity, revision, specification hash, and stored-record hash;
- workflow and task identity, lifecycle timestamps, attempt, attention state,
  elapsed-time coverage, resource coverage, and reported-output count;
- explicit stage-plan unavailability; and
- a Work semantic destination without a client route in the authority record.

The detail adds:

- the exact WorkerInputManifest reference, worker, inputs, declared outputs,
  network policy, cache mode, cancellation policy, checkpoint policy, and
  deadline when present;
- exact dependency WorkUnit references and their current lifecycle states;
- declared resource ceilings and either measured WorkerOutputManifest use or an
  explicit unavailable reason;
- every declared output slot and its worker-reporting status;
- cancel, retry, and resume policy assessments separated from operation
  availability;
- explicit inquiry, Review, stage-plan, and coverage limitations; and
- an exact semantic Work location composed inside the same database snapshot.

PostgreSQL verifies every stored payload against its registered schema and
canonical record hash. It also reproduces the WorkUnit-to-input and
WorkUnit-to-output authority chains before returning the view. A WorkUnit from
another Project is never substituted.

## Output and control honesty

A successful worker terminal is reported as operational success only. A
produced output remains `staged_handle_only`; the view does not infer that the
output is registered in the Project, valid for its declared purpose, accepted,
applied, or usable.

Control policy and command availability are also separate. The view may report
that cancellation is permitted by the WorkUnit policy while every operation
remains `unavailable`. Opening Work cannot cancel, retry, or resume it. In
particular, a checkpoint is not relabeled as a paused task when no registered
resume command and compatibility check exist.

Requested Work is shown as requested and awaiting dispatch. It is not presented
as awaiting author input because no durable input-request record exists.

## Frozen workbench integration

The existing Work collection now consumes the live bounded read. Exact detail
shows registered inputs, dependencies, stage-plan limitations, resource limits
and measured use, declared output slots, Review/inquiry limitations, and the
disabled command boundary. It creates no synthetic stage or inquiry branch.

Collection URLs may carry the contract's state, limit, and cursor query. The
frozen surface preserves bounded paging with an exact next-page link when the
server returns a continuation cursor. A dedicated visual filter control remains
future presentation work.

Semantic deep links still pass exact Project, WorkUnit, revision, and record-hash
selection through the existing Project shell. The Work detail loader separately
requires the same Project and WorkUnit identity from the Project Work endpoint.

## Verification

The focused increment passes:

- 326 TypeScript contract, registry, generation, hash, and fixture cases;
- 11 strict Python/Pydantic contract-smoke cases, including both Work views;
- 96 real PostgreSQL 18.6 cases after Flyway V001-V021;
- 10 server Project-query route cases; and
- 20 focused workbench mapping and frozen-surface cases.

The complete repository gate passes with 656 always-on tests and seven expected
service-dependent skips, together with generated-contract/hash checks, the M1
retrieval-floor check, formatting, lint, TypeScript/Python type checks, and the
production workbench build. The complete workbench suite passes 80 cases.

## Remaining UX-REQ-014 work

This slice does not close all of `UX-REQ-014`. Remaining work includes:

- a registered ProjectDefinition-resolved workflow stage-plan record;
- durable input-request and response linkage;
- ProjectDefinition-valid inquiry and profile-neutral Review linkage;
- Project-level output registration, validation, usability, and destination;
- actor-authorized retry and supported resume operations;
- richer attempt, checkpoint, partial-result, and cross-module recovery
  composition;
- visual filter controls and the applicable accessibility, responsive,
  reconnect, and participant validation gates; and
- Project-shell active-Work composition beyond the existing summary count and
  exact Work destination.

Durable Project threads and the ProjectDefinition-valid inquiry-mapping
foundation are now complete. Exact inquiry composition into this Work read is
next; it must not derive inquiry resolution from Work completion.
