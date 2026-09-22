# FE-A1: Agentic frontend adaptation

- **Status:** Planned; blocks Wave 7
- **Decision:** [D024](../decisions/D024-agentic-split-workspace.md)
- **Operation map:** [ui-operation-presentation-map.json](../scripts/ui-operation-presentation-map.json)
- **Inventory:** [ui-operation-inventory.json](../scripts/ui-operation-inventory.json)
- **Trigger:** The Wave 6 checkpoint proved its graph-controlled mechanisms but failed user evaluation as a frontend. It exposed the operation inventory as product navigation, lacked a coherent agent-first composition, and presented two example profiles as the apparent limits of Petra.

## Result required from this milestone

FE-A1 turns the existing graph-controlled application into a usable agentic
workspace. A user begins with any Project outcome, collaborates with Petra in a
persistent left panel, and sees the active result or task in the main workspace.
Graph authority remains under the hood during ordinary work and remains fully
inspectable through the same application.

This milestone adapts the frontend rather than replacing the authority model.
The command, graph, Work, Review, evidence, provenance, event, and recovery
mechanisms already proved by Wave 6 remain the execution foundation.

The exit experience must support this loop:

1. Describe an outcome in ordinary language or open an existing Project.
2. Review the proposed objective, outputs, constraints, and capability limits.
3. Ask Petra to proceed.
4. Follow progress, answer necessary questions, and steer or stop Work in the
   agent panel.
5. Read, edit, compare, or review the durable result in the workspace.
6. Inspect any material action to see its graph operation, evidence, policy,
   transition, receipt, provenance, impact, and History.

## Frontend contract

### 1. One stable 30/70 composition

Desktop uses a persistent Agent panel on the left and a Workspace on the right.
The default ratio is 30/70. The Agent contains Project and objective context,
conversation, current plan and progress, required input, approvals, the composer,
and the stop control. The Workspace contains the active outcome, artifact, task,
source, Review, comparison, or inspection.

The user may resize the split within tested bounds. The interface does not add a
third permanent rail. On constrained screens, Agent and Workspace become two
switchable views with exact selection, draft, Work, decision, and focus
preservation.

### 2. Agent as control plane

The user should normally need four kinds of agent interaction:

- state the outcome or ask a question;
- provide input or clarify meaning;
- approve, reject, or revise a consequential proposal;
- steer, pause, resume, retry, or stop active Work.

The agent translates those interactions into registered operations. It cannot
invent operation identity, eligibility, authority, success, or recovery. The
workspace renders the durable object; the conversation reports and controls it.

### 3. Workspace as the durable work surface

`WorkspaceHost` selects a renderer from a server-supplied destination role and
exact object identity. The initial renderer set is:

- **Outcome:** current objective, plan, progress, produced results, and material
  decisions;
- **Artifact:** direct reading and editing of a durable output;
- **Source:** source collection, exact reader, revision, processing, and rights;
- **Review:** candidate, basis, exact ChangeSet, decision, and outcomes;
- **Work:** stages, required input, observable activity, results, and recovery;
- **Inspect:** explanation, evidence, focused graph, policy, provenance, impact,
  and History.

The renderer registry is domain-neutral. A Project definition may supply labels,
object descriptors, output types, or admitted tools. It cannot supply arbitrary
layout code or change authority semantics.

### 4. Inspectable graph control

Every consequential agent card and every durable workspace object provides a
single **Inspect** action. Inspect opens within the 70-percent workspace. It uses
progressive levels rather than several diagnostic routes:

1. **Explanation:** request, outcome, current state, and concise reason;
2. **Basis:** evidence, sources, limitations, applicable objective and snapshot;
3. **Control:** operation, prerequisites, policy, validation, approval, and
   receipt;
4. **Graph and History:** exact objects, relationships, transition path,
   downstream impact, event history, and recovery.

Private model reasoning is never required. Inspectability is grounded in
observable input, registered operations, evidence, policies, events, and
results.

### 5. Use-agnostic Project entry

The first screen asks: **What are you trying to accomplish?** It accepts a plain
language outcome and optional initial material. Scientific inquiry and
controlled writing may appear under a secondary “Start from an example” action,
alongside unrelated examples. They are not required categories.

D018 still requires an exact Project-owned definition and objective. FE-A1 adds
the missing server-owned definition-draft path:

- preserve the user's original wording;
- derive a definition from the shared Petra kernel and registered capabilities;
- expose expected outputs, consequential assumptions, constraints, and missing
  capabilities;
- ask only about ambiguities that change meaning or authority;
- validate and register an immutable Project-owned definition and objective;
- retain any template as optional origin metadata;
- revise definitions additively or derive a new Project when semantics change.

A Project outside currently installed capabilities remains a valid Project.
Petra describes the unsupported execution or output instead of rejecting the
domain or silently substituting an example profile.

### 6. Calm, content-led visual language

The shell should feel like a focused working application rather than a
dashboard, presentation, or control room:

- use one neutral application canvas and one restrained functional accent;
- give the active workspace object the strongest hierarchy;
- keep Project context and navigation compact and stable;
- present agent turns as a continuous working thread rather than a stack of
  oversized chat bubbles;
- use cards only for bounded objects, decisions, or interruptions that benefit
  from a visible edge;
- avoid decorative metrics, repeated status badges, gradients, excessive
  borders, and competing calls to action;
- express state in plain language close to the affected object, with color as
  redundant support;
- reserve motion for spatial continuity, progressive results, and state
  transitions; and
- preserve comfortable reading and editing widths inside the 70-percent
  workspace rather than filling every available pixel with controls.

The visual pass begins from the actual Agent–Workspace hierarchy. It does not
reskin the existing module grid or use the fixture gallery as the product shell.

## Complete operation mapping

The machine-readable presentation map covers all **116** inventory operations.
It assigns each operation a default entry, result surface, exposure, and
presentation rule. The audit command fails on a missing, duplicate, stale, or
invalid mapping:

```sh
npm run audit:ui-presentation
```

Only seven operations are primary in normal use:
`project.open`, `project.create`, `brief.frame-objective`, `petra.ask`,
`composition.open`, `composition.edit`, and `composition.ask-petra`. The
remaining operations are contextual, inspectable, automatic, secondary, or
test-only.

| Family | Operations mapped | Default frontend treatment |
| --- | --- | --- |
| Project and shell | `project.search`, `project.open`, `project.switch`, `project.resume`, `project.create`, `project.import`, `project.recover`, `shell.navigate`, `shell.return`, `shell.inspect-context`, `shell.project-map`, `shell.attention-work` | Create and frame through the Agent; open outcomes in Workspace; keep search/switch/map secondary; resume automatically; put exact context in Inspect. |
| Outcome/Brief | `brief.orient`, `brief.frame-objective`, `brief.attention`, `brief.change`, `brief.suggested-preview`, `brief.suggested-invoke`, `brief.recent-decisions` | Workspace orients around the outcome; Agent frames objectives and offers ready actions; change and decision detail live in Inspect. |
| Sources | `source.find`, `source.open`, `source.register`, `source.reuse`, `source.start-processing`, `source.inspect-processing`, `source.inspect-exact`, `source.add-revision`, `source.remove-project-link`, `source.delete-local-copy` | Agent initiates discovery and processing; Workspace reads and manages the selected source; Inspect holds processing, exactness, provenance, and limitations. |
| Review | `review.queue`, `review.open-session`, `review.select-member`, `review.correct-candidate`, `review.revise-basis`, `review.separate`, `review.prepare-apply`, `review.apply`, `review.reject`, `review.defer`, `review.reopen`, `review.refresh` | Review runs by exception. Agent raises decisions; Workspace supports correction and comparison; exact ChangeSet and policy remain inspectable. |
| Graph and Details | `graph.open`, `graph.return`, `graph.layer-position`, `graph.select`, `graph.open-details`, `graph.open-source`, `graph.expand`, `graph.filter`, `graph.save-question`, `graph.compare`, `graph.impact`, `graph.time`, `graph.correct-through-review`, `details.open`, `details.return` | Focused Graph and Details are Inspect modes within Workspace. Graph correction exits through governed Review. No graph canvas is the default home. |
| Work | `work.list`, `work.open`, `work.start`, `work.answer-input`, `work.steer`, `work.prioritize`, `work.detach`, `work.reconnect`, `work.replay`, `work.cancel`, `work.retry`, `work.resume`, `work.start-again`, `work.open-result` | Agent summarizes and controls Work; Workspace shows exact stages and results; reconnect and replay are automatic; controls appear only when eligible. |
| Agent, models, and feedback | `petra.open`, `petra.resume-thread`, `petra.ask`, `petra.inspect-context`, `petra.inspect-references`, `petra.preview-action`, `petra.invoke-action`, `petra.respond-interrupt`, `model.inspect-readiness`, `model.use`, `feedback.confirm`, `feedback.retry`, `feedback.dismiss`, `feedback.return` | Agent remains persistent and owns requests and interrupts. Healthy model routing stays under the hood. Context, references, certification, and limitations are inspectable. |
| Project definition | `taxonomy.inspect-profile`, `taxonomy.bind-project` | Replace profile-picker presentation with Project-owned definition drafting and binding. Existing operation IDs remain compatibility names until the contract migration is complete. Definition detail is inspectable. |
| History | `history.list`, `history.filter`, `history.open`, `history.compare`, `history.impact`, `history.preview-revert`, `history.execute-revert` | History is an Inspect mode. Agent can request Revert; exact preview, impact, confirmation, receipt, and updated result remain visible. |
| Settings | `settings.personal-change`, `settings.personal-reset`, `settings.inspect-project-control`, `settings.change-project-control` | Personal preferences remain secondary. Governed Project controls are inspected in Settings and changed through an agent-mediated exact preview. |
| Composition | `composition.list`, `composition.create`, `composition.open`, `composition.edit`, `composition.save`, `composition.ask-petra`, `composition.inspect-provenance`, `composition.inspect-findings`, `composition.compare`, `composition.restore`, `composition.validate`, `composition.render`, `composition.copy`, `composition.download`, `composition.promote-review` | Artifact work is primary in Workspace. Agent acts in exact passage, section, or artifact context. Save is durable and quiet; provenance, findings, and comparisons use Inspect. |
| Definition capabilities | `profile-tool.open`, `profile-tool.run` | Present registered capabilities only when the Project definition and current task make them relevant. They never become profile-branded global navigation. |
| Acceptance infrastructure | `application.guide`, `application.reset` | Remove from customer navigation. Keep as test-harness operations. Product onboarding occurs through the Agent; fixture reset remains external acceptance infrastructure. |

The JSON map is normative when an individual operation differs from its family
summary.

## Frontend architecture

FE-A1 introduces a small presentation layer over existing typed clients:

```text
AgentRail
  ├── ProjectObjectiveHeader
  ├── ConversationThread
  ├── PlanAndProgress
  ├── InterventionCard
  └── AgentComposer

WorkspaceHost
  ├── OutcomeWorkspace
  ├── ArtifactWorkspace
  ├── SourceWorkspace
  ├── ReviewWorkspace
  ├── WorkWorkspace
  └── InspectWorkspace

OperationPresenter
  ├── server-supplied availability and destination
  ├── exact preview and invocation
  ├── receipt and recovery
  └── operation-to-presentation map
```

`AgentRail` consumes Petra interaction and Project-thread view models. It does
not consume raw AG-UI events. `WorkspaceHost` owns routeable object identity and
the exact return location. `OperationPresenter` renders availability supplied by
the server; it does not infer whether an operation is allowed. All three use the
existing command/query owners.

## Delivery sequence

### FE-A1.0 — Preserve mechanics and establish the new boundary

- Retain the Wave 6 authority, operation, and recovery evidence.
- Mark the existing checkpoint as rejected for frontend acceptance.
- Keep the current control-heavy interface available only as an internal
  conformance reference while migration is underway.
- Make D024 and the 116-operation presentation map binding.

### FE-A1.1 — Build the shell and interaction foundation

- Implement the desktop 30/70 shell and task-preserving responsive variant.
- Establish restrained tokens, typography, spacing, density, focus, motion, and
  component states around one hierarchy.
- Replace persistent module navigation with Project switching, workspace
  destinations, object links, and exact return.
- Provide the Agent, Workspace, Inspect, and interrupt component primitives.

### FE-A1.2 — Add agnostic Project creation

- Add the definition-draft query and validated create command required by D018.
- Replace mandatory profile selection with the outcome-first entry.
- Keep examples optional and verify one scientific, one writing, and one
  unrelated Project through the same shell.
- Render limitations when a requested capability is unavailable.

### FE-A1.3 — Consolidate control in the agent

- Route ask, objective framing, SuggestedActions, Work controls, required input,
  Review interrupts, approvals, recovery, and Revert requests through AgentRail.
- Keep detailed editing, reading, comparison, and Review in Workspace.
- Ensure direct and agent-mediated execution use the same operation identities.

### FE-A1.4 — Build the workspace renderer set

- Implement Outcome, Source, Review, Work, and Inspect renderers against current
  live contracts.
- Establish the Artifact renderer boundary that Wave 7 Composition completes.
- Preserve exact object, snapshot, selection, return, focus, and draft identity
  across renderer changes.

### FE-A1.5 — Integrate inspection

- Add one Inspect entry to every material agent result and workspace object.
- Compose explanation, basis, control, graph, impact, History, and recovery from
  authoritative read models.
- Remove raw diagnostic payloads and duplicate standalone inspection routes from
  the ordinary experience.

### FE-A1.6 — Migrate and remove frontend debt

- Reconcile every inventory operation against the presentation map.
- Remove permanent controls that are now automatic, contextual, inspect-only, or
  test-only.
- Remove scientific and controlled-writing terminology from shared shell copy.
- Delete or quarantine obsolete components after their mapped replacement passes.

### FE-A1.7 — Evaluate the product as a frontend

- Run outcome-based tests through the complete interface, rather than one test
  per control.
- Conduct an adversarial design review for hierarchy, cognitive load, apparent
  authority, dead ends, hidden state, and graph inspectability.
- Conduct keyboard, focus, text-scale, responsive, reduced-motion, and non-color
  checks on the complete task.
- Require explicit user acceptance before Wave 7 resumes.

## Acceptance scenarios

The milestone cannot exit on route coverage or automated element assertions
alone. It requires retained execution of these scenarios:

1. **Agnostic creation:** Create three unrelated Projects from natural-language
   outcomes without using a mandatory profile or template picker.
2. **Agentic completion:** Complete one representative outcome primarily through
   the Agent while the Workspace updates the durable result.
3. **Direct work:** Edit or review a durable workspace object and continue the
   same task through the Agent without losing selection or context.
4. **Governed intervention:** Encounter missing input and a consequential change;
   answer, preview, approve or reject, and observe the exact outcome.
5. **Inspectable authority:** Starting from an agent result, reconstruct its
   request, operation, context, evidence, validation, transition, receipt,
   provenance, impact, and History.
6. **Recovery:** Disconnect, reconnect, retry or resume eligible Work, cancel a
   run, and recover an unknown effect without duplicate execution or lost draft.
7. **Quiet default:** Complete the representative outcome without opening Graph,
   Work, History, Settings, or diagnostics.
8. **Optional depth:** Open those same details on demand and return to the exact
   task and focus.
9. **Responsive continuity:** Complete the task across desktop and constrained
   layouts without losing the Agent–Workspace relationship.
10. **User acceptance:** The user judges the interface to be coherent, usable,
    domain-agnostic, agentic, and inspectable.

## Exit gate and subsequent milestones

FE-A1 exits only when:

- all 116 inventory operations pass the presentation-map audit;
- all 97 currently live Wave 6 operations conform to their mapped presentation;
- the outcome-first Project creation path is live against a Project-owned
  definition;
- the complete 30/70 task passes visual, interaction, accessibility, adverse
  state, and recovery review;
- the old checkpoint is no longer the customer entry point; and
- the user explicitly accepts the new frontend.

Wave 7 then completes the 15 Composition operations inside the accepted
Artifact workspace. Wave 8 completes the four remaining governed Settings and
definition-capability operations and repeats whole-application validation. A
later wave cannot restore profile-gated entry, operation-led navigation, or a
graph-first default without revisiting D024.
