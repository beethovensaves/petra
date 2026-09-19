# Wave 6 slice 5 — certified model readiness

Date: 2026-09-19 America/New_York

Status: backend implementation complete; the named actual-model UI scenario
remains outstanding.

Backend starting commit:
`9b9080bbfdf2243e245bb3609c92b8c011da2afe`

Exact counterpart inspected:
`20a988cf5d74a966d775aa5294de33ec13557e6a`

## Delivered boundary

This slice completes the server-owned model-readiness and command binding that
design slice 6 can consume. It does not change React, CSS, browser routes, or
the frozen Petra information hierarchy.

- `GET /api/queries/projects/:projectId/model-readiness` exposes one typed,
  no-store view of the selected certified role, current managed-ChatGPT
  provider state, exact Project context, registered prompt, command endpoint,
  delivery behavior, limitations, and authority effect.
- PostgreSQL repeatable-read composition binds the current Project revision,
  current ProjectDefinition plus stored record hash, exact focused Objective,
  certified snapshot, immutable ContextPacket, immutable EvidencePacket, and
  role certification. Every stored record is schema- and hash-checked.
- `POST /api/interactions/run` requires the readiness view's exact context when
  the production Project readiness owner is configured. It rereads readiness
  immediately before admission and rejects missing, stale, mismatched, or
  unavailable bindings before starting Work.
- The renderer-neutral `ProjectModelClient` reads readiness and submits through
  the registered AG-UI command without letting the client choose a role,
  provider, authority effect, fallback context, or alternate prompt.
- The certified Codex runtime reports authenticated, login-required,
  unavailable, model-unavailable, and certification-drift provider states.
  Credentials remain inside the Codex app-server sidecar.

## Authority and unsupported states

The current certified role is `scientific.grounded-synthesist` on
`gpt-5.6-terra`. Its output remains advisory, is rendered only after schema and
grounding validation, and has `authority_effect: none`. The only accepted
prompt is the prompt recorded by the active certification.

The controlled-writing profile intentionally remains unavailable because it
registers no certified model role. A scientific Project without the exact
compiled ContextPacket and EvidencePacket is also unavailable. Objective or
definition drift produces a stale-context result. Petra never borrows a nearby
profile, packet, role, model, prompt, or Project.

## Operation ledger disposition

`model.inspect-readiness`, `petra.ask`, and `model.use` now have complete
backend owners. The Wave 6 backend ledger moves from 56 owned / 18 partial /
15 missing / 8 client-owned operations to 59 owned / 15 partial / 15 missing /
8 client-owned operations.

The UI inventory remains unchanged. A backend owner does not make the disabled
composer live, prove draft preservation, or satisfy the production UI model
scenario.

## Evidence control

No command in this slice invoked
`UX1.6-MODEL/actual-certified-model-ui-path` from the production Petra UI. The
actual certified Codex AG-UI verification exercised the backend provider,
validation, persistence, restart, and replay boundary only. It is verification
support, not the named UI evidence record, so this slice returns an empty
evidence array.

## Verification

All commands use pinned Node 24.20.0 and npm 11.19.0.

- contract conformance validates the new readiness schema and certified
  ProjectDefinition/Objective fixtures;
- focused server, adapter, and readiness-service tests cover exact query,
  typed client, missing context, stale context, unavailable state, and command
  admission;
- fresh PostgreSQL 18.6 integration migrates V001–V044 and exercises exact
  role/context reads, missing packets, and stale Objective/definition state;
- actual managed-ChatGPT Codex integration executes the certified role through
  AG-UI, validates source/petra/unresolved origins, persists the terminal, and
  replays exactly after restart without a second model execution; and
- the complete repository `npm run verify` gate and `git diff --check` are
  required before commit.

## Next safe boundary

Design slice 6 can connect the production Petra surface to
`ProjectModelClient`, display the server-supplied role/provider/context and
limitations, submit the exact registered prompt, preserve the local draft
through failure or disconnect, render streaming/terminal basis and recovery,
and return to the originating task. It must keep controlled-writing and
uncompiled-context states unavailable and must not infer authority or commands
from model prose.
