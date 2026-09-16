# Wave 5 executed-evidence inventory

Date: 2026-09-16

Status: Slice 24 inventory passed with three bounded findings. Wave 5 remains open for the protected remediation and closure reserve.

## Result

`npm run audit:wave5:evidence` reconciled all 24 frozen implementation scenarios. Every scenario has one passed controller record, an invoked command, an exact reachable commit, a retained JSON artifact at that commit, and one matching passed artifact record. The audit found no missing, duplicate, unexpected, failed, or hash-mismatched scenario.

The machine-readable inventory is `reports/WAVE5-EXECUTED-EVIDENCE-INVENTORY.json`. It binds the packet, frozen evidence plan, three roadmaps, accepted Petra scope, controller state, commands, commits, artifact bytes, and scenario records. It does not treat an uninvoked helper or test definition as evidence.

During this audit, the cumulative browser trace was rerun against fresh PostgreSQL and Neo4j stores in Chrome. The live impact route passed with an exact event and response hash. It returned the dependency inventory and explicitly reported consequences unavailable because no exact Review member was bound. UX-FX25 separately executed supplied, incomplete, and stale consequence presentations. The cumulative integration process also exited normally after it verified Docker cleanup.

## Findings for the reserve

1. **Per-scenario UX-FX25 boundaries are not embedded in its retained JSON.** Seven passed adverse scenarios have exact boundaries in controller state, while `reports/WAVE5-UX-FX25-BROWSER-OBSERVATION.json` stores only their keys and statuses plus shared authority boundaries and limitations. The execution is valid, but the committed artifact is weaker than the ten cumulative-browser records. Design remediation should embed each scenario's boundary and refresh those seven records.
2. **Three production behaviors depend on deterministic typed transport for the successful state.** The live scientific profile has no compatible named-expansion recipe, its bounded result excludes the open Review's relationship needed for correction preview, and no Review member assesses the exact focus used by the live impact route. Each live path fails closed or reports unavailability, while UX-FX25 executes named expansion, correction-preview convergence, and supplied consequences through production controllers with injected typed views. The evidence is honest and satisfies the frozen browser scenarios, but final closure must not relabel those successful states as live backend results.
3. **The paired-profile graph proof is intentionally asymmetric.** Scientific focused queries run through live authenticated routes. The controlled-writing graph packet remains synthetic because the installed focused-query HTTP composition is scientific-only. UX-FX24 explicitly requires a fixture, so this is not missing evidence. It remains the main cross-profile product limitation to reassess before final closure.

No native screen-reader evaluation is required or claimed. Chrome semantic structure, keyboard focus, forced colors, reduced motion, text scaling, and touch-target behavior remain within the accepted browser boundary.

## Felicity and critic review

The review covered every `reports/WAVE5*.md` file and the user-facing graph, Details, action-preview, comparison, impact, time, omission, projection, and recovery language in the workbench. Claims were checked against the retained artifacts and their transport boundaries.

One consequential report error was corrected: the Slice 23 adversarial report had attributed the live impact rejection to the compensated Review read. The stricter browser run proved a separate History target-hash binding defect. The report now describes the Review fix, the resolved-target fix, and the cumulative-process exit fix separately. The final browser report also distinguishes the live dependency result and unavailable consequences from the deterministic supplied-consequence presentation.

No remaining report claims a universal performance threshold, whole-Project completeness, renderer authority, live backend execution for injected transport, or native screen-reader coverage. The current language is direct, scoped, and consistent with the product's explicit unavailable and fail-closed states.

## Verification boundary

- `npm run test:wave5:browser` passed UX-FX24, UX-FX25, and the fresh-store live production browser trace and retained ten refreshed scenario records.
- `npm run audit:wave5:evidence` verified 24 of 24 frozen implementation scenarios across their recorded commits and artifacts, with zero errors and seven durability warnings described above.
- `npm run verify` passed on the final integrated Slice 24 tree: generated contracts and fixtures, retrieval floor, formatting, lint, type checks, production build, 1,373 TypeScript tests with seven expected service skips, 25 Python tests, and 24 controller tests.

## Next safe boundary

Backend Slice 25 should confirm that no higher-priority backend gap remains after the exact-target and process-exit fixes, then authorize Design Slice 26 to embed the seven missing UX-FX25 per-scenario boundaries. Wave 5 must not be declared complete before the final cumulative, critic, Felicity, and exit audits in Slices 29–32.
