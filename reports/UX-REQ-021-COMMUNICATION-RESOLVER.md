# Scientific communication payload and resolver prerequisite

Date: 2026-09-13
Backend starting commit: `22268929b1971b2d73ceba151cb4dea418e48eff`
Exact design counterpart inspected: `207590ee734953863945186b9f7b9676ff088547`
Authority: [UX-REQ-004/021](UX-BACKEND-HANDOFF.md), frozen
[DB15/DB16](PETRA-UX-DESIGN-BRIEF.md), the
[communication owner review](UX-REQ-021-COMMUNICATION-OWNER-REVIEW.md), and the
[retained-synthesis integration](UX-REQ-002-RETAINED-SYNTHESIS-INTEGRATION.md).
The counterpart's `reports/UX-REQ-021-COMMUNICATION-CONFORMANCE.md` was read from
that exact commit; it authorizes this prerequisite and no frontend integration.

## Implemented boundary

`scientific-communication-payload@1.0.0` installs one non-executable scientific
communication payload. Its schema fixes the supported semantics as an exact
constant, so its accepted schema hash also binds its terminology, reference,
discourse, preservation, and validation-scope rules:

`sha256:c32fbcc062c28b100babf7ca372a62d9eeb25fb7446f49b6491d8fab61d4882a`

`ProfileCommunicationResolver` resolves that payload against an exact
ProjectDefinition revision. It checks the definition's Project, identity,
revision and content hash, its scientific family, and each required registration's
kind, semantic key, name, version, installed schema hash, and available schema
validator. Missing, duplicate, unknown, or incompatible semantic registrations
fail closed. Only the exact `en` locale is supported; regional aliases and other
locales are not silently mapped to it.

The existing immutable ProjectDefinition contract is unchanged. The resolver's
`requiredRegistrations()` returns the necessary descriptors for a separately
authored revision; it neither writes nor automatically opts in a definition.
The extension, terminology, and resolution-validator registrations all bind the
same payload schema, with distinct semantic keys. Its validator registration
means schema and reference-resolution compatibility only. It does not install
or claim a response language validator.

The payload pins the existing synthesis output, invocation, invocation view,
WorkUnit, Claim, Assertion, SourceSpan, WorkVersion, and GroundedResponse schemas.
The pure resolver accepts an already-authorized definition read and observed
canonical reference identities. It verifies their shape and semantic owner;
it does not query whether an object exists or is visible to an Actor. Later
server composition must supply authenticated, snapshot-consistent owner reads.
No persistence, API, typed client, renderer, or browser route changes are included.

## Meaning and historical limits

| Concern | Behavior and limit |
| --- | --- |
| Statement family | The installed mapping resolves `source_report` to attributed report, `petra_synthesis` to Petra assessment, and `unresolved_inference` to inference. Original subtypes remain distinct. This slice resolves rules; it does not transform or validate statements. |
| Original content | The payload requires preservation of statement identity/order/text, producer and attribution, evidence and SourceSpan selections, limitations, resolution requirements, packet coverage, original Artifact bytes/hashes, snapshot, and source-time versions. No existing response or Artifact is rewritten. |
| Unsupported structure | Separate scientific force, conditions, inference rule, and author decision remain explicitly unavailable in the source schema. This does not mean their obligations are satisfied or that prose has no conditions. Relation/force vocabulary and pronunciation are unsupported here. |
| References | Registered singular forms accompany the exact canonical identifier and revision. First, later, and textual references use the same complete form. The returned record retains the canonical content hash and semantic schema owner. SourceSpan references retain the owner’s immutable revision 1. No ordinal or pronoun is inferred. |
| Missing or borrowed terminology | Missing or incompatible display forms use the installed generic family and canonical identity with an explicit limitation. They never supply another profile's display noun. Missing semantic registration or validator compatibility cannot use this fallback. Duplicate terms fail closed. |
| Historical replacement | Each result binds its own exact definition and payload. Resolving a current definition is a separate observation; it cannot change a historical result. Unknown replacement payload versions fail closed. Source-time communication, prompt, renderer, or validator evidence is not observed by this resolver and is not backfilled. A later composition must retain exact model-call prompt and original validation evidence, or explicit unavailability. |
| Validation | The result says `resolved`, with scope `profile_registration_and_reference_resolution_only` and response language validation `not_performed`. Gateway checks retain their original limited meaning. A draft-specific Felicity receipt is not applicable to a response; future required language checks and repair limitations are explicit. |
| Textual equivalence | The reference result has identical first/later/text-alternative meaning and retains terminology limitations separately. The payload requires equivalent origin, basis, conditions, limitations, state, consequence, and recovery in later visual/textual composition. This is not browser or accessibility conformance evidence. |

The linked action-report rules preserve exact response/result matching and the
canonical invocation, command acceptance, Work execution and terminal outcome,
result availability, delivery, History, authority observations, and recovery
owners. History coverage is bounded at 100 Work revisions. `retry_exact_start`
applies only before Work registration, never to terminal failed Work. These are
versioned composition obligations, not a newly calculated recovery assessment or
permission. No report of an actual invocation is composed in this slice.

## Verification and review

Node 24.20.0 and npm 11.19.0 were used throughout. The focused suites passed
56 tests: 45 resolver cases and 11 contract cases. They exercise exact opt-in,
Project/definition/hash mismatch, absent and incompatible registrations and
validators, unsupported families and locales, unknown semantic owners, missing
and borrowed display terms, ambiguity, malformed references, historical
replacement and unsupported replacement versions, source-language retention,
and stable repeated resolution. Contract tests reject altered semantics,
executable additions, and a fabricated response validation receipt.

The complete `npm run verify` gate passed on the final implementation: 527
contract, 285 core, 54 adapter, 15 retrieval, 101 server, 231 workbench, 25
Python, and eight handoff tests. Neo4j and S3 each passed three tests; their
seven service-dependent skips are not integration evidence. The first gate
found three unnecessary test assertions, which were removed. A subsequent
sandboxed run reached the known localhost socket restriction in server tests;
the complete final rerun with socket access passed. `git diff --check` passed.
Markdown is excluded from repository formatting checks and received the separate
writing review below.

This slice changes no persistence or PostgreSQL behavior, so a new real
PostgreSQL integration run is not required. Prior PostgreSQL and browser evidence
retains the limits documented in the retained-synthesis integration report.

The engineering review added an explicit SourceSpan revision-1 guard and regression
test after checking the canonical owner. It also checked for implicit authority,
changed source semantics, borrowed terminology, history rewriting, and misleading
validation claims.
The resolver has no mutation or action-execution path and no communication ledger.
Felicity review found no material writing issue after the report distinguished
installed obligations from executed response checks, and reference formatting
from full textual-peer conformance. Those distinctions are retained above.

## Next safe boundary

Design should review this exact backend implementation against DB15/DB16 and the
pinned conformance handoff. No frozen frontend integration is requested yet.
After that review, a separate backend slice may compose the first bounded
CommunicationPlan and scoped receipt from exact authenticated response and linked
invocation reads. It must preserve original versions and bytes, missing thread/
turn linkage, independent Work/result/delivery outcomes, History coverage, current
recovery ownership, and explicit unsupported fields. Missing required checks
cannot yield an unqualified `passed`; `repaired` requires exact repair provenance.

Only one scientific payload is implemented. Another materially different profile,
plan/receipt composition, runtime integration, browser/assistive-technology
validation, direct/model identity convergence, and cumulative live exit evidence
remain open. This prerequisite does not close Wave 4 or UX1.4-EV01–EV06.
