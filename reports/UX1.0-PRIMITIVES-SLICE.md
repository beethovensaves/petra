# UX1.0 Shared Primitive and Interaction Evidence

- **Status:** accepted foundation baseline; bounded primitive slice implemented
- **Date:** 2026-09-02
- **Branch:** `design/m1-ux`
- **Decision:** `UX1.0-DISC03`
- **Route:** `/__fixtures/primitives`

This slice implements Petra's shell-essential shared controls without
redesigning the provisional shell or inventing module-specific interaction
contracts. It completes `UX1.0-W09`, starts the language work in `UX1.0-W11`,
and supplies the shared-primitive evidence for `UX1.0-AC03`. Token adoption and
the wider primitive inventory remain in progress under `UX1.0-W03`–`W06`.

## Accepted density and scope

- Reading and form controls use the comfortable density.
- Navigation and metadata controls use the compact density.
- Petra does not expose a global density switch in M1.
- Shared unavailable actions remain keyboard discoverable and show both their
  reason and missing prerequisite.
- Busy actions retain a textual label and `aria-busy`; their meaning does not
  depend on spinner animation.
- Specialized chips, badges, popovers, tables, trees, and split panes remain
  deferred until a consuming module defines their scientific object,
  selection, authority, and keyboard contract.

## Production boundary

[`apps/workbench/src/design-system/primitives.tsx`](../apps/workbench/src/design-system/primitives.tsx)
and its adjacent CSS now own:

- primary, secondary, quiet, destructive, busy, and unavailable buttons;
- comfortable and compact links;
- labeled text fields and text areas with adjacent hints and errors;
- controlled tabs with roving arrow-key selection and a distinct panel focus
  destination;
- a focus/hover tooltip with an explicit accessible description;
- a native modal dialog with cancel handling and trigger-focus restoration;
- neutral and failure empty states.

The existing `StateNotice` remains the shared notice treatment rather than
creating a duplicate feedback system. New component styles consume Petra
semantic tokens; compatibility aliases remain limited to the provisional
shell. The primitive route is presentation evidence only: its buttons do not
issue Petra commands, and its dialog copy does not define mutation authority.

## Language boundary

The fixture begins `UX1.0-W11` with patterns that can be validated before
module adoption:

- action labels name their outcome;
- field help describes valid input before entry;
- correction text states what must change;
- unavailable actions state a reason and prerequisite;
- consequential confirmation states that impact, authority, and reversal must
  come from the command contract;
- notices pair state with recovery;
- empty states distinguish honest absence from failure and avoid implying a
  graph mutation.

These examples do not yet complete the full D006 language matrix for module
titles, Hypothesis references, approval prompts, and assistant responses.

## Rendered evidence

- [full desktop primitive gallery](ux1.0/screenshots/primitives-1440.png)
- [true 390 CSS-pixel narrow layout](ux1.0/screenshots/primitives-390.png)
- [720 CSS-pixel 200% zoom-equivalent layout](ux1.0/screenshots/primitives-200-percent.png)
- [200% text-only scaling at 720 CSS pixels](ux1.0/screenshots/primitives-text-200-percent.png)
- [modal confirmation and backdrop](ux1.0/screenshots/primitives-dialog-1440.png)

At 390 CSS pixels, the document, body, and main surface each measured 390px;
the primitive card measured 358px and no document-level horizontal overflow
occurred. At the 720 CSS-pixel zoom equivalent, the document remained 720px
and the card measured 672px. With the root text size increased to 200% at that
same width, the document remained 720px and the card reflowed to 624px without
document overflow.

## Interaction and accessibility evidence

| Check | Result |
| --- | --- |
| Keyboard order | All 22 Tab stops from the skip link through the final recovery link followed source order and had a visible focus outline or inset focus marker. Busy and unavailable actions remained reachable. |
| Tab keyboard behavior | Right Arrow moved focus and selection from Summary to Sources · 3 and replaced the associated panel content. Only the selected tab remained in the Tab sequence. |
| Dialog focus | Opening the confirmation produced a native modal and moved focus to its close control. Escape closed it and restored focus to Preview removal. |
| Field semantics | Hints and correction text are joined to their fields with `aria-describedby`; invalid fields expose `aria-invalid`. |
| Tooltip semantics | The trigger is focusable, names its topic, and references a `role="tooltip"` description that appears on focus as well as hover. |
| Reduced motion | Under `prefers-reduced-motion: reduce`, `--petra-motion-fast` resolved to `0ms`; the spinner animation resolved to one `0.01ms` iteration while the textual busy label remained. |
| Narrow and scaling reflow | 390px, 720px zoom-equivalent, and 200% text-only checks retained document width with no page overflow. |

Cross-browser and screen-reader evaluation remain part of the integrated module
validation; they are not substituted by these browser-semantic checks.

## Automated verification

The pinned Node 24 toolchain reports:

- `npm test --workspace @petra/workbench`: 4 files, 18 tests passed;
- `npm run typecheck --workspace @petra/workbench`: passed;
- scoped ESLint across the workbench design system, fixtures, and router:
  passed;
- Prettier check for the touched workbench files: passed after formatting;
- `npm run build --workspace @petra/workbench`: passed, including the accepted
  rock image and self-hosted Inter and Bebas Neue assets.

No root package file, lockfile, server source, shared contract, core, adapter,
persistence, worker, or infrastructure source was changed.

## Review outcome

Generally approved by the user on 2026-09-02 as the shared Petra control
baseline. This acceptance covers the control grammar, density relationship,
and overall visual character; it does not approve the fixture gallery as
product information architecture. Consuming modules may refine spacing or
composition under realistic pressure without silently changing the accepted
density model, unavailable-action behavior, or accessibility requirements.

The UX1.1 shell hierarchy begins only after its own discussion.
