# UX-REQ-012 exact ReviewSession lifecycle read

Status: bounded Wave 4 backend read slice complete; frozen Reopen integration remains open
Date: 2026-09-12
Design counterpart: `0c3f5766d2d92e216019610de519fcdfc00f5847`

## Result

`petra.project-review-view@1.2.0` adds one field to the 1.1 Review composition:
`content.session.lifecycle`. The value is the lifecycle stored on the same exact
ReviewSession record that supplies the view's ReviewSession identity, revision,
and content hash. The PostgreSQL reader returns `open`, `deferred`, or
`completed` directly from that canonical record.

Lifecycle remains separate from the derived `needs_decision`, `waiting`, or
`completed` display status. In particular, an open session whose members are
all waiting and a deferred session may both display **Waiting** while retaining
different lifecycle values. The field describes coordination state only. It
does not state that Defer or Reopen is eligible or authorized, give validation
force, record a Review decision, or grant Approval, ChangeSet, domain-event,
projection, or mutation authority.

## Compatibility and failure behavior

The reader now emits Project Review view 1.2 for canonical ReviewSession 1.1
records and continues to emit the legacy 1.0 view for ReviewSession 1.0 records.
The shared record union retains view versions 1.0, 1.1, and 1.2 so retained
callers can still type older records.

The renderer-neutral workbench client accepts 1.2 and maps its exact lifecycle
without synthesizing a lifecycle for older view versions. Missing, malformed,
or unrecognized lifecycle values fail at the contract, authenticated server
read, and typed-client boundaries. The view does not add a client-controlled
profile payload or alter ProjectDefinition-owned object, relationship,
validator, terminology, or reference meaning.

The existing authenticated lifecycle command remains authoritative. A
`deferred` read is a necessary presentation condition for Reopen, not proof
that the operation is eligible or authorized. The server still resolves the
Actor and CapabilityGrant and verifies the exact ReviewSession identity,
revision, content hash, lifecycle, and transition direction before any revision
is appended.

## Verification

All checks use the pinned Node 24.20.0 and npm 11.19.0 toolchain.

- Generated-contract verification passes. Focused contract tests pass four
  cases, including rejection of missing lifecycle and injected operation
  eligibility.
- The focused authenticated server route suite passes 29 tests, including a
  fail-closed 1.2 read with missing lifecycle.
- The focused renderer-neutral client suite passes 48 tests, including open
  and deferred Reviews that both display Waiting and rejection of an invented
  lifecycle value.
- A fresh PostgreSQL 18.6 store applies and validates V001 through V035. All
  119 PostgreSQL tests across 16 files pass, including exact deferred and
  reopened lifecycle reads and the existing stale, unauthorized, idempotent,
  no-authority, and durable-cardinality cases.
- The complete `npm run verify` repository gate passes generated contracts and
  fixtures, the retrieval floor, formatting, lint, TypeScript and Python
  typechecks, the production workbench build, and all repository test suites.

No migration was added because the exact lifecycle is already stored on each
ReviewSession revision. The fresh PostgreSQL run was required because this
slice changes PostgreSQL read composition.

## Remaining boundary

This slice does not edit the frozen Review component, CSS, browser routes, or
presentation fixtures. It does not connect Reopen, Apply, Reject, correction,
refresh, separation, member recovery, Brief, communication, a second profile,
or the cumulative Wave 4 proof.

The next safe design slice can merge this read contract and consider Reopen
presentation only for a server-returned `deferred` lifecycle, using the same
exact ReviewSession revision and content hash already retained by the route.
Pending, verified success, same-identity retry, stale, unauthorized, and
return-context behavior should remain aligned with Defer. The command result
must still be revalidated; the lifecycle read itself grants no operation
authority.
