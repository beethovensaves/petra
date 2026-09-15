# Wave 5 working, historical, and freshness composition

Date: 2026-09-15
Slice: Wave 5 Slice 9
Status: implemented; cumulative Wave 5 evidence remains open

## Outcome

The authenticated focused-graph query owner now accepts three explicit read
modes without treating them as interchangeable:

- **Current** returns the bounded Neo4j membership guarded by exact PostgreSQL
  records and positions.
- **Working changes** adds only relevant durable WorkingRelationship heads and
  their exact WorkingCandidate endpoints. Every added member remains labeled
  `working_non_authority`; a stale or incompatible base is omitted rather than
  overlaid onto Current.
- **Historical** requires an exact retained snapshot and exact recorded-time
  position. It reconstructs bounded membership from the retained PostgreSQL
  projection ledger, resolves the corresponding immutable evidence revisions
  and ProjectDefinition, and returns only `historical_authority` members.

The result continues to expose projection freshness separately. A Historical
read reports the current Neo4j representation as unavailable for the selected
prior position instead of presenting the live projection as that historical
state. A Current or Working read retains the existing `current` or
`catching_up` projection position and pending-record count.

## Authority and identity boundaries

- PostgreSQL remains the authority for ProjectDefinition, snapshot, exact
  evidence revisions, durable working records, and retained projection
  receipts.
- Neo4j still supplies bounded Current membership only. The renderer never
  queries it directly.
- WorkingCandidate and WorkingRelationship IDs and revisions remain visible in
  their focused members and basis references. Their underlying profile records,
  validation, snapshot base, provenance, and limitations remain inspectable.
- Historical requests fail closed when the retained definition, event, snapshot
  identity, or contiguous projection-ledger coverage cannot be reproduced.
- Current, Working changes, and Historical never share an authority label.
  Historical is read-only, while Working changes can reach authority only
  through the existing Review and Apply owners.

## Contract and query changes

`FocusedGraphViewRequest` now accepts `current`, `working`, or `historical`.
Current and Working changes require the current Project temporal position.
Historical requires both an exact `recorded_time` position and
`expected_snapshot`; incompatible combinations are rejected at the untrusted
request boundary.

The existing `petra.focused-graph-view@1.0.0` response contract required no
schema revision. It already represented semantic layers, historical temporal
positions, per-member authority, omissions, and independent projection state.
The typed HTTP client continues to verify that the response preserves the
requested layer, temporal position, snapshot, profile semantics, scope, and
return destination.

## Verification boundary

Focused tests exercise request parsing, server routing, typed-client identity,
Current composition, a relevant WorkingRelationship with its exact candidate,
and exact Historical reconstruction. The real PostgreSQL/Neo4j integration
trace invokes all three modes against migrated stores and the production graph
adapter. The complete repository gate remains the slice completion authority.

No frozen Wave 5 evidence scenario is recorded by this slice. The cumulative
fresh-store sidecar scenarios remain assigned to later packet slices and must be
executed explicitly before Wave 5 can close.

## Next boundary

Slice 10 may present Current, Working changes, Historical, Return to current,
and projection freshness from these server-owned distinctions. It must use a
dedicated before/after comparison and must not infer a comparison from overlaid
members or renderer geometry.
