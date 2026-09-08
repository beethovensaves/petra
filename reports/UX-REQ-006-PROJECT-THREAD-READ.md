# UX-REQ-006 Project thread read

Status: Project-scoped collection/detail read, authenticated API, and frozen Petra workspace integration passed; commands and retained transcript bytes remain open
Date: 2026-09-08
Design boundary: `UX-DESIGN-FREEZE-01`

## Result

Petra can now open a Project-owned conversation from durable
`ProjectThread` authority rather than fixture prose. The additive
`petra.project-thread-view@1.0.0` contract provides a bounded collection and an
exact detail representation. Both identify the governing ProjectDefinition,
thread revision, lifecycle, origin, retained turns, coverage, authority event,
and honest capability limitations.

This is a read boundary only. It does not introduce a second interaction
lifecycle or treat a displayed message as mutation authority. `InteractionRun`
continues to own execution and delivery state; `ProjectThread` owns the durable
product history that can be reopened and, later, continued or branched.

## Exact collection and detail reads

`PostgresProjectThreadViewReader` composes each result under repeatable-read
isolation and verifies the ProjectDefinition and ProjectThread contract,
content, and record hashes before returning it. Collection reads support bounded
pagination and lifecycle filtering. Detail reads require the exact Project and
thread identity, so a cross-Project request is absent rather than leaking the
record.

The detail view exposes each material turn with its exact context, snapshot,
execution, Work, result, response Artifact, authority, and semantic Work
destination. Input is either hash-only or metadata-only, according to the
authoritative turn record. Response is metadata-only because this reader does
not own an Artifact byte store. The contract states those limitations instead
of inventing transcript bytes or borrowing fixture text.

All create, append, branch, archive, reopen, and continuation operations are
explicitly unavailable in this slice.

## API and frozen workspace

Authenticated routes now expose:

- `GET /api/queries/projects/:projectId/threads`
- `GET /api/queries/projects/:projectId/threads/:projectThreadId`

The server validates bounded query input, exact response contracts, and actor
scope. Project-shell Petra-place counts now come from durable ProjectThread
records rather than InteractionRun execution records, and that place reports
complete count coverage once V022 is available.

The existing `/projects/:projectId/petra` route loads the first open thread and
then its exact detail. The client verifies the complete thread reference tuple
between both responses before rendering. It maps retained metadata, omissions,
coverage, limitations, and the exact linked Work destination into the frozen
workspace. It has no fixture fallback and makes no layout or CSS changes.

## Verification

The disposable PostgreSQL 18.6 suite applies V001 through V022 and passes all
97 cases, including lifecycle filtering, empty branches, archived detail,
metadata-only response visibility, exact Work destinations, and cross-Project
absence. Contract generation and validation pass 331 TypeScript cases. Server
routes pass 40 cases, strict Python/Pydantic and RFC 8785 parity pass 25 cases,
and the frozen workbench passes 82 cases. The complete repository gate passes
with 662 always-on tests and seven expected service-dependent skips.

## Remaining UX-REQ-006 work

- create, append-turn, branch, archive, and reopen commands with authorization
  and optimistic concurrency;
- retained input and response bytes through the owning Artifact boundary for
  new turns, without weakening existing hash-only history;
- stale-snapshot continuation preflight and execution for original, current,
  and compare modes;
- model-agnostic compaction plus proposal, decision, and PresentationContext
  linkage; and
- Project-lifetime retention and later `.petra` checkpoint reconstruction.

The ProjectDefinition-valid inquiry-mapping foundation now supplies explicit
zero, many, and shared Work links. Its composed inquiry and Work reads are next;
thread commands can later consume that neutral linkage without deriving inquiry
resolution from Work completion.
