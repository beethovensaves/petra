# Wave 5 layer and comparison presentation

Date: 2026-09-15
Slice: Wave 5 Slice 10
Status: implemented; cumulative Wave 5 evidence remains open

## Outcome

The production focused-graph entry now carries an explicit Current, Working
changes, or Historical read position into the existing typed query client.
Current and Working changes use the current Project-snapshot temporal position.
Historical requires an exact retained snapshot plus an exact recorded-time
position before the route is accepted. The frontend does not turn a date filter,
renderer state, or URL label into a Historical query.

The focused result now presents:

- route-backed Current and Working changes controls that perform new bounded
  server reads instead of filtering one client-owned graph;
- Historical availability only when an exact retained position is present, a
  read-only Historical notice, and an explicit Return to current route;
- semantic layer, temporal position, requested and represented snapshots, and
  projection position as separate facts;
- a dedicated Current / Working changes comparison with separate Before and
  After regions rather than an overlay; and
- the complete Slice 8 graph/text facts, exact selection, basis, SourceSpan
  availability, limitations, destinations, and registered actions within each
  comparison position.

The comparison deliberately does not calculate Added, Removed, Changed,
Unchanged, consequence, or counterpart facts from two memberships. Those facts
remain unavailable until the later server-owned comparison read supplies them.
Renderer geometry, order, line length, and position supply no authority or
comparison meaning.

## Exact integration boundary

- Design started at `959d98f3bb654c46c220c289093dff30d0f4ba49` with exact
  backend counterpart `da79168cc912a17f5b5a4bd717257f6cddbc110c` already
  integrated.
- The route consumes the Slice 9 `semantic_layer`, `temporal_position`,
  requested and represented snapshots, per-member `authority_position`, and
  independent `projection_position` fields without redefining them.
- The Current / Working comparison executes two separately validated typed
  reads for one exact Project, definition, question, focus, origin, return
  destination, snapshot, and finite scope. Its consistency boundary rejects
  mismatched positions before presentation.
- Historical entry remains fail-closed when no exact retained snapshot and
  recorded-time position is supplied. Existing History data does not expose
  that complete focused-graph position, so this slice does not synthesize one
  from an event date or current snapshot.
- Projection catching up, unavailable, and rebuilding remain presentation
  conditions on each read. They never become semantic layers or negate the
  PostgreSQL authority labels supplied for represented members.

## Interaction and accessibility boundary

Layer and comparison controls are semantic links with visible current and
unavailable states. Historical exposes a prominent Return to current link.
Comparison positions stack at the existing narrow breakpoint, retain complete
text peers, use distinct heading IDs, and retain forced-color borders. Current,
Working changes, and Historical also use text labels and symbols, so color is
not their only distinction.

This slice does not start Slice 11 expansion, filters, pinning, graph history,
correction, new Work, impact, or renderer-owned inference. Exact difference,
impact, and time facts remain assigned to later backend and design slices.

## Verification

Pinned Node 24.20.0 and npm 11.19.0 were used.

- Focused Vitest: three files and 11 tests passed for entry/request binding,
  Slice 8 parity, layer navigation, comparison separation, and fail-closed
  incompatible positions.
- Complete workbench Vitest: 19 files and 258 tests passed.
- Workbench TypeScript and the package build passed.
- The complete repository gate is the final completion authority for this
  slice.

These commands are implementation checks, not execution of a named frozen Wave
5 evidence scenario. The evidence inventory remains `0/25`; this slice records
no evidence entry.

## Next safe boundary

Backend Wave 5 Slice 11 may add bounded named expansion and filtering through
the same authenticated query owner. It must report caps, groups, hidden counts,
restricted paths, cycles, incomplete results, and unknowns without inventing
links or absence. It must preserve the explicit layer, temporal, authority, and
projection separation established here and must not start Slice 12 client
exploration state.
