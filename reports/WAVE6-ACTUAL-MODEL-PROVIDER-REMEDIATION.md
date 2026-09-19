# Wave 6 actual-model provider remediation

Date: 2026-09-19 America/New_York

Status: backend slice complete; the named production-UI model scenario passed.

Backend starting commit:
`a50b191685720690e6e1215d8438b3000682fe82`

Exact design counterpart:
`ddefb8c4d3711921bdcca8eaabfbf612fc5bc495`

## Repaired boundary

Fresh-store setup previously registered certification Actor
`actor_7RVPE6RBYWGY6B71FQGPHREE8Q` as “Petra certified synthesist
evaluator.” The certified runtime owns that same ID as “Petra grounded
synthesis service,” so production execution stopped with `ACTOR_ID_CONFLICT`
before contacting the provider.

The runtime now exports one canonical service-Actor constructor and uses it
itself. Provider-free presentation setup uses the same constructor, preventing
setup/runtime identity drift while keeping that checkpoint separate.

`PostgresGroundedResponseAuthorityRepository.registerPacketAuthority` now
persists an already compiled, registry-validated ContextPacket/EvidencePacket
pair independently of response registration. This lets readiness expose exact
Project context before execution without manufacturing a ModelRequest,
ModelCall, GroundedResponse, or reusable cache hit. Persistence remains
transactional, idempotent, exact-content checked, and Project scoped.

## Actual-provider UI execution

The separate `wave6-actual-model-ui` trace was executed from a detached,
ephemeral integration of the exact design counterpart plus this backend patch.
It did not modify the design branch or its two known untracked assets.

The production React Petra composer:

- rendered authenticated managed-ChatGPT readiness for the registered
  `scientific.grounded-synthesist` role and exact packet/snapshot binding;
- submitted “What does the selected study report, and what limits the claim?”
  once with the readiness-owned Project context;
- displayed 10 progress items, the grounded answer, source-report/Petra
  synthesis/unresolved-inference origins, exact references, all registered
  limitations, a durable Work destination, no Review request, and the exact
  return to Brief; and
- displayed `Provider` as execution source and `No authority effect` as the
  authority boundary.

The pre-execution database audit found zero Project ModelRequests, ModelCalls,
and GroundedResponses. The post-execution audit found exactly one of each, one
InteractionRun, one required initial delivery record, and a non-empty real
provider request ID. The result therefore did not come from `memory_cache` or
`durable_cache`, and no direct backend interaction invocation was used.

Retained artifacts:

- `reports/WAVE6-ACTUAL-MODEL-UI-TRACE.json`
- `reports/WAVE6-ACTUAL-MODEL-BROWSER-OBSERVATION.json`

The recorded localhost URL belonged to the disposable production browser run
and was intentionally removed with its stores after the passing trace.

## Verification

All commands used Node 24.20.0 and npm 11.19.0.

- Focused certified-runtime server test: 5 passed.
- Real PostgreSQL 18.6 integration: 19 files and 169 tests passed, including
  packet-only persistence with zero execution/cache records.
- `UX1.6-MODEL/actual-certified-model-ui-path`: passed through the production
  React Petra composer on fresh PostgreSQL 18.6, Neo4j 2026.07.1, and SeaweedFS
  S3 stores with managed ChatGPT `gpt-5.6-terra` provider execution.
- Complete repository `npm run verify`: passed after the retained artifacts
  were formatted, including 1,415 Vitest tests, 25 Python tests, 31 handoff
  tests, the production workbench build, and the UI-operation audit.

## Evidence boundary

This slice satisfies only `UX1.6-MODEL/actual-certified-model-ui-path`. It does
not claim provider-free setup as model evidence, does not claim another Wave 6
scenario, and does not advance the user-owned acceptance record.
