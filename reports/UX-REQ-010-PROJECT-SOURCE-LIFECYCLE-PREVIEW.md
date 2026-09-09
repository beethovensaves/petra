# UX-REQ-010 Project source lifecycle preview

Status: exact read-only preview and governed backend exclude/restore authority passed; public mutation and physical deletion remain unavailable
Date: 2026-09-08
Design boundary: `UX-DESIGN-FREEZE-01`

## Result

Petra now exposes an exact Project-scoped preview for three source lifecycle
intents:

- exclude a ProjectSource from ordinary new Project use;
- restore an excluded ProjectSource to ordinary new use; and
- request deletion of its local copy.

The authenticated endpoint is:

`GET /api/queries/projects/:projectId/sources/:projectSourceId/lifecycle?requested_action=<action>`

Its response conforms to `petra.project-source-lifecycle-view@1.0.0`. It
identifies the exact current ProjectSource revision and hash, the requested
transition, bounded registered dependents, explicit retention outcomes, the
operation boundary, and the repeatable-read Project authority position.

This route remains a preview boundary, not a command. Exclude and restore now
have registered backend commands, Project events, immutable receipts, and
compensating recovery. They are not exposed through the public API because the
current bearer-token boundary does not establish the Actor and capability grant
required by the command envelope. Local-copy deletion remains unavailable.

## Lifecycle meaning

Excluding an active ProjectSource previews a transition from `active` to
`excluded`. Its declared effect is to disable ordinary new use of that source
binding. Restoring an excluded ProjectSource previews the inverse transition.
Requests that already match the current status are reported as not applicable.

Neither transition erases or rewrites the ProjectSource, canonical Work,
selected WorkVersion, ArtifactManifest, parsed representation, scientific
provenance, downstream records, or revision history. The existing stable
ProjectSource identity and immutable revision chain remain the authority
foundation.

Local-copy deletion is a separate destructive lifecycle. It is unavailable
because Petra has no accepted Artifact retention policy or local-copy deletion
command. This preserves the deferred design decision rather than treating
Project membership removal as permission to remove bytes.

## Dependency and retention boundary

The PostgreSQL reader reports eight ordered impact groups:

1. ParsedDocuments;
2. StructuralBlocks;
3. SourceSpans;
4. Claims directly grounded in those spans;
5. Assertions directly grounded in those spans;
6. active WorkUnits with direct input bindings to the source Artifact;
7. open ReviewSessions whose current revision binds the matched Claim or
   Assertion revisions; and
8. GroundedResponse revisions with exact dependencies on the source's
   WorkVersion, SourceSpans, Claims, or Assertions.

Each group contains an exact total and at most 100 validated record references.
Truncation is declared. Every returned reference includes its revision, stored
record hash, current or historical posture, and retained effect. The reader
revalidates the canonical contract and hash for each returned record before it
exposes the preview.

This initial scope is deliberately bounded. It does not infer transitive,
profile-specific dependencies that lack a registered ProjectSource lifecycle
adapter. The response names this limitation so absence from the preview cannot
be read as proof that no domain-specific dependency exists.

The retention section independently reports ProjectSource history, canonical
identity, selected WorkVersion, ArtifactManifest, local Artifact, parsed
representation, and provenance. All authority and provenance areas remain
retained. The local Artifact is marked `deletion_unavailable`.

## PostgreSQL and API behavior

The reader performs the entire source, impact, retention, and authority read in
one read-only repeatable-read transaction. It requires the source's exact
ArtifactManifest binding, validates all stored records and hashes, and fails
closed if authority is inconsistent. A source identity from another Project
returns no record.

The server requires one supported `requested_action`, rejects missing, repeated,
unknown, or extra query parameters, validates the ProjectSource identity and
final response contract, and checks that the reader returned the requested
Project, source, and action. No execute flag or lifecycle mutation is accepted
through this route.

## Design-freeze behavior

These slices add no CSS, route hierarchy, layout, or component changes to the
frozen interface. There is not yet an approved source-lifecycle control slot,
and the public mutation boundary still lacks Actor and capability binding. The
live preview and backend authority can support a later frozen-design integration
without redesigning the surface.

## Verification

The focused increment passes:

- 350 TypeScript contract, registry, generation, hash, and fixture cases;
- strict TypeScript and Python type checks;
- 98 real PostgreSQL 18.6 cases after Flyway V001 through V024; and
- 42 server cases, including the authenticated exact lifecycle route and its
  malformed-query and cross-Project failures.

The complete repository gate passes with 683 always-on tests and seven expected
service-dependent skips, together with generated-contract/hash checks, the M1
retrieval-floor check, formatting, lint, TypeScript/Python type checks, and the
production workbench build.

The database proof covers exclusion and restoration previews, local-copy
deletion refusal, exact parsed dependency references, retained outcomes,
repeatable-read authority, invalid action rejection, Project isolation,
authorization denial, exact expected-source enforcement, idempotent replay,
identity-reuse conflicts, immutable events and receipts, and compensating
restoration.

## Remaining UX-REQ-010 work

This preview advances but does not close the requirement. Remaining work
includes:

- an Actor- and capability-bound public preflight and command route over the
  implemented backend authority;
- a governed creation and compensation command over the implemented immutable
  ProjectSource replacement/supersession lineage;
- ProjectDefinition-valid lifecycle adapters for other source kinds;
- broader registered dependency adapters and complete impact policy;
- frozen-interface preview/confirmation integration after mutation exists; and
- an accepted retention policy before any physical local-copy deletion command
  can be designed or exposed.

The immediate next backend decision is how an authenticated single-user request
resolves its exact Actor and capability grant. Only then can the governed
exclude/restore authority be exposed without inventing authorization in the
route. Physical deletion remains outside that step.
