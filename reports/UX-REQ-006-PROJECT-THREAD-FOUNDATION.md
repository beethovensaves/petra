# UX-REQ-006 Project thread foundation

Status: durable identity and completed-turn authority bindings passed; read/API/UI and lifecycle commands remain open
Date: 2026-09-08
Design boundary: `UX-DESIGN-FREEZE-01`

## Result

Petra now has a durable, Project-owned thread aggregate with immutable material
turns. A thread is the product history a user can later reopen, inspect, or
branch. It is deliberately separate from `InteractionRun`, which remains one
protocol-correlated execution and replay stream, and from `ContextPacket`,
which remains one bounded model-context compilation.

The foundation is definition-bound but not template-bound. Each thread and each
material turn names the exact `ProjectDefinition` revision that governed it.
The turn's context and result references are typed record references, allowing
future Project definitions to register other context and result contracts. The
first PostgreSQL adapter supports existing ContextPacket and GroundedResponse
records and fails closed for other types until an additive authority resolver is
implemented.

## Durable turn boundary

`petra.project-thread@1.0.0` records stable thread and turn identities, title,
task, lifecycle, root or branch origin, retention posture, and exact per-turn
bindings. A completed turn retains:

- the exact input hash and source message identity, with either a retained
  Artifact or an explicit hash-only limitation;
- the exact ContextPacket, Project snapshot, included-object and omission
  counts, and stated coverage;
- the exact completed InteractionRun and successful WorkUnit revision;
- the actor, capability, privacy, budget, and available Review-policy context;
- the exact GroundedResponse and response Artifact, with communicative force
  and a non-authoritative effect declaration; and
- explicit compaction, proposal/decision, and presentation-context posture.

The initial adapter admits completed, grounded material turns only. It does not
invent pending messages, infer missing prompts, call staged worker output a
Project response, or treat a successful execution as a domain change.

## Revision and branch invariants

ProjectThread revisions are contiguous and content-addressed. Every revision
preserves its complete prior turn list as an immutable prefix and may append no
more than one material turn. Metadata and lifecycle may advance without
rewriting a recorded turn. Deletion and in-place SQL mutation are rejected.

A branch receives a new stable thread identity and binds an exact parent thread
revision and retained parent turn. It records whether continuation should use
the original snapshot, the current snapshot, or compare them before continuing.
That choice is retained as provenance; this slice does not yet execute any
continuation mode.

## PostgreSQL proof

Flyway V022 adds immutable thread heads, revision records, and normalized turn
bindings. Deferred database checks reproduce the canonical ordered turns,
enforce immutable revision prefixes, preserve exact branch origins, and bind
Project, definition, optional objective, context, snapshot, execution, Work,
result, response Artifact, input Artifact when retained, and actor identity.

The repository additionally verifies semantic equality across the chain:
ContextPacket counts and coverage, InteractionRun input and authority context,
successful Work state, and GroundedResponse context, snapshot, run, Work, and
Artifact references must all agree. Cross-Project reads return no record.

The disposable PostgreSQL 18.6 suite applies V001 through V022 and passes all
97 cases. Contract generation and validation pass 328 TypeScript cases; strict
Python/Pydantic validation and RFC 8785 content-hash parity pass with the new
fixture included. The complete repository gate passes with 658 always-on tests
and seven expected service-dependent skips, together with generated-contract
and fixture checks, the retrieval-floor check, formatting, lint, TypeScript and
Python type checks, and the production workbench build.

## Remaining UX-REQ-006 work

This foundation does not yet expose product thread reads or commands. Remaining
work includes:

- a Project-scoped collection/detail read that resolves titles, tasks, branch
  lineage, turns, coverage, and honest capability limitations;
- authenticated server routes and frozen Petra-workspace integration, without
  fixture fallback or visual redesign;
- create, append-turn, branch, archive, and reopen commands with optimistic
  concurrency and authorization;
- stale-snapshot continuation preflight and execution for all three recorded
  modes;
- retained prompt Artifacts for new turns, model-agnostic compaction records,
  proposal/decision linkage, and PresentationContext linkage; and
- Project-lifetime retention and later `.petra` checkpoint reconstruction.

The immediate next slice is the read boundary and frozen workspace integration.
Command behavior should follow only after the read can present exact retained
state and unavailable capabilities truthfully.
