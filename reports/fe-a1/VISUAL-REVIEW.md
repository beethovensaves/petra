# FE-A1 visual review

This record covers live Chromium captures from the current Agent–Workspace
adaptation. Each screen used production React routes and authenticated HTTP
against disposable services. It is a focused design review, not the milestone's
complete user acceptance.

| Screen | Capture | Finding and disposition |
| --- | --- | --- |
| Review queue | [Desktop](screenshots/review-queue-desktop.png) | The decision count and Agent's open Review count had incorrect plural grammar, and each row exposed an authority event/stream label. Counts now read correctly; the queue keeps the title, accountable author, state, and decision link in focus. |
| Review detail | [Desktop](screenshots/review-detail-desktop.png) | A passing validation used a red failure banner, and the raw Review identity and snapshot occupied the default heading. Validation now reflects its actual state; exact record fields are available on demand. The Agent shows the decision consequence concisely, with the full boundary and optional deferral reason behind keyboard accessible disclosures. A visible jump moves keyboard focus to the decision group above the persistent composer. |
| Source reader | [Desktop](screenshots/source-desktop.png), [200% narrow](screenshots/source-mobile-200.png) | Raw ProjectSource and copy identities filled the side panel before user-relevant rights and use. Record and copy identity are now on demand, while revision, creator, rights, role, and downstream use stay visible. |
| Source Inspect | [Desktop](screenshots/source-inspect-desktop.png), [narrow screen](screenshots/source-inspect-mobile.png) | Exact Source selection, processing extent, limits, and return stay in one Inspect view. The narrow view was checked at 200% text scale for horizontal overflow in the live browser trace. |
| Work collection | [Desktop](screenshots/work-collection-desktop.png) | Work tasks now precede inquiry paths, so the current queue is visible before optional Project framing. The Agent labels the registered-question limit and exposes the retained thread's message-text limit. |
| Work task | [Desktop](screenshots/work-checkpoint-desktop.png), [execution controls](screenshots/work-controls-jump-desktop.png) | A long registered task title overwhelmed the default heading and pushed the eligible Resume action below the fixed composer. The heading is smaller, exact record fields and the assessment are on demand, and a keyboard-reachable jump brings the eligible action into view. Unavailable execution actions and their reasons are disclosed separately. The steering form now uses one column so its priority field fits the 30% Agent pane. |
| Work Inspect | [Desktop](screenshots/work-inspect-desktop.png) | The exact Work selection, current execution, server control assessment, and return stay in one Inspect view. The Work route now refreshes its owning state after an applied command, so Inspect and Workspace agree after retry and Resume. |

The Review workflow result is
[`FRONTEND-LIVE-REVIEW-BROWSER.json`](../FRONTEND-LIVE-REVIEW-BROWSER.json).
The Source and Inspect result is
[`FRONTEND-LIVE-SOURCES-BROWSER.json`](../FRONTEND-LIVE-SOURCES-BROWSER.json).
The Work result is
[`FRONTEND-LIVE-WORK-BROWSER.json`](../FRONTEND-LIVE-WORK-BROWSER.json).
The remaining full-task, general-question, durable action-inspection, and user
acceptance gates are tracked in the
[FE-A1 milestone](../FRONTEND-ADAPTATION-MILESTONE.md).
