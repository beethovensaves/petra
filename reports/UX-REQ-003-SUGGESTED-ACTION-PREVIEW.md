# UX-REQ-003 SuggestedAction preview and readiness

Status: first exact Project-scoped read-only SuggestedAction preview and frozen
Brief integration passed; Work-starting actions and command invocation remain open
Date: 2026-09-11
Design boundary: `UX-DESIGN-FREEZE-01`

## Result

Petra now exposes one revisioned, renderer-neutral SuggestedAction preview
derived entirely from existing retained authority. The initial action recommends
inspecting an exact GroundedResponse that already addresses a Project inquiry.
It starts no Work, invokes no command, changes no Project record, and creates no
second action ledger.

The stable SuggestedAction identity is deterministically derived from the
immutable `ProjectInquiryLink` identity, the fixed action kind, and the 1.0
derivation version. That exact link can produce only revision 1 of this action.
A different result link produces a different action identity instead of
rewriting the old preview. The action revision hash covers only immutable action
content. Current readiness is recomposed beside that revision, so a stale
transition cannot change content under the same revision identity.

## Contract and authority boundary

`petra.suggested-action-view@1.0.0` binds:

- the stable SuggestedAction identity, revision, and canonical action hash;
- the exact ProjectDefinition revision and record hash;
- the exact profile-valid Objective revision, semantic key, and statement;
- the immutable inquiry-result link, GroundedResponse, snapshot, and any
  declared producing WorkUnit reference;
- the reason, exact included scope, explicit exclusions, and missing
  information;
- closed `ready` or `stale` view readiness with a reason code and server-owned
  prerequisites, kept outside the immutable action-revision hash;
- the only applicable `current_graph` depth for this existing-result action;
- the already-available result, its reuse state, and its absence of authority
  effect;
- no-work resource, interrupt, approval, and cancellation consequences; and
- a typed renderer-neutral invocation of the existing authenticated
  `petra.project-inquiry-view@1.0.0` detail read.

The PostgreSQL reader composes the preview inside one read-only repeatable-read
transaction. It validates canonical content and record hashes for the exact
ProjectInquiryLink, ProjectDefinition, Objective, GroundedResponse, and
any declared producing WorkUnit before returning any action. A cross-Project
link identity returns no result.

Readiness is `ready` only while the linked ProjectDefinition and Objective are
still current, the Objective is active, the GroundedResponse remains reusable,
and any declared producing Work revision is retained and completed. Definition
or Objective replacement, inactive Objective state, or result invalidation
makes the same immutable action preview `stale` with exact regeneration
prerequisites. The browser does not calculate any of those states.

## Authenticated API

The authenticated query is:

`GET /api/queries/projects/:projectId/suggested-actions?inquiry_result_link_id=:projectInquiryLinkId`

It resolves an exact immutable inquiry-result link through a bounded indexed
lookup to its server-derived action without asking the browser to reproduce the
identity derivation. The endpoint validates the canonical link identity and
complete response contract, verifies that the returned Project and basis match
the request, and returns stable invalid-query, not-found,
unavailable-boundary, and read-failure responses. Action-ID-only lookup is
deferred until an accepted invocation or retention boundary can resolve it
without an unbounded Project scan or a second ledger.

The action's typed invocation names the existing inquiry-detail contract and
exact Objective reference rather than a browser route. The frozen Brief adapter
maps that typed read without changing its meaning or treating it as a command.

## Frozen Brief integration

The existing **Next steps** region now consumes the authenticated
`petra.suggested-action-view@1.0.0` query. The default Brief path reads the
server-owned current Objective and its exact inquiry detail. It requests a
SuggestedAction only when that current inquiry has exactly one result link, so
the browser never ranks links or invents a recommendation. An explicit exact
`inquiry_result_link_id` may select the same preview without fixture fallback.
No action region is rendered when there is no current Objective or when zero or
multiple result links leave the selection unsupported by current server
authority.

The preview keeps the action identity, revision, content hash, ProjectDefinition,
Objective, inquiry-result link, GroundedResponse, snapshot, declared Work basis,
read authority, readiness reason, and prerequisites intact. It also shows the
exact included scope, exclusions, missing information, reuse and authority
effect, capability posture, and no-Work duration, cost, interrupt, approval, and
cancellation consequences. These values come from the action view; the client
does not derive readiness, priority, capability, cost, or authority.

A ready action exposes only the contract-declared
`get_project_inquiry_detail` authenticated read. The loader obtains the exact
Objective from the returned invocation, then verifies the inquiry detail against
the action's ProjectDefinition, Objective, link, result, and any producing Work
references before rendering it in the same Brief region. A stale action is
disabled, keeps the server reason and prerequisites visible, and performs no
substitute read or Work request. The preview and inquiry detail both state that
the GroundedResponse has no authority effect and does not resolve the authored
inquiry.

## Verification

The focused contract suite passed 433 tests, the server route suite passed 23
tests, and the Python contract mirror passed 11 tests. Targeted TypeScript
builds and test typechecks passed.

The disposable PostgreSQL 18.6 integration applied all 31 migrations and passed
all 110 persistence tests across 15 files. The complete `npm run verify` gate
then passed generation checks, the retrieval floor, formatting, lint,
TypeScript and Python typechecks, the workbench production build, 866
JavaScript/TypeScript tests including the 6 handoff automation tests, and 25
Python tests.

The frozen-interface increment passes 40 focused adapter and component tests,
all 103 workbench tests, the workbench TypeScript check, and the production
workbench build. The complete `npm run verify` gate also passes generated
contract and fixture checks, the retrieval floor, repository formatting and
lint, TypeScript and Python typechecks, the production build, 866
JavaScript/TypeScript package and application tests, 6 handoff automation
tests, and 25 Python tests. Seven service-dependent tests remain expected
skips.

Because the design slice merges the exact backend counterpart, the disposable
PostgreSQL 18.6 integration was also rerun. It validated and applied all 31
migrations and passed all 110 persistence tests across 15 files.

## Remaining UX-REQ-003 work

This slice intentionally does not close `UX-REQ-003`. Remaining work includes:

- immutable or derivable action families that preview bounded new Work;
- capability, grant, budget, time, tool, validator, interrupt, and cancellation
  readiness for those Work-starting actions;
- exact action invocation with stale regeneration and idempotent convergence on
  one durable WorkUnit;
- direct and conversational paths using the same Petra command;
- terminal result, History, and eligible-recovery bindings;
- server-owned discovery and ordering when more than one exact action is
  available; and
- the relevant reconnect, accessibility, responsive, and adverse-state proof.

The next backend slice may add the smallest Work-starting action preview and
exact invocation now that this initial read-only preview is mapped into the
frozen action region. It must not generalize priority, capability, cost,
reversibility, or profile meaning in the client.
