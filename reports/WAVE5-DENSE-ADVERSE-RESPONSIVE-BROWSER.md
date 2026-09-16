# Wave 5 dense, adverse, responsive browser observation

Date: 2026-09-16

Slice: Wave 5 Slice 20

Design start: `ab25c097e362a21d6212f020f7e5d07d3bdc10ef`

Backend counterpart: `3978aafc0a22d35f99d6988f0f3ec3aa9f61ac1c`

Status: implemented and executed; cumulative Wave 5 evidence remains open

## Result

`npm run test:wave5:adverse-browser` executes `UX-FX25` through the production
focused-graph orientation, exploration, result, Details, analysis, and
Cytoscape rendering components in isolated headless Chrome. The retained
machine-readable observation is
`reports/WAVE5-UX-FX25-BROWSER-OBSERVATION.json`.

The fixture supplies 32 objects, 33 relationships, 33 paths, all five distinct
registered relationship meanings, a two-edge cycle, a partial restricted path,
capped and unknown paths, four explicitly hidden WorkingCandidate
relationships, a stale working member, an exact missing destination, and
incomplete comparison and historical positions. It uses injected synthetic
reads so the browser scenario is deterministic and cannot create a command or
domain effect.

## Production behavior exercised

- Dense and cyclic rendering retained all 32 objects and 33 relationships. Two
  repeated layout captures had the same SHA-256 hash.
- A deliberate Cytoscape initialization failure kept the complete textual
  relationship facts and exact selection available. The visible retry restored
  the production canvas without a Project effect.
- An injected disconnected expansion labeled the displayed result as cached and
  retained the question, represented snapshot, selection, and explicit
  non-currentness boundary. Retrying the exact read succeeded.
- A response for snapshot event 41 was rejected while event 42, the exact
  selection, and a visible retry remained in place. Retrying the active request
  accepted an exact event-42 response.
- Deliberately out-of-order expansion responses accepted the newer request and
  rejected the older completion without replacing the selected object.
- Current, catching-up, unavailable, and rebuilding projection positions kept
  PostgreSQL authority distinct from the rebuildable Neo4j projection.
- Historical unknown dates, incomplete comparison, and a stale working base
  remained explicit and non-authoritative.
- At 1440 by 1000 CSS pixels, 390 by 844 with 200% root text, and 320 by
  844 with 200% root text, the document had no horizontal overflow. Direct
  narrow entry started with the complete textual peer. Keyboard activation
  deliberately opened Graph and retained focus; a 44-pixel control returned to
  Text by emulated touch. Graph, named expansion, and Details actions remained
  present at the 320-pixel boundary.
- Forced colors preserved a solid non-color relationship boundary. Reduced
  motion reduced the inspected transition to `0.01ms`; coarse-pointer media was
  active. The Chrome accessibility tree exposed the entry, exploration, result,
  and relationship-matrix headings.
- Citation, support, contradiction, qualification, and inference remained
  identifiable by text, symbols, direction words, origin, authority, and
  limitations rather than color or position alone.

## Observed renderer timings

The retained JSON records the exact first and repeated dense-render timings from
pinned Node 24.20.0 and headless Chrome 152.0.7977.84 on Darwin arm64. The
command also verified the exact Slice 19 backend support artifact at SHA-256
`51fbe21b8be7ade8df3d77b8facff178fbb581efedc660c7f0c5d094083cc70b`.
That prior fresh-store run recorded a 110.724 ms focused query and a 7.154 ms
finite dense query; Slice 20 did not re-execute those database operations. These
are single-environment observations, not an SLA, a universal threshold, graph
importance, confidence, or product authority.

## Executed frozen records

This command actually invoked and retained passed observations for:

- `UX1.5-EV01/dense-temporal-adverse-fixture`;
- `UX1.5-EV03/non-color-relation-semantics-browser`;
- `UX1.5-EV04/dense-cyclic-performance`;
- `UX1.5-EV04/stale-late-response-browser`;
- `UX1.5-EV04/disconnected-offline-recovery-browser`;
- `UX1.5-EV04/projection-rebuild-browser`; and
- `UX1.5-EV04/responsive-text-motion-touch-browser`.

The command does not claim `UX1.5-EV03/keyboard-focus-browser`: it did not
execute that scenario's complete Details, source-inspection, action, recovery,
and return sequence.

## Evidence boundary

Touch, coarse pointer, forced colors, and reduced motion were Chrome emulations;
no physical touch-device result is claimed. Browser semantic structure and the
Chrome accessibility tree were inspected, while native screen-reader evaluation
remains outside Wave 5. The browser used synthetic transport for deterministic
frontend adverse states. The exact Slice 19 artifacts remain backend support
for real PostgreSQL, Neo4j, HTTP disconnect, and projection-rebuild behavior and
are not relabeled as browser evidence.

PostgreSQL remains authoritative. Neo4j remains a rebuildable projection. The
renderer consumes the renderer-neutral view model; renderer failure, layout,
coordinates, selection, retry, and representation switching create no domain
authority. Existing Review and Work ownership is unchanged.

## Next safe boundary

Backend Slice 21 may now execute the paired-profile cumulative trace on fresh
PostgreSQL and Neo4j stores for the seven `M1.7-AC01` through `M1.7-AC07`
scenarios. It must not promote this synthetic browser transport to backend
fresh-store evidence.
