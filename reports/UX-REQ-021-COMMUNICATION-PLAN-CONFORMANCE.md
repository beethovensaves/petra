# Communication plan: frozen design conformance

Date: 2026-09-13
Design starting commit: `3a5772eb2b98be06710077987a5dd814e314898c`
Exact backend commit reviewed: `80bceddd99358a6de8842ec0b58801cd312df1d4`

## Disposition

The first scientific communication composition preserves the reviewed canonical
owner boundaries, but its typed client accepts inconsistent segment metadata.
One moderate integration prerequisite is recorded below. Backend should close
that gap before requesting frozen frontend integration. No consequential product,
architecture, authority, or freeze decision is unresolved by this finding.
Wave 4 remains open.

This bounded review changes only this report. It inspected the plan and receipt
schemas, composer, authenticated endpoint and production wiring, PostgreSQL
reader, invocation-reader refactor, typed client, and tests at the exact backend
commit. D022, UX-REQ-004/021, frozen DB15/DB16, and the communication owner,
resolver, and conformance reports supply the accepted boundary. Backend-only
files and reports were read from that commit's unchanged worktree; they were
not merged into the design branch. No frontend integration was authorized.

## Finding: segment metadata can contradict its retained source

**Moderate — validate segment metadata before exposing a plan to rendering.**
At the pinned backend commit,
`packages/adapters/src/communication-plan-client.ts:123` compares the ordered
non-null `original_statement` values with the model output. It does not bind
each segment's family and declared order to that same source. The plan schema
at `packages/contracts/schemas/communication-plan/1.0.0/schema.json:150` permits
these fields independently.

Two read-only probes against the actual client source reproduced acceptance:

1. Load the accepted `communication-plan.json` fixture, retain its exact request
   response identity/revision/content hash/record hash and locale `en`, and
   change only `content.segments[0].family` from `attributed_report` to
   `action_report`. Recompute the enclosing `content_hash` with canonical JSON
   and SHA-256; return that body through the client's injected fetch. The client
   accepts `origin: source_report`, `family: action_report`, and `invocation: null`.
2. Reload the fixture and set the first segment's `order` to the second segment's
   order. Recompute the enclosing hash and read it in the same way. The client
   accepts declared orders `[2, 2, 3]` while the original statement array is
   unchanged.

Both probes leave the full language receipt `blocked`. They used Node 24.20.0
with `--experimental-transform-types` to import the client TypeScript source;
no backend file, canonical record, or original Artifact byte was changed.
The existing composer produces the correct mapping and sequential order. These
probes demonstrate missing rejection of inconsistent returned plans, not that
the PostgreSQL composer currently generates those plans or that an attacker can
change canonical authority.

A future renderer consuming these fields could give a source report the wrong
communicative meaning or use a different reading order from its textual peer.
DB15's attribution/action distinction and DB16's meaning/order equivalence
therefore require an executable consistency check before integration. Preserve
server-owned profile meaning: validate the supplied bindings against the installed
profile and original statement sequence without asking React to infer semantics,
repair text, or calculate authority. Reuse a suitable backend-owned validation
boundary; any necessary contract revision must be additive.

## Conforming behavior and explicit limits

| Concern | Observed boundary |
| --- | --- |
| Partial preservation and full validation | The composer retains original statement text, order, origin, evidence selections, limitations, resolution requirements, and packet coverage. Missing segment evidence blocks its preservation finding while other segments remain inspectable. The receipt is always `blocked` / `incomplete`; family, force, attribution-language, action-language, and accessible-text checks remain `not_performed`. A preservation pass cannot label prose language-validated. The schema rejects `passed`, `repaired`, and non-null repair provenance. |
| Exact invocation | An optional command selects one Project-scoped canonical invocation. Its available result must match the separately observed current GroundedResponse ID, revision, content hash, and record hash. Missing requested invocation fails; omitted invocation stays null with a limitation. Similar text, ambient selection, and an inspect-result reason cannot supply an action report or preferred recommendation. |
| Original and current bindings | The retained response and current cache revision are separate; only cache observations may differ in their content. Original packets and evidence snapshot, model output and prompt/validator records, and source delivery retain their exact bindings. The current composition definition and installed communication hashes do not backfill unrecorded source-time terminology or renderer versions. Unique product-turn linkage retains its original definition; missing or ambiguous linkage is explicit. |
| Artifact and delivery | Artifact identity, hash, media type, and byte size remain references to original bytes. This reader neither fetches object-store bytes nor re-renders the answer. Source delivery and current invocation delivery occupy separate fields, including result reuse. Failed Work, available result, and stopped delivery remain independent observations. |
| Authentication and Actor provenance | Bearer authentication plus exact Project scope implements D022. The reader uses a repeatable-read, read-only transaction, checking required stored owners and exact permitted dependencies. It validates required Actor records rather than inventing Actor-specific read grants or using command grants as read permission. Recording service attribution does not become source authorship or human approval. |
| History and recovery | Invocation composition reuses the existing owner in the same transaction, with a deny-only command authorizer. Canonical command acceptance, Work state/outcome, result availability, recovery assessment, and first 100 Work revisions remain distinct. `retry_exact_start` applies before durable Work registration; terminal failed Work gains no generic retry. Any execution still belongs to its existing typed owner and current authorization checks. |
| References and unavailable meaning | The installed resolver supplies exact canonical identity/revision/hash and first/later/text references, with generic-family fallback and its limitation. Only exact `en` is supported. Source-language resolution and translation validation are unavailable. Structured force, conditions, inference rule, and author decision remain unavailable rather than being inferred from prose. |
| Authority and projection | Communication creates no ledger or mutation authority. The observed authority position is separate from projection, which is explicitly `not_observed`. Read timestamps can change, including the nested invocation timestamp and enclosing hash; they establish no durable communication lifecycle or changed result. |

The typed client already rejects mismatched request identities, incompatible
composition hashes, altered original output or statement text, and changed packet
content. The finding concerns the additional metadata it returns alongside that
preserved content. It does not negate those existing checks.

## Next bounded backend slice

Harden communication segment consistency in the existing backend-owned contract,
composition, or typed-client validation boundary. Add regressions for the two
recomputed-envelope cases above and for a fabricated or missing action-report
segment relative to the exact invocation. Valid complete and partially preserved
plans must still pass transport checks while retaining blocked language receipts.
Reject contradictions rather than silently reclassifying, sorting, or repairing
the returned content.

Include an authenticated successful endpoint-to-typed-client read and corrupt
returned-plan rejection. The current two route tests cover authentication,
unsupported/duplicate controls, missing response/service, and storage failure;
they do not execute a successful plan response or a corrupt returned plan,
despite the second test's title mentioning corruption. Test metadata consistency
without moving profile interpretation or authority into frozen components.

Run focused checks, the complete repository gate, and real PostgreSQL integration
if persistence or database behavior changes. Apply Felicity review, commit and
push the coherent backend change, and return one exact conformance handoff.
No frontend changes are authorized by this review. Full response-language
validation/repair, versioned rendering and task-oriented accessible presentation,
another materially different profile, and cumulative live exit evidence remain
later work; this fix alone cannot close them.

## Writing review and verification

Felicity review found no material writing issue in the pinned backend plan report
within its stated scope. Its distinction between preservation and language
validation is accurate, and its Artifact claim is explicitly limited to a
reference. This report records the typed-client gap separately rather than
claiming the backend report promised a complete semantic validator. Review of
this report preserves the difference between a reproduced inconsistent response,
a production composer defect, and an unperformed browser test. No product copy
changed.

Node 24.20.0 and npm 11.19.0 were used. At the exact backend worktree HEAD,
the focused communication suites passed 15 core, 11 typed-client, and two route
tests using `--configLoader runner --no-cache`. The two additional source-level
probes above reproduced the missing metadata rejection. Existing tests cover
partial preservation, missing/mismatched linkage, Project and owner mismatches,
unsupported locale/validator, historical cache invalidation, failed Work with
stopped delivery, and fabricated language-validation outcomes.

The complete design-branch `npm run verify` gate passed with localhost socket
access: 515 contract, 240 core, 54 adapter, 15 retrieval, 101 server, 231 workbench,
25 Python, and eight handoff tests. Neo4j and S3 each passed three tests; their
seven service-dependent skips are not integration evidence. This gate verifies
the design branch; the focused communication suites above verify the exact
backend counterpart. `git diff --check` passed. Markdown is excluded from
repository formatting checks and received the separate Felicity review above.

The backend's reported PostgreSQL run was inspected, not rerun here: 154 tests
across 16 files, with its stated fresh-store, repeatable-read, concurrent-definition,
reader-restart, linked-invocation, and unchanged-cardinality evidence. Its report
explicitly limits the combined failed-Work/stopped-delivery case to core tests.
This report changes no persistence or PostgreSQL behavior, so a new PostgreSQL
integration run is not required.

No fresh browser, assistive-technology, second-profile, direct/model identity
convergence, or cumulative live exit proof is claimed. A complete textual peer,
keyboard/focus, scaling, touch, forced-colors, reduced-motion, and non-color
communication evidence remain open at the recorded UX1.4-EV01–EV06 boundaries.
