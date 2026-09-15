# Wave 4 final UX, Felicity, and exit audit

Status: fixed closure item 48 executed; Wave 4 remains open because the current
evidence does not satisfy `UX1.4-EV01`, `UX1.4-EV03`, or all required scenarios
in `UX1.4-EV02`, `UX1.4-EV04`, and `UX1.4-EV06`
Date: 2026-09-14
Design starting commit: `5b7adc9edb5880703f43554e28061a78282b2a97`
Exact backend counterpart integrated and inspected:
`c3c5164036f83873b0edc5b0ab54449914de23c9`
Prior production-browser trace:
`fb810a3ea16c391cdd20a5cbbb87901438abf943`

## Disposition

The material production-browser trace passes on the integrated branch. Against
fresh PostgreSQL 18.6 and Neo4j 2026.07.1 stores, the ordinary workbench entry,
route loaders, production typed clients and controllers, live server routes, and
frozen renderers show the scientific working overlay, ordinary and exception
Review members, source return, exact manual Apply checkpoint, independent
applied and rejected outcomes, changed Brief, and the complete server-returned
recent History window. Two server restarts retain the changed Brief and exact
durable cardinalities; replay returns the three stored command observations
without another effect. The stored controlled-writing candidate reaches the
shared Review renderer and stops before Apply.

This is not the complete Wave 4 exit proof. The harness creates the demonstrated
candidate and relationship as setup records. Its "direct" and
"model-mediated" designations are labels on repeated authenticated reads through
one caller seam. It executes neither a natural-conversation candidate path nor
an external model-mediated command and resulting revision. The browser evidence
also does not execute every named Review recording or a governed Revert, and it
uses the Chrome DevTools accessibility tree rather than a screen-reader session.
These are missing required proofs, not later-wave limitations. No claim in this
audit widens setup records, caller labels, unit rendering, synthetic transport,
or browser emulation into that evidence.

No consequential product, architecture, authority, profile-semantic, Review-
atomicity, or frozen-information-hierarchy decision is unresolved. The missing
proof needs backend/model integration and additional production-browser
execution through accepted owners. This design slice therefore changes only
the inaccurate design-owned caller claim above and this conformance report. It
does not change a backend contract, server, persistence, migration, authority
owner, frozen component, route, fixture, CSS rule, or interaction behavior.

## UX1.4 evidence assessment

| Evidence | Current exact evidence | Exit assessment |
| --- | --- | --- |
| `UX1.4-EV01` | Both registered ProjectDefinitions reach the shared WorkingCandidate and Review kernels. Scientific Graph and controlled-writing Review presentation preserve exact origin and non-authority wording. | **Open.** `UX-FX23` still lacks a paired-profile natural-conversation record in which conversation creates or revises inspectable working structure and optional inspection preserves exact origin. Seeded records do not satisfy this criterion. |
| `UX1.4-EV02` | The cumulative live browser covers ordinary and exception members. Focused typed, component, and synthetic-transport checks cover limited basis, blocked validation, correction, stale refresh, and defer/reopen states. | **Partial.** There is no material production-browser recording for every named limited-basis, blocked, corrected, stale, and deferred Review scenario. Unit rendering and synthetic transport establish bounded behavior but are not the required complete recording set. |
| `UX1.4-EV03` | Caller-designated reads before and after restart return the same stored working and Review hashes. The live manual checkpoint produces exact command and revision identities. | **Open.** No external model-mediated path creates or revises the candidate, enters the same Review, issues the same typed command, and demonstrates the resulting revision beside the direct path. Renaming identical reads cannot prove this convergence. |
| `UX1.4-EV04` | The live scientific trace applies one complete atomic ChangeSet, retains an independently rejected member, separates projection observation from effect, and replays without duplication. Existing focused checks cover failed and uncertain observations. | **Partial.** The required production evidence does not include the complete failure and governed Revert scenarios. The live Brief exposes canonical History summaries, but the browser trace does not execute Revert. |
| `UX1.4-EV05` | Contract, authority, client, renderer, and browser checks reject conversation-carried authority, invented Apply availability, passed-validation authority, partial-session success, and misleading producer/recorder attribution. Controlled writing exposes no Apply, and blocked communication is not presented as a validated answer. | **Materially covered.** The reviewed claims preserve human checkpoint, origin, validation, Review decision, command result, projection, and authority as separate facts. This does not compensate for the other open evidence. |
| `UX1.4-EV06` | The live Chrome trace covers responsive reflow, keyboard and focus return, synthesized touch, complete Graph/text cardinality and meaning, 200% text, forced colors, reduced motion, non-color status, minimum Apply target size, and the CDP accessibility tree. | **Partial.** It does not execute the required screen-reader evaluation or a full assistive-technology session. Synthesized touch and one Chrome engine remain accurately bounded. |

## Felicity review

The final pass reviewed the 40 Wave 4 reports created from the Wave 3 boundary
`da3f41663d4551a3ba3c6580f3e3956a87acff33` through the integrated starting
commit, together with the current Wave 4 Graph, Brief, Review, Recovery, Apply,
and communication copy. The intended reader is the coordinator deciding whether
the authoritative exit gate is proved.

One major claim problem remained in the design-owned cumulative browser report:
it called caller-designated authenticated reads "model-mediated" without an
external model or model-mediated command/revision trace. That wording could
support an incorrect `UX1.4-EV03` and Wave-completion decision. The report now
calls them caller-designated reads, limits them to the tested seam, and names the
unexecuted natural-conversation and model-mediated paths.

No other material meaning, reasoning, structure, audience-fit, or natural-voice
finding requires a design-owned report or product-copy change. Earlier reports
correctly bound focused tests, synthetic transport, fresh-store production
routes, Vite asset delivery, browser emulation, PostgreSQL evidence, profile
support, and unavailable authority. Backend-owned reports remain unchanged; the
item 47 audit already states the same caller-label limitation precisely.

## Verification and limits

Pinned Node 24.20.0 and npm 11.19.0 were selected explicitly.

- `node scripts/check-prerequisites.mjs` passed with Node 24.20.0, npm 11.19.0,
  Python 3.13.7, uv 0.12.5, Docker 29.7.2, and Compose 5.4.0.
- `npm run test:wave4:browser` passed after applying all 43 migrations to a fresh
  PostgreSQL 18.6 store and using a fresh Neo4j 2026.07.1 store. It exercised the
  live server and production workbench path through two server restarts, exact
  manual Apply, partial member outcomes, Brief/History update, replay, and the
  material browser and accessibility checks described above.
- `npm run verify` passed on the final tree under the pinned toolchain.
- `git diff --check` passed.

This design-only audit changes no persistence or PostgreSQL behavior, so item
47's fresh 156-test PostgreSQL integration remains the exact backend evidence;
the live browser rerun independently used fresh PostgreSQL and Neo4j stores for
the cumulative path. Browser assets were served through Vite rather than a
deployed static host. The run used synthesized touch, one Chrome engine, and the
CDP accessibility tree rather than a physical touch device or screen reader.

## Next safe boundary

Wave 4 must remain open. The next backend-owned evidence slice should execute,
not relabel, the missing `UX1.4-EV01` and `UX1.4-EV03` paths through the existing
production interaction, working-state, Review, and command owners: retain a
natural-conversation-created or revised candidate with exact producer and task
origin; run an external model-mediated entry that resolves to the same candidate,
Review, typed decision command, and resulting revision as the direct path; and
record exact identities before and after restart without treating conversation
as approval. It must not add a second authority ledger or weaken the manual human
Apply checkpoint.

After that backend evidence exists, one design-owned browser evidence slice must
consume the exact pushed commit and complete the remaining production recordings
for `UX1.4-EV01`–`EV04`, plus the required screen-reader evaluation in
`UX1.4-EV06`. Only then may the final audit be repeated and `wave_complete`
considered.
