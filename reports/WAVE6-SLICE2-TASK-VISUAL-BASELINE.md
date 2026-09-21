# Wave 6 slice 2 task and visual baseline

Date: 2026-09-18 America/New_York

Status: design slice 2 complete. The production shell and Brief now establish
the task hierarchy for later Wave 6 integration; no named Wave 6 evidence
scenario was executed.

Design starting commit:
`58790e5b7a9d0d67156bc25ba6ca8a8a7c28406d`

Exact backend counterpart inspected:
`17656c785bf2a5692ac9cb757f466c0215f519cd`

Pre-merge design commit inspected:
`f3c175d981f80f33e09dd61ec35baddad57f5e9c`

## Result

The live Project route had a complete collection of surfaces but did not yet
read as one application task. Project identity, service status, authority
position, Petra, settings, and eight places competed in two stacked headers and
an undifferentiated navigation list. The production Brief then began as a
narrow engineering report: raw snapshot hashes, coverage mechanics, revision
positions, schema terms, and serialized records appeared before or alongside
the person's focus, attention, and next action.

This slice establishes a reusable application hierarchy without changing a
runtime owner:

- the global header identifies the Projects level, while the Project context
  bar retains Project, registered profile, authority position, projection
  position, and Settings;
- the persistent Project navigation follows the guided task order: Brief, Ask
  Petra, Work, profile-named sources, Graph, Review, History, and Composition;
- Ask Petra is the one emphasized Project place rather than a duplicate header
  action, and server-supplied place summaries can expose non-color attention
  counts;
- the production Brief identifies itself as Brief instead of repeating the
  Project name as a report title;
- current focus, attention, change, grounded state, Work, next steps, and recent
  decisions retain the accepted seven-region source order but now have distinct
  task roles and a direct jump to the first supplied next action; and
- exact hashes, refs, manifests, packets, revisions, and serialized records
  remain available under keyboard-operable technical disclosures. They no
  longer carry the primary hierarchy.

The refactor is presentation-only. It consumes the same validated
`petra.project-shell-view` and `petra.project-brief-view` records, issues no new
read or command, changes no route, and does not infer a recommendation,
priority, readiness state, taxonomy term, authority effect, or recovery action.

## Person-task critique and disposition

| Observation on the guided path | Consequence | Slice 2 disposition |
| --- | --- | --- |
| Petra appeared as a context-bar action while Work, Sources, Graph, Review, and History appeared as equal sidebar destinations. | The intended sequence was not visible, and Petra looked like a global utility rather than contextual Project help. | Petra is now one emphasized place inside the ordered Project workflow. |
| The sidebar order followed a surface inventory rather than the Wave 6 task. | A person had to reconstruct the path from repository knowledge. | Navigation now follows orientation, help, Work, inspection, decision, and trace order. |
| The Brief repeated the Project name as its only title. | The current place was ambiguous, especially after route changes. | The page title is `Brief`; the Project remains visible as context. |
| Raw snapshot hashes and serialized records appeared in the first screenful. | Diagnostic identity displaced focus, attention, and action. | Exact data remains in technical disclosures; readable position chips summarize profile, coverage, and projection. |
| The next supplied action appeared after long state and Work sections. | A person could understand state but still miss how to continue. | A top-level `Review next step` link jumps to the exact server-supplied action without invoking it. |
| Every section used the same report-like rhythm. | The screen read as reference documentation rather than a working application. | Orientation, attention, retained results, empty states, next actions, and technical detail now use distinct but coherent visual roles. |
| The shell used a wide page-title scale and a narrow Brief measure. | The shell felt presentation-like while the Brief felt like a developer report. | Shared surface headings are compact; the Brief uses a bounded task workspace with readable measures and responsive reflow. |

## Frozen boundaries preserved

- The seven accepted DB07 Brief regions and their source order remain intact.
- All scientific statements, limitations, attention order, SuggestedActions,
  History summaries, profile labels, projection labels, and readiness states
  still come from validated server records.
- Technical disclosure does not make a record less authoritative; it changes
  only its prominence. Closed details remain in the DOM and preserve exact
  browser inspection.
- Project navigation does not execute an operation. Every destination still
  reaches its existing React Router loader and registered production boundary.
- Client-local attention badges use only `place_summaries.attention_count` and
  combine text, symbol, and color.
- Composition remains present because it is an accepted Project place, but this
  slice does not promote its Wave 7 operations to live.
- No backend contract, server code, persistence owner, migration, fixture,
  command, authorization rule, or operation-inventory state changed.

## Deliberately not started

The baseline does not pre-empt later Wave 6 owners:

- slice 3 owns registered-profile runtime; slice 4 owns usable taxonomy
  inspection and cross-surface terminology;
- slices 5 and 6 own actual certified-model readiness and the live Petra
  composer;
- slices 7 and 8 own complete Work operations, the stable URL, resettable
  representative Project, and the in-product guide; and
- later slices own Sources, Review, Graph, History, settings, recovery,
  operation evidence, responsive audit, and Felicity closeout.

The existing disabled or incomplete operations remain honestly incomplete. A
visual hierarchy change does not satisfy any row in the 97-operation Wave 6
inventory.

## Visual and interaction review boundary

The production Brief component was rendered in isolated Chrome through its
existing validated loader and synthetic fixture transport at 1440 by 1000 and
390 by 844. The review confirmed readable hierarchy, no horizontal overflow,
task-first focus, explicit limitations, non-color position labels, and narrow
reflow. This was a development inspection, not a retained Wave 6 scenario
record, a stable production URL, a live backend trace, or user acceptance.

## Evidence control

No command in this slice invoked an exact named Wave 6 evidence scenario. The
Wave 6 ledger therefore remains `0/24`, and this slice returns an empty evidence
array. The component tests, temporary screenshots, this report, and the browser
inspection are verification support only. They do not satisfy the guided-path,
visual-review, responsive-accessibility, Felicity, operation-gate, or final
recording scenarios.

## Verification

All commands used the pinned Node 24.20.0 toolchain.

- `npm run typecheck --workspace @petra/workbench`
- `npm test --workspace @petra/workbench -- --run src/product/project-brief.test.tsx src/product/reference-workbench.test.tsx`
  passed 42 focused tests.
- isolated Chrome inspection through the production Brief loader at wide and
  narrow viewports found no horizontal overflow.
- `npm run test:wave4:browser` passed against fresh PostgreSQL 18.6 and Neo4j
  2026.07.1 stores, isolated Chrome, Apply, two server restarts, History, and
  governed Revert.
- `npm run verify` passed after the required loopback-authorized rerun: format,
  lint, typecheck, production build, 1,427 passed tests, seven expected skips,
  and the 116-operation structural audit.
- `git diff --check` passed.

## Next safe boundary

Hand back for backend Wave 6 slice 3 only. Starting from the pushed design
commit for this slice and exact backend counterpart
`17656c785bf2a5692ac9cb757f466c0215f519cd`, complete Project creation/reset,
registered profile selection, versioned taxonomy reads, paired-profile
behavior, and safe unsupported-profile handling through production owners. Do
not rewrite this presentation baseline or begin design slice 4 integration.
