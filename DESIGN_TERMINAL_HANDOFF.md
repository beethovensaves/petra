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
5. Continue the design brief at `DB12`, Composition and revision. `DB04` through `DB09` are accepted; DB10 and DB11 have accepted direction, complete specifications, and paper audits. Do not resume production-surface implementation or create a contextual demo before `UX-DESIGN-FREEZE-01`.

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

The user accepted DB11's task overview and meaningful-stage presentation on
2026-09-06 as `UX1.6-DISC02`. The subsequent discussion accepted direct steering
and contextual branch advice as `UX1.6-DISC03`:

- a clear instruction acts through the supported operational command within
  existing authority and limits, with a visible acknowledgment of interpreted
  scope, affected stages, reuse, and effective timing;
- ask again only for unresolved consequential meaning or additional authority,
  not merely because a clear instruction changes the plan;
- actual prerequisites and control constraints remain distinct from contextual
  **Recommended next** advice. The recommendation explains its benefit using
  the current objective, dependency paths, known limits, and material uncertainty;
- another eligible branch may be chosen without an override ceremony, warning
  status, repeated nudges, or an automatic reset to the recommended order. A
  valid alternate choice need not harm the overall Project;
- viewing a branch does not schedule it. **Work on this next** records task-scoped
  priority without implicitly cancelling other work or changing global policy;
- preserve shared dependency identity, exact consumed inputs and prior results;
  validate reuse and state what happens to affected running stages at supported
  instruction, cancellation, checkpoint, or atomic completion boundaries; and
- narrowed-task completion names its actual scope, while Work success, usable
  output, and domain application remain separate.

The earlier pending rule requiring another preview/confirmation for every
material plan change is superseded by this direction. Do not revive that blanket
confirmation rule. Recommendations remain advisory even when prominently placed;
a model preference or inferred domain dependency cannot create a runtime gate.

DB11 now includes full task/stage and dependency hierarchy, direct steering,
progress/input/resource/result meaning, lifecycle/recovery states, responsive and
textual parity, language, ten interaction paths (`DB11-P01`–`P10`), six paper
findings (`DB11-A01`–`A06`), acceptance criteria, and post-freeze scenarios
`UX-FX26`/`UX-FX27`. `UX-REQ-014` is the proposed Work read composition;
`UX-REQ-015` is the proposed operational steering/branch-priority transition.
Current WorkUnit, manifests, retry/cancellation, and interaction records remain
the foundation. Checkpointed does not mean paused/resumable, terminal completed
may encode failure, and generic Pause/resume/cascade operations are not invented.

DB11 closes at `G-SPEC`; contract, implementation, integration, and participant
validation remain separate. Continue at DB12 with Composition and revision's
material choices, using the accepted source protection, bounded Work, exact
candidate/Review, output provenance, and immutable lineage boundaries. Do not
record a new DB12 recommendation as accepted before the user's direction. The
author can still refine DB11 before the explicit whole-product freeze.

## Latest repository checkpoint

- This conversation resumed on `design/m1-ux` at `230fadd`; DB10's specification
  closure and DB11 opening discussion were saved at `5cd707b`; DB11 presentation
  and the then-pending steering choice were saved at `6fa8f91`. The current
  checkpoint records accepted steering/branch advice and the DB11 specification
  closure; inspect Git status/log for local and remote position.
- The preceding synchronized merge was `81c3786`.
- The merge consumes backend `main` at `344cf77` without workbench or design-doc
  conflicts.
- Verification at that preceding merge passed 599 always-on tests with seven
  expected service skips. It is historical evidence, not a test run for this
  documentation-only closure.
- Documentation checks at the DB10 closure covered table/fence structure, new local
  links, path/audit and decision/request/fixture definitions, acceptance status,
  five-file design-only scope, and `git diff --check`.
- `UX-REQ-011` through `UX-REQ-015` remain proposed runtime
  requirements; the design closure does not implement or close them.
- `ChatGPT Image Aug 29, 2026, 04_21_35 PM.png` and `Claim Form BASIC.pdf` are
  intentionally untracked user assets. Do not add or remove them without explicit
  direction.

Do not implement a Graph fixture after this discussion. Continue the full
product-design specification through `DB12`–`DB18`.
Product implementation resumes only after the user accepts
`UX-DESIGN-FREEZE-01`.
