# Petra UX writing and interaction audit protocol

Status: accepted cross-module protocol
Accepted: 2026-09-02
First application: `UX1.1 — research shell, navigation, and synchronized selection`

## Purpose

Petra treats words and interactions as part of the scientific interface. A label can be readable and still name the wrong object. A control can look polished and still obscure its authority, consequence, or recovery path. Every module therefore documents and audits:

1. the terminology a researcher sees;
2. the complete paths a researcher can take;
3. the system feedback and scientific effect at each step;
4. the controls for leaving, cancelling, undoing, reverting, or recovering;
5. conformance with D006, the owning object and command contracts, accessibility requirements, and Nielsen's ten usability heuristics.

The protocol applies to direct controls and assistant-mediated actions. Both must resolve to the same Petra object, command, authority boundary, and result.

## Authority order

An audit resolves terminology and behavior in this order:

1. `PETRA.md` and accepted decisions;
2. Petra's graph, query, command, event, and view-model contracts;
3. the implementation roadmap's shipped capability;
4. the design roadmap and this protocol;
5. current interface copy and prototypes.

Friendly copy cannot broaden a capability or soften a material limit. Existing interface wording is evidence to review, not authority.

## Required module artifacts

Each module maintains five small, linked artifacts. They may live in one report when that is easier to review.

| Artifact | Required content |
| --- | --- |
| Task and object frame | Researcher, task, primary object, starting state, intended outcome, authority boundary, and explicit non-goals |
| Terminology ledger | Canonical term, user-facing term, concise definition, allowed variants, prohibited conflations, owning source, and surfaces using it |
| Interaction pattern register | Pattern, trigger, preconditions, feedback, completion, cancellation or reversal, focus behavior, accessibility behavior, and adverse states |
| Path registry | A complete user path from entry through result and recovery, including every material branch and commit point |
| Audit register | Finding, location, evidence, consequence, affected heuristic or contract, severity, disposition, owner or gate, and verification result |

Screenshots do not replace these artifacts. A screen cannot show what happens after failure, reconnect, cancellation, stale projection, or a consequential command.

## UX writing standard

### Name the researcher's object

- Use the canonical Petra name when it is also the clearest researcher-facing term: Project, Research Question, Hypothesis, Claim, Paper, Experiment, and Draft.
- Introduce a technical distinction when it changes what the researcher can conclude or do. For example, distinguish a Paper from the exact version Petra read.
- Keep internal identifiers available for verification without making them the primary label.
- Use `H12 — descriptor` on the first Hypothesis mention in each assistant turn, as required by D006.
- Do not alternate terms for variety. A changed term implies a changed concept until the interface proves otherwise.

### Preserve scientific force and origin

- Attribute source statements to their authors.
- Say that Petra extracted a proposal when the statement is not authoritative.
- Reserve `applied` for a completed authoritative change.
- Distinguish support, contradiction, qualification, failed replication, citation, and derivation.
- Do not convert a citation into support, a failed run into counterevidence, or trusted membership into truth.
- Keep abstract-only, partial-text, stale, superseded, and projection-lag limits next to the affected content or action.

### Make controls predict outcomes

- Begin action labels with a concrete verb and name the object when ambiguity or consequence warrants it.
- Use navigation labels for destinations and button labels for actions.
- Use `Show` and `Hide` for visibility; use `Expand` and `Collapse` only for disclosure within the same region.
- Use `Cancel` for stopping an uncommitted interaction, `Stop` for ending a stream or local process, and `Cancel work` only for a durable WorkUnit command.
- Use `Revert` only for a compensating, history-preserving authoritative action. Do not label it `Undo` unless the state truly returns through a local reversible operation.
- Use `Save` or `Apply` only when the interface has a distinct commit. If a setting takes effect immediately, say so and provide a reliable reset or reversal.
- Avoid generic labels such as `Done`, `Continue`, `Yes`, `No`, `Fix`, or `Try again` when the result is not already evident from context.

### Write state, empty, unavailable, and error messages

| Message | Required content |
| --- | --- |
| Status | What is happening, which object or work it affects, and whether the view is current, cached, running, stale, or authoritative |
| Empty state | What is absent, whether that absence is expected or limiting, and the next useful action if one exists |
| Unavailable action | Why the action is unavailable and the prerequisite or policy that would make it available |
| Confirmation | The exact requested action, affected object or scope, material consequence, and whether it can be reversed |
| Error | What happened, what was preserved or not changed, and a concrete recovery action |
| Completion | What actually completed, its authoritative effect, and any projection or follow-up state still pending |

Error language is plain and local to the failure. It does not blame the researcher, use humor to hide the problem, or expose an internal error code as the explanation. Diagnostic detail may remain available through disclosure or copy controls.

### Separate product and development language

The product frame must not contain fixture names, roadmap IDs, module status, implementation notes, contract caveats intended for developers, or statements about what a calibration slice is testing. Fixture routes may expose that information in a clearly separate review overlay or evidence panel outside the application frame.

## Terminology ledger schema

Every material term uses this shape:

| Field | Meaning |
| --- | --- |
| Canonical term | Petra object, state, action, or relationship name |
| User-facing term | Label used in the interface |
| Definition | What the term means in the current task |
| Allowed short form | Compact form that preserves recognition |
| Do not use for | Nearby concepts this term must not absorb |
| Authority source | Decision, graph model, runtime contract, or accepted UX record |
| Surfaces | Locations where the term appears |
| Verification state | Proposed, accepted, or needs researcher validation |

Terminology findings are consequential when wording can change scientific interpretation, make a proposal look authoritative, hide a limitation, imply an unsupported capability, or cause the wrong action.

## Interaction pattern register

Each reusable pattern records:

| Field | Required answer |
| --- | --- |
| Pattern ID and name | Stable identifier and researcher-facing description |
| Purpose | The job this interaction performs |
| Trigger | Control, gesture, shortcut, route, assistant proposal, or system event |
| Preconditions | Required selection, capability, policy, connectivity, or state |
| Immediate feedback | What changes within the first perceptible response |
| Persistent effect | Local presentation state, durable work, proposed state, or authoritative mutation |
| Commit point | The exact step after which a consequence occurs |
| Exit and control | Close, back, cancel, stop, detach, reconnect, resume, reset, undo, or revert behavior |
| Preservation | Selection, input, edits, scroll, work, and object identity retained across the path |
| Focus and keyboard | Entry focus, order, shortcuts, trapping, return focus, and announcement |
| Pointer and touch | Target, drag, alternative control, capture, and cancellation behavior |
| Adverse states | Missing, unavailable, stale, slow, offline, interrupted, failed, superseded, or conflicting states |
| Recovery | A bounded action that does not repeat or broaden the original consequence unexpectedly |
| Language | Control label, progress, result, warning, confirmation, and error copy |
| Evidence | Test, recording, accessibility result, and audit disposition |

## Complete path specification

A path is more than a screen-to-screen diagram. It records:

```text
entry state
  -> visible choices and preconditions
  -> user intent
  -> immediate system acknowledgment
  -> optional review or preview
  -> explicit commit point, if any
  -> progress and interruption behavior
  -> completed result and authority effect
  -> projection or downstream state
  -> return path

branch from every material step
  -> cancel, back, unavailable, stale, conflict, failure, reconnect, or recovery
```

Every path names the active Project, snapshot, selected object, affected WorkUnit or ChangeSet, and preserved local work when those concepts apply. Route, panel, graph, table, Details, and assistant representations must keep one canonical object identity.

## Control and authority audit

For every material action, verify:

1. the control describes the user's outcome rather than the implementation mechanism;
2. the active object and scope are visible before commitment;
3. the interface distinguishes local view state, conversation state, proposed state, durable work, authoritative state, and derived projection state;
4. a direct action and assistant-mediated action use the same command and consequence;
5. consequential changes expose a preview or sufficiently specific confirmation;
6. routine reversible actions avoid unnecessary confirmation;
7. cancellation and stream control do not imply each other;
8. double activation, reconnect, replay, and retry cannot duplicate a command or apply a ChangeSet twice;
9. completion copy reports what occurred rather than what was intended;
10. failure copy states what Petra preserved and offers a bounded recovery action;
11. unavailable controls expose the reason and prerequisite without appearing enabled;
12. the user can return to the prior object and task without reconstructing context from memory.

## Nielsen heuristic audit

Petra uses the [Nielsen Norman Group's ten usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) as broad evaluation principles, not as a replacement for requirements or user research. NN/g's [heuristic-evaluation guidance](https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/) explicitly describes the method as useful for finding likely usability problems while cautioning that it does not replace testing with actual users.

| ID | Heuristic | Petra audit question |
| --- | --- | --- |
| `NN-H01` | Visibility of system status | Can the researcher see the current object, snapshot, projection freshness, active work, progress, result, and authoritative effect soon enough to choose the next action? |
| `NN-H02` | Match between system and the real world | Do terms, order, and controls match research practice without requiring knowledge of Petra's storage, graph, event, or agent implementation? |
| `NN-H03` | User control and freedom | Can the researcher leave, cancel, stop, detach, resume, reset, or revert at the correct boundary without losing unrelated work? |
| `NN-H04` | Consistency and standards | Do the same words, icons, placements, shortcuts, and interaction types mean the same thing across direct and assistant surfaces, while following platform conventions? |
| `NN-H05` | Error prevention | Do constraints, defaults, previews, scope summaries, and confirmations prevent high-cost scientific or destructive mistakes before commitment? |
| `NN-H06` | Recognition rather than recall | Are the active object, descriptor, scope, provenance, available actions, prior choice, and recovery options visible when needed? |
| `NN-H07` | Flexibility and efficiency of use | Do frequent and expert paths support keyboard use, shortcuts, batch operations, saved views, and progressive disclosure without hiding the safe novice path? |
| `NN-H08` | Aesthetic and minimalist design | Does every visible element support orientation, evidence, action, status, or recovery, with secondary detail available on demand? |
| `NN-H09` | Recognize, diagnose, and recover from errors | Does an error identify the affected task in plain language, distinguish its effect from preserved state, and offer a specific recovery? |
| `NN-H10` | Help and documentation | Is concise, task-focused help available at the point of need, with searchable deeper guidance for complex scientific distinctions? |

For consequential actions, confirmations must name the concrete effect rather than ask a generic “Are you sure?” question. This follows NN/g's [confirmation-dialog guidance](https://www.nngroup.com/articles/confirmation-dialog/). Error reviews also apply NN/g's guidance to keep messages visible, human-readable, precise, constructive, and close to the source of failure ([Error-Message Guidelines](https://www.nngroup.com/articles/error-message-guidelines/)).

## Finding severity and disposition

Severity follows consequence rather than visual prominence.

| Severity | Consequence | Gate effect |
| --- | --- | --- |
| Critical | Can cause an unauthorized or duplicate mutation, destructive loss, unsupported scientific trust, or an unrecoverable action | Blocks prototype use beyond isolated evaluation and blocks validation |
| Major | Can cause the wrong object, scope, decision, command, or recovery path; can conceal material provenance or state | Blocks module validation |
| Moderate | Creates avoidable delay, memory burden, repeated navigation, ambiguous status, or material accessibility friction | Must be fixed or assigned to a named gate before validation |
| Minor | Local consistency or polish issue with no likely wrong action or scientific misread | May enter the design-debt register with an owner and trigger |

Every finding receives one disposition: `fix now`, `fix in named module`, `needs contract`, `needs researcher validation`, `accepted exception`, or `not a defect`. Accepted exceptions state their evidence and revisit trigger.

## Audit cadence

1. **Before design:** build the initial terminology ledger and task path from accepted decisions and contracts.
2. **During the primitive review:** verify labels, states, focus, cancellation, and error behavior independently of module layout.
3. **During the module review:** walk ordinary, dense, empty, limited, running, stale, failed, and recovery fixtures.
4. **Before integration:** compare the fixture path with the live query, command, event, identity, and authority boundaries.
5. **Before validation:** run the heuristic audit, accessibility checks, language fixtures, and task evaluation; resolve or disposition every finding.
6. **After a consequential change:** rerun the affected paths and any cross-module path that consumes the changed term, control, object, or event.

## Completion rule

A module is not language- or interaction-complete because its visible strings have been polished. It is complete only when:

- every material term has a verified meaning and stable use;
- every material interaction has a documented successful, adverse, cancellation, and recovery path;
- user-facing copy accurately describes the underlying object, authority, consequence, and state;
- direct and assistant-mediated routes are semantically identical where they perform the same action;
- no unresolved critical or major audit finding remains;
- task testing confirms or corrects the heuristic review's assumptions.
