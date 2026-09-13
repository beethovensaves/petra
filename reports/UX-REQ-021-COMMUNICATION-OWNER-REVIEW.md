# Communication plan: canonical owners and first contract dependency

Date: 2026-09-13
Backend starting and exact counterpart commit:
`2cd823fc74f78c8f7f2a039a726dcf600c6dcb81`
Authority: [UX-REQ-021](UX-BACKEND-HANDOFF.md#ux-req-021--profile-resolved-communication-plan-and-language-validation-receipt),
[UX-REQ-004](UX-BACKEND-HANDOFF.md#ux-req-004--versioned-project-profile-and-domain-semantic-boundary),
frozen [DB15](PETRA-UX-DESIGN-BRIEF.md#db15--ux-language-system) and
[DB16](PETRA-UX-DESIGN-BRIEF.md#db16--accessibility-specification), and the
[retained-synthesis integration handoff](UX-REQ-002-RETAINED-SYNTHESIS-INTEGRATION.md).

## Disposition

This bounded backend review identifies the contract dependency before the first
ProjectDefinition-resolved CommunicationPlan. Existing owners retain the answer,
evidence, execution, and action facts, but the installed contracts do not yet
resolve the applicable profile discourse/reference rules or record a response
language-validation outcome. This report records that gap; it implements no
CommunicationPlan, endpoint, validator, or persistence behavior.

The next backend implementation boundary is the smallest additive
terminology/reference/discourse contract and resolver needed for one scientific
answer and a linked action report under UX-REQ-004/021. This dependency precedes
the plan composition because its family mapping and validation scope must be
versioned inputs, rather than interpretations supplied by a shared client.
Existing ProjectDefinition registration kinds can name these contracts; a new
profile authority or an in-place edit of accepted schemas is unnecessary.

No consequential product or freeze decision is requested by this review. DB15
already supplies the shared families, ownership, English-first coverage, and
limited generic fallback. Those accepted rules support further implementation.
If that implementation requires changing domain force or the meaning of an
existing statement, it must stop for the specific semantic decision.

## Existing owners and their limits

| Required fact | Inspected canonical owner | Reuse and limit |
| --- | --- | --- |
| Project/profile binding | `project-definition@1.0.0`, `ProjectDefinitionAuthorityRepository`, and its PostgreSQL implementation | Retain the exact Project-owned revision and hashes. `Registration` already admits `terminology`, `validator`, `output`, `prompt`, and `extension` with named version/hash. `Term` contains semantic key, singular, plural, definition, and generic family; it has no reference grammar, locale coverage, discourse mapping, or relation/force rules. |
| Ordered answer statements | `model-synthesist-output@1.0.0` and `GroundedSynthesisValidator` | Retain statement key, order, original text, `source_report` / `petra_synthesis` / `unresolved_inference`, exact evidence and SourceSpan selections, limitations, resolution requirement, and packet coverage. Origin is explicit; separate scientific force and conditions are not structured fields in this output. Do not infer them from prose or from the origin enum. |
| Exact response and original basis | `grounded-response@1.0.0`, `InMemoryGroundedResponseRegistry`, and `readResearchBriefSynthesis` | Retain Artifact bytes/hash, output hash, packet refs, original snapshot, execution and interaction refs, dependencies, cache revision, and terminal state. The Brief adapter already checks the successful model call and exact packets in its transaction. Its captured read position and each result's original evidence snapshot have distinct meanings. |
| Product thread and turn | `project-thread@1.0.0` and `PostgresProjectThreadAuthorityRepository` | Retain thread revision and exact turn, definition, input, context, execution, authority context, and completed-response binding. A protocol thread identifier is not a substitute for this product record; absent retained linkage must remain unavailable. |
| Model and validation provenance | `model-call@1.1.0`, `model-request@1.1.0`, `SynthesistGateway`, and `SynthesistExecutionRepository` | Reuse prompt-profile name/version/hash, exact call input/output, deployment/certification refs, and validator results. Successful gateway results name `model-output-schema`, `grounded-synthesis`, and `statement-origin-separation`, all at 1.0.0. They establish their stated checks, not the complete DB15 communication contract. |
| Language repair | `felicity-revision-record@1.0.0` and `FelicityRevisionEngine` | This receipt requires previous/revised DraftArtifact, provenance map, citation bundle, command, language contract, and preservation checks. It describes a passed draft transformation. A GroundedResponse cannot be assigned this receipt without that owning workflow; the receipt has no general response-level passed/repaired/blocked branch. |
| Existing inspection action | `suggested-action-view@1.0.0` and `PostgresSuggestedActionViewReader` | Preserve the exact inspect-result action, Objective, definition, inquiry link, response basis, scope, current readiness, and read-only invocation. Its reason is not evidence that this is the preferred next action or that alternatives were assessed. |
| Linked action report | `suggested-action-invocation@1.0.0`, `suggested-action-invocation-view@1.0.0`, and `SuggestedActionInvocationAuthorityRepository` | An existing grounded-synthesis invocation supplies the exact action/command receipt, Work/input manifest, interaction, result, History, recovery, and authority observations. Report only an invocation whose result reference matches the bounded response. An arbitrary older response need not have such an invocation. |
| Progressive delivery | `GroundedSynthesisInteractionExecutor`, `renderGroundedSynthesisForInteraction`, GroundedResponse terminal state, and InteractionRun replay | Preserve the actual response/Work/delivery observations. Completed structured synthesis is validated before this renderer produces its answer. These owners do not supply generalized per-segment language-validation and repair states; received bytes alone cannot establish them. |

The installed `packages/contracts/registry.json` has no terminology/discourse
payload or CommunicationPlan/language-validation-receipt schema. A registration
slot and labels in a ProjectDefinition do not themselves install those semantics.
The bounded synthesist prompt profile is also a separate owner from the
ProjectDefinition: its scientific instructions are not a profile-neutral
terminology resolver.

The source boundaries are the [definition schema](../packages/contracts/schemas/project-definition/1.0.0/schema.json),
[synthesis schema](../packages/contracts/schemas/model-synthesist-output/1.0.0/schema.json),
[gateway validation](../packages/core/src/synthesist-gateway.ts),
[Felicity receipt](../packages/contracts/schemas/felicity-revision-record/1.0.0/schema.json),
[action reader](../packages/postgres/src/suggested-action-view-reader.ts), and
[invocation view](../packages/contracts/schemas/suggested-action-invocation-view/1.0.0/schema.json).
`PostgresProjectBriefViewReader.assertProfile` provides an existing pattern for
checking an exact definition registration against the installed schema hash;
communication resolution can reuse that pattern without automatically revising
or opting in an existing ProjectDefinition.

## Precise implementation dependency

The next contract slice can use the existing immutable ProjectDefinition
registration mechanism and installed schema hashes. It needs to define and test:

1. A versioned, non-executable profile communication payload resolving exact
   semantic owners, applicable terms/references, English coverage, fallback,
   prohibited conflations, and the mapping of the three existing synthesis
   origins to the accepted shared families. Preserve the original subtype and
   text. Keep origin and communicative family separate from scientific force;
   unsupported force or conditions remain explicitly unavailable as structured
   data, with the original content retained.
2. Resolution against the exact ProjectDefinition registration and installed
   name/version/hash, with closed unsupported and incompatible outcomes. DB15's
   generic family plus canonical identifier and terminology limitation remains
   available where applicable. A missing display term need not block an
   otherwise safe segment; missing semantic or validator compatibility cannot
   be represented as a successful profile validation.
3. Exact communication, response-schema, prompt, renderer, and validator version
   bindings, distinguishing retained source-time versions from a new composition's
   versions. Do not retroactively claim that a historical answer used a registry
   or language validator introduced later. Preserve original descriptors/bytes;
   any current replacement is a separate observation.
4. An explicit validation scope for the subsequent receipt: original synthesis
   validation is evidence to compose, not a new language `passed` result. A new
   validator must actually check the declared family, reference, origin, force
   preservation, conditions/limitations, action fidelity, and state obligations
   before reporting its outcome. Unsupported checks remain visible. Exact
   repair provenance is required before a later `repaired` result is available.

After that prerequisite, one backend plan slice can compose a bounded answer
with an action report from an existing exact SuggestedAction invocation. This
uses the accepted action-report alternative in UX-REQ-021 and avoids making a
preferred-recommendation assessment that the current Brief action list does not
own. The report must distinguish command acceptance, Work terminal outcome,
response availability, delivery, projection, and domain authority. A successful
grounded-synthesis result has no domain authority effect.

Use the existing response/output, Work, event, invocation, and validation records
as references or snapshot-bound composition inputs. Do not create copies with
independent lifecycle authority. Missing thread/turn or invocation linkage must
be explicit; it cannot be filled from ambient selection or a merely similar
response. No new command is needed to read a communication plan.

Contract and resolver tests should reject unknown profiles, missing/incompatible
registrations and validators, mismatched hashes, and borrowed terminology.
Subsequent plan tests must cover exact response/action/Project mismatches, stale
basis, original versus current versions, retry stability, invalid or incomplete
segments, and failed/partial Work without a whole-success claim. Database reads
will need authenticated snapshot consistency and real PostgreSQL integration
when implemented. This review supplies no substitute for those future tests.

## Authority, provenance, and writing review

The critic-style pass identified three material shortcuts to exclude from the
implementation: treating gateway validation as full language validation,
assigning a draft-specific Felicity receipt to a response, and promoting an
inspect-result reason into a preferred recommendation. The dependency and owner
mapping above preserve those distinctions. No runtime defect is claimed to have
been fixed by this report.

Felicity review of the retained-synthesis, conformance, and integration reports
found no material overclaim within their stated scopes. This report preserves
the difference between an addressing result and an accepted finding or inquiry
resolution. Its version and validation claims are limited to the inspected
owners. The report also distinguishes a missing implementation contract from a
new product decision; the next worker need not request approval merely to
implement the already accepted bounded semantic registry.

DB16 requires equivalent meaning, exact references, limitations, controls, and
outcomes in visual and textual peers. A future plan must carry those facts to
both. This review authorizes no frozen component, route, CSS, or fixture edits.
It demonstrates no browser, accessibility, alternate-profile, model-convergence,
or cumulative live exit trace. Wave 4 remains open.

## Verification

Node 24.20.0 and npm 11.19.0 were used for verification. The focused
`grounded-synthesis`, `grounded-response-registry`, `synthesist-gateway`, and
`composition-compiler` suites passed 40 tests in four files. These exercise exact
output admission, evidence/origin checks, mismatched bytes and dependencies,
invalidation and replay, certification/prompt rejection, and draft-specific
Felicity preservation and failure. They verify the reused owners, not a future
CommunicationPlan implementation. An initial focused invocation used the wrong
workspace root and discovered no tests; the corrected workspace command passed.

The complete `npm run verify` gate passed, including 515 contract, 240 core,
54 adapter, 15 retrieval, 101 server, 231 workbench, 25 Python, and eight handoff
tests. Neo4j and S3 each passed three tests; their seven service-dependent skips
are not integration evidence. The initial sandboxed gate failed on localhost
socket permission in server tests. The complete rerun with socket access passed.
`git diff --check` passed. Markdown is excluded from repository Prettier checks;
the report received the separate writing and authority/provenance review above.

This documentation-only slice changes no persistence or PostgreSQL behavior, so
a new real PostgreSQL run is not required. The previous integration report's
PostgreSQL and synthetic-browser evidence retains its stated limits; it is not
claimed as fresh execution or as communication-plan coverage here.
