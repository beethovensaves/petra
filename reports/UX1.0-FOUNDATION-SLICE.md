# UX1.0 Foundation Slice Evidence

- **Status:** review candidate; bounded foundation slice implemented
- **Date:** 2026-09-02
- **Branch:** `design/m1-ux`
- **Decisions:** `UX1.0-DISC01`, `UX1.0-DISC02`
- **Evidence:** `UX1.0-EV01`, `UX1.0-EV02`, partial `UX1.0-EV03`

This report records the first production-candidate UX1.0 vertical slice. It does
not mark UX1.0 complete and does not authorize the UX1.1 shell redesign. The
existing workbench receives the accepted fonts and token compatibility layer;
the new scientific-state grammar is reviewed in isolated, addressable fixtures
before a consuming module adopts it.

## Accepted boundary

- The exact production rock and lockup are accepted separately under
  `UX1.0-W07` and recorded in `UX1.0-BRAND-SLICE.md`.
- Bebas Neue is used only for the uppercase PETRA wordmark.
- Inter is used for product headings, controls, tables, and prose.
- Monospace is restricted to identifiers, metrics, provenance, and code.
- The latest inspiration image supplies palette, density, and editorial
  character, not Petra's information architecture or scientific semantics.
- Shared state is contextual rather than one universal badge treatment:
  authority is an explicit marker; freshness stays with its snapshot; origin
  stays near the statement; evidence relations use text and line pattern;
  source depth remains a persistent limitation; work includes activity and
  recovery; unavailable actions name their reason and prerequisite.

## `UX1.0-EV01` — token and primitive inventory

### Foundation assets and roles

| Area | Implementation | Boundary exercised |
| --- | --- | --- |
| Font delivery | `apps/workbench/src/assets/fonts/InterVariable.woff2`, `BebasNeue-Regular.woff2`, and adjacent OFL license texts | Self-hosted assets; no external runtime font request and no root dependency change |
| Semantic tokens | `apps/workbench/src/design-system/tokens.css` | Palette foundations; surface, text, border, focus, action, state, type, spacing, sizing, density, shape, elevation, and motion roles |
| Contextual state | `apps/workbench/src/design-system/state.tsx` and `state.css` | Authority, freshness, outcome, source depth, origin, evidence relation, review posture, and availability without color-only meaning |
| Fixture view model | `apps/workbench/src/fixtures/foundation.ts` | Named presentation model with explicit mapped versus presentation-only contract status |
| Gallery composition | `apps/workbench/src/fixtures/FoundationGallery.tsx` and `fixture-gallery.css` | Production components, route selection, skip path, responsive reflow, and unknown-fixture recovery |
| Application boundary | `apps/workbench/src/main.tsx` and `router.tsx` | Tokens load before legacy styles; gallery routes remain isolated from production navigation |

The new component styles consume semantic tokens. Compatibility aliases in
`tokens.css` allow the provisional shell to keep rendering, but new code does
not consume those aliases. Existing raw values in the legacy shell remain
registered design debt rather than being silently treated as normalized.

Font provenance recorded with the assets:

- Inter variable WOFF2 from the [official Inter distribution](https://github.com/rsms/inter), with SHA-256
  `693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3`;
- Bebas Neue regular WOFF2 from the [official Dharma Type repository](https://github.com/dharmatype/bebas-neue), with SHA-256
  `395cb0944c3d0ada8beb178b9e9a9887e75f76302544abeaaf1f1ef4b3a0b19b`.

## Contract and fixture boundary

The foundation model reuses accepted contract fixture identifiers where
scientific or durable-work data appears. Loading, empty, and density pressure
that exists only to exercise interface behavior is explicitly labeled
`presentation_only`; it cannot become scientific authority.

| Route ID | Scenario | Contract status | Primary boundary |
| --- | --- | --- | --- |
| `ordinary` | `UX-FX04` | Mapped | Claim, Assertion, SourceSpan, current snapshot, full-text depth, extraction origin, supporting relation |
| `empty` | `UX-FX01` | Presentation only | Honest early-project absence and prerequisite language |
| `loading` | `UX1.0-STATE-LOADING` | Presentation only | Route resolution without borrowed scientific state |
| `cached` | `UX-FX02` | Mapped | Snapshot-bound cached ContextPacket and EvidencePacket |
| `running` | `UX-FX10` | Mapped | Durable WorkUnit objective, stage, update time, and reconnect meaning |
| `failed` | `UX-FX11` | Mapped | Operational failure distinct from negative scientific evidence |
| `stale` | `UX-FX09` | Mapped | Applied PostgreSQL authority distinct from projection catch-up |
| `abstract-only` | `UX-FX03` | Mapped | WorkVersion reading-depth boundary and unavailable method action |
| `dense` | `UX-FX08` | Presentation only | Compact non-color differentiation across state dimensions |

No `UX-REQ` is created by this slice. It consumes existing contracts or
interface-only state. A later consuming module must raise a `UX-REQ` if its
composite query, command, event, or authority boundary is not already accepted.

## `UX1.0-EV02` — routes and rendered evidence

Addressable routes:

- `/__fixtures/foundation` renders the complete gallery;
- `/__fixtures/foundation/:fixtureId` isolates one registered pressure;
- an unknown `fixtureId` renders an explicit failure and recovery path.

Rendered checks:

- [ordinary at 1440 × 1000](ux1.0/screenshots/foundation-ordinary-1440.png)
- [failed at 1440 × 1000](ux1.0/screenshots/foundation-failed-1440.png)
- [dense at 1440 × 1200](ux1.0/screenshots/foundation-dense-1440.png)
- [abstract-only at 390 × 844](ux1.0/screenshots/foundation-abstract-only-390.png)

The true 390 CSS-pixel capture measured a 390px document, 390px main surface,
358px fixture card, and no document-level horizontal overflow. The fixture
navigation intentionally remains a 715px scroll strip inside its 390px client
box so all named routes stay available without collapsing their labels.

## `UX1.0-EV03` — accessibility slice

This is repeatable foundation evidence, not yet the full UX1.0 accessibility
validation.

| Check | Result |
| --- | --- |
| Keyboard order | The first seven Tab stops were skip link, workbench return, all-fixtures route, ordinary, empty, loading, and cached. Every stop matched `:focus-visible`. |
| Skip path | The first focusable element links directly to the fixture `main`; the target is programmatically focusable. |
| Reduced motion | With `prefers-reduced-motion: reduce`, `--petra-motion-fast` resolves to `0ms` and residual transition duration resolves to `0.01ms`. |
| Zoom-equivalent reflow | A 720 CSS-pixel layout pressure, equivalent to a 200% zoomed 1440px canvas, retained a 720px document and 672px fixture card with no page overflow. |
| Narrow reflow | At 320 CSS pixels the document and main remain 320px and the card is 272px; only the named-route navigation scrolls internally. |
| Non-color state | Labels, dimension names, symbols, border patterns, relation line styles, and explanatory text remain present independently of semantic color. |

The checked small-text contrast pairs are: primary/canvas 15.76:1,
secondary/canvas 7.10:1, tertiary/canvas 4.70:1, link/canvas 6.64:1,
positive/soft 4.67:1, information/soft 5.98:1, caution/soft 4.80:1,
danger/soft 5.03:1, and hypothesis/soft 5.69:1. The first pass exposed the
tertiary token at 4.36:1; it was darkened before these screenshots and results
were recorded.

The shared-control keyboard, focus, reduced-motion, narrow reflow, and 200%
text-only scaling extension is recorded in `UX1.0-PRIMITIVES-SLICE.md`.
Screen-reader review, cross-browser checks, and repeatable automated
accessibility/visual-regression tests remain integrated validation work.

## Automated verification

The slice was checked with the pinned Node 24 toolchain:

- `npm test --workspace @petra/workbench`: 2 files, 9 tests passed;
- `npm run build:server`: passed, producing only ignored build artifacts needed
  for workspace declarations;
- `npm run typecheck --workspace @petra/workbench`: passed;
- `npm exec eslint -- apps/workbench`: passed;
- `npm run build:workbench`: passed, including both self-hosted font assets;
- `git diff --check`: passed.

No install was performed. Root package files, the lockfile, server source,
contract source, core source, adapter source, persistence, workers, and
infrastructure were not changed.

## Review boundary and remaining UX1.0 work

This first slice remains the state-and-fixture foundation record. Later bounded
UX1.0 slices now cover the accepted brand and shell-essential controls. UX1.0
still stops before:

- completing specialized chips, badges, popovers, tables, trees, split panes,
  and the full D006 language matrix (`UX1.0-W03`–`W06`, `W11`);
- replacing the provisional workbench shell, graph-first default, autonomy
  controls, or raw AG-UI diagnostics;
- wiring the foundation view model to a live composite provider;
- beginning consequential UX1.1 information hierarchy or navigation work.

Any remaining refinement stays in UX1.0. Advancement to shell design begins
with a separate UX1.1 discussion.
