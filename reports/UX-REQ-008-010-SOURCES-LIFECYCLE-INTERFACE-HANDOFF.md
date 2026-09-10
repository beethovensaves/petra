# UX-REQ-008/009/010 Sources lifecycle interface handoff

Status: frozen-surface integration specified; implemented command authority is
ready for one actor-scoped read composition and frontend connection
Date: 2026-09-10
Design baseline: `UX-DESIGN-FREEZE-01` at `655d094`
Implementation baseline: `main` at `29f26f9`

## Result

Project-source lifecycle and replacement controls belong to the existing
**Details** region of the existing Sources reader. They do not add a navigation
item, collection mode, route, page, drawer, action sheet, visual vocabulary, or
new authority path.

The existing collection-row **Inspect** link remains the entry from Sources.
The existing `SourceDetails` component receives one **Project use** action group
immediately after `dl.reference-detail-list`, following **Downstream use** and
before the `aside.reference-details` element closes. This is the already frozen
`DB18-SP12` **permitted actions** slot. It contains lifecycle position,
replacement position, the applicable controls, and a disabled **Delete local
copy** control with its reason.

Each enabled control opens the existing `PetraDialog` transient-action pattern
from `DB18-SP14`. The dialog owns preview, required reason or rationale,
confirmation, pending feedback, receipt, error, and recovery. It closes back to
the exact invoking control when that control still exists. A successful state
change that removes the invoking control returns focus to the stable **Project
use** heading after the receipt closes.

The four user-facing actions and their existing backend commands are:

| User-facing action | Command |
| --- | --- |
| **Remove from Project** | `ExcludeProjectSource` |
| **Restore to Project** | `RestoreProjectSource` |
| **Create replacement** | `CreateProjectSourceReplacement` |
| **Retract replacement** | `RetractProjectSourceReplacement` |

Physical deletion remains unavailable. No lifecycle or replacement action
deletes canonical identity, immutable source revisions, Artifacts, parsed
representations, exact locations, dependents, events, receipts, provenance, or
history.

## Frozen surface placement

### Sources collection

The collection keeps its current row structure and trailing **Inspect** link.
Its existing Project-role/status text may state **Excluded from current Project
use** when the typed source binding is excluded. An excluded predecessor remains
inspectable in the same collection; Petra does not hide it merely because it is
excluded.

The collection does not receive row-level mutation buttons or an overflow menu.
This prevents a compact row from carrying a consequential action without the
identity, dependency, retention, and replacement context already present in
Details. A superseded deep link continues to resolve through UX-REQ-008, but
opening it shows the requested predecessor and its replacement position; it
does not silently redirect to the successor.

### Source reader and Details

The existing reader header continues to own source descriptor, selected
revision, Project role, inspection extent, and location. Reader content remains
primary. The existing Details column or stacked section keeps identity, copy,
creator, rights, Project role, and downstream use.

The new content occupies this exact existing slot:

```text
aside.reference-details
  existing Details heading and extent
  existing dl.reference-detail-list
    ...
    Project role
    Downstream use
  Project use                    <- existing DB18-SP12 permitted-actions slot
    current lifecycle position
    current replacement position
    eligible or unavailable controls
    Delete local copy — unavailable
```

**Project use** is a heading, not another page or tab. Current position is
written in text and does not rely on color:

- **Active in this Project**;
- **Excluded from new Project use**;
- **Replaced by _successor_** with exact successor inspection;
- **Replaces _predecessor_** for each permitted incoming relation; or
- **Position unavailable** with the server-provided safe reason.

The active outgoing replacement belongs to the excluded predecessor. Its
**Retract replacement** control appears in that predecessor's Project-use group.
An active successor may list permitted incoming **Replaces** relationships and
link to each predecessor, but it does not duplicate a relation-level retraction
control without first establishing which exact relation the author selected.

### Transient preview and receipt

`PetraDialog` remains subordinate to the reader. The preview order is fixed:

1. exact action, Project, source descriptor, and current revision/status;
2. the material consequence in ordinary language;
3. exact predecessor, successor, or active relationship when applicable;
4. affected registered dependents with totals and coverage;
5. retained identity, material, provenance, and history;
6. declared omissions or unsupported dependency adapters;
7. required **Reason** or **Rationale** input; and
8. **Cancel** followed by the exact confirmation verb.

Technical IDs, revisions, hashes, event positions, and record coverage remain
available under **Technical details** in the same dialog. They do not displace
the consequence or become the confirmation label.

## Required read composition

The browser cannot safely enable these controls from the current reads alone:

- `project-source-view@1.0.0` supplies typed active/excluded status, but the
  current `SourceRecord` adapter flattens it into display text and omits the
  exact ProjectSource record hash;
- `project-source-lifecycle-view@1.0.0` supplies exact source position, impact,
  retention, and authority position for exclude, restore, and delete intent,
  but its `operation` is always `unavailable` and does not represent current
  Actor capability or the active-replacement restore guard;
- semantic location exposes an active successor chain, but not the exact
  replacement relation required for retraction; and
- the lifecycle command response does not expose the stored record hash needed
  to form `exclusion_receipt_ref` for later replacement creation.

Before the frontend enables any of the four commands, the backend must expose an
authenticated, Project-scoped read composition under UX-REQ-008/009/010. It may
version the current lifecycle view or add the following preferred companion;
neither choice adds a browser surface.

The preferred minimal transport is:

`GET /api/queries/projects/:projectId/sources/:projectSourceId/lifecycle-control`

It returns `petra.project-source-lifecycle-control-view@1.0.0` and accepts these
strict query parameters:

| Parameter | Rule |
| --- | --- |
| `requested_action` | Required exactly once: `exclude_project_source`, `restore_project_source`, `create_project_source_replacement`, `retract_project_source_replacement`, or `delete_local_copy` |
| `replacement_source_id` | Required only for create preview; forbidden for every other action |
| `project_source_replacement_id` | Required only for retract preview; forbidden for every other action |

Unknown or repeated parameters fail closed. The response must provide, in one
coherent read position:

- the requested and exact current ProjectSource references, including revision,
  content hash, record hash, and active/excluded status;
- current, historical, or superseded resolution and the permitted current
  successor without replacing the requested identity;
- the active outgoing replacement, if any, including exact replacement ID,
  revision, content hash, record hash, active state, kind, rationale,
  predecessor, successor, and exact exclusion-receipt reference;
- permitted incoming replacement summaries for the selected active successor;
- for replacement creation, the exact selected active successor and the exact
  exclusion receipt that established the predecessor's current excluded
  revision;
- the existing lifecycle impact groups, totals, returned counts, coverage,
  retained effects, seven retention outcomes, and limitations where applicable;
- Actor-scoped action state for each applicable command: `ready`, `blocked`,
  `forbidden`, `unavailable`, or `not_applicable`, with a stable reason code,
  safe message, and required next action when one exists;
- exact command name and expected references that the browser must return
  unchanged after confirmation; and
- read time, event position, and stream revision.

Replacement creation preview accepts one candidate `project_source_id` from the
existing Project source collection. Replacement retraction preview accepts one
exact active replacement ID. Unknown, repeated, or action-inapplicable inputs
fail closed. The server derives Actor, grant, Project, correlation, and
submission metadata as it does for the implemented command routes.

The read is guidance and preflight, not mutation authority. Every command
revalidates the grant, exact refs, status, relation head, exclusion receipt,
cycle/depth rules, and stored hashes inside its existing serializable command
transaction. The component never parses a human label to determine state and
never constructs a missing hash, receipt, replacement, or eligibility fact.

## Action contracts

### Exclude: **Remove from Project**

**Entry conditions**

- Details represents the exact current ProjectSource revision requested by the
  author, rather than a historical revision or silently followed successor.
- Its current typed status is `active`.
- The actor-scoped action state for `ExcludeProjectSource` is `ready`.
- No earlier attempt for this control has an unknown effect.

Historical, stale, missing, unauthorized, or unsupported resolution does not
enable the control. If the selected source participates as a current replacement
successor or another backend rule constrains exclusion, the server returns the
applicable blocked state; the client does not infer the dependency.

**Preview and confirmation**

Title: **Remove “{source title}” from this Project?**

The first consequence sentence is:

> New Project work will stop using this source binding. Existing material,
> dependents, provenance, decisions, and history will remain.

The preview binds the exact active source ref and displays the eight existing
impact groups, coverage/truncation, all retention outcomes, and limitations. It
states **This does not create a replacement**. **Reason** is required, has no
invented default, and is preserved through nonterminal failures. The primary
button is **Remove from Project**. The command is sent only once per deliberate
confirmation with a newly generated command ID and idempotency key.

**Receipt and recovery**

The receipt state names the source, `active -> excluded`, resulting exact
revision, recorded time, preservation result, and whether the response was
newly applied or replayed. It offers **Preview restore** and, when a distinct
eligible active successor is available, **Create replacement**. Neither action
runs automatically.

An exclude receipt's inverse is `RestoreProjectSource` against its exact
resulting excluded revision. If a replacement is later created, restoration is
blocked until that active replacement is retracted.

### Restore: **Restore to Project**

**Entry conditions**

- Details represents the exact current predecessor or ordinary source revision.
- Its typed status is `excluded`.
- It has no active outgoing replacement.
- The actor-scoped action state for `RestoreProjectSource` is `ready`.

When an outgoing replacement remains active, **Restore to Project** stays
visible but disabled with: **Retract the active replacement before restoring
this source.** The enabled primary action is **Retract replacement**. This state
comes from the backend's implemented active-head guard.

**Preview and confirmation**

Title: **Restore “{source title}” to this Project?**

The first consequence sentence is:

> This source binding will become available for ordinary new Project use.
> Existing material, dependents, provenance, decisions, and history will remain.

The preview binds the exact excluded source ref, shows current impact/retention
facts and limitations, and states that it creates no replacement relation.
**Reason** is required. The primary button is **Restore to Project**.

**Receipt and recovery**

The receipt names `excluded -> active`, the exact resulting revision,
preservation, event, and applied/replayed state. Its inverse is a separately
previewed **Remove from Project** command. A prior retracted replacement remains
retained in History and does not reactivate.

### Create replacement

**Entry conditions**

- The selected predecessor is the exact current `excluded` revision.
- Its exclusion receipt resolves with exact receipt ID, revision, content hash,
  record hash, and a resulting source ref equal to that predecessor revision.
- The author has selected a distinct exact current `active` ProjectSource in the
  same Project as successor.
- No active outgoing replacement exists for the predecessor.
- The proposed relation passes the implemented current-head, cycle, and bounded
  depth checks, and `CreateProjectSourceReplacement` is `ready` for the actor.

On an active predecessor, **Create replacement** is visible but unavailable with
**Remove this source from current Project use first.** The UI does not combine
exclude and create into one confirmation or one optimistic transaction.

**Preview and confirmation**

The action opens a candidate control over the existing Project source
collection. Only typed current `active` candidates are selectable. Changing the
candidate invalidates the prior preview and requests a new exact composition.

Title: **Use “{successor title}” as the replacement for “{predecessor title}”?**

The preview states:

- future semantic traversal from the predecessor follows the successor;
- the predecessor remains excluded and the successor remains active;
- existing dependents retain their exact original source references and are not
  migrated;
- the relation does not merge canonical identities, broaden rights, copy bytes,
  or establish the truth of either source; and
- replacement, source, dependent, and Artifact history remain retained.

The author chooses one implemented kind: **Newer source version**, **Identity
resolution**, **Preferred copy changed**, or **Project role replacement**.
**Rationale** is required. The primary button is **Create replacement**.

**Receipt and recovery**

The receipt names both exact sources, replacement kind, active relation ref,
event, preserved areas, and applied/replayed state. The only immediate inverse
is **Retract replacement** using the receipt's exact active replacement ref. It
does not offer or imply predecessor restoration as the same command.

### Retract replacement

**Entry conditions**

- Details shows the exact excluded predecessor and its exact active outgoing
  replacement.
- The relation is still the effective current head and its exact active ref is
  available.
- `RetractProjectSourceReplacement` is `ready` for the actor.

An incoming relation shown on a successor must first resolve the exact
predecessor/relation selection. Retraction never targets a relation inferred
only from two visible sources.

**Preview and confirmation**

Title: **Retract the replacement for “{predecessor title}”?**

The material consequence appears before technical detail:

> The replacement relationship will stop directing current traversal to
> “{successor title}”. “{predecessor title}” will remain excluded. Restoring it
> requires a separate next command.

The preview also states that the successor remains active, no dependent is
migrated, and both source histories, the original replacement, the new
retraction, dependents, and Artifact material remain retained. **Reason** is
required. The primary button is **Retract replacement**.

**Receipt and two-step recovery**

The receipt names the exact replacement as `retracted`, the new retraction ref,
event, preservation, and applied/replayed state. It must display:

> Replacement retracted. “{predecessor title}” is still excluded.

The receipt's primary next action is **Preview restore**. Choosing it fetches a
fresh restore preview against the post-retraction excluded source revision and
requires a second explicit **Restore to Project** confirmation with a new
command ID and idempotency key.

The order is invariant:

```text
RetractProjectSourceReplacement
  -> relation inactive; predecessor still excluded
  -> fresh restore preview
  -> separate RestoreProjectSource confirmation
  -> predecessor active
```

Retraction never restores the predecessor, and restoration never silently
retracts a relation. Petra never submits the two commands as a hidden batch.

## Physical deletion

**Delete local copy** remains in the same Project-use action group as a disabled
control. Its adjacent text is:

> Unavailable. Petra has no accepted Artifact retention policy or physical-copy
> deletion command. The local Artifact and every registered dependency remain.

The existing `delete_local_copy` lifecycle preview may support **View retention
details** as a read-only disclosure. There is no destructive confirmation,
command, optimistic state, or simulated receipt. Removal or replacement never
changes this control's unavailable status.

## Pending, stale, forbidden, unavailable, and replayed states

| State | Required presentation and behavior |
| --- | --- |
| Preview loading | Keep the exact Details selection visible; announce **Loading action preview** once; do not open an empty confirmation or enable its primary action. |
| Command pending | Disable every dialog action except safe dismissal only when dismissal cannot lose attempt identity; show the exact action and object; do not update the source row optimistically. |
| Stale or conflict (`409`) | Keep reason/rationale and candidate selection; mark the preview stale; disable confirmation; refetch exact source, location, relation, capability, and action preview. Require a new confirmation against changed facts. Never convert an active-replacement restore conflict into automatic retraction. |
| Forbidden (`403`) | Show **You do not have permission for this Project action** without Actor/grant details; retain local input; disable confirmation; return to the invoking control or stable Project-use heading. A visibility check is not authority, so the command still revalidates transactionally. |
| Missing (`404`) | State that the selected source or relation can no longer be resolved in this Project; disclose no replacement or cross-Project existence not returned by UX-REQ-008; close to the stable Details heading or permitted Brief fallback. |
| Invalid (`422`) | Treat as a client/integration defect; preserve input, show the safe server message, and do not retry unchanged input automatically. |
| Service or authority unavailable (`503`) | Distinguish unavailable command boundary, unregistered Actor, ambiguous authority, stored-record corruption, and generic service failure using safe server text. Preserve preview and local input; offer **Retry preview** or **Check status** only when supported; queue no hidden command. |
| Delivery outcome unknown | Retain the exact command ID, idempotency key, body, and action context. Reconcile before allowing another command. Exact retry reuses that complete tuple; a new ID/key is forbidden until the prior effect is known. |
| Replayed response (`applied: false`) | Show **Already completed — receipt replayed** with the original immutable receipt. Do not emit a second success event, repeat the next command, or imply a new change. |
| Applied receipt, detail refresh failed | Keep the receipt as the observed command outcome and state **Change recorded; current Details could not refresh**. Offer a current read retry; never relabel the command failed or send it again. |

The client maps existing server codes without collapsing their meaning:

| Presentation | Existing codes |
| --- | --- |
| Forbidden | `PROJECT_SOURCE_LIFECYCLE_COMMAND_FORBIDDEN`, `PROJECT_SOURCE_LIFECYCLE_COMMAND_NOT_AUTHORIZED`, `PROJECT_SOURCE_REPLACEMENT_COMMAND_FORBIDDEN`, `PROJECT_SOURCE_REPLACEMENT_COMMAND_NOT_AUTHORIZED` |
| Missing target | `PROJECT_SOURCE_LIFECYCLE_SOURCE_NOT_FOUND`, `PROJECT_SOURCE_REPLACEMENT_COMMAND_SOURCE_MISSING`, `PROJECT_SOURCE_REPLACEMENT_COMMAND_REPLACEMENT_MISSING` |
| Stale or conflicting | `PROJECT_SOURCE_LIFECYCLE_COMMAND_ID_REUSED`, `PROJECT_SOURCE_LIFECYCLE_IDEMPOTENCY_KEY_REUSED`, `PROJECT_SOURCE_LIFECYCLE_PROJECT_MISMATCH`, `PROJECT_SOURCE_LIFECYCLE_STALE_SOURCE`, `PROJECT_SOURCE_LIFECYCLE_STATUS_MISMATCH`, `PROJECT_SOURCE_LIFECYCLE_ACTIVE_REPLACEMENT`, `PROJECT_SOURCE_REPLACEMENT_COMMAND_ID_REUSED`, `PROJECT_SOURCE_REPLACEMENT_IDEMPOTENCY_KEY_REUSED`, `PROJECT_SOURCE_REPLACEMENT_COMMAND_PROJECT_MISMATCH`, `PROJECT_SOURCE_REPLACEMENT_COMMAND_SOURCE_STALE`, `PROJECT_SOURCE_REPLACEMENT_COMMAND_STATUS_MISMATCH`, `PROJECT_SOURCE_REPLACEMENT_COMMAND_RECEIPT_MISSING`, `PROJECT_SOURCE_REPLACEMENT_COMMAND_RECEIPT_STALE`, `PROJECT_SOURCE_REPLACEMENT_COMMAND_ALREADY_ACTIVE`, `PROJECT_SOURCE_REPLACEMENT_COMMAND_REPLACEMENT_STALE`, `PROJECT_SOURCE_REPLACEMENT_COMMAND_NOT_ACTIVE` |
| Unavailable | `PROJECT_SOURCE_LIFECYCLE_COMMAND_UNAVAILABLE`, `PROJECT_SOURCE_REPLACEMENT_COMMAND_UNAVAILABLE`, `AUTHENTICATED_ACTOR_UNAVAILABLE`, `PROJECT_COMMAND_AUTHORITY_AMBIGUOUS`, `PROJECT_SOURCE_LIFECYCLE_STORED_RECORD_CORRUPT`, `PROJECT_SOURCE_REPLACEMENT_COMMAND_STORED_RECORD_CORRUPT`, `PROJECT_SOURCE_LIFECYCLE_COMMAND_FAILED`, `PROJECT_SOURCE_REPLACEMENT_COMMAND_FAILED` |
| Invalid | `PROJECT_SOURCE_LIFECYCLE_COMMAND_INVALID`, `PROJECT_SOURCE_REPLACEMENT_COMMAND_INVALID` |

The frontend retains one unresolved attempt tuple for the dialog until it
observes a validated receipt or a confirmed no-effect failure. If browser
storage or a reload loses that tuple, it cannot manufacture a new retry. An
authenticated receipt/status lookup by exact command identity, using the
repositories' existing receipt reads, is required to close this recovery path
before the control claims full DB17 conformance.

## Narrow, keyboard, announcement, and focus behavior

- Wide layouts keep the action group in the existing Details column. Narrow and
  high-zoom layouts keep it in the same DOM position in the existing full-width,
  stacked Details section after reader content. Petra adds no duplicate sticky
  bar or mobile action sheet.
- Action buttons reflow to one column without shortening their labels. The
  dialog uses the existing responsive width and internal document scroll. The
  consequence precedes long impact groups so it is encountered first at 400%
  zoom and by a screen reader.
- Every action is a native button. Tab follows document order; Enter and Space
  activate it. The replacement candidate control exposes one label, current
  value, and typed active options and supports keyboard selection without drag
  or pointer-only behavior.
- Opening a dialog moves focus within it according to the existing native dialog
  behavior, with its title and consequence programmatically named. Focus is not
  placed on the consequential confirmation by default.
- Escape and **Cancel** close a non-pending preview and return focus to the exact
  invoking button. A validation, forbidden, or unavailable result moves focus to
  its error summary; correction does not discard the reason or candidate.
- A validated receipt keeps the dialog open, moves focus to the receipt heading,
  and announces one bounded status message. Closing returns to the invoking
  control if it remains eligible. If the state change replaced that control,
  focus returns to the stable **Project use** heading; it does not jump to a new
  action automatically.
- After replacement retraction, activating **Preview restore** deliberately
  changes the same dialog to a fresh restore preview and focuses the new title.
  The second confirmation is reachable only by ordinary forward navigation.
- Refresh after a stale result restores focus to the dialog title and then the
  changed field or explanation. If the selected object is no longer permitted,
  focus goes to the safe route-error heading or permitted fallback returned by
  UX-REQ-008.
- Status, disabled reasons, lifecycle position, active/retracted relation state,
  applied/replayed result, and the two-step restoration requirement are all
  explicit text. Color and iconography remain redundant.

## Exact client and server handoff

The existing typed command functions remain the only mutation calls:

- `executeProjectSourceLifecycleCommand` posts to
  `/api/commands/projects/:projectId/sources/:projectSourceId/lifecycle`;
- `createProjectSourceReplacement` posts to
  `/api/commands/projects/:projectId/source-replacements`; and
- `retractProjectSourceReplacement` posts to
  `/api/commands/projects/:projectId/source-replacements/:replacementId/retraction`.

The surface supplies only the fields already accepted by those clients. It does
not send Actor, capability grant, Project identity in the body, correlation, or
submission time. Command and idempotency identities are created only for an
actual confirmation and remain stable for exact replay.

| Command | Strict request body |
| --- | --- |
| `ExcludeProjectSource` / `RestoreProjectSource` | `command_id`, `idempotency_key`, `requested_action`, exact `expected_source_ref`, and `reason` |
| `CreateProjectSourceReplacement` | `command_id`, `idempotency_key`, `replacement_kind`, exact `replaced_source_ref`, exact `replacement_source_ref`, exact `exclusion_receipt_ref`, and `rationale` |
| `RetractProjectSourceReplacement` | `command_id`, `idempotency_key`, exact active `expected_replacement_ref`, and `reason` |

| UI fact | Owning runtime fact |
| --- | --- |
| Current active/excluded position | Exact current ProjectSource revision and record hash |
| Source descriptor and role | `project-source-view@1.0.0` and ProjectDefinition terminology |
| Impact and retained areas | `project-source-lifecycle-view@1.0.0` or its exact compatible composition |
| Current/superseded destination | `project-object-location-view@1.0.0` active replacement traversal |
| Create eligibility | Excluded predecessor, exact exclusion receipt, active distinct successor, no active head, graph integrity, current grant |
| Retract eligibility | Exact active effective replacement ref and current grant |
| Restore-after-retract order | D019 plus lifecycle `ACTIVE_REPLACEMENT` guard and replacement retraction disposition |
| Command outcome | Validated lifecycle or replacement receipt and `applied` flag |
| Recovery | Exact replay or receipt/status reconciliation before any new attempt |

The frontend refetches source detail, semantic location, and action composition
after a validated receipt. It may update presentation from the returned exact
result immediately, but the receipt remains distinct from the refreshed read.
Projection repair never repeats a lifecycle or replacement command.

## Implementation and acceptance sequence

1. Add the actor-scoped lifecycle/replacement control read and strict contract
   validation without changing the three command transactions.
2. Preserve typed ProjectSource status and exact refs through the workbench data
   adapter; stop deriving lifecycle state from `role` display text.
3. Add the **Project use** group to the existing `SourceDetails` slot and use the
   existing `PetraDialog` for all preview/receipt states.
4. Connect exclude and restore to the current lifecycle preview and command.
5. Connect create and retract only after the read supplies exact relation and
   exclusion-receipt refs.
6. Add exact pending-attempt reconciliation; keep every command disabled if the
   browser cannot establish its current effect safely.
7. Verify wide, 500-CSS-pixel narrow, 400% zoom/reflow, keyboard-only, screen-
   reader, forced-color, stale, forbidden, unavailable, lost-response, replayed,
   refetch-failed, and two-step retract/restore paths.

Acceptance fails if the collection gains a new mutation layout; a historical or
superseded source is silently replaced by its successor; the browser infers
eligibility or hashes; exclude creates a replacement; create migrates
dependents; retract restores the predecessor; restore retracts a relationship;
the two recovery commands share a confirmation or idempotency key; a stale or
unknown attempt is repeated as new; `applied: false` appears as another change;
focus is lost when the invoking control changes; forbidden state leaks authority
details; or physical local-copy deletion becomes enabled.

This handoff refines UX-REQ-008/009/010 at interface-integration depth. It does
not revise `UX-DESIGN-FREEZE-01` and creates no `UX-REQ-024`.
