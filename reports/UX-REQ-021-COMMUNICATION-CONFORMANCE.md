# Communication dependency: frozen design conformance

Date: 2026-09-13
Design starting commit: `2cd823fc74f78c8f7f2a039a726dcf600c6dcb81`
Exact backend commit reviewed: `22268929b1971b2d73ceba151cb4dea418e48eff`

## Disposition

The proposed profile communication contract and resolver are a conforming next
dependency under [UX-REQ-004/021](UX-BACKEND-HANDOFF.md), frozen
[DB15](PETRA-UX-DESIGN-BRIEF.md#db15--ux-language-system), and
[DB16](PETRA-UX-DESIGN-BRIEF.md#db16--accessibility-specification).
No consequential product or freeze decision is unresolved in this bounded review.
This is design review of a proposal, not acceptance of implemented communication
behavior. Wave 4 remains open.

The exact backend diff adds only
`reports/UX-REQ-021-COMMUNICATION-OWNER-REVIEW.md`; that report was read from the
pinned commit. Its runtime files are identical to the design starting commit.
The [retained-synthesis integration report](UX-REQ-002-RETAINED-SYNTHESIS-INTEGRATION.md)
supplies the existing frontend boundary and its limits. No frontend integration
is requested or supplied by this counterpart. This slice changes only this report.

## Conformance findings

The owner proposal preserves the accepted distinctions. The following are
implementation acceptance conditions, not claims of defects fixed in runtime.

| Concern and inspected source | Finding and required boundary |
| --- | --- |
| Statement origin and family: `model-synthesist-output@1.0.0`, DB15 shared communicative acts | Preserve statement key, order, text, original origin subtype, and attributable producer. The registered mapping may resolve a shared family, but an origin enum alone does not supply scientific force, an inference rule, or an author decision. Unavailable family obligations must remain explicit. A synthesis cannot become a recorded author judgment or accepted finding. |
| Force, conditions, and limitations: synthesis schema and UX-REQ-021 ordered plan | The current output has no separate force or conditions fields. Preserve original text, every limitation, uncertainty, resolution requirement, and packet coverage. Explicitly unavailable structured force/conditions do not mean absent conditions or an unconditional statement. Never infer support strength or validation completeness from `source_report`, `petra_synthesis`, or `unresolved_inference`. |
| References and generic fallback: ProjectDefinition `Term`/`Registration`, DB15 reference grammar | The existing term labels do not install discourse/reference semantics. The additive registry must bind the semantic owner and exact canonical identity, first/later reference and ambiguity behavior, source language, English coverage, and replacement/fallback rules where applicable. Missing display terminology may use the registered generic family plus canonical identifier and a visible limitation. Unknown semantic or validator compatibility cannot use this fallback to claim successful profile validation. No guessed ordinals, machine-key labels, borrowed taxonomy, or rewritten source bytes. |
| Historical versions: GroundedResponse, model-call, DB15 versioning | Preserve original output/Artifact bytes and hashes, evidence snapshot, prompt and validator versions. Bind newly resolved communication/terminology/reference/discourse/renderer versions to the new composition. A current replacement descriptor is a separate observation; it cannot imply that a historical response used a later validator or terminology registry. Missing historical version evidence remains unavailable. |
| Validation scope: `SynthesistGateway` and `felicity-revision-record@1.0.0` | Gateway checks name output-schema, grounded-synthesis, and statement-origin separation. They cannot be relabeled as full language validation. The Felicity receipt requires previous/revised DraftArtifact and its provenance/citation/command workflow; it cannot be attached to a response. A subsequent response receipt must report actual scoped checks and material findings. Missing required checks cannot yield an unqualified `passed`; `repaired` requires exact repair provenance. |
| Equivalent textual meaning: DB16 equivalence and live-update rules | The future plan must carry the same exact references, origin, basis, conditions, limitations, state, action consequence, and recovery to visual and textual peers. Compact disclosure may change depth, not meaning. Preserve segment availability and validation/delivery distinctions so meaningful announcements can retain focus and avoid token-by-token updates. Raw-record inspection in the current Brief is not full task-oriented or assistive-technology conformance. |

## Linked action report and canonical owners

The accepted action-report alternative is suitable for one response whose exact
result reference matches an existing grounded-synthesis SuggestedAction invocation.
An inspect-result action's reason is insufficient for a preferred recommendation;
it supplies no assessment of alternatives. Missing invocation or product
thread/turn linkage must remain explicit, with no join by ambient selection,
similar response text, or protocol thread alone.

The inspected `SuggestedActionInvocationCoordinator`, invocation/view schemas,
and `PostgresSuggestedActionInvocationAuthorityRepository` preserve these bounds:

- Command acceptance is the immutable invocation receipt. It may precede durable
  Work registration and does not prove execution or response completion.
- Work identity, input manifest, current revision, execution state, and terminal
  outcome remain separate from result availability and InteractionRun retention.
  Work `completed` with a failed terminal outcome cannot be reported as success.
  An available result does not prove visible delivery completed.
- Canonical command receipt and WorkUnit revisions own this operational History.
  Its Work/History destinations do not create a Project domain event. The reader
  bounds returned Work revisions at 100; composition must not claim an exhaustive
  lifecycle beyond the owner's coverage.
- Grounded synthesis has no scientific or inquiry-resolution authority effect.
  Preserve observed authority positions and any separately supported projection
  observation without claiming that the response applied domain changes.
- Recovery comes from the current server-owned invocation assessment. In the
  inspected implementation, `retry_exact_start` is eligible only before Work
  registration; it converges on the same command receipt and expected Work.
  It is not retry of terminal failed Work, generic resume, or fresh Work.
  Reconnection replays the exact interaction; stopping delivery does not cancel
  Work. Cancellation and inspection retain their owning eligibility and commands.
  A historical report cannot preserve old eligibility as current permission.

These facts can be referenced or composed at an authenticated, consistent read
boundary. Communication must not create another command, Work, result, History,
recovery, or domain-authority ledger. The invocation recovery facts also do not
replace ReviewSession RecoveryAssessment or grant member retry authority.

## Bounded backend handoff

Implement exactly the additive profile communication payload and resolver
prerequisite identified by the pinned owner report. Use existing immutable
ProjectDefinition registrations and installed name/version/hash checks for one
scientific answer plus the linked action-report vocabulary. Preserve the
statement distinctions and fallback/version rules above. Do not edit accepted
schemas in place or automatically opt existing definitions into a new contract.

Test successful exact resolution, unknown profile/semantic owner, missing or
incompatible registration/validator, wrong hash, unsupported locale, missing
display term with safe generic fallback, ambiguity, historical replacement,
borrowed terminology, and stable repeated resolution. Declare unsupported scope
explicitly; a scientific-only resolver does not establish profile neutrality.

Stop after that prerequisite. The later plan/receipt composition must test exact
Project/response/invocation matches, stale and historical basis, missing linkage,
partial or invalid segments, and failed Work without whole-success claims. It
will need authenticated snapshot-consistent reads and real PostgreSQL integration
when database behavior changes. No frontend changes are authorized by this handoff.

## Writing review and verification

Felicity review found no material writing defect in the pinned owner report or
retained-synthesis integration report within their stated scope. This report
makes the retry and History coverage limits concrete without enlarging their
owners or claiming new product authority. Its review separates a conforming
dependency proposal from unimplemented CommunicationPlan acceptance.

Node 24.20.0 and npm 11.19.0 were used for verification. The focused
`grounded-synthesis`, `synthesist-gateway`, and `composition-compiler` suites passed
32 tests; `project-brief` and `m1-interface-recovery` passed 26. These exercise
existing origin/evidence admission, gateway and draft-preservation boundaries,
Brief rendering and mismatched bindings, and stale/failed interface recovery.
They do not test the proposed communication resolver or receipt.

The complete `npm run verify` gate passed: 515 contract, 240 core, 54 adapter,
15 retrieval, 101 server, 231 workbench, 25 Python, and eight handoff tests;
Neo4j and S3 each passed three tests. Their seven service-dependent skips are
not integration evidence. The initial sandboxed gate failed on localhost socket
permission in server tests; the complete rerun with socket access passed.
`git diff --check` passed. Markdown is excluded from repository formatting
checks and received the separate writing review described above.

This documentation-only slice changes no persistence or PostgreSQL behavior,
so a new PostgreSQL integration run is not required. No fresh PostgreSQL, browser,
assistive-technology, second-profile, direct/model convergence, or cumulative
live exit proof is claimed here. UX1.4-EV01–EV06 remain open at their previously
recorded boundaries.
