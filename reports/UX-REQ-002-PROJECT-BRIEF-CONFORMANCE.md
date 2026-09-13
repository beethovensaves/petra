# First Project Brief freeze-conformance review

Date: 2026-09-13
Design starting commit: `8834280d63b5ffde5680c3acb5e77b44508d3ce3`
Exact integrated backend commit: `ca7c723f421c3f652937483cdd31942a44a10099`
Authority: [UX-REQ-002](UX-BACKEND-HANDOFF.md#ux-req-002--task-oriented-profile-resolved-projectbriefview),
[frozen DB07](PETRA-UX-DESIGN-BRIEF.md#db07--project-brief), and the
[runtime architecture disposition](UX-RUNTIME-ARCHITECTURE-DISPOSITION.md).

## Disposition

The first `ProjectBriefView` is a useful partial read boundary. It does not yet
satisfy DB07's supported-picture, comparison, or recommended-next-step tasks.
This slice integrates the exact backend commit and records a bounded design
review. It does not connect the payload to the production Brief renderer.
The mapping below preserves the accepted hierarchy and identifies the backend
facts needed before broader interface acceptance. No new freeze decision is made.

The reviewed sources are the backend [read report](UX-REQ-002-PROJECT-BRIEF-READ.md),
the two 1.0.0 schemas, `PostgresProjectBriefViewReader`,
`assertProjectBriefIntegrity`, `ProjectBriefClient`, and the existing
`BriefSurface`, `loadProjectBrief`, and browser contract registry.

## Mapping to the frozen reading order

| DB07 section | Supported observation | Limit that must remain visible |
| --- | --- | --- |
| Current focus | Exact Objective statement and revision, ProjectDefinition registration, shell authority position, and separate projection observation | Orientation is the current Objective statement. It supplies no additional synthesis of scope or governing constraints. Preserve the complete Objective and profile bindings. |
| Needs your attention | Server-ordered shell, open Review, and linked Work observations, with owner identity/hash, consequence class, reason, and inspection/deferral/acknowledgment boundaries | The first item leads within returned coverage only. Empty results cannot establish that the Project needs no attention. Complete returned Review manifests remain inspectable even without an attention item. |
| What changed | Current-only state or the exact event interval after a selected baseline in recent-ten canonical History | Name both returned endpoints and the interval limitation. This is not a comparison with the last locally acknowledged Brief snapshot; it cannot establish newly completed Work, changed scientific understanding, or unchanged material state. |
| Current state | Exact registered scientific source observations with copies, rights, provenance, source limitations, and query coverage | A source inventory does not assess Hypothesis standing, evidence relations, disagreement, inquiry understanding, or support for the Objective. These assessments are unavailable, rather than empty or favorable. |
| Work | Canonical detail views reached through retained current-Objective inquiry links | Preserve link and Work revisions and result provenance. Completed Work is not necessarily newly completed, relevant scientific truth, or an applied result. The client cannot derive the frozen newly-completed subset from this payload. |
| Next steps | Existing exact inspect-result SuggestedActions with their own basis and freshness | Array order does not identify a preferred recommendation. Do not invent a Work action, eligibility, reason, or alternatives. A selected existing preview must retain its exact action and inquiry-result identity. |
| Recent decisions | Complete returned recent-ten History changes, effect observations, and recovery boundaries | Preserve canonical event identities and the bounded window. The fixture-backed event-detail route must remain unavailable for live references. A History observation does not grant Revert or retry authority. |

The response's `section_order` matches DB07. A later bounded mapping can use
these supported observations with explicit unavailable states. It must not use
the nested shell's place summaries as coverage for these seven Brief sections.
Full Brief acceptance still requires the missing semantic assessments and
comparison behavior; partial rendering cannot close those requirements.

## Existing interface constraints

`BriefSurface` currently consumes the shell-derived `ProjectRecord` plus the
existing SuggestedAction loader result. `loadProjectBrief` does not call the new
Brief endpoint. `projectRecordFromShellView` supplies shell attention, a read
position sentence as `baselineChange`, and an empty `recentDecisions` array.
These are not a mapping of the new snapshot-bound Brief composition.

Three material presentation findings prevent treating a mechanical field copy
as integration:

- **Major: unsupported attention conclusion.** `BriefSurface` labels empty
  shell attention **No item needs attention**. With partial Brief coverage,
  this would imply an assessment the server did not make. A future mapping must
  show the coverage and say only that no items were returned within it.
- **Major: recommendation attribution.** The attention renderer expects
  **Petra recommends**, a rationale, and **Other valid next steps**. The new
  attention observations authorize inspection of their owners; they do not
  contain a preferred SuggestedAction or establish valid alternatives. Do not
  populate these slots from consequence text or array position.
- **Moderate: comparison label.** The existing **Change from baseline** slot
  receives a shell read-position sentence. The new current-only state must say
  that no comparison was requested. Its event-interval state must name the
  exact event endpoints and retain the historical-snapshot limitation.

The component also places its baseline text within Current focus and does not
render distinct What changed, Current state, and Work sections from this
payload. Connecting the endpoint alone would not implement the frozen reading
order. The next frontend integration needs a bounded, explicit mapping through
the seven existing DB07 roles, with the supported subset distinguished from
unavailable assessments. This review changes no component, route, fixture, or CSS.

## Browser and identity boundary

Before any browser consumption, register `project-brief-view@1.0.0` and
`research-brief-payload@1.0.0`, including their referenced schema dependencies,
in the browser validator. Supply `registeredProfileSchemaHash` from the accepted
contract registry, not from a response's self-asserted registration. The current
browser registry does not yet register these contracts.

Use `ProjectBriefClient` for the authenticated read and its integrity checks.
Preserve Project, definition, Objective, snapshot, inquiry-link, source, Review,
Work, SuggestedAction, and History records when making presentation models.
Separate shell route revalidation from the Brief's captured observation; never
combine independently fetched shell summaries into a claimed Brief snapshot.
Read failures, stale bindings, unknown profiles, and unavailable baselines must
remain explicit. No production fixture fallback or automatic profile opt-in is
permitted. Existing authored ProjectDefinitions require an authoritative exact
registration before they can use this payload.

## Next backend boundary

Take one bounded profile-owned Current state synthesis slice under
`UX-REQ-002`'s smallest viable M1 response: compose a bounded synthesis over the
existing evidence-spine objects for the current scientific Objective, retaining
exact evidence/source basis, limitations, and explicit coverage. Full Hypothesis
development, standing, alternatives, and obligations remain M3. First inspect
the accepted profile and owner contracts. If they cannot support that synthesis,
return the exact missing owner or decision instead of deriving scientific meaning in the shared kernel
or client. Reuse canonical records and keep the synthesis read-only.

Return the accepted schema and evidence for the design worker to map within
Current state. Do not expand this into attention ranking, preferred actions,
historical Brief persistence, communication, or a second profile in the same
turn. Those remain separate dependencies and slices.

## Verification and writing review

Node 24.20.0 and npm 11.19.0 were used throughout. The focused workbench loader,
reference-rendering, and interface-recovery suites passed 82 tests in three files.
The complete `npm run verify` gate passed, including 211 workbench tests and 101
server tests. The initial sandboxed gate could not bind the localhost sockets
required by server tests; the complete rerun with socket access passed.

`npm run test:postgres:integration` passed 151 tests in 16 files on a fresh
PostgreSQL store after migrations V001–V041. The runner also completed disposal
of its isolated Docker resources. Brief cases exercise the authenticated route
through the typed client, exact Review/source preservation, stable repeated
reads, stale and tampered bindings, unsupported registration, unavailable
baseline, application-to-History/Brief updates, concurrent commits during
composition, and exact Work/result linkage. This is backend composition
evidence, not a live browser exit trace. PostgreSQL verification covers the
integrated reader transaction changes; this report adds no persistence behavior.

Felicity review of the backend read report found no material writing issue
within its explicitly partial scope. Review of the existing Brief language
identified the three integration findings above. The report uses “event
interval,” “completed Work,” and “first within coverage” to avoid unsupported
snapshot, newness, and priority claims. The existing UI findings remain open;
they are not described as fixed by this report.

No new browser path is introduced by this review. Static rendering and loader
tests can verify the retained interface; they do not demonstrate browser Brief
integration, screen-reader behavior, or live Brief accessibility. No
UX1.4-EV01–EV06 closure or direct/model-mediated identity convergence is claimed.
Wave 4 remains open, including full Brief coverage, CommunicationPlan, a
materially different registered profile, and the cumulative live exit trace.
