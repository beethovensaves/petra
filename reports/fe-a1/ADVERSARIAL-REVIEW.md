# FE-A1 adversarial frontend review

Reviewed 2026-09-29 against the live [Review](screenshots/review-detail-desktop.png),
[Source](screenshots/source-desktop.png), [Work](screenshots/work-checkpoint-desktop.png),
[Work controls](screenshots/work-controls-jump-desktop.png), and
[Inspect](screenshots/work-inspect-desktop.png) captures, the production browser
traces, and the FE-A1 exit contract. This is a bounded review of the exercised
tasks, not whole-product acceptance.

| Challenge | Observed result | Remaining risk |
| --- | --- | --- |
| Can a user find the next action without reading an operation inventory? | Source processing enters through Agent, Review has one decision jump, and eligible Work execution leads its controls. Work tasks now precede optional inquiry paths. | The complete outcome-first journey has not been recorded in one session. |
| Could a passing check look like approval or scientific truth? | Review validation uses a success state but explicitly says it does not approve the candidate or establish truth. The model answer labels its limits and has no Project authority effect. | The same apparent-authority challenge must be repeated across every material Agent result. |
| Does the UI hide unavailable actions or create a dead end? | Work keeps unavailable commands and reasons in an on-demand disclosure. Its available Resume action remains keyboard reachable above the persistent composer. | A freeform Agent question outside the one registered prompt still cannot be sent; Objective review is a disclosed route, not a general conversational answer. |
| Can the user recover exact state after navigation or delivery loss? | Source and Work receipts survive reload; Work route refreshes after applied commands; retained Work receipts use an authenticated exact read; provider-free model failure replays without a duplicate effect. | The successful provider run was not replayed from a fresh browser. |
| Can a user inspect why an action or result exists? | Selected Source, Work, Review, and History reads have one Inspect destination with exact return. History exposes actor, grant, command fingerprint, impact, and recovery. | Durable receipt and policy composition for the other owning operations is incomplete. |
| Does the split layout preserve controls at constrained width? | Source, Inspect, and both live Work panes fit 420 px at 200% text; Work steering fits its 30% Agent pane; the structural shell preserves task and focus while panes switch. | Whole-task keyboard, forced-colors, and reduced-motion checks have not been completed across every step. |

The current failure conditions are tracked in the
[FE-A1 milestone](../FRONTEND-ADAPTATION-MILESTONE.md). The 116-operation map
audit validates the mapping and primary-operation count; it does not establish
runtime conformance for the 97 live operations.
