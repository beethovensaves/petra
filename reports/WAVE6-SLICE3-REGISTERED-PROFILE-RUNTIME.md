# Wave 6 slice 3 — registered Project profile runtime

Status: implemented and verified on the backend branch

## Delivered boundary

This slice adds a server-owned registered-profile boundary without changing the
design-owned React shell, CSS, or browser routes. A registered profile remains
an immutable optional template origin. Project creation copies its exact
ProjectDefinition into Project-owned authority; later registry changes cannot
silently change the Project.

The production boundary now owns:

- versioned profile catalogue reads for the packaged scientific-evidence and
  controlled-writing profiles;
- exact Project taxonomy reads covering purpose, objects, relationships,
  source roles, validators, Work families, model roles, Review destinations,
  terminology, supported places, and unavailable operations;
- authenticated, idempotent Project creation with an active Objective and
  focus;
- additive reset that archives the exact current owned Project and creates a
  replacement from the selected profile without deleting unrelated authority;
  and
- typed fail-closed outcomes for unknown profile, unavailable version, hash
  mismatch, stale reset, denied principal, and retained profile-definition
  mismatch.

The HTTP owners are:

- `GET /api/queries/project-profiles`
- `GET /api/queries/project-profiles/:profileId?version=...`
- `GET /api/queries/projects/:projectId/taxonomy?definition_revision=...`
- `POST /api/commands/projects`
- `POST /api/commands/projects/:projectId/reset`

The renderer-neutral typed client exposes the same reads and commands. The
request cannot carry Actor or grant identity; the command owner uses the
server-configured registered human. Reset additionally requires creator
ownership and the exact current Project revision.

## Operation ledger disposition

The Wave 6 backend contract baseline is now 56 owned, 18 partial, 15 missing,
and 8 intentionally client-owned operations. `project.create`,
`shell.project-map`, `taxonomy.inspect-profile`, and `taxonomy.bind-project`
now name their production owners. `application.reset` is partial because its
backend transaction exists while the representative-data setup, stable-URL
control, and guide remain design/integration work.

No operation was promoted to `live`, and no browser-control evidence was
attached. Slice 4 still owns the profile selection and usable taxonomy UI.

## Executed evidence

`UX1.6-TAXONOMY/registered-profile-runtime` passed against a fresh PostgreSQL
18.6 database migrated through V044. The run created both profile families,
read their exact taxonomies, replayed an idempotent command, reset from the
scientific profile to controlled writing, rejected unknown profile selection
without creating a Project, and verified a retained unknown profile binding
returns a typed unsupported state without fallback semantics.

Retained artifact:
`reports/WAVE6-EVIDENCE-REGISTERED-PROFILE-RUNTIME.json`.

The artifact is backend evidence only. It does not claim that a person can yet
choose or inspect a profile from the Petra UI.

## Verification

- pinned Node `v24.20.0` and npm `11.19.0`;
- focused package build, contract tests, server route tests, typed-client tests,
  and operation inventory audit;
- real PostgreSQL integration: 18 files and 163 tests passed on a fresh store;
- complete repository `npm run verify` gate.

## Next safe boundary

Design slice 4 can bind the existing profile selector and taxonomy
presentation to these typed production endpoints. It must preserve the exact
registered/project-authored/unsupported states, keep the two profile families
visibly distinct, and must not invent labels, commands, or fallback semantics
in the client.
