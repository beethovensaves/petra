# Wave 4 item 54 production-browser recordings

Date: 2026-09-15 America/New_York

Design starting commit: `40c2f8218e05ff1fb24f126e6a8ca4079249a994`

Exact item 53 backend support commit:
`3e0e47bafb0ea194645c02871c180b7e86877c50`

Coordinator hardening counterpart:
`d017a5128cc9dbe39f64eccf895e9cf83c882ce4`

## Result

`npm run test:wave4:item54` attached the design-owned observer to the item 53
evidence-support trace and passed all six reserved browser scenarios. The one
command created fresh PostgreSQL 18.6 and Neo4j stores, started the production
server and frozen workbench behind its Vite proxy, and exercised production
typed clients, controllers, live server routes, and canonical owners. It did
not use response fixtures or test-only product routes for any recorded
scenario.

The provider-free setup recreated only the item 49 records required for
presentation. It retained WorkingCandidate
`working_candidate_131W6GBBPYDG1CX0FSQKX1RJ10`, ReviewSession
`review_session_01K4D000000000000000000004`, model Actor
`actor_5QACHV6W8A66X4J3Y5KFVGHCX8`, and extractor ModelCall
`model_call_5VSBMFNNFMQ89Q9B77W9WAWA5W`. No external model ran in item 54.
`reports/WAVE4-NATURAL-CONVERSATION-MODEL-IDENTITY-TRACE.md` remains the sole
provider-execution evidence.

The production Review mapper previously retained the validation summary but
dropped server-returned candidate qualifications and exact working origin from
its presentation model. This slice now preserves those fields as explicit
limitations and a keyboard-operable origin/provenance disclosure. Validation,
provenance, and human decision authority remain distinct; the client does not
derive any of them.

## Executed coordinator scenarios

Every row below was invoked by the passing `npm run test:wave4:item54` command.
The command's observer retained the following exact run observations:

| Evidence / scenario | Production-browser observation |
| --- | --- |
| `UX1.4-EV01` / `paired-profile-natural-conversation-browser` | The item 49 natural-conversation thread, model-corrected scientific working Graph and textual peer, refreshed scientific Review, and controlled-writing Review all rendered from live reads. Thread hash `sha256:63ff1a9ec8ff357de5552d691fd0e76419175ec794ba2a24b04a421749fa09a8`; overlay hash `sha256:f41b7a01ba1768cd77f14b5878fcdb04d514e950c62cee83a3e5dcf6675b1686`; refreshed scientific Review hash `sha256:63c6b6e4942556aeea2957daec7665f31d05e696983465e6bb4e30e283b185b0`; controlled-writing Review hash `sha256:e7fab9c8f1903895fc587354e5c5359cab674c83b7902895dd73eb866f141719`. Registered controlled-writing terms were “Requirement and governing link,” “Authority source,” and “Governing link”; no writing Apply path appeared. |
| `UX1.4-EV02` / `limited-basis-review-browser` | Review hash `sha256:41070aac16f4222b5dc27179da87d5bc5d0afa8b4976d53b9740d0b0402d6641` displayed its exact basis and limitation: “The bounded passage does not establish whether the reported result generalizes beyond the study-defined task.” The limitation remained separate from blocked validation, decision, and recovery. |
| `UX1.4-EV02` / `corrected-blocked-review-browser` | The same live Review displayed the corrected candidate, blocked validation, absent Apply action, exact reason “At least one exact working record has no completed validation receipt. Pending validation does not authorize a decision.”, and recovery “Run the registered checks and refresh the Review with their exact results.” The complete text and accessibility tree retained Basis, limitations, validation, decision, model Actor, and ModelCall meaning. |
| `UX1.4-EV02` / `stale-review-before-refresh-browser` | Stale Review hash `sha256:2af1461d16ef9856678aae40ea086162b66ef6bf684c1d656263348d9a1e3f29` displayed “The Review binds Project stream revision 3, while authority is now at revision 6.” Prepare remained unavailable, no Apply control appeared, and keyboard focus reached Refresh Review with the exact recovery “Refresh the Review against current authority and rebuild any Changes-to-apply preview before deciding.” |
| `UX1.4-EV04` / `projection-lag-browser` | One synthesized touch activation at 200% text sent one exact human Apply for ChangeSet `change_set_0VER3GCX4D0P4AC48YFBZXVATX`, commitment hash `sha256:05a594b8b91f7ebed01ee8a7dfecdfc5c6ff94b3c2f80cd8d2ae8aad563ae257`. PostgreSQL authority reported `applied` while projection state remained `catching_up` with two pending records. The browser said “Applied—updating views,” prohibited resubmission, retained every server-returned preservation record, and offered Reload Review. |
| `UX1.4-EV04` / `governed-command-failure-recovery-browser` | Review `review_session_15E4KR717PN7MY3R3Z984WBYVR` prepared commitment `sha256:470209eff9b20526694fff4544ad1d9d3bfcc5fc868f7cc4b9dc8ec13ba55e80` under the exact authenticated-human checkpoint. A canonical authority advance then made Apply return `reconciliation_required` with `REVIEW_APPLY_STALE`; all three steps were `unverified` or `unattempted`, no event or false effect appeared, and 13 preservation records plus the read-only assessment, Reload Review, and Refresh Review remained visible. Focus moved to the alert observation, whose text was present in Chrome's accessibility tree; Retry was absent. |

After the production server restart, live reads retained item 49 Review hash
`sha256:d61ab15c00ac983f0163e5cfc04c4dc45674fa4d319544316208f009a480c05e`
and governed-failure Review hash
`sha256:cc4f3209e8127e9b224704b4e6d7a51c3b28f35c861da5c7b3953e1854649f43`.
The trace also rechecked cross-Project rejection, stale correction and refresh
guards, idempotent correction and refresh, replayed Apply observations, and
failure isolation. Controlled writing remained at one candidate with no
ChangeSet, command, or event.

## Interaction and accessibility boundary

The item 54 recordings used one isolated headless Google Chrome 152.0.7977.84
session on macOS. The live scenarios cover complete textual presentation,
keyboard activation and focus transfer, Chrome accessibility-tree roles and
names, 200% text at a 375 by 812 viewport, a 44 CSS-pixel touch target,
synthesized touch, forced colors, reduced motion, and non-color labels and
borders. Human-only Apply authority was verified from the server-prepared
checkpoint and from the absence of Apply for stale, blocked, and
controlled-writing Reviews.

This is one Chrome engine and an automated local production-browser transport
boundary. Touch and media preferences are browser-emulated; no physical-device
or cross-browser matrix is claimed. No native screen reader was launched or
automated.

## Verification

- Pinned Node 24.20.0 and npm 11.19.0 were selected explicitly.
- Focused workbench typechecking, changed-file ESLint and formatting, and 142
  tests across the Project data and Review presentation suites passed before
  the retained run.
- `npm run test:wave4:item54` passed its fresh-store support guards and all six
  attached production-browser scenarios, then cleaned up its disposable
  services and browser harness.
- `npm run test:wave4:item50` passed its complete fresh-store production-browser
  and accessibility gate.
- The complete repository gate is recorded on this slice's final committed
  tree.

## Remaining boundary

Item 54 closes the six executed-browser gaps reserved to this slice. It does
not repeat or replace the item 49 provider proof and does not declare Wave 4
complete. The fixed sequence still requires backend item 55 adversarial
reconciliation and design item 56 final executed UX and Felicity audit.
