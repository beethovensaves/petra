# D018 ProjectDefinition foundation

- **Status:** First additive authority slice complete
- **Verified:** 2026-09-08
- **Decision:** [D018](../decisions/D018-project-definition-and-checkpoint-boundary.md)
- **Boundary:** Prerequisite for live workbench meaning; not M1.9 frontend closeout

## Result

Petra can now persist one Project-owned semantic definition identity as
immutable contiguous revisions without modifying `petra.project@1.0.0`.
Project Objectives are also immutable contiguous revisions, and every new
Objective revision must resolve the exact current ProjectDefinition revision
and one Objective kind registered by that definition.

The foundation is use-agnostic. Contract fixtures exercise both a scientific
evidence definition authored for its Project and an unrelated collection
curation definition seeded from an optional template. Template provenance is
copied into the Project-owned definition and is not a mutable runtime dependency.

## Authority invariants

- one Project binds one stable ProjectDefinition identity and one exact current
  revision;
- definition and Objective content hashes reproduce their RFC 8785 canonical
  content;
- revision one is mandatory and later revisions advance contiguously;
- a definition family cannot change in place;
- repeated exact registration is idempotent, while rebound content fails;
- Objective parent and dependency references resolve exact retained revisions
  in the same Project;
- one separately stored Project focus pointer selects an exact current active
  Objective revision;
- focus changes are retained in append-only history; and
- PostgreSQL foreign keys and immutable-row triggers enforce the same-Project
  and append-only boundary beneath the TypeScript repository.

Current focus is intentionally not embedded in Objective content. It is a
Project-level pointer, so switching focus does not rewrite immutable Objective
history or leave several current Objective records claiming to be selected.

## Implementation evidence

The slice adds:

- `petra.project-definition@1.0.0` and
  `petra.project-objective@1.0.0` canonical schemas, generated TypeScript, and
  positive and negative fixtures;
- `ProjectDefinitionAuthorityRepository` as the storage-neutral core port;
- `PostgresProjectDefinitionAuthorityRepository` for exact registration,
  replay, listing, and focus selection; and
- `V019__project_definition_authority.sql` for definition, Objective,
  dependency, current-focus, and focus-history authority.

Verification passed:

```text
npm run test:contracts
  3 files, 290 tests passed

npm run typecheck
  TypeScript workspaces and tests passed
  workbench typecheck passed
  Python mypy passed

npm run test:postgres:integration
  Flyway validated and applied V001-V019
  12 files, 83 tests passed against PostgreSQL 18.6
```

## Remaining boundary

This checkpoint does not claim all D018 validation or M1.9-W04 completion.
Definition component resolution, definition-change impact Review, material Work
binding, general working candidates, managed Project folders, `.petra`
checkpoints, restoration, and derived-Project creation remain open.

The first authorized `ProjectShellView` and live server adapter are now recorded
in [the M1.9 Project shell integration report](M1.9-PROJECT-SHELL-INTEGRATION.md).
The next M1.9 cuts add scientific source and Review reads while keeping
ProjectDefinition interpretation, freshness, provenance, and recovery state out
of React components.
