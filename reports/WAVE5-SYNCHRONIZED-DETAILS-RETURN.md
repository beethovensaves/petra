# Wave 5 synchronized Details and return

Date: 2026-09-15

Slice: Wave 5 Slice 14

Design start: `0db9e7a837950c4e66410ec373577279f9cdf444`

Backend counterpart: `570e99e324c26990c045b5db82c45a15fd3cd770`

Status: implemented; cumulative Wave 5 evidence remains open

## Result

The frozen focused-graph workbench now calls the authenticated, typed
`petra.focused-graph-details-view@1.0.0` client and route introduced by the
exact backend counterpart. The active renderer-neutral view retains its exact
read request so Details can preserve Project, ProjectDefinition, task, scope,
requested and represented snapshot, selected node or relationship, semantic
layer, temporal position, authority position, provenance, return context,
projection position, and Details request identity.

Details presents the backend-composed selected member, path context, semantic
destinations, basis and source inspections without creating a graph-specific
object or source registry. Exact source inspection uses the supplied
ProjectSource and SourceSpan identities, representation, rights, authority,
and preview. Unavailable source facts remain explicit and do not imply absence
or completeness.

## Selection, destinations, and return

- The request is derived only from the exact graph request and selected
  renderer-neutral identity. Layout, coordinates, pan, zoom, and other local
  presentation state do not enter it.
- Brief, Review, History, Work, source, and other destinations use only the
  server-resolved semantic location. The browser does not infer a domain
  destination from graph position.
- Exact source inspection is disclosed in the synchronized Details region, so
  closing it returns to the same graph task and selection.
- Closing Details or a recovery state restores focus to the invoking control.
  Opening a successful or recovery result moves focus to its programmatic
  heading; native links, disclosure controls, and buttons remain keyboard
  operable.
- A response is accepted only while its request, state, and selected identity
  are still active. A newer query, expansion, history move, reset, or selection
  change cannot be replaced by the older Details response.

## Recovery and authority boundary

Stale or replaced reads, missing destinations, restricted destinations, and
unavailable reads have explicit recovery states. Replacement locations are
shown only when supplied by the typed response. Users can retry the same exact
Details read, keep the graph selection, or return through the frozen origin
context without treating operational failure as domain absence.

PostgreSQL remains authoritative and Neo4j remains a rebuildable projection.
The panel labels semantic layer, temporal position, authority position, and
projection position independently. It introduces no mutation, graph-specific
command path, renderer-owned meaning, direct Neo4j read, or local authority.

## Verification boundary

Pinned Node 24.20.0 and npm 11.19.0 are required. Focused tests cover browser
contract registration, exact request identity, stale-response rejection,
server-resolved Brief and Review destinations, replacement and restricted
recovery, unavailable source facts, keyboard focus markup, and return actions.
The full browser evidence scenario is intentionally deferred to the cumulative
recording slice; component tests are not reported as that executed evidence.

- Focused workbench, contract, adapter, and authenticated route checks passed
  35 tests.
- The complete workbench suite passed 21 files and 269 tests.
- Workbench type checking, focused lint, and `git diff --check` passed.
- The complete repository gate is recorded in the final Slice 14 handoff.

No PostgreSQL or Neo4j persistence behavior changed, and this slice invokes no
named frozen Wave 5 evidence scenario. It therefore adds no passed evidence
record. The 25-record inventory remains open.

## Next safe boundary

Backend Wave 5 Slice 15 may add exact comparison, impact, and time reads. It
must supply recorded positions, differences, dependencies, assessed
consequences, dates or honest unknown dates, snapshots, and limitations without
calculating universal importance, maturity, confidence, or currentness.
