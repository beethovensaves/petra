# Automated Wave 5 handoff

This packet closes the remaining focused-graph and provenance portion of
`M1.7` and `UX1.5`. It inherits Petra's accepted decisions, graph model,
runtime contracts, frozen UX brief, Wave 4 authority boundary, and automated
evidence policy. It coordinates implementation; it creates no domain authority.

## Outcome

The authoritative exit gate is:

> One bounded relationship question can open a profile-resolved focused graph,
> preserve its exact task, scope, snapshot, provenance, selection, and
> projection state, expose a complete textual peer and synchronized source
> inspection, and route correction through the existing candidate and Review
> authority without renderer-owned meaning.

## Starting boundary

- Wave 4 is complete at backend
  `abe1dc88fdb6081e48c288e80d0b2a4b689e6dac` and design
  `1395f49b03fb0511fecf52f44e5c1a32841bd110`.
- WorkingCandidate, WorkingRelationship, ReviewSession, ChangeSet, Approval,
  commands, events, projection, Brief, History, recovery, communication,
  interaction, Work, semantic-location, and exact source-inspection owners are
  already live. Reuse them.
- The Wave 4 model call remains historical evidence. Wave 5 requires no
  external model call and must not repeat it.
- DB10, `UX1.5-DISC01`–`DISC03`, `UX-FX24`, and `UX-FX25` fix the design
  direction. Two-dimensional Cytoscape rendering is primary. Literal 3D,
  Reagraph adoption, and yFiles evaluation are outside this wave.
- Native screen-reader evaluation is not part of this wave. Browser semantic
  structure, accessibility-tree inspection, keyboard/focus, 200% text,
  touch/coarse-pointer behavior, forced colors, reduced motion, and non-color
  meaning remain required where the frozen sidecar names them.

## Fixed boundaries

- PostgreSQL remains authoritative. Neo4j is a rebuildable projection. A graph
  read must state snapshot, scope, omissions, and projection position.
- A renderer consumes a renderer-neutral view model. It never queries Neo4j,
  resolves Project authority, interprets profile semantics, or issues a domain
  mutation directly.
- Current, Working changes, and Historical are distinct semantic layers.
  Projection freshness is a view condition, not a fourth authority layer.
- Expansion reveals recorded relationships within the existing bounded query.
  New research or assessment starts only through an existing typed Work
  preview. A hidden, capped, restricted, unknown, or partial path never implies
  absence or completeness.
- Graph selection, layout, pan, zoom, disclosure, filter state, saved questions,
  comparison selection, pinning, and Back/Forward history are presentation
  state. Correction, candidate revision, Review, Apply, Revert, Work, and
  History remain canonical server-owned paths.
- Preserve Project, ProjectDefinition, profile version, Actor, task, Work,
  snapshot, object, relationship, SourceSpan, candidate, Review, ChangeSet,
  event, projection, and return-context identities.
- Scientific and controlled-writing profiles must use the same kernel while
  retaining different registered objects, relationships, terminology, and
  available actions. Unknown profiles and relationships fail closed.
- The two known untracked design assets remain untouched.

## Slices 1–24: implementation and executed evidence

1. **Backend — closure baseline and request disposition.** Reconcile the final
   Wave 4 evidence with `M1.7-W01`–`W12`, `M1.7-AC01`–`AC07`, `UX1.5-W01`–
   `W12`, and `UX1.5-AC01`–`AC10`. Record what is already live, what must be
   rerun, and the smallest accepted disposition of `UX-REQ-013`. Do not rebuild
   a covered owner or mark an unexecuted scenario passed.
2. **Design — closure bookkeeping and contract map.** Mark the materially
   completed Wave 4 `UX1.4` work and amended acceptance boundary accurately.
   Map DB10 and the complete Wave 5 sidecar to production components, routes,
   states, and remaining backend needs. Make no speculative product change.
3. **Backend — focused graph contract.** Add the smallest versioned,
   profile-resolved `FocusedGraphView` contract with exact question/task,
   Project, definition, snapshot, layer, projection position, scope, limits,
   omissions, nodes, relationships, selection, semantic destinations, and
   registered actions. Unknown or incompatible meaning fails closed.
4. **Design — renderer-neutral conformance.** Prove the contract maps to frozen
   graph, textual-path, evidence-matrix, Details, and return regions without a
   renderer-specific domain type or client-derived authority.
5. **Backend — snapshot-consistent query owner.** Implement authenticated,
   Project-scoped query composition over canonical PostgreSQL records and the
   bounded Neo4j projection. Bind exact definition, layer, snapshot, projection
   checkpoint, query limits, and caller-visible coverage.
6. **Design — bounded entry and orientation.** Map contextual and direct entry
   from Brief, Review, assistant, History, and an exact saved question. Preserve
   task, scope, selected object, snapshot, origin, and return context; never
   open an unrestricted corpus graph.
7. **Backend — typed paths and provenance.** Return allowlisted profile-valid
   path steps with stable object/relationship identity, direction, origin,
   basis, source locations, validation or authority state, and explicit
   unavailable facts. Citation never becomes scientific support.
8. **Design — relation semantics and textual peer.** Render profile-owned edge
   labels, direction, origin, state, limitations, and selected-path rationale
   with non-color meaning. The textual path or evidence matrix must expose the
   same material facts and actions.
9. **Backend — working, historical, and freshness composition.** Compose
   relevant durable working relationships, exact retained historical state,
   current authority, and projection lag without overlaying incompatible
   revisions or granting working state authority.
10. **Design — layer and comparison presentation.** Implement Current, Working
    changes, Historical, Return to current, and dedicated before/after
    comparison. Preserve selection and label projection catching up separately.
11. **Backend — expansion, filters, limits, and omissions.** Add bounded named
    expansion and filtering through the same query owner. Report caps, groups,
    hidden counts, restricted paths, cycles, incomplete results, and unknowns
    without inventing links or absence.
12. **Design — graph exploration state.** Map named expansion, filtering,
    pin/collapse, home/reset, saved exact questions, and ten-state Back/Forward
    as local presentation state. Late responses cannot replace a newer query or
    lose the active selection.
13. **Backend — exact Details and source destinations.** Compose existing
    semantic-location and source-inspection owners for selected nodes,
    relationships, basis, SourceSpans, revisions, and unavailable destinations.
    Do not add a graph-specific source or object registry.
14. **Design — synchronized Details and return.** Preserve the selected graph
    identity across Details, exact source inspection, Brief, Review, and return.
    Verify keyboard focus and stale/replaced/missing destination recovery.
15. **Backend — comparison, impact, and time reads.** Supply exact positions,
    differences, dependencies, assessed consequences, dates or unknown dates,
    snapshots, and limitations. Do not calculate universal importance,
    maturity, confidence, or currentness.
16. **Design — dedicated comparison and temporal views.** Map comparison,
    impact, and time as task-specific views with graph/text parity, honest
    unknowns, stable selection, and profile-resolved terminology.
17. **Backend — governed correction and new-Work composition.** Reuse existing
    typed working-candidate, Review, SuggestedAction, and Work preview owners
    for relationship correction, relink/split/scope changes, or new research.
    Graph coordinates and drag gestures never enter a command payload.
18. **Design — correction and Work previews.** Provide pointer and non-drag
    entry to the same exact candidate/Review or Work preview. Show affected
    scope, unchanged state, authority consequence, cancellation, and return;
    presentation changes remain local.
19. **Backend — adverse-state and performance support.** Exercise dense/cyclic
    paths, finite limits, stale snapshots, late responses, restricted and
    missing targets, projection lag/rebuild, disconnect, and retry. Record
    server/query/projection timings without turning them into product truth.
20. **Design — dense, adverse, responsive, and accessibility behavior.** Run
    `UX-FX25` through production components for density, overflow, stale and
    offline recovery, keyboard/focus, browser semantics, 200% text, touch,
    forced colors, reduced motion, and non-color relations.
21. **Backend — paired-profile cumulative trace.** On fresh PostgreSQL and
    Neo4j stores, execute the seven `M1.7-AC01`–`AC07` sidecar scenarios through
    production routes and typed clients. Include restart/reconnect and exact
    duplicate-effect checks without an external model call.
22. **Design — cumulative production browser trace.** Execute every applicable
    `UX1.5-EV01`–`EV04` sidecar scenario through production controllers, live
    routes, the frozen workbench, and one documented browser boundary. Retain
    commands, artifacts, hashes, timings, focus, and limitations.
23. **Backend — pre-inventory adversarial audit.** Critique the cumulative
    implementation for direct Neo4j coupling, renderer authority, hard-coded
    scientific meaning, cross-Project leakage, false completeness, stale
    response replacement, lost provenance, duplicate effects, and local-state
    promotion. Fix backend-owned material defects and rerun fresh-store gates.
24. **Design — mandatory evidence inventory audit.** Compare the packet,
    roadmaps, accepted scope, sidecar, invoked commands, and retained artifacts.
    Record `WAVE5-EVIDENCE-CONTROL/executed-inventory-audit`. Identify every
    missing or weak scenario before the reserve begins. Apply Felicity to all
    Wave 5 reports and user-facing graph language. Do not declare completion.

## Slices 25–32: protected remediation and closure reserve

25. **Backend — first inventory remediation.** Fix or execute only the highest
    priority backend-owned gap from item 24; otherwise commit a precise
    conformance report that authorizes the next design remediation.
26. **Design — first inventory remediation.** Fix or execute only the highest
    priority design-owned gap, preserving the production path and exact
    evidence record.
27. **Backend — second inventory remediation.** Address remaining contract,
    query, identity, restart, projection, performance, or authority evidence.
28. **Design — second inventory remediation.** Address remaining browser,
    textual-parity, focus, responsive, non-color, adverse-state, or language
    evidence and update the inventory.
29. **Backend — final cumulative reconciliation.** Run the fresh-store
    production trace and reconcile every backend-owned sidecar scenario. Fix
    material backend findings only. Do not declare Wave 5 complete.
30. **Design — final cumulative browser recording.** Re-execute every material
    design-owned scenario on the final integrated tree. A helper that exists
    but is not invoked remains missing.
31. **Backend — final critic authority audit.** Perform the final adversarial
    engineering review, run the complete gate and real PostgreSQL/Neo4j tests,
    and hand off an exact closure assessment. Do not declare completion.
32. **Design — final UX, Felicity, and exit audit.** Reconcile all 25 sidecar
    records against exact pushed artifacts and commits, rerun material browser
    checks, fix design-owned defects, run the complete gate, commit and push,
    and declare `wave_complete` only when every record passes and the exit gate
    is live.

## Verification and stop rules

- Each worker handles exactly one bounded role-owned slice, verifies it, and
  commits and pushes coherent changes. A no-code audit commits its evidence
  report rather than fabricating product changes.
- Use pinned Node 24. Run the complete repository gate for every completed
  slice and real PostgreSQL/Neo4j integration when their behavior changes or a
  named evidence scenario requires them.
- The frozen inventory is `scripts/wave-handoff-wave-5.evidence.json`. Return
  passed records only for scenarios actually executed in the current slice,
  with the exact command, retained artifact, and honest boundary.
- Return `needs_user` only for a consequential unresolved product, profile,
  authority, or information-hierarchy decision. Return `blocked` for an unsafe
  repository state or a required gate that still fails after bounded diagnosis.
- Both branches must be clean and pushed. The known design image and PDF are
  the only permitted untracked files.

