# Petra Design Terminal Handoff

Worktree: `/Users/felipe.casadei/vscode/graphRAG/petra-design`
Branch: `design/m1-ux`
Mission: complete and freeze Petra's entire use-agnostic UX design brief, then stand up the independent reference UX against synthetic conformance scenarios before producing any contextual demo

## Start here

1. Confirm the current directory is the design worktree and the branch is `design/m1-ux`.
2. Activate Petra's pinned Node 24.20.0 toolchain.
3. Install the worktree's dependencies with `npm ci` if `node_modules` is absent.
4. Read, in order:
   - `PETRA.md`;
   - `reports/PETRA-UX-DESIGN-BRIEF.md`;
   - `reports/UX-FLOW-ARCHITECTURE.md`;
   - `reports/UX-BACKEND-HANDOFF.md`;
   - `design_implementation_roadmap.md`;
   - `decisions/D009-object-centered-research-workspace.md`;
   - `decisions/D006-petra-language-and-reference-contract.md`;
   - `decisions/D005-trusted-graph-review-and-direct-editing.md`;
   - `decisions/D013-ag-ui-sdk-interaction-boundary.md`;
   - `petra_brand_inspiration/README.md` and its referenced assets;
   - the current `apps/workbench/` implementation.
5. Continue the design brief at `DB09`, basis, proposals, and review. `DB04` through `DB08` are accepted. Do not resume production-surface implementation or create a contextual demo before `UX-DESIGN-FREEZE-01`.

## Working posture

Treat this as a complete product-design track followed by a production frontend track. Explore alternatives when a decision is genuinely open, recommend a direction, and record the accepted result at full specification depth. Complete every section in `reports/PETRA-UX-DESIGN-BRIEF.md` and obtain explicit design-freeze acceptance before implementing new product surfaces.

During product-brief work, proceed module by module:

1. state the project-author task and why the module matters;
2. identify profile-independent roles, profile-owned objects, and authority boundaries;
3. propose the information hierarchy and material interactions;
4. identify ordinary, dense, empty, limited, running, stale, failed, and recovery states that apply;
5. discuss the few choices that would materially change the experience;
6. obtain the user's direction;
7. specify responsive blueprints, interaction paths, copy roles, accessibility, recovery, backend needs, and acceptance criteria;
8. audit the paper design and advance to the next brief section without implementing a new product surface.

After the complete brief freezes, implement the entire Petra reference UX against synthetic, contract-shaped conformance scenarios that do not copy or depend on contextual demo data. Only after that product stands independently may separate efforts integrate the selected scientific and controlled-writing contexts.

Routine specification decisions do not require a new discussion. Pause when a choice changes domain interpretation, authority cues, navigation, action consequences, cross-module behavior, or Petra's language and visual identity.

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

Do not invent domain or authoritative state in a blueprint or React component. When a required query, command, event, profile, or view-model field is missing:

1. reproduce the need with a named design scenario during brief work or a synthetic conformance fixture after design freeze;
2. create a `UX-REQ-NNN` record as specified in the design roadmap;
3. specify an explicitly provisional contract-shaped boundary when safe;
4. wait for a coordinated backend handoff before claiming live integration.

AG-UI remains behind `PetraInteractionClient` and Petra-specific hooks. Feature components do not parse raw AG-UI events.

## Coordination with the implementation worktree

- Commit coherent design work on `design/m1-ux`.
- Do not edit a shared hotspot while the implementation terminal is editing it.
- Synchronize from `main` only at an explicit checkpoint and with a clean design worktree.
- Merge or cherry-pick reviewed design changes into `main`; never copy changed files between worktrees as a substitute for Git.
- If both terminals run development servers, agree on separate ports or run only one server pair at a time.
- Preserve user changes and avoid destructive resets or cleanup commands.

## Current conversation

Continue with this question:

> I am beginning `DB09`, basis, proposals, and review. I want to agree on how Petra lets an author compare a proposed interpretation or change with its exact basis, concentrate on exceptions without hiding ordinary members, correct the proposal itself, preview every authority and dependency consequence, and approve, reject, defer, split, relink, or Revert through one profile-neutral review grammar. My recommendation is one Review place with task-sized review sessions, an exact source-or-basis comparison, a typed proposal and validation explanation, an explicit ChangeSet preview before application, and no approval from chat, graph selection, batch selection, or Work completion alone.

Do not implement a Review fixture after this discussion. Complete the full basis,
proposal, and review specification, then continue through `DB10`–`DB18`.
Product implementation resumes only after the user accepts
`UX-DESIGN-FREEZE-01`.
