# Wave 6 slice 6 — model and Petra interaction

Date: 2026-09-19 America/New_York

Status: design implementation complete; the named actual-model UI scenario
remains outstanding.

Design starting commit:
`d9e598e063b8e019aaa9b5625aab60d73b525851`

Exact counterpart inspected:
`3eb4c2f5da74d527942a82e59a4ec63eb21a7a40`

## Delivered boundary

This slice replaces the disabled production Petra composer with the certified
Project-role path supplied by backend slice 5. It does not change server,
persistence, migration, contract, provider, prompt, Work-command, or Review
authority.

- The `/projects/:projectId/petra` loader reads
  `GET /api/queries/projects/:projectId/model-readiness` through
  `ProjectModelClient` beside the existing Project thread, communication, and
  SuggestedAction reads.
- The Petra surface shows the server-selected role and meaning, live provider
  message and model, exact Project revision and snapshot, certification,
  ContextPacket, EvidencePacket, delivery behavior, and limitations.
- The composer begins with the server-registered Project question. An edited
  draft remains local and visible but cannot be submitted until it again equals
  that exact registered prompt.
- Submit uses the readiness command's workflow and request context through
  `ProjectModelClient`; the browser does not select a role, provider, prompt,
  workflow, packet, or authority effect.
- Terminal presentation exposes the returned answer, meaningful progress,
  statement origins, ContextPacket and EvidencePacket identities, coverage,
  durable GroundedResponse and Work destinations, Review-interrupt count, model
  execution source, and the explicit no-authority effect.
- Confirmed provider/model failure is separate from delivery uncertainty.
  Project-scoped draft and protocol run/connection identity remain in session
  storage. Reconnect uses authenticated durable replay of the same run; a new
  run is offered only after a server-confirmed failed terminal.
- Work and SuggestedAction entry encode a same-Project return destination. The
  loader validates it, the Petra route names the exact return, and the Work
  origin restores its focus target.

## Taxonomy and authority states

Scientific readiness retains its registered `scientific.grounded-synthesist`
label and server-selected model. Controlled-writing and other profiles with no
certified role render the server's unsupported state, provider explanation,
context explanation, and limitations without borrowing scientific terms or a
fallback command.

Model prose remains advisory. It cannot create an executable control. The
response links only the exact durable Work destination returned by the terminal;
any Review interrupt remains a separate record and no change is described as
applied.

## Operation ledger disposition

`petra.ask` and `model.use` move from unavailable to partial. Model readiness,
context inspection, response-basis inspection, and retained draft/replay remain
partial but now name their concrete production or client-local owner. They do
not move to live until the named production browser record is executed and
attached.

## Evidence control

No command in this slice invoked
`UX1.6-MODEL/actual-certified-model-ui-path` through a live production browser
with the actual certified provider. Component tests, typed-client coverage,
production builds, and repository gates are verification support only. This
slice therefore returns an empty evidence array.

## Verification

All commands use pinned Node 24.20.0 and npm 11.19.0.

- focused workbench typecheck;
- focused workbench tests for ready and unsupported states, exact terminal
  presentation, failure versus disconnect, retained canonical run identity,
  adjacent Petra presentation, and loader composition;
- complete workbench tests and production build;
- structural UI-operation audit;
- complete repository `npm run verify` gate; and
- `git diff --check`.

## Next safe boundary

Backend Wave 6 slice 7 can complete Work reads and start, required-input,
steering/priority, detach/reconnect, replay, cancel, retry, and resume/start-again
commands. It must preserve this ProjectModelClient binding and must not rewrite
the design-owned Petra presentation or treat model prose as a Work command.
