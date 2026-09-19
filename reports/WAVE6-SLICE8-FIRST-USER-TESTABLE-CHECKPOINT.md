# Wave 6 slice 8 — first user-testable checkpoint

## Disposition

This bounded design slice delivers the first integrated checkpoint; it does not
claim the Wave 6 guided workflow, Work scenario, or user acceptance evidence.
The named evidence records remain outstanding until their complete tasks are
actually executed and retained.

## Stable start

From the repository root with Docker and the accepted local prerequisites
available:

```sh
./run-wave-6-checkpoint.zsh
```

The launcher pins Node 24, creates and migrates fresh disposable PostgreSQL and
Neo4j stores, runs the supported paired-profile setup and restart checks, then
holds the production React workbench at:

```text
http://127.0.0.1:4311/guide
```

The terminal remains the lifecycle owner. Press Enter there when testing is
finished; the launcher stops the workbench and removes its disposable services.
Port 4311 is strict so an occupied checkpoint URL fails visibly instead of
silently moving the tester to a different address.

The checkpoint setup is the provider-free retained presentation continuation.
It proves that the stable integrated route can start, restart, and retain its
Project state; it does not execute a certified model call. The Petra step must
therefore be exercised later with the server-owned certified runtime configured,
and no model evidence is inferred from this launcher.

## In-product boundary

The global **Test guide** opens the same stable route from any Project surface.
The guide:

- chooses the live scientific Project with represented task places;
- identifies its profile, current focus, authority snapshot, and projection;
- links the eight accepted checkpoint tasks in their required order;
- names expected outcomes and safe optional mutations;
- links the registered additive profile-reset control in Settings; and
- states that unavailable controls and this checkpoint do not imply Wave 6
  completion.

An empty clean store renders a creation instruction and does not fall back to
reference fixtures. The Settings reset archives the selected exact Project
revision and creates an additive registered-profile replacement. It does not
delete unrelated Projects or reconstruct the entire representative evidence
history; the guide states that boundary directly.

## Usable Work controls

The production Work detail loader now composes its existing task view with the
server-owned Work-operation assessment. The route renders only assessed
availability and binds the registered operation request without inventing an
actor, authorization grant, lifecycle state, response option, plan revision,
run identity, or result destination.

The visible controls cover start, exact registered input response, steering
with priority, priority change, leave-running return, reconnect, durable replay,
confirmed cancellation, eligible retry, and the server explanations for Resume
and Start again. The same command and idempotency identity survives an unchanged
retry. Failure retains entered instructions; success renders the exact outcome,
state, limitations, and result destinations. Reconnect and replay reject a
cross-Project, cross-Work, or wrong-run delivery before showing success.

Resume and Start again remain unavailable because no compatible-checkpoint
transition or workflow-specific fresh-input rebinding command is registered.
Their controls expose those exact server-owned reasons.

## Verification and evidence boundary

Focused tests cover the guide selection/empty state, the complete Work control
inventory, exact operation request construction, no client-authored authority,
production command endpoints, loader composition, and command result mapping.
The live disposable-store launcher migrated PostgreSQL through V045, completed
the supported paired-profile continuation and restart, held the strict URL, and
rendered the guide in isolated headless Chrome with its Project starting state,
Work step, reset control, registered-profile context, and known limits. The
complete repository `npm run verify` gate is required before this slice is
committed.

No frozen evidence-plan entry is recorded by this report. Unit tests, static
markup, implementation review, and a startup launcher are not substitutes for
executing `stable-url-clean-start-reset`, `usable-work-ui`, or the complete
guided browser scenario through the live application.
