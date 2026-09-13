# Communication consistency: frozen design closeout

Date: 2026-09-13
Design starting commit: `45c7df6727ba82de9559450f0a97647bc75bd3e4`
Exact backend counterpart inspected: `c935910e3d7bedad8323539322807073ee72a968`
Functional backend target: `eb5cbbe0179d6b1b52069861a14498648e4fdb10`
Prior design finding: `99ddbb0ef53e9545a208385ebe323de3f474576e`

## Disposition

The typed-client change closes the communication segment-consistency
prerequisite recorded by the prior design finding. It rejects schema-valid,
resealed contradictions in statement family, declared order, statement key,
and action-report presence, position, family, and command linkage. Valid
complete and partial-preservation plans remain readable without changing their
blocked full-language receipt.

No consequential product, architecture, authority, information-hierarchy, or
freeze decision remains open in this prerequisite. This bounded closeout changes
only this report. It does not implement or test communication presentation.
Closure item 42 is authorized when the fixed sequence reaches it; the immediate
next slice remains item 41.

The exact counterpart differs from the functional target only in the fixed
closure packet and a worktree-local launcher. The client source has the same Git
blob, `05efbd6bff8620af8f7f3fa90a29ca5f85bdab2a`, at both commits.

## Reproduced rejection boundary

At the exact counterpart,
`packages/adapters/src/communication-plan-client.ts:174`–`200` validates the
returned plan only after schema, exact request, owner, original-content,
invocation-result, and installed-contract checks. It compares every returned
segment with the same-position original statement and requires:

- a sequential one-based `order`;
- the original `statement_key` as `segment_key`;
- the family registered for the statement's exact origin; and
- when an invocation exists, exactly one final `action_report` with no original
  statement and a key for that invocation's exact command.

The check rejects the returned plan. It does not sort, reclassify, repair, or
return a partial substitute, and it grants no mutation authority.

The focused typed-client suite reproduced all twelve recomputed-envelope cases:

| Contradiction | Reproduced cases |
| --- | --- |
| Family | source report relabeled as action report; Petra synthesis relabeled as attributed report; unresolved inference relabeled as Petra assessment |
| Order | duplicated order; gapped order |
| Key | one original segment given another statement's key |
| Action report | fabricated without invocation; missing with invocation; duplicated; wrong command key; wrong family; moved before original statements |

Each mutated plan remained valid under the installed `communication-plan` schema
after its enclosing `content_hash` was recomputed. Every typed read rejected it
with the segment-metadata error and left the supplied plan object unchanged.
The authenticated route-to-client cases also reproduced rejection of the
original family and order contradictions after an HTTP 200 response, while the
valid exact response remained readable.

## Preserved success boundary

The same focused suite composed and read all four preservation/linkage
combinations: partial and complete preservation, each with and without an exact
linked invocation. The client returned every valid plan unchanged. Partial
preservation kept its blocked segment visible; complete preservation removed
that segment-level block. Both retained:

- validation outcome `blocked`;
- language validation `incomplete`; and
- null repair provenance.

Therefore a preservation pass still cannot be presented as passed or repaired
full-language validation. The closeout preserves the prior separation among
structured preservation, profile meaning, language validation, communication,
and authority.

## Verification and limits

Pinned Node 24.20.0 and npm 11.19.0 were selected explicitly. At exact backend
counterpart `c935910e3d7bedad8323539322807073ee72a968`:

- the adapter, authenticated route, and core communication suites passed all 45
  tests across three files;
- a separate verbose adapter run passed all 25 typed-client tests and named each
  of the twelve contradiction cases plus the valid preservation cases; and
- `git diff --check` passed, and the backend worktree matched `origin/main` with
  no tracked or untracked changes.

The complete design-branch `npm run verify` gate passed under the same pinned
toolchain: 515 contract, 240 core, 54 adapter, 15 retrieval, 101 server, 231
workbench, 25 Python, and eight handoff tests passed. Neo4j and S3 each passed
three tests; their seven service-dependent skips provide no integration
evidence. The first sandboxed gate attempt could not bind the existing server
tests to `127.0.0.1`; the complete rerun with localhost socket access passed.
`git diff --check` also passed on the design branch. This report does not change
persistence or PostgreSQL behavior, so no new PostgreSQL integration run is
required.

This evidence exercises the production typed-client implementation with
fixture-composed plans and the in-process authenticated Hono route. It does not
exercise PostgreSQL, a network socket, a browser renderer, assistive technology,
full language validation or repair, another registered profile, or the
cumulative Wave 4 exit trace. It neither closes `UX1.4-EV01`–`UX1.4-EV06` nor
declares Wave 4 complete.

## Felicity review

Felicity review found no material writing issue after the report distinguished
client rejection from server-side HTTP validation, partial preservation from
full-language validation, and this prerequisite from the later presentation and
cumulative proofs. No user-facing product copy changed.

## Next safe boundary

Perform exactly closure item 41: add the controlled-writing working-state
adapter through the existing backend WorkingCandidate and WorkingRelationship
owners. Do not begin communication presentation in that slice. The later item
42 may consume this validated scientific plan through the frozen production
typed-client boundary, but it must preserve the blocked receipt as a visible
limitation rather than an ordinary validated answer.
