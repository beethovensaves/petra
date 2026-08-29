# Petra Design Terminal Handoff

Worktree: `/Users/felipe.casadei/vscode/graphRAG/petra-design`
Branch: `design/m1-ux`
Mission: leave Petra's frontend as close to production-complete as available contracts permit while exploring and validating the scientific UX collaboratively

## Start here

1. Confirm the current directory is the design worktree and the branch is `design/m1-ux`.
2. Activate Petra's pinned Node 24.20.0 toolchain.
3. Install the worktree's dependencies with `npm ci` if `node_modules` is absent.
4. Read, in order:
   - `PETRA.md`;
   - `design_implementation_roadmap.md`;
   - `decisions/D009-object-centered-research-workspace.md`;
   - `decisions/D006-petra-language-and-reference-contract.md`;
   - `decisions/D005-trusted-graph-review-and-direct-editing.md`;
   - `decisions/D013-ag-ui-sdk-interaction-boundary.md`;
   - `petra_brand_inspiration/README.md` and its referenced assets;
   - the current `apps/workbench/` implementation.
5. Begin with a discussion of `UX1.0`. Do not begin a broad redesign before agreeing on its priorities and definitions with the user.

## Working posture

Treat this as a production frontend track, not a mockup exercise. Explore alternatives when a decision is genuinely open, recommend a direction, record the accepted result, and then implement it in the real workbench against Petra-owned contract-shaped fixtures.

Proceed module by module. Before consequential work in each module:

1. state the researcher task and why the module matters;
2. identify the primary scientific objects and authority boundaries;
3. propose the information hierarchy and material interactions;
4. identify ordinary, dense, empty, limited, running, stale, failed, and recovery states that apply;
5. discuss the few choices that would materially change the experience;
6. obtain the user's direction;
7. implement, demonstrate, evaluate, and refine the accepted slice.

Routine coding decisions do not require a new discussion. Pause when a choice changes scientific interpretation, authority cues, navigation, action consequences, cross-module behavior, or Petra's language and visual identity.

## Ownership boundary

The design worktree primarily owns:

- `apps/workbench/` client code, routes, styles, frontend fixtures, and frontend tests;
- design evidence and design-specific reports;
- `design_implementation_roadmap.md` status and discussion records;
- accepted production visual assets derived from the inspiration kit.

Treat these as read-only unless the user coordinates a handoff:

- `apps/server/`;
- `packages/contracts/`, `packages/core/`, `packages/adapters/`, and `packages/postgres/`;
- `workers/`, `infra/`, and persistence/projection code;
- accepted decisions and `implementation_roadmap.md`.

Root package files and `package-lock.json` are shared hotspots. Discuss a new frontend dependency before changing them. Prefer the existing stack and a route-based fixture gallery until evidence establishes a need for another tool.

## Contract gaps

Do not invent scientific or authoritative state in a React component. When a required query, command, event, or view-model field is missing:

1. reproduce the need with a named design fixture;
2. create a `UX-REQ-NNN` record as specified in the design roadmap;
3. continue with an explicitly provisional contract-shaped fixture when safe;
4. wait for a coordinated backend handoff before claiming live integration.

AG-UI remains behind `PetraInteractionClient` and Petra-specific hooks. Feature components do not parse raw AG-UI events.

## Coordination with the implementation worktree

- Commit coherent design work on `design/m1-ux`.
- Do not edit a shared hotspot while the implementation terminal is editing it.
- Synchronize from `main` only at an explicit checkpoint and with a clean design worktree.
- Merge or cherry-pick reviewed design changes into `main`; never copy changed files between worktrees as a substitute for Git.
- If both terminals run development servers, agree on separate ports or run only one server pair at a time.
- Preserve user changes and avoid destructive resets or cleanup commands.

## First conversation

Open with this question:

> I am beginning `UX1.0 — design foundations and fixture system`. Before changing the interface, I want to agree on the audit priorities and what “frontend complete against fixtures” means for this first pass. I will then inventory the current shell, identify what should be retained, revised, replaced, or removed, and propose the first bounded design-system decisions. Shall we start with the current shell hierarchy and visual density, or with the shared state and component grammar that every module will use?

The recommended starting point is the shared state and component grammar, followed immediately by applying it to the shell. That produces reusable decisions without postponing visible progress.
