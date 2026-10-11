# FE-A1: Agentic frontend adaptation

- **Status:** `in_progress`; all eight stages require revalidation under D025; the inspected frontend was rejected on 2026-10-07; blocks Wave 7 and Wave 8
- **Decision:** [D024](../decisions/D024-agentic-split-workspace.md)
- **Operation map:** [ui-operation-presentation-map.json](../scripts/ui-operation-presentation-map.json)
- **Inventory:** [ui-operation-inventory.json](../scripts/ui-operation-inventory.json)
- **Required implementation ledger:** [FE-A1-CONTRACT-IMPLEMENTATION-LEDGER.md](FE-A1-CONTRACT-IMPLEMENTATION-LEDGER.md)
- **Canonical work/status register:** [frontend-a1-work-inventory.json](../scripts/frontend-a1-work-inventory.json)
- **Trigger:** The Wave 6 checkpoint proved its graph-controlled mechanisms but failed user evaluation as a frontend. It exposed the operation inventory as product navigation, lacked a coherent agent-first composition, and presented two example profiles as the apparent limits of Petra.

## Delivery ledger

The canonical ledger controls the required functions, dependency order, and
criterion evidence. D025 adds one process prerequisite to the original 89 items:
90 required items remain tracked. Earlier completion evidence is retained and
must be revalidated with execution and critical passes. Current counts and stage
states are generated in the controlling A1 section below; historical traces do
not establish current completion.

The 16 supplementary scenarios remain optional near the end of A1. Every
contracted function still needs its own evidence. Native screen-reader evaluation
remains excluded; browser semantics, keyboard, focus, reflow and graph peers are
required.

### User inspection correction — 2026-10-07

The user rejected the current candidate: the left panel does not provide a
conversational evidence-review copilot, the Workspace does not respond to that
conversation, and the graph is not discoverable in the intended interaction.
The earlier completion labels for FE-A1.1, FE-A1.3, and FE-A1.4 described
mechanical implementation evidence and overstated product delivery. Those stages
are reopened; their structural and command evidence remains retained for revalidation.

The next delivery must prove one connected evidence-review task:

1. Ask a normal evidence question and a follow-up in a readable conversation.
2. Open and select the cited source, passage, claim, or Review object in the
   Workspace from that conversation.
3. Show and interact with the relevant graph in the Workspace while retaining
   the conversation and exact evidence selection.
4. Prepare a governed Review proposal, observe the exact decision and result,
   and restore readable conversation and task context after reload.

The current certified synthesis route remains limited to its exact registered
question. General evidence discussion requires a registered backend interaction
contract, applicable model eligibility and grounding checks, and durable text
reads. Changing the composer alone cannot supply that capability. The model
result callback currently refreshes Agent readiness and thread metadata; it
does not provide the required conversation-to-Workspace interaction.

No replacement frontend acceptance has been recorded. Wave 7 remains blocked.

FE-A1.1's implemented structural mechanics are evidenced by
[`FRONTEND-STEP2-AGENT-WORKSPACE.json`](FRONTEND-STEP2-AGENT-WORKSPACE.json).
The Chromium run measures the split at 0.30/0.70, keyboard-activates every
retained destination, confirms inspection begins closed, and switches between
Agent and Workspace at 420 px while preserving the current route and mounted
task. The later
[`FRONTEND-STEP5-WORKSPACE-HOST.json`](FRONTEND-STEP5-WORKSPACE-HOST.json)
also verifies keyboard and pointer resizing from the 30 percent default and
restoration of the default width. The Agent conversation, composer, and Work controls remain FE-A1.3 scope;
their absence does not make the structural shell a simulated interaction.

FE-A1.2's retained creation mechanics are proven by
[`FRONTEND-STEP3-AGNOSTIC-PROJECT-CREATION.json`](FRONTEND-STEP3-AGNOSTIC-PROJECT-CREATION.json)
and the disposable PostgreSQL integration suite. The live Chromium run creates
scientific, controlled-writing, and unrelated general Projects from the same
outcome-first surface. It reviews selected capabilities, assumptions, and
unsupported behavior before creation, and carries an optional initial file into
the existing source and rights review. The isolated database run applies all 59
migrations and proves exact draft replay, explicit optional examples, initial
material plans, and rejection of changed drafts or unaccepted assumptions.

FE-A1.3's implemented control placement is evidenced by
[`FRONTEND-STEP4-AGENT-CONTROL-PLANE.json`](FRONTEND-STEP4-AGENT-CONTROL-PLANE.json),
the production controller tests, and the retained shell browser trace. The
Agent persistently owns `petra.ask` and the retained Project thread. Objective
framing, SuggestedAction invocation and Work start, required input, steering,
priority, cancellation, reconnect, replay, retry, Resume, Start again, result
opening, Review decisions, command recovery, and governed Revert
are presented in the Agent through their existing typed owners. Each contextual
presentation carries its mapped operation IDs and exact object identity. The
browser trace confirms that each sampled route-owned controller remains mounted,
appears inside the Agent rather than the Workspace, and survives the responsive
Agent/Workspace switch without changing the task route. ChangeSet preparation,
candidate editing, comparison, and other detailed Review work remain in the
Workspace, as required by the operation map.

FE-A1.4's first host slice is evidenced by
[`FRONTEND-STEP5-WORKSPACE-HOST.json`](FRONTEND-STEP5-WORKSPACE-HOST.json)
and the Workspace host and direct-object loader tests. The host keeps the six
renderer roles and authority snapshot visible in the production shell, refuses
destinations absent from the server Project read, and refuses an exact selection
whose server destination disagrees with the displayed place. Direct Source,
Work, and DraftArtifact URLs request server selection in the Project shell
snapshot before rendering. Exact selections accept the current shell 1.3 read.
The Chrome trace keyboard-opens every retained destination, preserves the
mounted task through the narrow Agent/Workspace switch, restores focus to the
Workspace heading after route changes, and verifies an exact Source URL through
a fresh server shell read. It also retains an in-memory Source draft while
switching to Review and back, and opens Inspect for that exact Source before
returning to its task and focus. The Review Inspector also survives 200% text
scale at 420 px without horizontal overflow and exposes its exact return in
reduced-motion mode. The draft cache now covers Source registration
and revision, Work instructions, Review decisions and candidate/basis edits,
and Artifact text. Its child route bodies are context observers, supplemented by
live Source, Work, and Review browser flows. The Work instruction and selected
priority survive Work → Review → Work and a narrow Agent/Workspace switch. An
unfinished candidate edit survives Review → Sources → Review. A server-resolved DraftArtifact currently receives an
explicit live Artifact-unavailable boundary until Wave 7 Composition supplies
its reader and editor.

FE-A1.5's current Inspect slice uses the Project shell's resolved selection and
authority snapshot. Explanation and object identity are visible first; basis,
control, and Graph/History are disclosed on demand. Source and Work detail reads
must match the selected shell revision; Work also checks its record hash.
Review sessions and History events opened from agent cards are read from their
exact Project owners. The event read composes its recorded change, impact, and
recovery assessment. Opening History requests the authoritative retained event
read, targeted to the selected object when that exact target type is supported.
Selecting a retained event in Inspect now keeps the user in Inspect, reads the
exact event, impact, and recovery, and preserves the originating task return.
For an exact Source revision, Inspect also reads the server-composed processing
state, representation extent, verified span counts, and limitations; a changed
Source revision is rejected instead of being presented as the selected one.
The inspector refuses destinations absent from the server place map and does
not present an unresolved agent object as verified. New-Source registration
receipts are read from the retained authority by exact Project and Source ID,
checked against the authenticated actor, and remain visible after page reload.
The read now resolves the registered human independently of current command
grants, while the retained owner check still rejects another actor. Recent Work
command receipts use an authenticated retained read with exact task, actor,
command, and record-hash checks, and remain visible after browser reload. Work
control availability and reasons come from a separate server assessment that
must match the selected Work revision. A fresh direct link reads retained
receipts instead of relying on browser memory. Full durable per-operation evidence, policy, receipt, impact, and
recovery composition is still required before FE-A1.5 is complete.

The live Sources regression is retained in
[`FRONTEND-LIVE-SOURCES-BROWSER.json`](FRONTEND-LIVE-SOURCES-BROWSER.json) and
[`FRONTEND-LIVE-SOURCES-BACKEND.json`](FRONTEND-LIVE-SOURCES-BACKEND.json).
It ran in Chromium against authenticated HTTP and fresh disposable PostgreSQL,
Neo4j, and S3 services after all 59 migrations. Registration, processing,
revision, replacement, reuse, link removal, deletion recovery, exact Source
and registration-receipt inspection after a full page reload, and exact returns
passed. The live Source and Inspector also fit the 420 px workspace at 200% text
scale without horizontal overflow. The environment used Node 24.20.0 and the
certified Codex CLI 0.154.0 from the cached npm package; the machine's default
CLI 0.158.0 fails the pinned synthesist certification at startup. This regression
exercises the live Sources task but does not cover the whole FE-A1 outcome loop.
Visual inspection of the Source reader moved raw record and copy identity behind
an on-demand disclosure while leaving revision, creator, rights, role, and
downstream use visible beside the content.

The live History and governed Revert regression is retained in
[`FRONTEND-LIVE-HISTORY-BROWSER.json`](FRONTEND-LIVE-HISTORY-BROWSER.json).
It resolves the exact applied event, opens Inspect from its agent card, verifies
the recorded actor, Project definition, original command fingerprint and grant,
receipt reference, recovery state, and bounded direct and semantic impact there,
drills into another retained event without leaving Inspect, returns to the event task, then previews,
plans, and executes one governed compensation before observing the updated
outcome. This proves the event Inspector path and exact return within a live
task; it does not prove inspection of every material operation.

The live Work regression is retained in
[`FRONTEND-LIVE-WORK-BROWSER.json`](FRONTEND-LIVE-WORK-BROWSER.json). It opens
the exact completed Work task in Inspect, verifies the selected Work identity,
execution details, authorized limit, and server-assessed controls, and returns
to the same result view. The same run retains the exact Resume receipt through
an in-app Work route change and displays that receipt in Inspect. The retained
Work receipt query now reads up to 20 completed commands for the authenticated
actor and exact task, and validates their contracts and record hashes. Its full
browser reload check passed in the updated live trace, including the exact
Work return. The same trace found no horizontal overflow at 420 px and 200%
text scale in either the Work Agent or Workspace pane.
The same run exercises required input, steering, priority, cancellation,
retry, Resume, Start again, reconnect, replay, and exact result destinations.
It verifies that the owning Work route refreshes after an applied retry: the
Workspace state advances with the Agent receipt instead of retaining the old
failed revision. A visual review put Work tasks before optional inquiry paths,
reduced long task-heading emphasis, moved exact record fields and the full
assessment behind disclosures, and made the eligible execution action reachable
above the persistent composer through a keyboard-accessible jump. Ineligible
execution actions and their reasons remain available on demand. Captures and
findings are retained in [`fe-a1/VISUAL-REVIEW.md`](fe-a1/VISUAL-REVIEW.md).
It does not by itself prove the full outcome-first user journey.

The model failure and recovery browser record is retained in
[`FRONTEND-LIVE-MODEL-RECOVERY-BROWSER.json`](FRONTEND-LIVE-MODEL-RECOVERY-BROWSER.json).
A deterministic unavailable-provider port interrupts the first response after
the production runtime records one failed run. The Agent automatically reads
that exact retained run, preserves the edited draft and Work return across
navigation, and shows the verified failure without duplicating the provider or
Work effect. This is an adverse-state trace, not a successful external model
response. After the user authorized one synthetic-Project call, the
[`FRONTEND-LIVE-MODEL-SUCCESS-BROWSER.json`](FRONTEND-LIVE-MODEL-SUCCESS-BROWSER.json)
and
[`FRONTEND-LIVE-MODEL-SUCCESS-BACKEND.json`](FRONTEND-LIVE-MODEL-SUCCESS-BACKEND.json)
traces verified a visible grounded answer, one provider ModelCall, one retained
interaction and delivery record, and no Project authority effect. The success
trace did not separately read that retained run from a fresh browser; this
limit and the exact payload are recorded in
[`fe-a1/MODEL-TRACE-REVIEW.md`](fe-a1/MODEL-TRACE-REVIEW.md).

The live Review regression is retained in
[`FRONTEND-LIVE-REVIEW-BROWSER.json`](FRONTEND-LIVE-REVIEW-BROWSER.json). It
retains an unfinished candidate edit across Review → Sources → Review before
saving one exact correction, then exercises basis revision, member separation,
defer, reopen, rejection, refresh, and Apply through their live owners.
Desktop captures of the queue and detail exposed and resolved three presentation
errors: plural decision counts, raw snapshot and record identity dominating the
default Review view, and a danger-colored validation banner for passing checks.
The decision queue now prioritizes title, accountable author, state, and action;
the detail keeps exact identity and authority snapshot on demand. Passing,
pending, and blocked validation have distinct text, symbols, and color. A
keyboard-activated jump from the Agent task card brings the existing decision
group above the persistent composer; the optional deferral reason and full
decision boundary remain available on demand.
The reviewed captures and dispositions are in
[`fe-a1/VISUAL-REVIEW.md`](fe-a1/VISUAL-REVIEW.md).

The isolated Project resume browser record is retained in
[`WAVE6-PROJECT-RESUME-BROWSER.json`](WAVE6-PROJECT-RESUME-BROWSER.json).
It verifies that the primary Project title opens the exact server-retained Graph
task and selection, and that stale, missing, and unavailable task states follow
the server's Brief recovery or retry without client-generated task identity.
The transport in this test is schema-shaped and deterministic; it is not a live
database trace.

The acceptance reset browser record is retained in
[`FRONTEND-GUIDE-RESET-BROWSER.json`](FRONTEND-GUIDE-RESET-BROWSER.json).
It confirms that ordinary Settings has no reset control, then executes the
registered reset from the direct test guide against disposable live services
and opens the distinct replacement Project. The direct guide is test
infrastructure and is absent from customer navigation.

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

| Family                      | Operations mapped                                                                                                                                                                                                                                                                                                                                                     | Default frontend treatment                                                                                                                                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project and shell           | `project.search`, `project.open`, `project.switch`, `project.resume`, `project.create`, `project.import`, `project.recover`, `shell.navigate`, `shell.return`, `shell.inspect-context`, `shell.project-map`, `shell.attention-work`                                                                                                                                   | Create and frame through the Agent; open outcomes in Workspace; keep search/switch/map secondary; resume automatically; put exact context in Inspect.                                                                 |
| Outcome/Brief               | `brief.orient`, `brief.frame-objective`, `brief.attention`, `brief.change`, `brief.suggested-preview`, `brief.suggested-invoke`, `brief.recent-decisions`                                                                                                                                                                                                             | Workspace orients around the outcome; Agent frames objectives and offers ready actions; change and decision detail live in Inspect.                                                                                   |
| Sources                     | `source.find`, `source.open`, `source.register`, `source.reuse`, `source.start-processing`, `source.inspect-processing`, `source.inspect-exact`, `source.add-revision`, `source.remove-project-link`, `source.delete-local-copy`                                                                                                                                      | Agent initiates discovery and processing; Workspace reads and manages the selected source; Inspect holds processing, exactness, provenance, and limitations.                                                          |
| Review                      | `review.queue`, `review.open-session`, `review.select-member`, `review.correct-candidate`, `review.revise-basis`, `review.separate`, `review.prepare-apply`, `review.apply`, `review.reject`, `review.defer`, `review.reopen`, `review.refresh`                                                                                                                       | Review runs by exception. Agent raises decisions; Workspace supports correction and comparison; exact ChangeSet and policy remain inspectable.                                                                        |
| Graph and Details           | `graph.open`, `graph.return`, `graph.layer-position`, `graph.select`, `graph.open-details`, `graph.open-source`, `graph.expand`, `graph.filter`, `graph.save-question`, `graph.compare`, `graph.impact`, `graph.time`, `graph.correct-through-review`, `details.open`, `details.return`                                                                               | Focused Graph and Details are Inspect modes within Workspace. Graph correction exits through governed Review. No graph canvas is the default home.                                                                    |
| Work                        | `work.list`, `work.open`, `work.start`, `work.answer-input`, `work.steer`, `work.prioritize`, `work.detach`, `work.reconnect`, `work.replay`, `work.cancel`, `work.retry`, `work.resume`, `work.start-again`, `work.open-result`                                                                                                                                      | Agent summarizes and controls Work; Workspace shows exact stages and results; reconnect and replay are automatic; controls appear only when eligible.                                                                 |
| Agent, models, and feedback | `petra.open`, `petra.resume-thread`, `petra.ask`, `petra.inspect-context`, `petra.inspect-references`, `petra.preview-action`, `petra.invoke-action`, `petra.respond-interrupt`, `model.inspect-readiness`, `model.use`, `feedback.confirm`, `feedback.retry`, `feedback.dismiss`, `feedback.return`                                                                  | Agent remains persistent and owns requests and interrupts. Healthy model routing stays under the hood. Context, references, certification, and limitations are inspectable.                                           |
| Project definition          | `taxonomy.inspect-profile`, `taxonomy.bind-project`                                                                                                                                                                                                                                                                                                                   | Replace profile-picker presentation with Project-owned definition drafting and binding. Existing operation IDs remain compatibility names until the contract migration is complete. Definition detail is inspectable. |
| History                     | `history.list`, `history.filter`, `history.open`, `history.compare`, `history.impact`, `history.preview-revert`, `history.execute-revert`                                                                                                                                                                                                                             | History is an Inspect mode. Agent can request Revert; exact preview, impact, confirmation, receipt, and updated result remain visible.                                                                                |
| Settings                    | `settings.personal-change`, `settings.personal-reset`, `settings.inspect-project-control`, `settings.change-project-control`                                                                                                                                                                                                                                          | Personal preferences remain secondary. Governed Project controls are inspected in Settings and changed through an agent-mediated exact preview.                                                                       |
| Composition                 | `composition.list`, `composition.create`, `composition.open`, `composition.edit`, `composition.save`, `composition.ask-petra`, `composition.inspect-provenance`, `composition.inspect-findings`, `composition.compare`, `composition.restore`, `composition.validate`, `composition.render`, `composition.copy`, `composition.download`, `composition.promote-review` | Artifact work is primary in Workspace. Agent acts in exact passage, section, or artifact context. Save is durable and quiet; provenance, findings, and comparisons use Inspect.                                       |
| Definition capabilities     | `profile-tool.open`, `profile-tool.run`                                                                                                                                                                                                                                                                                                                               | Present registered capabilities only when the Project definition and current task make them relevant. They never become profile-branded global navigation.                                                            |
| Acceptance infrastructure   | `application.guide`, `application.reset`                                                                                                                                                                                                                                                                                                                              | Remove from customer navigation. Keep as test-harness operations. Product onboarding occurs through the Agent; fixture reset remains external acceptance infrastructure.                                              |

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

**Reopened — 2026-10-07.** The structural shell completed on 2026-09-22;
the requested visual and conversational interaction redesign remains open.

- Implement the desktop 30/70 shell and task-preserving responsive variant.
- Establish restrained tokens, typography, spacing, density, focus, motion, and
  component states around one hierarchy.
- Replace persistent module navigation with Project switching, workspace
  destinations, object links, and exact return.
- Provide the Agent, Workspace, Inspect, and interrupt component primitives.

### FE-A1.2 — Complete conversational zero/empty Project entry

**In progress — scope clarified on 2026-10-07.** The definition-draft,
atomic-create, and optional-file handoff mechanics completed on 2026-09-23.
Normal conversational entry before Project creation, no-evidence Q&A after
creation, intake restoration, and complete compositional definition resolution
remain required in FE-A1.2-W04 through W07.

- Add the definition-draft query and validated create command required by D018.
- Replace mandatory profile selection with the outcome-first entry.
- Keep examples optional and verify one scientific, one writing, and one
  unrelated Project through the same shell.
- Render limitations when a requested capability is unavailable.
- Carry optional initial files into the existing source and copy-rights review
  after atomic Project creation; file bytes remain browser-local until that
  review is submitted.

### FE-A1.3 — Consolidate control in the agent

**Reopened — 2026-10-07.** Control placement completed on 2026-09-23;
grounded conversational questions, follow-ups, and readable durable history
remain open.

- Route ask, objective framing, SuggestedActions, Work controls, required input,
  Review interrupts, approvals, recovery, and Revert requests through AgentRail.
- Keep detailed editing, reading, comparison, and Review in Workspace.
- Ensure direct and agent-mediated execution use the same operation identities.

### FE-A1.4 — Build the workspace renderer set

**Reopened — 2026-10-07.** The host, role registry, server place check,
direct-object selection, route focus restoration, and in-memory draft
continuity are live. Existing route-owned surfaces serve as the content
renderers under the common Workspace contract. Live Source, Work, and Review
flows verify task continuity. Conversation-driven Workspace updates and
discoverable graph interaction remain open; Artifact editing remains Wave 7 scope.

- Implement Outcome, Source, Review, Work, and Inspect renderers against current
  live contracts.
- Establish the Artifact renderer boundary that Wave 7 Composition completes.
- Preserve exact object, snapshot, selection, return, focus, and draft identity
  across renderer changes.

### FE-A1.5 — Integrate inspection

**In progress — 2026-09-29.** The single entry, exact selection, progressive
sections, targeted History read, exact Source and Work reads, Review and event
reads, retained Source and recent Work receipts, and exact return are live.
New-Source registration has an authenticated, actor-bound retained receipt read
verified after a full browser reload and independent of current command grants.
Work operation, Resume, and Start again receipts now have a bounded retained
read with exact Project, task, actor, receipt identity, and record-hash checks.
The live Resume receipt survived a fresh browser reload and remained available
in Inspect's Control and identity section, with an exact return to the task.
Each retained Work receipt now reveals its recorded actor and capability grant,
requested and resulting task revision, registration when present, and record
hash under an additional disclosure.
Complete material action inspection still requires durable receipt and policy
reads for the other owning operations.

- Add one Inspect entry to every material agent result and workspace object.
- Compose explanation, basis, control, graph, impact, History, and recovery from
  authoritative read models.
- Remove raw diagnostic payloads and duplicate standalone inspection routes from
  the ordinary experience.

### FE-A1.6 — Migrate and remove frontend debt

**In progress — 2026-09-29.** Source intake, reuse, processing start, and
uncertain-effect recovery use contextual Agent controls while the Workspace
retains the detailed source task. Shared shell copy now describes the Project
definition rather than making the optional registered profile the apparent
entry requirement. The Project collection opens a verified retained task from
its primary link; Work reconnect and replay, and eligible stale Review refresh,
are automatic. The Agent surfaces the server's open Review count. Acceptance
reset now appears only on the direct test guide. A draft that differs from the
certified role's registered question remains local and can be carried into an
explicit Objective revision review; no model request or authority change is
inferred from that draft. The Agent labels the composer as a registered question
and states this limit before a user edits it. General follow-up questions still
require a registered backend interaction path before the Agent can honestly
present them as supported. The retained Project-thread read exposes turn
metadata and exact Artifact references, not message bytes. The Agent labels
this limitation and links to all recorded entries when the recent four are
truncated. Restoring readable conversation content needs an authorized exact
text read.

- Reconcile every inventory operation against the presentation map.
- Remove permanent controls that are now automatic, contextual, inspect-only, or
  test-only.
- Remove scientific and controlled-writing terminology from shared shell copy.
- Delete or quarantine obsolete components after their mapped replacement passes.

### FE-A1.7 — Evaluate the product as a frontend

**In progress — 2026-09-29.** The structural Workspace browser run includes
keyboard focus and task return, narrow pane continuity, 200% text scale without
horizontal overflow at 420 px, and reduced-motion mode. The live Source and
Inspector task and both live Work panes now pass the same narrow 200% width check. Visual inspection
found and fixed text clipping in Inspect and a five-pixel overflow in the
Source heading. Review, Source, and Work desktop captures have also been
inspected and their hierarchy, state, and focus findings corrected. A bounded
[adversarial review](fe-a1/ADVERSARIAL-REVIEW.md) records observed authority,
dead-end, hidden-state, and width risks. Complete task and whole-product
adversarial evaluation remain.

- Run outcome-based tests through the complete interface, rather than one test
  per control.
- Conduct an adversarial design review for hierarchy, cognitive load, apparent
  authority, dead ends, hidden state, and graph inspectability.
- Conduct keyboard, focus, text-scale, responsive, reduced-motion, and non-color
  checks on the complete task.
- Require explicit user acceptance before Wave 7 resumes.

## Functional acceptance criteria

The milestone cannot exit on route coverage or automated element assertions
alone. These functional criteria remain binding; verification evidence attaches
to the granular implementation items. The sixteen optional scenario groupings
at the end of the implementation ledger are not additional release criteria.

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
- every required granular A1 item has completed prerequisites, satisfied
  functional criteria, and retained completion evidence;
- normal conversational empty entry, grounded Q&A/follow-ups, compositional
  object examination, reactive Workspace, progressive AG-UI disclosure, and
  graph-guided cyclic assessment, closure, and invalidation are implemented;
- the outcome-first Project creation path is live against a Project-owned
  definition;
- the complete 30/70 task passes visual, interaction, accessibility, adverse
  state, and recovery review;
- the old checkpoint is no longer the customer entry point; and
- the user explicitly accepts the new frontend.

`npm run gate:frontend-a1` checks this prerequisite before later-wave worker
execution, resume, extension, and acceptance. It intentionally fails while A1
is incomplete. Optional scenario completion is excluded from the gate.

Wave 7 then completes the 15 Composition operations inside the accepted
Artifact workspace. Wave 8 completes the four remaining governed Settings and
definition-capability operations and repeats whole-application validation. A
later wave cannot restore profile-gated entry, operation-led navigation, or a
graph-first default without revisiting D024.

<!-- A1-SYNC:START -->

## Controlling A1 execution

Binding: `sha256:3fbd1856dc40eedcaae104545afccda9e9d520b1d13e1e86e44af9373ffe33f2`. 13/90 required items complete; 77 incomplete.

D024 governs the conversational copilot and reactive Workspace. D025 governs synchronized execution and two distinct validation passes. The canonical [function ledger](../scripts/frontend-a1-work-inventory.json), [readable implementation ledger](FE-A1-CONTRACT-IMPLEMENTATION-LEDGER.md), and [granular execution instructions](../scripts/frontend-a1-execution.md) agree before work starts, evidence is recorded, completion is accepted, or another wave proceeds.

Active work: none; select one prerequisite-ready item.

| Stage   | Required behavior                                                          | Complete / required |
| ------- | -------------------------------------------------------------------------- | ------------------- |
| FE-A1.0 | Contract reconciliation and execution control                              | 6 / 6               |
| FE-A1.1 | Copilot shell and interaction design                                       | 1 / 7               |
| FE-A1.2 | Conversational zero/empty Project entry                                    | 1 / 7               |
| FE-A1.3 | Durable grounded conversation and AG-UI                                    | 4 / 18              |
| FE-A1.4 | Reactive Workspace, compositional examination and cyclic graph-guided work | 0 / 23              |
| FE-A1.5 | Progressive inspection and complete authority receipts                     | 0 / 9               |
| FE-A1.6 | Complete migration and operation conformance                               | 1 / 7               |
| FE-A1.7 | Functional verification and explicit user acceptance                       | 0 / 13              |

Select one prerequisite-ready item. Execute every criterion with proper tests; then challenge the delivered behavior in a separate critical pass with distinct tests. Repair findings when needed. Two unsuccessful attempts require broad diagnosis before more local retries. Preserve earlier partial evidence. The sixteen late scenarios are optional; browser semantics are required and native screen-reader evaluation remains excluded. Wave 7/8 stay blocked until all required functions pass and the user accepts the exact candidate.

<!-- A1-SYNC:END -->
