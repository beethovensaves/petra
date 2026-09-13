# UX-REQ-012 paired-profile working and Review mapping

Status: fixed Wave 4 closure item 44 passed; the cumulative live exit trace,
production browser trace, and final authority audit remain open
Date: 2026-09-13
Design starting commit: `008dd0332d2243c1fe5d43b1e6e770a4285aa167`
Exact backend counterpart inspected:
`bcce8fb7697955e67200d1ea01e3529d45269815`

## Result

The frozen workbench now accepts the additive controlled-writing
`petra.project-review-view@1.3.0` response and maps it through the same Review
loader and renderer as the scientific 1.2 response. The client accepts only an
installed scientific evidence pair or controlled-writing Requirement payload.
It rejects a controlled-writing response that claims Apply is available, binds
a ChangeSet, changes the GOVERNS predicate, substitutes the registered record
types, or reports an authority effect other than `none`.

Scientific Review behavior remains available. Its Claim and ASSERTS terms,
candidate correction and basis revision disclosures, commitment preparation,
and exact ChangeSet presentation are unchanged. The controlled-writing member
uses the ProjectDefinition-resolved Requirement, authority-source, and
governing-link terms while retaining the shared Current, Candidate, Origin,
Basis, Difference, Consequences, Validation, Decision, status, authority, and
Recovery hierarchy.

The controlled-writing presentation does not offer candidate correction, basis
revision, commitment preparation, or Apply. It states that no controlled-writing
ChangeSet operation, Approval, or Apply path is installed, and that the
candidate remains non-authoritative working state. Its unavailable commitment
controls are focusable and explanatory but have no request handler. Decide
later remains a Review-coordination action, and Recovery remains a read-only
status check.

No consequential product, architecture, authority, or freeze decision remains
open in this slice. The changes are limited to the frozen frontend model,
mapping, Review component, fixtures, tests, browser harness, and this report.
No backend contract, server, persistence, migration, or backend authority file
changed.

## Working Graph and textual peer

The shared relationship-overlay mapper now uses the server-supplied
`relationship_term` for a working relationship instead of falling back to a
profile-specific display label. The visual Graph and textual peer therefore
show the same definition-resolved predicate term. Empty optional display terms
fall back only to the generic labels `Item`, `Relationship`, `Working
candidate`, and `Basis item`; the client does not infer Claim, Requirement,
ASSERTS, GOVERNS, priority, validity, eligibility, or authority.

The browser harness ran both registered ProjectDefinition scenarios through the
production Project and relationship-overlay loaders, shared mapper, Graph
renderer, and complete textual-peer renderer. The scientific scenario retained
Claim, Source, Evidence relationship, and ASSERTS meaning. The
controlled-writing renderer scenario used Requirement, Authority source,
Governing link, and GOVERNS meaning. Both kept working and current layers,
selection, validation warning, basis, meaning, scope, and non-authoritative
working-state labels distinct.

There is an important transport limit: the installed relationship-overlay
contract and server route are still scientific-only. The controlled-writing
Graph response in this harness is therefore a renderer-only synthetic packet,
not an accepted controlled-writing overlay contract, live server response, or
typed-client conformance proof. The production mapper and renderer are ready to
preserve definition-resolved terms once a backend-owned registered overlay is
available; this design slice does not create that authority.

## Browser and accessibility evidence

Real headless Chrome through the DevTools protocol exercised the production
workbench routes, loaders, mapper, and frozen renderers around synthetic HTTP
transport. The Review 1.3 response used the exact controlled-writing record
families and reference shapes composed by the counterpart, but its record
identities were presentation fixtures rather than live stored records. The run
observed authenticated Project, Graph, and Review requests and no
relationship-view fixture fallback. Clicking the unavailable preparation and
Apply controls sent no requests.

The same run proved:

- keyboard Enter toggles the Graph textual peer and Recovery disclosure without
  losing focus;
- Graph and textual-peer object and relationship cardinalities match in each
  bounded scenario;
- a 375 CSS-pixel viewport at 200% root text size has no horizontal document
  overflow for the controlled-writing Review or textual Graph;
- the Recovery disclosure has a 44 CSS-pixel target and opens through an
  emulated touch sequence;
- forced colors retain visible Review status borders and a dashed working-layer
  distinction;
- reduced motion collapses control transition duration;
- validation, working authority, and unavailable actions use visible words and
  do not depend on color; and
- the accessibility tree exposes the shared Review headings and both
  unavailable commitment controls by name.

This is paired-profile renderer and interaction evidence for closure item 44.
It is not the cumulative production browser/server trace required by item 46.

## Verification and limits

Pinned Node 24.20.0 and npm 11.19.0 were selected explicitly.

- Workbench TypeScript checking passed.
- The focused Project adapter and Review renderer suite passed 87 tests across
  two files after the final language pass.
- The production workbench build passed.
- The focused Chrome interaction and accessibility harness passed every check
  listed above.
- `git diff --check` passed.
- The complete `npm run verify` gate passed generated-contract and fixture
  checks, the retrieval floor, formatting, lint, TypeScript and Python
  typechecks, the production workbench build, 536 contract, 300 core, 81
  adapter, 15 retrieval, 106 server, 239 workbench, 25 Python, and eight handoff
  tests. Neo4j and S3 each passed three tests; their seven service-dependent
  skips provide no integration evidence.

This slice changes no persistence or PostgreSQL behavior, so no PostgreSQL
integration run is required. Browser transport was synthetic and did not run a
live server or database. The evidence does not cover a physical touch device,
a full assistive-technology session, a registered controlled-writing Graph
transport, a controlled-writing mutation or Brief payload, or the cumulative
fresh-store exit trace. Those limits prevent this slice from closing Wave 4.

## Felicity review

Felicity review covered this report and the new user-facing Review language. It
found three material clarity risks, all corrected here: a controlled-writing
section formerly retained the misleading `Changes to apply` heading; its
unavailable explanation described an abstract registered profile instead of
naming Petra; and the draft browser claim did not distinguish registered record
shapes from live stored identities. The final copy now names the unavailable
commitment boundary directly, states that no Project authority changes, and
keeps renderer evidence separate from live transport evidence. No material
meaning, reasoning, structure, audience-fit, or natural-voice issue remains
after those corrections.

## Next safe boundary

Perform exactly closure item 45, owned by backend: run the cumulative live exit
trace on fresh stores through the production server routes and typed clients.
Exercise one scientific candidate from admission through working overlay,
resumable Review, exact manual checkpoint Apply, resulting Brief, and retained
History. Prove direct and model-mediated identity convergence, exact durable
cardinalities and provenance, restart replay, independent member outcomes, and
no duplicate effects. Include the controlled-writing candidate-to-Review path
as paired-profile evidence and stop before Apply. Do not begin the cumulative
production browser trace in that backend slice.
