# Automated wave evidence control

Every automated wave from Wave 5 onward must have a committed
`scripts/wave-handoff-wave-N.evidence.json` before the coordinator initializes
it. The sidecar is part of the frozen execution packet. It converts each named
exit requirement into scenario-level records with a stable evidence ID,
scenario ID, execution owner, and concrete description.

The inventory must cover ordinary, adverse, recovery, authority, provenance,
accessibility, profile, restart, and persistence scenarios that the packet or
accepted roadmap names. A broad evidence-class row is split when its scenarios
can be executed independently. An implementation, helper, fixture, route, test
definition, or report is not execution evidence unless the named scenario was
actually invoked.

Each completed worker slice returns an `evidence` array. A passed record names
the exact command, retained repository artifact, and the boundary of what the
execution establishes. The coordinator records the role, commit, run, and time.
It rejects unplanned records and records submitted by the wrong role. Existing
provider or service evidence may be reused only when the plan permits it and
the retained artifact binds the exact call and identities; reuse is not a new
execution.

The evidence plan also schedules an inventory audit before the remediation
reserve. That audit compares the packet, roadmaps, accepted scope changes, test
invocations, and retained artifacts with the sidecar. The coordinator stops the
wave when the audit deadline passes without its execution record. If the audit
finds an omitted required scenario, workers stop while the packet and sidecar
are amended and their digests are deliberately reconciled. This happens before
the reserved remediation slices are consumed.

At least two slices must remain after the audit; four slices or 25 percent of
the budget, whichever is larger, is the planning default for substantial
waves. The reserve covers implementation support, execution and recording,
adversarial reconciliation, and the final exit audit. A worker's
`wave_complete` result becomes a handoff when any frozen scenario lacks a
passed execution record. User-approved scope changes amend the inventory;
omitted evaluation methods do not silently return in a later audit.
