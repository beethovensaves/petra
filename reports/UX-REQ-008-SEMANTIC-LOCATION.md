# UX-REQ-008 semantic object location

Status: initial live slice passed; broader `UX-REQ-008` remains partial
Date: 2026-09-08
Design boundary: `UX-DESIGN-FREEZE-01`

## Result

Petra can now resolve an exact Project object through one authenticated,
Project-scoped semantic-location query. The result identifies the requested,
resolved, and current revisions; preserves each retained record hash; reports
whether the requested revision is current, historical, missing, or unsupported;
and selects a ProjectDefinition-permitted destination by semantic place role and
task intent.

The runtime does not return a URL, component, panel, layout coordinate, or other
presentation instruction. The frozen workbench owns the small mapping from a
registered place role to its existing route and carries the semantic key, object
ID, exact revision, and record hash forward. This preserves the design-freeze
boundary while preventing React from discovering domain identity or authority.

## Contract and authority boundary

`petra.project-object-location-view@1.0.0` is an additive, renderer-neutral read
contract. It binds:

- the exact requested semantic key, opaque object ID, optional revision, and task
  intent;
- the effective ProjectDefinition revision used to interpret the request;
- a resolved, current, historical, superseded, missing, unauthorized, or
  unsupported result shape;
- exact record hashes for every disclosed object reference;
- primary, alternate, and safe fallback destinations expressed only as semantic
  place roles;
- details/Petra-context eligibility, PostgreSQL authority position, Neo4j
  projection position, and one coherent read timestamp.

Unavailable results cannot carry an object descriptor or target reference. The
rejected cross-runtime fixture specifically prevents an unauthorized result from
leaking object facts. At the current single-user boundary, bearer authentication
fails with `401` before the reader is invoked; actor-specific object authorization
remains later work.

## Initial adapter registry

| Semantic key | Exact authority source | Primary task-appropriate places |
| --- | --- | --- |
| `petra.project-source` | ProjectSource revisions | Sources, Graph, History |
| `scientific.assertion` | Assertion evidence revisions, Project-bound through ChangeSet authority and enabled only by the active ProjectDefinition registration | Graph, Review, History |
| `petra.change-set` | ChangeSet record | Review, History |
| `petra.work-unit` | WorkUnit revisions | Work, History |
| `petra.draft-artifact` | DraftArtifact revisions | Composition, History |

The registry is deliberately additive. It is not a universal science switch and
does not assume that every Project shares these object types. An adapter is usable
only when its semantic key and any required contract registration are valid for
the effective ProjectDefinition.

## Resolution behavior

- Current objects retain their requested task intent when selecting a supported
  destination.
- A retained non-current revision always resolves to History. Petra does not
  silently replace it with the current revision.
- Missing revisions, cross-Project identities, invalid IDs, and unsupported
  semantic keys disclose no object details and return the Project's registered
  Brief place as the safe orientation fallback.
- Stored payloads are validated against their canonical schema and must reproduce
  their stored record hash before any descriptor or destination is returned.
- PostgreSQL lookup, effective-definition resolution, authority position, and
  projection position run under one read-only repeatable-read transaction.

## Workbench integration

`/projects/:projectId/locate` is a loader-only redirect boundary. It forwards
only the registered location parameters, validates that the response belongs to
the requested Project and exact object identity, and maps the returned place role
onto the already frozen client routes. The endpoint is not a new visual surface.

## Verification

The slice passes:

- 313 TypeScript schema, registry, generation, hash, and fixture cases;
- 11 strict Python/Pydantic contract-smoke cases;
- 94 real PostgreSQL 18.6 repository cases after Flyway V001-V021, including
  current and historical resolution across all five initial adapters;
- 7 focused authenticated server-route cases;
- 74 workbench cases, including exact identity propagation, semantic role-to-route
  mapping, historical routing, and safe Brief fallback.

The complete repository gate passes with 640 always-on tests and seven expected
service-dependent skips, together with generated-contract/hash checks, the M1
retrieval-floor check, formatting, lint, TypeScript/Python type checks, and the
production workbench build.

## Remaining UX-REQ-008 work

This is an initial live slice, not complete `UX-REQ-008` conformance. Remaining
work includes:

- authoritative replacement/supersession chains and parent fallback from object
  types that actually record those relationships;
- explicit retained Project-snapshot selection and reconstruction;
- extension-registered profile-tool destinations;
- actor-specific object authorization if Petra later introduces different
  permissions within one Project;
- the complete applicable `UX-FX19` validation and accessibility evidence.

Multi-user collaboration is outside the current product version and is not a
condition for this slice.
