# Wave 6 slice 25 — Work result destinations

Status: backend prerequisite passed; Wave 6 operation gate remains incomplete

Date: 2026-09-19

Counterpart inspected: `d3705c6d000e4dd235591dc678d4f30da448e87d`

## Result

The Project semantic-location authority now resolves the two result identities
already returned by the composed Work operation read:

- `petra.grounded-response` resolves to Petra for inspection, with Work and
  History alternatives;
- `petra.worker-output-manifest` resolves to Work for inspection, with History
  as an alternative.

Both adapters validate the exact stored contract and record hash, preserve the
selected and current result revisions, and return the exact producing
`petra.work-unit` as `parent_ref`. Missing revisions and cross-Project records
continue to use the existing non-disclosing Brief fallback.

The disposable production checkpoint now also registers the scientific
ProjectDefinition's `scientific.research-question` inquiry role through
`PostgresProjectInquiryAuthorityRepository`. It records exact Work links for
both the representative parsing task and the completed grounded-synthesis task.
The mapping uses the current definition registration, Objective identity,
content hashes, Work revisions, specification hashes, and record hashes; it is
not a client-invented scientific fallback.

No React component, CSS, or browser route changed in this slice.

## Verification

- focused semantic-location unit suite: 5 passed;
- real PostgreSQL 18.6 integration after Flyway V001–V047: 19 files and 169
  tests passed, including both result adapters and exact producing-Work refs;
- production cumulative disposable-store trace: passed through initial launch,
  restart, certified-model readiness, browser scenarios, retained identities,
  and duplicate-effect checks;
- complete `npm run verify`: passed under pinned Node 24.20.0;
- `npm run gate:wave6:user-testable`: still fails with 97 incomplete
  milestone-6 operations.

The production cumulative trace was a setup and regression check, not a new
Wave 6 evidence record. It did not execute the frozen
`UX1.6-WORK/usable-work-ui` scenario.

## Remaining design integration

The design branch must consume the resolved result and its `parent_ref` without
discarding exact identity. The grounded response must render the exact retained
response and basis in Petra. The worker output manifest must open its producing
Work task while retaining the selected manifest identity and render the exact
outcome, outputs, diagnostics, measured resources, and limitations. A redirect
to a result ID as though it were a WorkUnit ID is not sufficient.

After that bounded integration, re-run the complete Work browser scenario. Only
attach `UX1.6-WORK/usable-work-ui` evidence if meaningful stages, inquiry paths,
input, steering or priority, detach/reconnect, replay, cancel or retry recovery,
both exact result destinations, and exact return all pass through production
controls.
