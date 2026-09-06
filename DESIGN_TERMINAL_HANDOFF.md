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
5. Continue the design brief at `DB11`, durable Work and orchestration. `DB04` through `DB09` are accepted; DB10's direction is accepted and its full specification and paper audit are complete. Do not resume production-surface implementation or create a contextual demo before `UX-DESIGN-FREEZE-01`.

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

`DB10` is specified and paper-audited. The user accepted its semantic-depth and
expansion model on 2026-09-06 after the synthetic H4 evidence example
(`UX1.5-DISC03`). The following direction is accepted:

- the Graph is an optional, task-bounded relationship workspace rather than a
  corpus-wide explorer or graph-entry form;
- contextual entry opens the exact relationship question and preserves its
  originating object, task, snapshot, selection, and return path;
- direct Graph entry begins from a recent or saved relationship question, a
  selected object, or a natural-language relationship question that a named
  model role translates into inspectable bounded scope;
- the three semantic layers are **Current**, **Working changes**, and
  **Historical**. **Current** is the default; contextual entry from conversation,
  a candidate, or Review may include the relevant non-authoritative **Working
  changes**; **Historical** is an explicit non-editing mode with **Return to
  current**;
- projection is representation freshness, not a fourth semantic layer. A lagging
  graph says that the authoritative change already applied and provides an
  authoritative non-graph route while the projection catches up;
- Graph controls and the textual peer expose layer, scope, hidden working-change
  counts, snapshot, and projection position. Layout, selection, dragging,
  filtering, and expansion never carry authority;
- before/after comparison uses a dedicated comparison presentation rather than
  translucent overlapping state;
- 2D and textual parity remain primary, Cytoscape.js remains the 2D candidate,
  and Reagraph remains optional only when a named third dimension improves
  comprehension;
- depth means the relationship context needed to answer the question. Named
  profile-valid actions lead; Scope exposes exact types, directions, hop limits,
  layers, snapshot, time, and omissions;
- contrary and qualifying material remains visible in initial summaries; counts
  distinguish units, overlap, grouping/filtering, partial results, and unknowns;
- expansion reveals recorded relationships and preserves focus, selection, and
  snapshot. New research, validation, or assessment uses bounded Work;
- selection opens exact Details; paths retain every relationship's meaning,
  origin, basis, layer, and limitations. Dependency links do not establish
  assessed consequences.

DB10 now specifies selection/path inspection, task layouts and dedicated
comparison, density/grouping, direct correction through DB09, temporal behavior,
ten-state view history, local saved questions, adverse states, responsive/textual
parity, language, backend needs, acceptance criteria, and the paper audit. The
earlier DB06 ghosted-reversal wording and roadmap's renderer-authority wording
were aligned with the accepted direction.

`DB10-P01`–`P08` are the interaction paths and `DB10-A01`–`A04` the paper
findings. `UX-REQ-013` requests the missing bounded relationship-view query;
architecture owns its disposition. `UX-FX24`/`UX-FX25` specify post-freeze paired
and adverse conformance scenarios. No fixture, query, renderer, backend contract,
or product surface was implemented. Paper completion is not runtime validation.

DB11's opening discussion now records a pending recommendation: lead with a
task overview and meaningful stages, with exact role/tool/validator activity
expandable beneath each stage and a full execution/dependency view available
for complex diagnosis. The invented passage/requirements example makes the
choice concrete. This recommendation is not accepted; await the user's direction
before closing that choice. The accepted DB06/DB10 Work boundaries still apply.
Then specify
plans, roles and validators, progress, required input, steering, cost, detachment,
reconnect, cancellation, results, retry, adverse states, and the paper audit.

## Latest repository checkpoint

- This conversation resumed on `design/m1-ux` at `230fadd`, the DB10 discussion
  checkpoint. The DB10 specification closure is recorded by the commit containing
  this handoff; inspect Git status/log for the current local and remote position.
- The preceding synchronized merge was `81c3786`.
- The merge consumes backend `main` at `344cf77` without workbench or design-doc
  conflicts.
- Verification at that preceding merge passed 599 always-on tests with seven
  expected service skips. It is historical evidence, not a test run for this
  documentation-only closure.
- Documentation checks for the closure covered table/fence structure, new local
  links, path/audit and decision/request/fixture definitions, acceptance status,
  five-file design-only scope, and `git diff --check`.
- `UX-REQ-011`, `UX-REQ-012`, and new `UX-REQ-013` remain proposed runtime
  requirements; the design closure does not implement or close them.
- `ChatGPT Image Aug 29, 2026, 04_21_35 PM.png` and `Claim Form BASIC.pdf` are
  intentionally untracked user assets. Do not add or remove them without explicit
  direction.

Do not implement a Graph fixture after this discussion. Continue the full
product-design specification through `DB11`–`DB18`.
Product implementation resumes only after the user accepts
`UX-DESIGN-FREEZE-01`.
