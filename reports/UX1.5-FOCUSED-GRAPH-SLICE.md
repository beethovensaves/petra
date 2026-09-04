# UX1.5 focused graph prototype slice

Date: 2026-09-02
Status: production-candidate prototype; not integrated or validated

## Outcome

The shell fixture now contains a real focused graph rather than a diagram that
only describes a future module. It implements the accepted `UX1.5-DISC01`
direction against one frozen, deterministic research fixture.

Review the ordinary shell at
`http://127.0.0.1:4311/__fixtures/shell`. Select **Graph** in the main research
views. Reproducible review URLs are also available:

- minimum-width Graphite graph:
  `http://127.0.0.1:4311/__fixtures/shell?view=graph&theme=graphite&panels=minimum`;
- minimum-width Stone shell:
  `http://127.0.0.1:4311/__fixtures/shell?panels=minimum`.

The query parameters configure fixture presentation only. They do not represent
production routes or scientific state.

## Implemented in this slice

| Area | Prototype behavior |
| --- | --- |
| Focus boundary | The view names its active scientific focus, Project snapshot, projection position, hop depth, and relationship allowlist. |
| Renderer boundary | A renderer-neutral `FocusedGraphViewModel` supplies nodes, relationships, identities, depth, basis, and stable positions. Cytoscape.js renders the canvas and does not query Neo4j or own authority. |
| Navigation | Back, forward, active-question home, pin, collapse or expand neighbors, and reset are keyboard-operable controls. |
| Task layouts | Neighborhood, Disagreement, and Provenance arrangements use the same objects and preserve selection history. |
| Progressive scope | A depth control and independently labeled relationship filters change the visible bounded graph. |
| Relation semantics | Support is solid, contradiction dashed, qualification dotted, and provenance blue; every relation also has a text label. Color is not the only distinction. |
| Inspection | Canvas selection and a keyboard-accessible node picker update a basis and identity panel with visible connections. |
| Label containment | Canvas shapes use compact object labels as landmarks. Complete descriptors remain in the inspector and textual representation, where they can reflow without escaping the geometry. |
| Text parity | An ordered text view lists every currently visible relationship and its direction. The canvas is hidden from assistive technology because the controls, picker, inspector, and text view expose the operative information. |
| 3D boundary | This fixture stays 2D because it has no named scientific z-axis. Reagraph remains an optional comparison only for a later fixture that satisfies the accepted 3D criteria. |
| Loading cost | Cytoscape.js is loaded on demand when the graph mounts; the main shell bundle does not eagerly include the graph engine. |

## Shell correction pass

The same pass corrected defects that made the prior shell review unreliable:

- the exact raster rock mark is inverted in Graphite and system-dark themes;
- state chips, buttons, button groups, and their labels now respect the width of
  their containers;
- the Graph projection chip uses the shorter visible state **Catching up** while
  retaining its complete revision and pending-record explanation for accessible
  and hover text;
- panel controls use icons where a word could not survive the accepted minimum
  pane width;
- Details tabs fit at the 304px minimum;
- presentational all-caps styling was removed across the workbench and fixture
  surfaces; Bebas Neue remains reserved for the PETRA wordmark;
- the shell footer now states which functions are interactive, representative,
  presentation-only, or module-pending instead of implying that every named
  destination is implemented.

## Agent boundary

The Petra panel now demonstrates the portion owned by the shell: selected
context, review posture, capability boundary, explanation, durable WorkUnit
identity, and a visible requested-work sequence. The fixture deliberately does
not invent a composer, approval, interrupt, reconnect, resume, or cancellation
workflow. Those paths require the `UX1.6` discussion loop before implementation.

## Remaining UX1.5 work

This is one representative prototype, not complete function coverage. The
following remain open:

- Comparison, Impact, and Time task layouts;
- evidence matrices and timelines where they outperform node-link views;
- trusted, inferred, superseded, stale, failed-replication, citation, and
  derivation treatments;
- route-addressable selection and saved or shared graph views;
- typed draft-command previews for direct graph edits;
- loading, partial, empty, disconnected, graph-failure, and projection-rebuild
  states;
- density and performance budgets using larger real fixtures;
- screen-reader, cross-browser, touch, and researcher comprehension validation.

No `UX1.5` acceptance criterion is closed by this slice alone.
