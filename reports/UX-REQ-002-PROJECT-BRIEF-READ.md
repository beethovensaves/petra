# First Project Brief read

Date: 2026-09-13
Backend starting commit: `eed1dddb6b953e3a4437614b79d89ecedd69c419`
Exact integrated design commit: `8834280d63b5ffde5680c3acb5e77b44508d3ce3`
Authority: `UX-REQ-002`, frozen DB07, and the Wave 4 runtime architecture disposition.

## Available boundary

`GET /api/queries/projects/:projectId/brief` returns the versioned
`petra.project-brief-view@1.0.0`. It requires the existing single-user bearer
authentication. `ProjectBriefClient` provides a renderer-neutral read and
validates schema, hashes, Project and Objective identity, profile registration,
owner observations, inquiry links, and comparison endpoints. It performs no
mutation or automatic retry. Its integrity helpers use a browser-safe core export.
The caller supplies the installed payload schema hash as
`registeredProfileSchemaHash`; this avoids depending on the server registry
filesystem loader or registry metadata in a browser.

The reader composes one PostgreSQL `REPEATABLE READ READ ONLY` transaction. The
existing shell, source, Review, Work, History, and SuggestedAction readers expose
internal composition methods that use the caller's transaction. Their standalone
reads retain their own transaction boundaries. No table, migration, Brief ledger,
command, approval, or recovery rule is added.

The current Objective supplies the orientation statement and its exact basis.
The response preserves the frozen section order and the full canonical records
behind the first bounded observations:

- exact ProjectDefinition and current Objective, shell authority position, and
  independently observed graph projection freshness;
- complete open Review views for the current Objective or Project, preserving
  every member of each returned session and its independently atomic ChangeSets;
- Work and inspect-result SuggestedActions from exact current-Objective inquiry
  links, including the retained link records and result provenance;
- the canonical recent-ten History view, including its existing effect and
  recovery observations; and
- one registered scientific payload with exact source views, copies, rights,
  provenance, source limitations, and explicit coverage.

The scientific adapter requires an `extension` registration with semantic key
`scientific.research-brief`, contract `petra.research-brief-payload@1.0.0`, and the
exact canonical schema hash in the contract registry. The ProjectDefinition must
support Brief and its Objective must use the registered scientific question kind.
Missing, unknown, mismatched, or stale bindings fail closed. Existing authored
ProjectDefinitions are not silently revised to opt into this payload.

## Snapshot and comparison limits

`content_hash` binds the complete response content, including each owner's read
observation. `snapshot_hash` binds the canonical owner identities while excluding
read timestamps and elapsed-time displays. `expected_snapshot_hash` requires the
same observation identity; a changed snapshot returns `409 PROJECT_BRIEF_STALE`.
A retry reads authority again and creates no durable record.

Without a baseline, comparison is explicitly `current_only`. Supplying both
`baseline_event_id` and `baseline_record_hash` requests the interval after that
exact event within the canonical recent-ten History window. The response retains
the baseline, current authority endpoint, and exact intervening History changes.
An unknown, mismatched, cross-Project, or out-of-window baseline is unavailable;
the reader does not silently substitute another endpoint.

This event interval is a bounded comparison of domain events. It does not
reconstruct a historical Brief, Objective, Work, working candidate, source,
dependency, or projection snapshot. Work completion and graph catch-up remain
separate current observations. An empty interval establishes no correctness,
completeness, agreement, or Project health.

## Coverage and authority limits

Each source, Review, and inquiry-link query returns at most twenty records and
reports its coverage. Review sessions are never cut into partial member
manifests. Work appears only through the returned current-Objective links;
retained completed Work is not labeled newly completed or accepted domain truth.

Attention uses existing shell observations, Review status, and Work attention.
Returned items carry stable owner identity, exact owner content hash, consequence
class, reason, and explicit inspection, deferral, and acknowledgment boundaries.
The first item leads only within the stated coverage. Complete Reviews remain
inspectable without an attention item. Missing profile assessments and omitted
records cannot establish that nothing else needs attention.

The response does not supply Hypothesis standing, evidence-frontier synthesis,
material-disagreement assessment, admissible inquiry understanding, a preferred
recommendation, or a universal score. These are explicit unavailable assessments,
not fabricated empty scientific findings. This is the first partial
`UX-REQ-002` composition, not full Brief acceptance.

## Verification and design handoff

The focused server tests cover authentication, unregistered and duplicate query
controls, unavailable readers, stale snapshots, and explicit profile/baseline
failures. Real PostgreSQL tests exercise the production reader and authenticated
Hono route through the typed client, complete Review and source preservation,
repeat reads, tampered bindings, and zero new command/event cardinalities.
Additional cases cover application-to-Brief/History updates, exact event
comparison, concurrent commits during composition, and canonical Work/result
linkage. The complete gate and final PostgreSQL outcome are recorded in the
worker handoff after verification.

The exact design Apply integration was fast-forwarded onto main. This backend
slice makes no further changes to frozen React components, CSS, browser routes,
or presentation fixtures. It adds no production Brief loader or fixture fallback.
The existing History event-detail browser route remains fixture-backed and must
stay disabled for live event references.

Before browser integration, register both new schemas in the browser validator
and supply the canonical payload schema hash from the accepted registry.
Design should review this contract against the frozen hierarchy and map only
supported observations, retaining the coverage and comparison limits. Use the
canonical Brief sections rather than treating nested shell place summaries as
Brief coverage. If integration needs a missing semantic assessment, return a
bounded backend handoff rather than calculate it in the client. Do not present
the first available attention item as the Project's globally highest priority.

Felicity review narrowed the comparison claim to a retained domain-event
interval, distinguished completed Work from newly completed or applied results,
and qualified attention ordering by query coverage. No broader acceptance claim
is made. Wave 4 remains open: full Brief assessment/comparison coverage,
CommunicationPlan, a materially different registered profile, frozen-interface
integration, and the cumulative live exit evidence remain outstanding.
