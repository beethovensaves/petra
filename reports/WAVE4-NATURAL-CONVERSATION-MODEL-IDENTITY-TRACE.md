# Wave 4 natural-conversation and external-model identity trace

Execution date: 2026-09-14 America/New_York (2026-09-15 UTC)

## Boundary

This report closes evidence-closure item 49 against backend coordinator commit
`6b0b7b9d42cc22280ab58327c8a192edbb5d8c83`, backend implementation baseline
`c3c5164036f83873b0edc5b0ab54449914de23c9`, and design audit
`144b35d17db03d5b9c4de9caa8a29ad65ee146b0`.

The proof used the production interaction route, durable interaction and Work
owners, PostgreSQL working-state and Review owners, renderer-neutral typed
clients, and the existing manual Review Apply command path. It did not use a
fixture response, caller-designated “model-mediated” label, browser fixture, or
OpenAI Platform API key.

## Live execution

`npm run test:wave4:model-identity` started fresh disposable PostgreSQL 18.6,
SeaweedFS 4.41 S3, and Neo4j 2026.07.1 stores. Through the production
`/api/interactions/run` route it sent the natural question “What does the
selected study report, and what limits the claim?” to the certified grounded
synthesist. The terminal reported `execution_source: provider` and
`authority_effect: none`.

Codex App Server reported managed ChatGPT authentication, plan `prolite`, and
no API-key use. A separate actual Codex App Server extractor turn then emitted
the source-grounded correction proposal. Its retained ModelCall had a provider
request ID. The exact item-49 extractor certification covered this one live
positive case; it is not evidence of broad model quality or a replacement for
the synthesist suite’s negative controls.

The live identities were:

| Boundary | Exact identity |
| --- | --- |
| ProjectThread | `project_thread_1TVS320FP5Z477P8NY46FXAZF9` |
| Project turn | `project_turn_7MH84CJ73Z12ZV2YTEP9S188QB` |
| InteractionRun | `interaction_run_525CDXC6KHKJEB9045XDXJTVBT` |
| Terminal / delivered run revisions | `2` / `3` |
| WorkUnit revision | `work_unit_1M59PHH5NWTD9XKTJKGSQQ3ED0` revision `4` |
| ContextPacket | `context_packet_01ARZ3NDEKTSV4RRFFQ69G5FCD` |
| Snapshot | `snapshot_01ARZ3NDEKTSV4RRFFQ69G5FCE` revision `1`, event position `3` |
| GroundedResponse | `grounded_response_0R812XV7Z34417E3M3F49QNE0A` |
| Synthesist ModelCall | `model_call_34EMJF50M0NHVMQA3D6187NS4R` |
| Extractor RoleCertification | `role_certification_10E9K7FHS4KN7YFASNNH9ERRDX` |
| Extractor ModelRequest | `model_request_4P74X6DN937NDNTDZQRBXGF0TJ` |
| Extractor ModelCall | `model_call_5VSBMFNNFMQ89Q9B77W9WAWA5W` |
| EvidenceProposalBundle | `evidence_proposal_bundle_17WF4DWBPWERF73DV0R9HS3FME` |
| Model Actor | `actor_5QACHV6W8A66X4J3Y5KFVGHCX8` |

The terminal InteractionRun revision is retained because the GroundedResponse
binds that exact completed revision. AG-UI delivery then advances the same
stable run to revision 3. The ProjectThread correctly retains revision 2; the
working candidate’s current interaction-work binding correctly retains
revision 3. No owner treats the revisions as interchangeable.

## Identity convergence and authority

The direct path exposed human-produced WorkingCandidate
`working_candidate_131W6GBBPYDG1CX0FSQKX1RJ10` revision 1 in ReviewSession
`review_session_01K4D000000000000000000004` revision 1. The external model
proposal advanced that same candidate identity to revision 2, not a parallel
candidate. The canonical correction owner also advanced the same working
relationship `working_relationship_5MV0X9MX2PGD1T6W4AE42AC5DT` to revision 2
with pending validation and the same ReviewSession to revision 2. Relationship
revision 3 recorded completed results from the registered validators, and the
typed refresh command advanced the same ReviewSession to revision 3.

Retrying correction command `command_0Y91KA26R8P2PH3S7VX04XHK6Q` returned the
same resulting candidate and Review records with `applied: false`. It did not
append another correction.

Conversation, Work completion, model output, and validation remained
non-authoritative. Candidate revision 2 retained `domain_authority: false`.
Only the structured checkpoint with
`authorization_basis: authenticated_human_checkpoint`, human Actor
`actor_01ARZ3NDEKTSV4RRFFQ69G5FAV`, and `review_policy: not_applicable`
authorized ChangeSet `change_set_6ZZF42FMB61A3S1RTFVAC0E652`. The checkpoint
hash was
`sha256:f7d0312825529e9f498afc54c1b2738e54fa67abfb328fb7dd2c9be2bd181d18`.
The checkpoint retained the model producer and proposal provenance while
assigning decision authority only to the authenticated human.

The three typed Apply steps executed once. The resulting Brief snapshot was
`sha256:fbccd0c384a89cad0a77ba93f171443e8266689de66b02485417f1a76864e06f`.
History retained events `event_01M2HGFS804ZPGBK6QGCFFGG6N`,
`event_01M2HGFS72K1VQ0S96CFCKAHYN`, and
`event_01M2HGFS615X46C26E5SKYETJK`.

## Durable cardinalities and restart

After server restart, the exact interaction messages, working-state content
hash, Review content hash, Brief snapshot, and recent-History content hash
replayed unchanged. Replaying the manual checkpoint returned three `replayed`
step observations and did not create another effect.

| Durable record family | Count |
| --- | ---: |
| InteractionRun identities / revisions | 1 / 3 |
| WorkUnits | 2 |
| ModelRequests / ModelCalls / proposal bundles | 2 / 2 / 1 |
| ProjectThreads / turn bindings | 1 / 1 |
| WorkingCandidate identities / revisions | 1 / 2 |
| WorkingRelationship identities / revisions | 1 / 3 |
| ReviewSession identities / revisions | 1 / 3 |
| Correction / refresh command receipts | 1 / 1 |
| ChangeSets / Approvals | 2 / 2 |
| Command executions / domain events / graph outboxes | 8 / 6 / 2 |

The counts include the exact pre-existing baseline authority seeded into the
fresh Project. Counts before and after replay were identical.

## Backend finding and correction

The first actual extractor output reached the correction owner and failed
closed because the strict provider-schema projection had omitted the reported
`task` and `outcome` scope fields. The Claim semantic guard therefore rejected
incomplete scope accounting. The adapter projection now supports an explicit
bounded list of canonical optional properties that must be present in a strict
provider response. Item 49 requires `task` and `outcome`; the canonical output
contract and evidence semantics remain unchanged. A focused adapter test proves
that both fields and their nested required structure survive projection.

The installed Codex runtime was also `codex-cli 0.154.0`, while the prior
server-loadable synthesist certification named 0.151.0. The synthesist suite
was rerun live before this trace; all three cases and its subsequent gateway
call passed. The refreshed runtime record is exact to 0.154.0 and startup still
fails closed on later drift.

## Verification

All commands ran with the repository's pinned Node 24.20.0 toolchain:

- `npm run test:codex-synthesist:integration` passed with an actual managed-
  authentication Codex provider call and no OpenAI Platform API key.
- `PETRA_CODEX_CERTIFICATION_OUTPUT=/tmp/petra-wave4-item49-certification.json
  npm run test:codex-synthesist:certification` passed all three certification
  cases and the subsequent gateway call.
- `npm test --workspace @petra/adapters -- --run
  test/model-extractor-adapters.test.ts` passed 16 tests.
- `npm test --workspace @petra/server -- --run
  test/m1-grounded-synthesis.test.ts` passed 4 tests.
- `npm run test:wave4:model-identity` passed the fresh-store live trace and its
  restart replay with actual external-model execution.
- `npm run test:wave4:cumulative` passed the pre-existing cumulative scientific
  Apply and controlled-writing-to-Review trace on fresh stores.
- `npm run verify` passed formatting, linting, type checks, builds, and 1,309
  always-on tests. Seven service-dependent tests were explicitly skipped by
  their ordinary gate configuration.
- `npm run test:postgres:integration` applied all 43 migrations to a fresh
  PostgreSQL 18.6 store and passed all 156 integration tests in 16 files.

The report language received a consequential-claim review after the live
evidence was recorded. Claims above distinguish the executed backend proof
from the browser and assistive-technology evidence still required by item 50.

## Limits and next boundary

This is backend runtime and persistence evidence for UX1.4-EV01 and
UX1.4-EV03. It does not supply item 50’s production workbench recordings,
named Review-state coverage, governed Revert recording, or full assistive-
technology session. Wave 4 remains open. The next safe slice is exactly item
50 on the design branch, followed by backend item 51 and design item 52.
