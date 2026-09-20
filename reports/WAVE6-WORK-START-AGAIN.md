# Wave 6 — registered Work Start again

Date: 2026-09-20 America/New_York

Status: backend implementation complete; visible browser integration remains
design-owned.

Backend starting commit:
`bbba1699e9277fb24806337b563c2879047e6e0e`

Exact counterpart inspected:
`cf894b63a165157676a0d4e034b65824c0eabd63`

## Delivered boundary

`work.start-again` now has a production backend owner without cloning Work,
mutating consumed input, parsing prose into a command, or weakening registered
checkpoint Resume.

- A trusted owning service first registers one exact terminal prior WorkUnit and
  one distinct requested WorkUnit with a genuinely different immutable input
  manifest. The registration requires the same Project, workflow, task, worker,
  service Actor, and capability boundary and declares that no prior output is
  reused.
- `GET /api/queries/projects/:projectId/work/:workUnitId/operations` exposes
  Start again only while the exact prior Work remains terminal, the registered
  fresh Work remains requested, no fresh required input is pending, and every
  retained identity still matches.
- `POST /api/commands/projects/:projectId/work/:workUnitId/start-again`
  requires bearer authentication, the server-resolved human
  `ManageProjectWork` grant, the exact prior Work revision/specification, and
  the server-supplied registration identity and content hash.
- The command queues and starts attempt 1 under the distinct fresh WorkUnit. The
  receipt exposes both Work identities, both input manifests, the Work-local
  attempt, the linked lineage attempt, the fresh-input explanation, no-reuse
  boundary, and exact Work destination.
- Prior Work, attempts, outputs, usage, and domain authority remain unchanged.
  Checkpoint Resume continues to preserve one Work identity and one attempt;
  Start again remains a separate linked-fresh-execution operation.

## Persistence and recovery

Flyway V058 adds immutable workflow registrations, pending/completed command
receipts, and exact prior-Work-to-fresh-Work transition lineage. A pending
command can reconcile fresh Work at its registered requested, exact queued, or
exact running state. Completed command/idempotency replay returns the same
receipt after server restart. Conflicting identities, stale prior Work, changed
fresh Work, same-content input, workflow/service/capability mismatch, unresolved
fresh input, and unauthorized commands fail without a duplicate attempt.

## Executed production evidence

`npm run test:wave6:work` passed against a fresh disposable PostgreSQL 18.6
store migrated from V001 through V058. The retained
`reports/WAVE6-WORK-PRODUCTION-COMMANDS.json` artifact records:

- unavailable Start again before trusted workflow registration;
- availability with an exact server-owned fresh-input binding;
- authenticated creation of linked fresh Work attempt 1;
- distinct prior/fresh Work and input identities with no output reuse;
- one immutable registration, receipt, and transition;
- unchanged retained prior Work;
- server restart plus exact receipt replay; and
- three fresh Work revisions with no duplicate effect.

The scenario exercises production backend routes and the renderer-neutral typed
client. It makes no claim that the frozen React Start again control has been
connected or exercised through the browser.

## Next safe boundary

Design can bind the existing Start again control to
`start_again_binding`, construct the request only from that server-supplied
identity plus a fresh command/idempotency identity, invoke
`ProjectWorkClient.startAgain`, and navigate to the receipt's distinct Work
destination. The visible outcome must disclose the fresh input/no-reuse choice
and retained prior attempt, and must preserve the live Resume integration.
