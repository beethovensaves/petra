# UX-REQ-001 Project shell context

Status: second live slice passed; broader `UX-REQ-001` remains partial
Date: 2026-09-08
Design boundary: `UX-DESIGN-FREEZE-01`

## Result

`petra.project-shell-view@1.1.0` extends the accepted shell read without changing
or reinterpreting version 1.0. The new version adds:

- one honest summary for every place supported by the effective
  ProjectDefinition; and
- an optional exact selected-object result, using the accepted
  `project-object-location-view` semantics rather than a second selection model.

The existing Project, definition, current Objective, authority position,
projection freshness, and attention fields remain unchanged. The PostgreSQL
reader composes all of them under one read-only repeatable-read transaction.

## Place summaries

Place summaries are orientation data, not module-completion claims. Each summary
names its semantic place role, coverage (`complete`, `partial`, or `unavailable`),
label, bounded summary, attention count, optional item count, and any limitation.
An unavailable summary cannot disclose or invent an item count.

The initial reader obtains current counts from the authoritative ProjectSource,
ReviewSession, WorkUnit, InteractionRun, DraftArtifact, and DomainEvent heads. It
uses the exact graph projection checkpoint for Graph and the effective
ProjectDefinition for Brief and Settings. Sources use the definition's registered
reference terminology. Profile tools fail visibly as unavailable until an
extension registers a real summary adapter.

Partial coverage remains explicit:

- Petra counts retained InteractionRuns but does not claim durable ProjectThread
  or branch context;
- Composition counts DraftArtifacts but does not claim a profile-neutral document
  collection;
- History counts retained Project domain events but does not claim a composed
  causal History read; and
- Settings exposes the effective ProjectDefinition but does not claim composed
  privacy, capability, routing, budget, or Review controls.

## Optional exact selection

When a shell request includes a semantic key, opaque object ID, optional revision,
and task intent, the shell reader invokes the semantic locator inside its existing
PostgreSQL transaction and embeds the resulting `LocationContent`. Definition,
authority, projection, selection, and read time therefore share one snapshot.

Selection remains presentation state: the shell query does not persist it, change
Project authority, or infer it from conversation. Current, historical, missing,
and unsupported selections retain the locator's exact disclosure and fallback
rules.

The workbench sends a shell selection only when the route carries the complete
semantic key, object identity, revision, and record-hash tuple. It rejects partial
exact metadata, verifies the returned identity, revision, and hash, then exposes
the result through the existing Project view model. No component hierarchy, CSS,
or visual layout changed.

## Compatibility

The server accepts and validates both shell versions. Existing 1.0 providers and
fixtures remain valid. The production PostgreSQL reader now emits 1.1 for Project
collection and detail reads; selection is simply absent when none was requested.

## Verification

The slice passes:

- 316 TypeScript schema, registry, generation, hash, and fixture cases;
- 11 strict Python/Pydantic contract-smoke cases;
- 94 real PostgreSQL 18.6 repository cases after Flyway V001-V021;
- 37 server cases, including exact optional selection and malformed-selection
  refusal; and
- 76 workbench cases, including place-summary mapping, exact selection
  propagation, returned-hash verification, and incomplete-tuple refusal.

The complete repository gate passes with 644 always-on tests and seven expected
service-dependent skips, together with generated-contract/hash checks, the M1
retrieval-floor check, formatting, lint, TypeScript/Python type checks, and the
production workbench build.

## Remaining UX-REQ-001 work

This increment does not complete `UX-REQ-001`. Remaining work includes:

- exact attention-requiring WorkUnit references rather than counts alone;
- a complete shell-level Review posture distinct from open-session counts;
- active Work context and its observable resource/control state;
- selection/Details behavior across every applicable frozen surface and return
  path;
- paired synthetic scientific and controlled-writing ProjectDefinition evidence;
  and
- the applicable keyboard, responsive, accessibility, recovery, and participant
  validation gates.
