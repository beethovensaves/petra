# Automated Wave 6 handoff

This packet delivers Petra's first user-testable application milestone. It
implements `UX1.6`, integrates the accepted `UX1.1`–`UX1.6` experience, and
closes every core operation assigned to milestone 6 in
`scripts/ui-operation-inventory.json`. Engineering evidence screens, fixture
galleries, isolated routes, and unavailable controls do not satisfy this wave.

## Outcome

The authoritative exit gate is:

> A person can open one stable Petra URL, create or reset a representative
> Project with a registered profile, understand its taxonomy, ask a certified
> model for grounded help, start and manage durable Work, inspect sources and
> relationships, correct and decide a Review, inspect History and recovery, and
> return to the originating task through one coherent application UI.

The wave must end in `needs_user`. Automated workers cannot declare it complete.
After every executed evidence record passes, the user performs the guided live
workflow and explicitly accepts or rejects `USER-TESTABLE-01`.

## Binding delivery rules

- The 116-entry atomic UI-operation inventory is the delivery ledger. Wave 6 cannot
  exit while any operation with `milestone <= 6` is not `live` or lacks executed
  evidence.
- DB18's 14 surfaces, 18 flows, four end-to-end paths, and 23 runtime requests
  remain the contract source. The inventory makes their user operations
  enforceable; it does not weaken them.
- A route is not an operation. A control is not live unless it reaches the
  registered production query or command and renders its material outcomes,
  recovery, and exact return.
- A disabled control required by milestone 6 is a failing gate. Explainable
  unavailability remains correct during implementation but cannot satisfy exit.
- Direct and Petra-mediated variants use the same server-owned identity,
  authorization, command, and result. Model prose never becomes a command.
- The test environment uses one stable URL, starts from a clean documented
  command, supports reset to representative state, and remains active until the
  tester stops it.
- The primary UI uses task language and progressive disclosure. Schema names,
  hashes, raw records, and diagnostic payloads may be available in technical
  details but cannot carry the main hierarchy or instructions.
- Felicity reviews labels, instructions, status, results, errors, and recovery
  language. A separate product-design review covers hierarchy, navigation,
  interaction, density, typography, spacing, responsive behavior, and visual
  coherence.
- Native screen-reader evaluation is outside this wave by user direction.
  Keyboard, focus, landmarks, browser semantics, text reflow, non-color meaning,
  reduced motion, and touch targets remain required.

## Usable taxonomy gate

The Project profile must be an operational product boundary rather than a label.
The application must let a person:

1. choose a registered profile while creating or resetting a Project;
2. inspect its purpose, object kinds, relationship meanings, source roles,
   validators, Work families, model roles, Review destinations, terminology,
   supported places, and unavailable operations;
3. see those terms and permitted actions used consistently in Brief, Sources,
   Review, Graph, Work, Petra, Details, History, and Settings;
4. distinguish scientific and controlled-writing profiles without changing
   Petra's shared authority and interaction grammar; and
5. encounter a safe, useful unsupported-profile state without client-invented
   labels, commands, or fallback semantics.

## Usable model gate

At least one certified model role must be usable from the production Petra UI.
The executed path must show readiness and selected role, submit an actual prompt
from exact Project context, stream or return the response, expose origin, force,
references, limitations, Work and Review effects, survive disconnect/replay,
and present provider/model failure without losing the draft or implying domain
authority. A historical call, mocked response, disabled Send button, direct
backend invocation, or hidden developer harness does not satisfy this gate.

## Usable application gate

The guided checkpoint must cover this task sequence on the stable URL:

1. create or reset a Project and confirm its profile vocabulary;
2. use Brief to understand the current focus, attention item, and next action;
3. ask Petra a grounded question and inspect its basis;
4. start Work, inspect meaningful stages, answer required input, detach and
   reconnect, and exercise one cancel or retry recovery path;
5. inspect an exact source and the bounded Graph/text peer without losing task
   or selection;
6. correct or revise a Review member, reject or defer where appropriate,
   prepare and apply one exact ChangeSet, and observe projection state;
7. inspect the resulting History episode and one recovery or governed Revert
   preview; and
8. return to the updated Brief with the same Project and task context.

The in-product guide names the purpose, starting state, actions, expected
outcomes, safe optional mutations, reset action, and known limits. The tester
must not need repository reports or opaque identifiers to understand the task.

## Slices 1–20: application and operation delivery

1. **Backend — operation and contract baseline.** Reconcile the 97 Wave 6
   operations against production queries, commands, authorization, persistence,
   recovery, and `UX-REQ-001`–`016`, `020`–`023`. Record every missing owner.
2. **Design — task and visual baseline.** Critique the live product as a person
   performing the guided path. Establish the cohesive hierarchy and remove the
   reference-surface presentation from the primary workflow.
3. **Backend — registered profile runtime.** Complete Project creation/reset,
   profile selection, versioned taxonomy reads, safe unsupported behavior, and
   paired-profile fixtures through production owners.
4. **Design — usable taxonomy UI.** Implement profile selection and an
   inspectable taxonomy presentation; apply its terminology and operation
   availability consistently across core places.
5. **Backend — certified model readiness.** Expose actual certified model-role
   readiness, provider status, exact context binding, and a live interaction
   command suitable for the Petra surface.
6. **Design — model and Petra interaction.** Replace the disabled composer with
   the live path, including draft preservation, progress, references,
   limitations, model failure, and exact return.
7. **Backend — Work operations.** Complete composed Work reads plus start,
   required input, steering/priority, detach/reconnect, replay, cancel, retry,
   resume/start-again assessment, and result destinations.
8. **Design — first user-testable checkpoint.** Deliver the stable URL,
   resettable representative Project, in-product task guide, and usable Work
   controls. Record the checkpoint; do not claim Wave completion.
9. **Backend — Project and source operations.** Complete Project recovery,
   source registration/reuse, processing, new-revision addition, Project-link
   removal, eligible local-copy deletion, and their distinct recovery results.
10. **Design — Projects, Brief, and Sources.** Make creation, orientation,
    attention, change, next action, source registration, exact inspection, and
    return understandable without diagnostic records.
11. **Backend — Review operation completion.** Complete reject and any missing
    correction, separation, refresh, defer/reopen, Apply, and recovery command
    composition with exact member outcomes.
12. **Design — Review task completion.** Integrate every Review decision into
    one exception-led task, with usable comparison, basis, consequences,
    decision, feedback, focus, and return.
13. **Backend — interaction parity.** Prove direct and Petra-mediated Project,
    Work, source, graph, Review, and History actions reach the same command
    owners and cannot be inferred from model text.
14. **Design — Graph, Details, and contextual return.** Finish expansion,
    filtering, saved questions, Details, source inspection, correction preview,
    textual parity, and exact task return inside the cohesive shell.
15. **Backend — History and recovery composition.** Complete canonical effect,
    preservation, eligible action, member outcome, and return reads for every
    guided-path failure and mutation.
16. **Design — History, feedback, and personal settings.** Make outcomes,
    recovery, personal settings persistence/reset, and transient feedback usable
    in the same application grammar.
17. **Backend — live clean-start trace.** Start from empty disposable stores,
    seed only through supported setup commands, execute the core path with an
    actual certified model, restart services, and verify retained identity and
    no duplicate effect.
18. **Design — task-based browser trace.** Execute the guided workflow through
    production routes at the stable URL; retain visual, interaction, focus,
    responsive, language, and recovery observations.
19. **Backend — adversarial authority and operation audit.** Challenge every
    Wave 6 operation for client authority, model authority, stale identity,
    duplicate effects, hidden commands, fake readiness, and incomplete recovery.
20. **Design — mandatory operation inventory audit.** Reconcile all 97 Wave 6
    entries, evidence commands, controls, outcomes, visual findings, and copy.
    Run Felicity and product-design review. Reserve the remaining slices for
    actual remediation.

## Slices 21–64: integration, remediation, and acceptance reserve

21. **Backend — first inventory remediation.** Fix the highest-severity
    contract, taxonomy, model, Work, or operation gap from item 20.
22. **Design — first inventory remediation.** Fix the highest-severity task,
    hierarchy, visual, interaction, responsive, or language gap.
23. **Backend — second remediation and clean-start replay.** Address remaining
    production command, persistence, restart, or model-path findings.
24. **Design — second remediation and guided replay.** Re-run the complete
    guided path and address remaining product-design findings.
25. **Backend — core operation gate.** Run
    `npm run gate:wave6:user-testable`; fix backend-owned failures only.
26. **Design — core operation gate.** Run the same gate and fix UI-owned
    failures, attaching executed evidence to every live operation.
27. **Backend — paired-profile and unknown-profile audit.** Prove usable
    taxonomy and shared command semantics without scientific hard-coding.
28. **Design — visual and interaction audit.** Review the final application at
    supported widths and text scales; fix any slide-like hierarchy, dead control,
    hidden instruction, broken return, or inconsistent state language.
29. **Backend — final critic gate.** Run complete tests, fresh-store services,
    actual model interaction, restart/replay, and operation evidence audit.
30. **Design — final browser and language recording.** Record the stable URL and
    guided task against the final integrated tree with no fixture or diagnostic
    fallback; complete Felicity and product-design dispositions here.
31. **Backend — exit reconciliation.** Confirm every non-user evidence record,
    clean pushed branches, reproducible startup/reset, and no missing Wave 6
    operation. Do not declare completion.
32. **Design — first complete checkpoint attempt.** Re-run the final integrated
    evidence without editing either branch. Return `needs_user` only when every
    automated requirement has passed; otherwise hand off the exact remaining
    defect.

Slices 33–63 repeat the backend/design remediation, clean-start, guided-browser,
critic, and cumulative-gate cycle in severity order. The controller may reach
the user checkpoint as soon as all automated evidence passes; the extra budget
is a guard against stopping on an anticipated conflict or failed first pass, not
a target. Slice 64 is the final safety boundary. If evidence still remains, the
wave stops as incomplete and cannot claim acceptance.

## Stop rules

- Do not substitute fixtures, reports, screenshots, JSON, or a browser test for
  an operable product path.
- Do not defer a Wave 6 inventory entry to Wave 7 or 8 without explicit user
  approval and an amended inventory.
- If the actual certified model cannot be used through the UI, return blocked;
  do not replace it with historical evidence.
- If the stable URL or reset path is unavailable, return blocked.
- Only when the user-owned acceptance record is the sole remaining item, return
  `needs_user` with
  the URL, starting state, guide, known limits, and reset instructions.
