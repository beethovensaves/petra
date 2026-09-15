# Wave 4 final evidence reconciliation and authority audit

Status: evidence-closure item 51 passed as a backend audit; no backend-owned
runtime defect required a code change; the exact evidence does not yet support
declaring Wave 4 complete

Date: 2026-09-15 America/New_York

Backend starting commit: `059b3a4640b939f09be0b9ca39328777f6105c40`

Exact design counterpart inspected:
`494f0f4bebe5270d38f565d85cc8975259003846`

Item 49 evidence commit: `2b42eeb1cf003b31473756bf3e7c329950de4ede`

Item 50 implementation commit: `3461349bb4278cb415caa66db8ea28b9c266b48f`

## Result

The item 49 trace supplies the missing bounded backend proof of one actual
managed-provider natural conversation and one actual external extractor call.
It retains the exact human and model Actors, producer role, ProjectThread turn,
Work, InteractionRun, snapshot, basis, proposal, candidate, Review, typed
correction and refresh commands, human Apply checkpoint, resulting Brief and
History, and restart replay. The external ModelCall has a provider request ID;
this is not a caller-label substitute. Conversation, Work completion, model
output, and validation remain non-authoritative, while the exact authenticated
human checkpoint remains the only Apply decision.

The item 50 command supplies fresh production-browser evidence for the
human-seeded cumulative path and governed Revert. It records deferred Review,
ordinary and exception members, controlled-writing Review without Apply,
source return, the manual Apply checkpoint, independent applied and rejected
outcomes, Brief and History updates, restart replay, compensation preview,
confirmed plan, one compensation execution, and the resulting
`already_compensated` unavailable state.

The combined evidence still has material recording gaps. The item 50 driver
defines helpers for the retained conversation, the model-corrected blocked
Review, stale Review, and refreshed Review, but
`npm run test:wave4:item50` aliases the ordinary cumulative browser command.
Its instrumenter invokes only the ordinary cumulative driver and the item 50
governed-Revert helper. It never invokes the conversation, corrected/blocked,
or stale helpers, and it does not run the item 49 mode. Uncalled helpers are not
recordings. The ordinary cumulative seed is accurately human-produced and
cannot substitute for the pushed external-model trace or for a production-
browser recording of that trace.

No backend contract, authority owner, persistence path, migration, API, typed
client, command, event, projection, Brief, History, communication, Work,
interaction, or recovery ledger changed in item 51. No frozen React component,
CSS file, browser route, presentation fixture, or design report was modified.

## UX1.4 evidence reconciliation

| Evidence | Exact combined evidence | Assessment |
| --- | --- | --- |
| `UX1.4-EV01` | Item 49 retains one scientific natural-conversation and external-model correction through the working and Review owners. Item 50 separately renders a human-seeded scientific working Graph and a seeded controlled-writing Review. | **Partial.** The item 50 command does not execute its natural-conversation/working-Graph helper, and controlled writing is not shown in the `UX-FX23` natural-conversation path. Separate seeded profile coverage cannot be relabeled as the paired-profile natural-conversation and optional-inspection record. |
| `UX1.4-EV02` | The item 50 command records ordinary, exception, and deferred Review states. Item 49 retains the corrected and refreshed backend revisions. | **Partial.** The item 50 command does not invoke its corrected/blocked or stale browser helpers, and no executed production-browser evidence in the named command records the required limited-basis state. Defined helpers and focused component evidence are not the named recording set. |
| `UX1.4-EV03` | Item 49 uses an actual provider-backed interaction and extractor ModelCall, then advances the same stable candidate and Review identities through the typed correction, refresh, and exact human Apply path. It records each resulting revision and proves idempotent correction and Apply replay. | **Materially covered for the one bounded positive trace.** The provider request ID, retained ModelCall, model Actor, producer provenance, and stable identities eliminate caller-label substitution. This is not broad model-quality evidence. The ordinary cumulative test's caller-designated read labels add no model evidence. |
| `UX1.4-EV04` | Item 50 records one complete atomic Apply, independent applied and rejected member outcomes, restart replay without duplication, and a successful three-step governed Revert with additive History. | **Partial.** The final `already_compensated` state is an unavailable recovery state after successful compensation, not a governed command failure. The named item 50 execution also does not record the required projection-lag scenario. Calling `already_compensated` a “failure state” would overstate the evidence. |
| `UX1.4-EV05` | Item 49 separates model producer, human decision Actor, validation, correction, Review, checkpoint, command result, and authority. Item 50 proves prepare and plan reads do not execute, one explicit touch action sends one Apply or Revert request, and controlled writing exposes no Apply. | **Materially covered.** No reviewed backend path lets conversation, model output, validation, selection, or presentation grant authority. Attribution remains exact. |
| `UX1.4-EV06` | Item 50 records responsive reflow, keyboard activation and focus transfer, Chrome accessibility-tree semantics, Graph/text cardinality, 200% text, synthesized touch, forced colors, reduced motion, and non-color meaning. | **Partial in the named item 49/item 50 evidence.** Native screen-reader evaluation is outside Wave 4 acceptance and must not be requested. The item 50 command does not record the completion criterion's panel-resize evaluation; item 52 must reconcile or rerun the existing post-freeze panel-resize evidence without turning one Chrome engine or synthesized touch into a physical-device or cross-browser claim. |

## Adversarial authority audit

| Risk | Evidence inspected | Assessment |
| --- | --- | --- |
| Implicit authority | Item 49 interaction terminal, corrected working record, Review refresh, Apply preparation and execution; item 50 Apply and recovery call sequence | No backend finding. Conversation and model output report no authority effect. Apply still requires the exact human checkpoint, and Revert still requires separate preview, confirmed plan, and execution actions. |
| Attribution | Item 49 ProjectThread, ModelCall, proposal, candidate producer, prior-revision lineage, checkpoint Actor, and History | No backend finding. Human authorship, model production, service validation, recording, and human decision authority remain separate exact facts. |
| Cross-Project leakage | Project-scoped working, Review, Apply, Brief, History, and recovery readers; focused route/client checks; fresh PostgreSQL suite | No backend finding. Authenticated reads and commands retain exact Project bindings and reject mismatched Project identities. |
| Duplicate effects | Item 49 correction retry and Apply replay, fresh cumulative replay, ChangeSet/Approval/command/event owners, durable counts | No backend finding. Retries return retained results, server restart preserves hashes and cardinalities, and no duplicate effect or second ledger appears. |
| Stale replay | Exact-current guards, item 49 restart, cumulative lifecycle and Apply replay, PostgreSQL stale-reference cases | No backend finding. Retained replay succeeds only for the exact prior request; stale current-state mismatches remain rejected. This does not supply the unexecuted item 50 stale browser recording. |
| Fixture fallback | Item 49 provider terminal and request ID; item 50 Vite proxy and relationship-overlay rejection; cumulative setup records | No backend response fallback appears in the executed paths. Item 49 uses actual provider output. Item 50 reads live routes from accepted setup records and rejects the legacy Graph fallback, but its human seed is not external-model evidence. |
| Caller-label substitution | Item 49 actual interaction/extractor calls compared with the ordinary cumulative caller-seam labels | No item 49 substitution. The fresh cumulative regression still prints “model-mediated caller seams”; this audit treats those as repeated authenticated reads only and relies exclusively on item 49 for external-model evidence. |
| Unsupported completeness | UX1.4 definitions, exact item 49 and item 50 reports, item 50 package command, instrumenter, drivers, and prior final UX audit | Material evidence finding remains. Uninvoked browser helpers, `already_compensated`, and the superseded native-screen-reader requirement cannot close the missing recordings or Wave 4. This is a design evidence/report finding, not a backend runtime defect. |

## Verification

Pinned Node 24.20.0 and npm 11.19.0 were selected explicitly. No external
model call or native screen reader was invoked during item 51.

- The focused model-extractor, working-state client, and candidate-correction
  client suites passed 22 tests in three files.
- The focused grounded-synthesis, Project route, correction route, and Apply
  route suites passed 40 tests in four files. Their localhost-capable rerun was
  required because the filesystem sandbox denied the test server's listener.
- `npm run test:wave4:cumulative` passed against fresh PostgreSQL 18.6 and
  Neo4j 2026.07.1 stores, including two server restarts, independent applied and
  rejected outcomes, and exact Apply replay without duplicate effects. Its
  caller-seam labels are regression evidence only, not external-model evidence.
- `npm run test:postgres:integration` validated and applied migrations V001
  through V043 to fresh PostgreSQL 18.6 and passed all 156 tests in 16 files.
- `npm run verify` passed the complete repository gate on the final tree.
- `git diff --check` passed.

## Felicity review

Consequential-claim review found three material precision risks in the
design-owned evidence set: uninvoked item 50 helpers could be mistaken for
executed recordings, `already_compensated` could be mistaken for a failure
scenario, and the prior final UX audit still treats native screen-reader
evaluation as required after the user removed it from Wave 4. This report keeps
those gaps separate from the backend paths that did execute and does not edit
the design-owned sources in the backend slice.

## Next safe boundary

Perform exactly evidence-closure item 52 on the design branch against backend
item 51 and design `494f0f4bebe5270d38f565d85cc8975259003846`.
Re-run the material production-browser and non-screen-reader accessibility
checks, apply Felicity review to all Wave 4 reports and user-facing claims, and
assess every `UX1.4-EV01` through `EV06` criterion from executed evidence.
Correct the prior final UX audit so native screen-reader evaluation is outside
Wave 4, and do not invoke VoiceOver or another screen reader. Do not count the
item 50 conversation, corrected/blocked, or stale helpers unless the exact
command actually invokes them; do not relabel the human cumulative seed as
model evidence or repeat the item 49 provider call. Treat
`already_compensated` as an unavailable post-compensation state, not a failed
command, and reconcile the missing limited-basis, projection-lag, governed-
failure, and panel-resize evidence. If an exact required recording still cannot
be executed from the pushed evidence, leave Wave 4 open and name the gap rather
than claiming completeness.
