# UX1.0 Brand Mark and Lockup Evidence

- **Status:** accepted; `UX1.0-W07` complete and `UX1.0-AC05` closed
- **Date:** 2026-09-02
- **Branch:** `design/m1-ux`
- **Decision:** `UX1.0-DISC01`
- **Source reference:** exact primary-logo figure in `petra_brand_inspiration/petra_latest_design_reference.png`

This slice turns the selected black-rock reference into production workbench
components without importing the source board's old wordmark, layout, or screen
semantics. It does not begin the UX1.1 shell redesign.

## Production boundary

[`apps/workbench/src/design-system/brand.tsx`](../apps/workbench/src/design-system/brand.tsx)
owns three code-native elements:

- `PetraMark`: the exact 150 × 140 raster figure extracted from the reference
  board, including its original silhouette, texture, cracks, and anti-aliasing;
- `PetraWordmark`: uppercase PETRA in the self-hosted Bebas Neue face;
- `PetraLockup`: compact, horizontal, and stacked compositions with explicit
  black-on-light and reversed light-on-dark treatments.

The production mark is now the isolated reference raster, not a redrawn SVG.
The source crop is `150 × 140` pixels from coordinates `x=82`, `y=88` in
`petra_latest_design_reference.png`. Background and crack pixels were converted
to transparency while the RGB plane remained unchanged: the decoded RGB frame
before and after alpha extraction has the same MD5,
`421907b4066a5fc97a57f2c4294cc011`. The final RGBA asset is
[`petra-rock-reference.png`](../apps/workbench/src/assets/brand/petra-rock-reference.png),
with SHA-256
`3bec07736dcb134cfb80e3947f173fc9a808480a15ea222207bf13d5e227dcaa`.

The reversed treatment inverts this same raster at render time; it does not
substitute different geometry. A standalone mark may receive an accessible
label; within a visible PETRA lockup, the mark is decorative to avoid duplicate
announcements. The older `petra_logo_inspiration.svg`, former inline
`RockMark`, and rejected hand-traced candidates remain historical
approximations, not production assets.

## Usage grammar

| Surface | Treatment | Tagline | Boundary |
| --- | --- | --- | --- |
| Application header | Compact mark and wordmark | Omit | One home link; no second decorative logo nearby |
| Navigation and assistant identity | Rock only | Omit | Use only when the surrounding role or accessible name is already present |
| Entry, presentation, and brand surfaces | Horizontal or stacked | Optional | Preserve clear space and avoid decorative graph imagery |
| Loading | Rock only | Omit | Motion is nonessential and must honor reduced motion |

The provisional workbench shell now consumes `PetraLockup` and `PetraMark` in
place of its duplicate inline geometry. This is an identity correction only;
its information architecture, graph-first default, navigation, status, and
assistant behavior were not redesigned.

## Rendered evidence

The route `/__fixtures/brand` isolates the accepted roles and scale pressure:

- [desktop lockups at 1440px](ux1.0/screenshots/brand-lockups-1440.png)
- [narrow lockups at 390px](ux1.0/screenshots/brand-lockups-390.png)
- [light and reversed marks from 16px through 96px](ux1.0/screenshots/brand-scale-1440.png)

The 390px capture measured a 390px document with no document-level horizontal
overflow. Horizontal and stacked lockups recompose into one-column fixture
cards at the narrow breakpoint.

At 16px the silhouette carries recognition and the cuts are intentionally
secondary. At 24px and above, the sparse facets remain legible without adding
nodes, dots, or a network motif. The 32px navigation/app scale retains both the
rock reading and the selected asymmetric cut pattern. On 2026-09-02, the user
accepted the rendered lockups as matching the intended figure. That visual
judgment closes `UX1.0-AC05` and completes `UX1.0-W07`.

## Verification

- Component markup tests cover decorative versus labeled mark semantics,
  reversed treatment, and opt-in tagline behavior.
- The existing shell, foundation gallery, and brand gallery consume the same
  extracted image asset rather than reproducing geometry.
- A built-in image-editing background extraction was inspected and rejected
  because it changed source pixels. It is not referenced by the project. The
  accepted asset uses deterministic crop and alpha extraction instead.
- New brand and gallery CSS consumes semantic Petra tokens and introduces no
  raw component colors.
- Workbench tests, typecheck, lint, production build, responsive rendering, and
  `git diff --check` are the release checks for this slice.

## Review outcome

Accepted on 2026-09-02. The exact extracted reference figure retains the
intended appearance in the reviewed lockups. Future refinements may adjust
raster scaling or lockup spacing, but the accepted rock pixels remain fixed
unless a new discussion explicitly reopens the mark.
