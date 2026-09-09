# UX-REQ-020 effective Project controls

Status: privacy and CapabilityGrant composition plus paired-definition
conformance passed; broader `UX-REQ-020` remains partial
Date: 2026-09-08
Design boundary: `UX-DESIGN-FREEZE-01`

## Result

`petra.project-effective-controls-view@1.0.0` provides the first authorized,
read-only composition of controls that are actually effective for one Project.
The PostgreSQL reader resolves the current Project revision, current
ProjectDefinition, authority position, and every control section in one
read-only repeatable-read transaction.

The first slice reports two effective values from the existing Project
authority:

- private Project visibility; and
- the exact enabled evidence namespaces.

Each value includes its registered meaning, state, owning Project revision,
effective time, and operation availability. Project revision history is retained,
while the missing causal History destination remains explicit.

The V026 follow-on adds canonical immutable Project-command grants and retained
revocations. The same repeatable-read view now reports each exact grant's
allowed commands, grantee, validity window, effective/expired/revoked posture,
immutable origin, and retained history. If no grant exists, the section is
`unavailable`; it never infers authority from a runtime reference.

## Remaining unsupported controls

The same view returns model-routing, Work-budget, and ReviewPolicy sections.
Each remains `unsupported`, with its intended owner, Project scope, freshness,
limitation, unavailable history, and unavailable typed operation.

This is deliberate. WorkUnits and InteractionRuns carry capability, privacy, and
budget references; ModelRequests carry routing and certification references; and
ReviewSessions preserve decision context. Those references describe what a
specific execution used. They are not definitions of the control currently
effective for future Project work and are not reverse-engineered into settings.

No `SetProjectSetting` operation, client-supplied policy override, personal
preference authority, or generic policy persistence was added. Grant issuance
and revocation are internal authority operations pending typed public commands.

## Application boundary

The authenticated route
`GET /api/queries/projects/:projectId/effective-controls` accepts the explicit
Project target from the path and rejects query parameters that could attempt to
override profile or policy resolution. A missing Project returns the existing
closed not-found result; a missing ProjectDefinition fails rather than
substituting generic controls.

The Settings loader reads the shell and controls together, then verifies the
same Project revision and ProjectDefinition identity, revision, and content hash
before exposing either. The existing Settings layout now presents the effective
privacy and command-grant values plus the explicit unsupported sections.
Personal session choices remain separate, and the Project-control button remains
disabled because no typed transition is registered. No CSS or component
hierarchy changed.

The Project shell's Settings summary now reports the available privacy and
namespace values while retaining the limitation for the three missing policy
registries.

## Verification

The slice passes:

- 320 TypeScript schema, registry, generation, hash, and fixture cases;
- 11 strict Python/Pydantic contract-smoke cases;
- 94 real PostgreSQL 18.6 repository cases after Flyway V001-V021;
- 9 focused server-route cases; and
- 17 focused workbench Settings and Project-data cases.

The complete repository gate passes with 649 always-on tests and seven expected
service-dependent skips, together with generated-contract/hash checks, the M1
retrieval-floor check, formatting, lint, TypeScript/Python type checks, and the
production workbench build. The full workbench suite passes 77 cases.

The follow-on [paired ProjectDefinition conformance](UX-WAVE-1-PAIRED-DEFINITION-CONFORMANCE.md)
proves that the same control reader resolves each independently project-authored
Project's own evidence namespaces and exact definition while preserving the
same honest unsupported-policy boundary. The paired database suite passes 95
cases and the workbench suite passes 78 cases.

The V026 CapabilityGrant follow-on passes 359 contract cases, 103 real
PostgreSQL cases after a clean V001-through-V026 migration, 25 Python cases,
and the complete repository gate with 692 always-on cases and seven expected
service-dependent skips.

## Remaining UX-REQ-020 work

This increment does not complete `UX-REQ-020`. Remaining work includes:

- Project-effective RoutingPolicy, BudgetProfile, and ReviewPolicy records where
  their owning decisions require them;
- authenticated-principal binding, broader capability scopes, inheritance,
  pause, conflict, stale-read, and partial-reconciliation behavior;
- a registry that maps only genuinely editable values to existing or accepted
  typed, idempotent commands;
- prospective and active-Work impact plus exact before/after plans;
- causal History destinations and independent operation outcomes; and
- the applicable accessibility, responsive, recovery, and participant gates from
  `UX-FX32` and `UX-FX33`.
