# Wave 4 item 53 — exact continuation and adverse-state support

Item 53 is implemented from backend baseline
`b2d1bee86f6ccf34d37e4abec8a51317da6f8815` and exact design counterpart
`5fbc18a95dd1c4f583983a8294d634683909e7cd`.

## Result

`npm run test:wave4:evidence-support` creates fresh disposable PostgreSQL and
Neo4j stores, reconstructs the item-49 records needed for presentation, starts
the production server, and exercises the production typed clients and routes.
The mode does not configure a model provider or artifact S3 service and does not
make a provider request. The sole external-model execution remains the item-49
record in
`reports/WAVE4-NATURAL-CONVERSATION-MODEL-IDENTITY-TRACE.md`.

The provider-free setup retains these published identities:

- ProjectThread `project_thread_1TVS320FP5Z477P8NY46FXAZF9`
- ProjectTurn `project_turn_7MH84CJ73Z12ZV2YTEP9S188QB`
- InteractionRun `interaction_run_525CDXC6KHKJEB9045XDXJTVBT`
- WorkUnit `work_unit_1M59PHH5NWTD9XKTJKGSQQ3ED0` at terminal revision 4
- ContextPacket `context_packet_01ARZ3NDEKTSV4RRFFQ69G5FCD` and snapshot
  `snapshot_01ARZ3NDEKTSV4RRFFQ69G5FCE`
- GroundedResponse `grounded_response_0R812XV7Z34417E3M3F49QNE0A`
- synthesist ModelCall `model_call_34EMJF50M0NHVMQA3D6187NS4R`
- extractor certification `role_certification_10E9K7FHS4KN7YFASNNH9ERRDX`,
  request `model_request_4P74X6DN937NDNTDZQRBXGF0TJ`, ModelCall
  `model_call_5VSBMFNNFMQ89Q9B77W9WAWA5W`, proposal
  `evidence_proposal_bundle_17WF4DWBPWERF73DV0R9HS3FME`, and model Actor
  `actor_5QACHV6W8A66X4J3Y5KFVGHCX8`
- WorkingCandidate `working_candidate_131W6GBBPYDG1CX0FSQKX1RJ10`,
  WorkingRelationship `working_relationship_5MV0X9MX2PGD1T6W4AE42AC5DT`,
  and ReviewSession `review_session_01K4D000000000000000000004`

The reconstructed ModelCall records are presentation setup, not new provider
evidence. Provider request identifiers, raw provider output, and provider usage
accounting are not invented. The setup instead binds the already-published
model identity and candidate output to fresh-store canonical records and labels
their accounting unavailable.

## Exercised backend boundaries

The focused trace proves:

- cross-Project Review read, correction, refresh, and failure-checkpoint
  preparation are rejected;
- correction and refresh require exact current Review and working-state heads;
- successful correction, refresh, authority commands, and Apply retries do not
  duplicate effects;
- the item-49 model correction remains non-authoritative, retains its exact
  model Actor and ModelCall provenance, records a material limitation, and
  leaves Apply at an authenticated human checkpoint with ReviewPolicy not
  applicable;
- an authority advance makes the unrefreshed Review stale and exposes the
  server-owned refresh recovery;
- successful Apply reports `catching_up` with pending projection records;
- a separate Review checkpoint made stale after preparation returns
  `reconciliation_required` and `REVIEW_APPLY_STALE`; its steps are unverified
  or unattempted, its member remains awaiting decision, and retries preserve
  the same durable cardinalities; and
- restart preserves the working-state hash, item-49 Review identity, and exact
  durable counts.

The controlled-writing Project is seeded through the existing paired-profile
owners and remains at one working candidate, no ChangeSet, no command, and no
domain event. No controlled-writing Apply path is introduced.

## Item 54 browser attachment

Item 54 can attach a design-owned observer without adding a product route:

```text
PETRA_WAVE4_EVIDENCE_OBSERVER=<module-path> npm run test:wave4:evidence-support
```

The module must export `createWave4EvidenceObserver({ root })` and return an
object with `record(stage, context)` plus an optional `close()`. The runner
emits these stages in order:

1. `corrected_blocked_limited_basis`
2. `stale_before_refresh`
3. `refreshed_paired_profile`
4. `projection_lag`
5. `governed_command_failure`
6. `restart_complete`

At `projection_lag`, the observer must perform the explicit human Apply through
the production browser and return its `{ request, result }`. At
`governed_command_failure`, it must prepare the failure Review in the browser,
await the supplied `advanceAuthority()` callback exactly once, perform Apply in
the browser, and return `{ request, result }`. The runner validates both typed
contracts and the no-effect failure boundary. The callback stages authority
through the canonical ChangeSet command owner; it does not simulate a route
response.

The existing item-50 browser driver can consume the earlier stage contexts for
the natural-conversation, corrected/blocked, limited-basis, stale, refreshed,
paired-profile, and explicit-Apply presentation. Any small driver extension
needed to place the authority advance between prepare and Apply remains
design-owned.

## Evidence and limits

The backend-focused run sets `browser_scenarios_executed` to `false`; it does
not create a coordinator evidence record. It invokes no browser, external
model, or screen reader. Item 54 must actually attach the production-browser
observer and retain one passed record for each of the six outstanding named
sidecar scenarios. This report is implementation evidence only and is not a
substitute for those recordings.

