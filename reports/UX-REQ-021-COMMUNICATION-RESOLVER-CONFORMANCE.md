# Scientific communication resolver: frozen design conformance

Date: 2026-09-13
Design starting commit: `207590ee734953863945186b9f7b9676ff088547`
Exact backend commit reviewed: `de6bb53320a543d354349c0b01f87b3a0bd0a351`

## Disposition

The installed `scientific-communication-payload@1.0.0` and
`ProfileCommunicationResolver` conform within the prerequisite scope authorized
by the [communication conformance review](UX-REQ-021-COMMUNICATION-CONFORMANCE.md).
No material defect or consequential unresolved freeze decision was found in this
bounded review. The next backend slice may compose the first bounded plan and
scoped response receipt under UX-REQ-021. Wave 4 remains open.

This review read the resolver implementation, schema, registry entry, generated
type, and focused tests at the exact backend commit, together with its
`reports/UX-REQ-021-COMMUNICATION-RESOLVER.md` and communication-owner report.
The [retained-synthesis integration report](UX-REQ-002-RETAINED-SYNTHESIS-INTEGRATION.md),
[UX-REQ-004/021](UX-BACKEND-HANDOFF.md), and frozen
[DB15/DB16](PETRA-UX-DESIGN-BRIEF.md) supply the accepted design boundary.
Backend-only files were inspected at the pinned commit without merging them
into this design branch. This slice adds only this report; no frontend
integration was requested.

## Conformance findings and limits

| Concern | Observed behavior and remaining limit |
| --- | --- |
| Exact registration and validator | The immutable payload schema fixes its semantic data with `const`; the registry hash is `sha256:c32fbcc062c28b100babf7ca372a62d9eeb25fb7446f49b6491d8fab61d4882a`. Resolution checks Project, definition identity/revision, expected and recomputed content hash, scientific family, and each required semantic key, registration kind, contract name/version/hash, and installed schema validator. Duplicate required registrations fail closed. `requiredRegistrations()` supplies descriptors without opting in or writing a definition. |
| Origin and force | The registered mapping preserves `source_report` as attributed report, `petra_synthesis` as Petra assessment, and `unresolved_inference` as inference. The payload requires retention of original subtype, producer, text, statement identity/order, evidence, limitations, and provenance. Structured force, conditions, inference rule, and author decision remain unavailable in the source schema. These are composition obligations; this resolver neither transforms statements nor proves that their prose satisfies them. |
| Reference identity | The five installed owners are Claim, Assertion, SourceSpan, WorkVersion, and GroundedResponse. Returned references retain canonical ID, revision, hash, source language, and semantic schema owner. The resolver rejects malformed or wrong-kind IDs, invalid hashes/revisions, and any SourceSpan revision other than immutable revision 1. It checks supplied identity shape, not object existence, visibility, or correspondence with stored bytes. |
| English and fallback | Only exact locale `en` resolves; `en-US`, other locales, and empty locale fail closed. Coverage is registered English terms and reference rules. Source language remains the observed value or explicit unavailability; there is no translation validation. Missing or incompatible singular/plural/family display terms use the installed generic family plus canonical identity/revision and a limitation. Borrowed display nouns are not returned. Missing semantic or validator compatibility cannot use display fallback. |
| Ambiguity and presentation | Duplicate requested display terms fail closed; first, later, and textual references repeat the same full identity and revision. This avoids guessed ordinals, pronouns, and ambient selection. It proves reference equality only. Ordinary response readability, profile descriptors where required, adjacent fallback limitations, efficient textual peers, and accessible disclosure still need composition and rendering evidence under DB15/DB16. |
| Historical and current bindings | Each result retains its exact definition and payload binding. Re-resolving a historical definition remains stable after a separate current revision uses fallback or an unsupported replacement version. Returned clones cannot mutate subsequent resolution. Source-time versions are explicitly `not_observed_by_resolver`; these tests do not establish durable historical response interpretation or authorize backfilling later terminology, prompt, renderer, or validator versions. |
| Validation scope | `resolved` means `profile_registration_and_reference_resolution_only`; response language validation is `not_performed`. Payload and contract tests prohibit a fabricated response receipt and executable/client-defined additions. Full language validation and repair remain unsupported. Gateway validation and a draft-specific Felicity receipt cannot be relabeled as a response-language `passed` or `repaired`. |

The payload preserves the canonical action-report obligations: exact
response/result matching, immutable command acceptance, independent Work execution
and terminal outcome, result availability, delivery, authority observations,
History, and current recovery assessment. The existing invocation reader bounds
Work History at 100 revisions. Its `retry_exact_start` branch applies only before
Work registration; terminal failed Work cannot acquire that operation through
communication. Stopping delivery and cancelling Work retain different owners.

These payload rules do not compose an actual invocation or evaluate current
eligibility. A historical report cannot become current permission. Communication
adds no command, Work, result, History, recovery, Review, or domain-authority
ledger. An inspect-result reason still supplies no preferred-recommendation
assessment.

## Precise backend handoff

Process exactly one bounded backend slice for the first additive, versioned
CommunicationPlan and scoped language-validation receipt around one existing
scientific GroundedResponse and one exactly linked SuggestedAction invocation
action report. Use this reviewed resolver and the canonical owners identified
by the pinned communication-owner report. No frozen frontend changes are
authorized.

1. Compose authenticated, snapshot-consistent reads of the exact Project,
   definition, response/output/Artifact, original packets and model-call
   provenance, and matching invocation. Verify supplied reference IDs, revisions,
   hashes, and Actor visibility through those owners. Preserve original bytes,
   source selections, original evidence snapshot, and source-time versions
   separately from the new composition's versions and current observations.
   Missing product thread/turn or invocation linkage remains explicit; protocol
   thread identity, ambient selection, and similar text cannot supply the join.
2. Retain ordered segments, original origin subtype, attributable producer,
   shared family, exact references, basis, conditions, limitations, uncertainty,
   and meaningful availability/delivery states. Unsupported structured fields
   stay explicit. The scoped receipt must identify checks actually executed and
   material findings. Missing required checks cannot yield an unqualified
   `passed`; `repaired` requires an implemented preservation check and exact
   repair provenance. Preserve valid segments when another segment is blocked.
3. Compose command acceptance, Work state and terminal outcome, result
   availability, delivery, projection/authority observations, History coverage,
   and current recovery independently. Failed Work must not become success;
   available results must not imply completed delivery or inquiry resolution.
   Reuse the current owning recovery assessment without granting generic retry,
   resume, or Review-member execution.
4. Test the exact successful composition and cross-Project, unauthorized,
   mismatched response/invocation/reference, stale or historical basis,
   unsupported registration/locale/validator, missing linkage, invalid/partial
   segments, failed Work, stopped delivery, and stable repeated-read cases.
   Prove original/current bindings remain separate and no communication read
   creates duplicate authority records. Run real PostgreSQL integration when
   implementing database behavior, the complete gate, and Felicity review.

If existing owners cannot safely supply a required fact, record its precise
unavailability or dependency. Stop for a consequential new semantic or authority
decision instead of inventing one. After this single backend slice, hand the exact
committed implementation to design with an explicit integration scope only if a
frozen frontend integration is ready.

## Writing review and verification

Felicity review found no material writing issue in the pinned resolver report,
communication-owner report, earlier conformance report, or retained-synthesis
integration report within their stated scopes. Review of this report keeps
installed obligations distinct from executed response checks and reference
formatting distinct from accessible task conformance. No product copy changes
are included.

Node 24.20.0 and npm 11.19.0 were used. At the exact backend worktree HEAD, the
focused resolver and contract suites passed 56 tests (45 core and 11 contract).
They cover exact registration, binding/hash failures, unsupported profiles and
locales, validator availability, fallback, borrowed terms, ambiguity, immutable
SourceSpan revision, source language, historical/current separation, and stable
resolution. The contract suite's first attempt hit the sandbox's temporary
config-file write restriction; the rerun used `--configLoader runner --no-cache`
and passed without writing backend repository files.

On the design branch, the focused `project-brief` and `m1-interface-recovery`
suites passed 26 tests, exercising existing Brief presentation/binding and
stale/failed recovery boundaries. They do not exercise a communication renderer.
The complete `npm run verify` gate passed with localhost socket access: 515
contract, 240 core, 54 adapter, 15 retrieval, 101 server, 231 workbench, 25 Python,
and eight handoff tests. Neo4j and S3 each passed three tests; their seven
service-dependent skips are not integration evidence. This gate verifies the
design branch; the additional backend resolver tests above ran at the exact
counterpart without merging its runtime files. `git diff --check` passed.
Markdown is excluded from repository formatting checks and received the separate
Felicity review described above.

This report changes no persistence or PostgreSQL behavior; a new PostgreSQL
integration run is not required. No fresh browser, assistive-technology,
second-profile, direct/model identity convergence, or cumulative live exit proof
is claimed. Plan/receipt composition and runtime integration remain open, as do
UX1.4-EV01–EV06 at their previously recorded boundaries.
