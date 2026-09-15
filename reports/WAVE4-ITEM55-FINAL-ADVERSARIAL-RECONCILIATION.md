# Wave 4 item 55 final adversarial reconciliation

Status: backend evidence-remediation item 55 passed; no backend-owned runtime
defect required a code change; design item 56 remains required before Wave 4
can be declared complete

Date: 2026-09-15 America/New_York

Backend starting commit: `d017a5128cc9dbe39f64eccf895e9cf83c882ce4`

Exact item 53 backend support commit:
`3e0e47bafb0ea194645c02871c180b7e86877c50`

Exact item 54 design counterpart inspected:
`41b80c2227c0d6d00398a6c5f7435b5ea7eb57b6`

Item 49 external-model evidence commit:
`2b42eeb1cf003b31473756bf3e7c329950de4ede`

## Result

The item 49, item 53, and item 54 records support the six reserved remediation
scenarios under `UX1.4-EV01`, `UX1.4-EV02`, and `UX1.4-EV04` within their stated
boundaries. Item 49 remains the sole external-model execution evidence. Item 53
recreates the published item 49 presentation identities on fresh stores without
provider egress, and item 54 uses that setup to record the six scenarios through
the production workbench, typed clients, controllers, live server routes, and
canonical owners.

The provider-free continuation does not claim a new provider execution or a
retained copy of the item 49 database. Its reconstructed ModelCall omits a
provider request identifier and raw provider output, marks usage and cost
accounting unavailable, and states that item 49 owns the provider evidence. The
fresh setup retains the published candidate, ReviewSession, model Actor,
ModelCall, ProjectThread, task, Work, run, snapshot, basis, provenance, and
revision identities needed for presentation. The item 54 report and observer
also record `external_model_call_executed: false`.

The item 54 observer invokes every scenario named in
`scripts/wave-handoff-wave-4.evidence.json`. Its browser driver sends Project
reads and mutations through a same-origin Vite proxy to the live production
server and records the actual upstream requests and responses. The driver's
separate `/__fixtures/shell` pane-resize helper is not called by item 54. Accepted
fixtures seed the disposable stores; no response fixture or test-only product
route replaces a demonstrated read or mutation.

No backend contract, authority owner, persistence path, migration, API, typed
client, command, event, projection, Brief, History, communication, Work,
interaction, or recovery ledger changes in item 55. No frozen React component,
CSS file, browser route, presentation fixture, or design report changes in this
backend slice.

## Remaining evidence reconciliation

| Evidence | Exact executed record | Assessment |
| --- | --- | --- |
| `UX1.4-EV01` | Item 49 retains the actual provider-backed natural conversation and external-model correction. Item 54 invokes `paired-profile-natural-conversation-browser` and reads the exact retained scientific thread, model-corrected working Graph and textual peer, refreshed scientific Review, and controlled-writing Review through live routes. | **The reserved gap is materially covered.** The scientific and controlled-writing definitions retain distinct terms and semantics, and controlled writing exposes no Apply path. The item 54 continuation is presentation evidence, not another provider call. |
| `UX1.4-EV02` | Item 54 invokes `limited-basis-review-browser`, `corrected-blocked-review-browser`, and `stale-review-before-refresh-browser`. | **The reserved gaps are materially covered.** Exact basis and limitation remain separate from validation; blocked Review exposes no Apply and gives the server-owned recovery; stale Review exposes no prepare or Apply and gives exact refresh recovery. |
| `UX1.4-EV04` | Item 54 invokes `projection-lag-browser` and `governed-command-failure-recovery-browser`. | **The reserved gaps are materially covered.** One human Apply reports authoritative success with projection `catching_up`; the separate stale-checkpoint Apply reports `reconciliation_required`, no executed step or event, preserved state, and refresh or reload recovery without Retry. |

This assessment closes only the six remediation gaps reserved after item 52. It
does not replace the already accepted EV03, EV05, or amended EV06 evidence and
does not itself declare the wave complete. Design item 56 must assess every
`UX1.4-EV01` through `EV06` row from the exact pushed evidence.

## Adversarial authority audit

| Risk | Evidence inspected | Assessment |
| --- | --- | --- |
| Caller-label substitution | Item 49 provider terminal and request identity; item 53 continuation boundary and exact IDs; item 54 observer and report | No substitution in the accepted claim. Item 49 alone proves provider execution. Item 53 and item 54 explicitly identify their provider-free setup and do not promote a caller label, saved payload, or recreated record into new provider evidence. |
| Response-fixture fallback | Item 54 package command, observer, production-browser driver, and live-route proxy | No demonstrated Project response comes from a fixture or test-only route. The browser proxy forwards `/api/` requests to the active production server and records the upstream response. The separate frozen-shell fixture helper is not invoked by item 54. |
| Fabricated provider evidence | Item 53 ModelRequest, ModelCall, proposal setup, terminal result, and report; item 54 retained observer boundary | No fabricated execution claim remains. Provider identifiers and raw output are omitted from the continuation, accounting is unavailable, and both code and reports direct provider claims to item 49. The recreated canonical records are bounded presentation setup. |
| Cross-Project leakage | Item 53 production Review read, correction, refresh, failure preparation, durable-count checks, and fresh PostgreSQL integration | No backend finding. Cross-Project reads and commands fail closed. The rejected correction leaves durable counts unchanged, and the canonical repositories retain exact Project bindings. |
| Duplicate effects | Item 53 correction, refresh, authority-command, successful Apply, and failed Apply retries; restart counts | No backend finding. Correction and refresh replays report `applied: false`; the successful Apply replay returns three `replayed` observations; authority-command and failed-Apply retries preserve cardinalities; restart preserves working and Review hashes and counts. |
| Stale replay | Item 53 stale correction and refresh requests, unrefreshed Review, stale checkpoint Apply, and replay | No backend finding. Exact-current guards reject stale correction and refresh. The governed failure reports `REVIEW_APPLY_STALE`, leaves all steps unverified or unattempted, retains the member awaiting decision, and does not offer unsafe Retry. |
| Implicit authority or lost attribution | Item 49 interaction, candidate producer, model proposal, and manual Apply; item 53 checkpoint assertions; item 54 browser actions and unavailable states | No backend finding. Conversation and model output retain no authority effect. The model Actor and ModelCall remain producer provenance, while only the authenticated human checkpoint authorizes Apply and `ReviewPolicy` remains not applicable. Blocked, stale, and controlled-writing Reviews expose no Apply action. |
| Unsupported completeness | Frozen evidence inventory, the three item reports, exact item 54 command path, and browser boundary | No unsupported closure claim is accepted. The six named records were invoked and retained, but they remain one automated local Chrome boundary with synthesized touch. Item 54 is not provider evidence, broad model-quality evidence, a physical-device result, or a cross-browser matrix. Wave completion remains for item 56. |

## Verification

Pinned Node 24.20.0 and npm 11.19.0 were selected explicitly. No external model,
browser, VoiceOver, or other screen reader was invoked during item 55.

- `npm run test:wave4:evidence-support` passed against fresh PostgreSQL 18.6
  and Neo4j stores after applying migrations V001 through V043. It rechecked
  exact item 49 continuation identities, cross-Project rejection, stale guards,
  idempotent correction, refresh and Apply, projection lag, no-effect command
  failure, and restart cardinalities. It reported
  `browser_scenarios_executed: false`, so this backend rerun creates no new
  coordinator evidence record.
- `npm run test:postgres:integration` validated and applied migrations V001
  through V043 to fresh PostgreSQL 18.6 and passed all 156 tests in 16 files.
- `npm run verify` passed the complete repository gate: generated contracts and
  fixtures, retrieval floor, formatting, lint, TypeScript and Python type
  checks, production workbench build, and 1,317 always-on tests. Seven
  service-dependent tests remained skipped by their ordinary configuration.
- `git diff --check` passed.

## Next safe boundary

Perform exactly Wave 4 item 56 on the design branch against the pushed item 55
backend commit and design commit
`41b80c2227c0d6d00398a6c5f7435b5ea7eb57b6`. Re-run the material provider-free
production-browser recordings from item 54, apply Felicity review to all Wave 4
reports and user-facing claims, and assess every `UX1.4-EV01` through `EV06` row
only from exact pushed evidence. Do not invoke a screen reader or external model.
Preserve item 49 as the sole provider evidence, the item 53 setup as presentation
continuation only, exact human-only Apply authority, and the one-Chrome,
synthesized-touch boundary. Declare `wave_complete` only if every row remains
materially covered and both branches are pushed.
