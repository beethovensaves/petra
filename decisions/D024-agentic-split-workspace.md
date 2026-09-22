# D024: Agentic split workspace with inspectable graph control

- **Status:** Accepted
- **Accepted:** 2026-09-21
- **Scope:** Primary frontend interaction model, desktop composition, responsive composition, Project entry, progressive disclosure, graph inspection, and operation presentation
- **Depends on:** [D005](D005-trusted-graph-review-and-direct-editing.md), [D008](D008-graph-guided-execution-context-and-cost.md), [D009](D009-object-centered-research-workspace.md), [D013](D013-ag-ui-sdk-interaction-boundary.md), [D018](D018-project-definition-and-checkpoint-boundary.md)
- **Amends:** D009's initial map-first shell and right-side assistant composition; D018's use-agnostic Project definition remains controlling

## Decision

Petra's primary frontend is a persistent **30/70 agent–workspace composition**.
The agent occupies the left 30 percent of the desktop application. The active
outcome, artifact, task, Review, source, or inspection view occupies the
remaining 70 percent.

The agent is the primary control surface. A user states an outcome, asks a
question, supplies input, steers Work, and responds to consequential
interrupts in the agent panel. The workspace renders the durable object or
result being created, edited, compared, reviewed, or inspected. Conversation
does not become authoritative state: every material action still resolves to a
registered query or command and passes through schema, authorization, policy,
prerequisite, validation, Review, event, and provenance boundaries.

The graph governs authoritative execution without requiring routine graph
operation. Every material agent action remains inspectable. An **Inspect** path
opens inside the workspace and shows the exact proposal, command, context,
evidence, constraints, prerequisite evaluation, transition, receipt,
downstream impact, and retained History that exist for that action. The
frontend must never hide a required decision, failed validation, stale state,
or uncertain effect behind conversational fluency.

Project creation begins with an unrestricted natural-language outcome. Petra
creates or proposes the exact Project-owned `ProjectDefinition` and objective
needed by D018. Reusable scientific, controlled-writing, or later templates
may seed a definition when useful, but the user is never required to select a
template or profile before describing a Project. Specialized terminology and
tools appear only when admitted by the Project's definition.

## Frontend philosophy

The application follows six rules:

1. **Delegate outcomes.** The ordinary entry point is a user outcome or request,
   not a module, ontology, operation, or model selector.
2. **Keep the work present.** Agent conversation remains visible while the
   workspace shows the object or result under discussion.
3. **Disclose progressively.** The default composition shows the current
   outcome, progress, and next required decision. Provenance, graph structure,
   policy evaluation, Work internals, and History are one deliberate Inspect
   action away.
4. **Interrupt only for consequence.** Petra asks the user when meaning is
   unresolved, authority is required, or a material choice cannot be made
   safely. Routine orchestration and healthy recovery remain under the hood.
5. **Preserve direct manipulation.** Editing, selection, comparison, Review,
   and source reading occur in the workspace. The agent can initiate the same
   operation but cannot replace the durable object with prose.
6. **Remain use-agnostic.** Petra's shell uses the shared Project, objective,
   Work, artifact, source, proposal, Review, evidence, decision, and History
   grammar. Project definitions supply domain vocabulary without changing the
   shell's authority or interaction rules.
7. **Let content carry the interface.** A restrained neutral shell, one
   functional accent, disciplined type, and limited chrome support the active
   outcome. Petra avoids dashboard mosaics, decorative metrics, oversized chat
   bubbles, repeated status badges, and controls without current task relevance.

## Desktop and responsive composition

```text
┌──────────────────────────────┬──────────────────────────────────────────────┐
│ Agent — 30%                  │ Workspace — 70%                              │
│                              │                                              │
│ Project and objective        │ Active outcome, artifact, or task            │
│ Conversation                 │                                              │
│ Current plan and progress    │ Direct editing, reading, comparison, Review  │
│ Required input and approvals │                                              │
│ Composer and stop control    │ Inspect: graph, evidence, policy, History     │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

The split is the default desktop ratio, not a fixed pixel calculation. The
agent panel must retain a usable composer and interrupt width; the workspace
must retain the minimum width required by its active renderer. The user may
resize within tested bounds. On constrained screens, Agent and Workspace
become two task-preserving views. Switching views cannot lose the selected
object, draft, active Work identity, pending decision, or return focus.

The application may use a compact top bar for Project switching, the active
objective, connectivity, and attention state. It must not restore the former
module-heavy navigation or add a third permanent column.

## Operation presentation

An operation remains part of Petra's capability and evidence ledger without
becoming a permanent control. Each operation receives exactly one default
entry, result surface, and exposure level in
[`scripts/ui-operation-presentation-map.json`](../scripts/ui-operation-presentation-map.json):

- **entry:** agent, workspace, system, settings, or test harness;
- **result:** agent, workspace, inspector, or no customer-facing result;
- **exposure:** primary, contextual, on demand, automatic, secondary, or
  internal.

Direct and agent-mediated paths may converge on the same operation. The map
defines the normal presentation, not a second command path. An operation may
appear contextually only when its authoritative owner reports eligibility.

## Project definitions and agnostic entry

D018 requires an exact definition and objective before material Work starts.
The frontend satisfies that rule without a mandatory profile picker:

1. the user describes the outcome and may attach initial material;
2. Petra preserves the wording and identifies only consequential ambiguity;
3. a server-owned definition builder selects the shared kernel, registered
   capabilities, validators, outputs, and terminology needed for the Project;
4. the workspace previews the proposed objective, expected outputs, important
   constraints, and unavailable capabilities;
5. accepted creation records the exact Project-owned definition and objective;
6. later semantic changes create reviewed additive definition revisions or a
   derived Project under D018.

The builder may use a template as a recorded origin, but template selection is
never the semantic authority and never the only way to create a Project. A
request outside installed capabilities may still be represented as a Project;
Petra must state which execution or output capability is unavailable instead of
substituting a nearby profile.

## Inspectability contract

Every authoritative or consequential outcome provides an Inspect action that
can answer:

- What did the user or agent request?
- Which registered operation and exact identities were used?
- Which Project definition, objective, snapshot, sources, and permissions
  applied?
- Which prerequisites, validators, policies, and approvals ran?
- What was proposed, validated, rejected, applied, cancelled, or recovered?
- Which objects and downstream obligations changed?
- Which event, receipt, provenance path, and History records support the
  current state?

Read-only inspection never grants authority. Graph layouts, filters,
selections, disclosure, and panel size remain presentation state.

## Consequences

The existing graph, command, Work, Review, source, History, model, and recovery
mechanisms remain useful. The current control-heavy frontend becomes an
internal conformance and inspection reference while the new shell is built.
Customer navigation no longer mirrors the operation inventory.

Wave 6's mechanical evidence establishes that the underlying operations can be
executed. It does not establish that the accepted frontend exists. Composition
and later whole-application work cannot proceed as user-facing milestones until
the agentic split workspace passes its own acceptance gate.

## Validation

D024 is implemented when:

1. a user can create Projects for at least three unrelated outcomes from plain
   language without selecting a profile;
2. the desktop application maintains the 30/70 Agent–Workspace composition
   throughout the core task, with task-preserving responsive behavior;
3. the agent can plan, start, steer, pause, resume, and recover Work through
   registered operations while the workspace renders durable outcomes;
4. only material ambiguity, authority, approval, failure, or unknown effect
   interrupts the user;
5. every operation in the frozen inventory has a validated presentation-map
   entry, and no operation is considered usable merely because a button exists;
6. every applied change can be explained through the complete Inspect path;
7. scientific and controlled-writing definitions pass as optional examples,
   alongside an unrelated Project-owned definition, without changing the shell;
8. user evaluation can complete an outcome without opening Graph, Work,
   History, Settings, or raw diagnostics, while still being able to inspect
   each when requested; and
9. the user explicitly accepts the resulting frontend before Composition or
   whole-application closure proceeds.

## Revisit triggers

Revisit D024 if persistent conversation demonstrably prevents focused artifact
work, if the 30/70 range cannot support an admitted workspace renderer, if
users cannot recover the relationship between agent turns and durable objects,
or if full inspection requires exposing private model reasoning rather than
observable context, operations, evidence, policy, and events.
