# Automated Wave 7 handoff

Wave 7 delivers the complete document-first Composition experience from
`UX1.7` while preserving every accepted Wave 6 operation. It closes the 15
milestone-7 entries in `scripts/ui-operation-inventory.json` through the same
stable application URL and production model, Work, Review, provenance, History,
and recovery owners.

## Outcome

> A person can create or open a governed artifact, write and save continuously,
> ask Petra in exact passage or document context, inspect support and findings,
> compare or restore revisions, validate and render, export a clearly marked
> working copy, and promote an exact revision through Review without losing
> authorship, provenance, selection, uncertainty, or prior work.

Wave 7 ends in `needs_user`. Workers cannot satisfy the final Composition
acceptance record.

## Binding gates

- `npm run gate:wave6:user-testable` must continue to pass. Wave 7 cannot trade
  away a core application operation to finish Composition.
- `npm run gate:wave7:composition` must pass with executed evidence attached to
  every operation due by milestone 7.
- The document is the primary workspace. Cards, raw records, and provenance
  dumps cannot replace continuous editing and exact contextual inspection.
- Local text, durable save, model proposal, support assessment, validation,
  promotion, render preparation, clipboard acknowledgment, download initiation,
  and confirmed delivery remain distinct observable states.
- An actual certified model must execute at least one scoped Composition request
  through the UI. A fixture or direct backend call does not satisfy the model
  path.
- Felicity changes must preserve validated force, scope, origin, uncertainty,
  citations, and author language. Failed preservation remains visible and does
  not overwrite the prior revision.
- The stable URL, representative Project, in-product guide, and reset path from
  Wave 6 remain the user entry point.

## Slices 1–20: Composition delivery

1. Backend audits all 15 milestone-7 operations and `UX-REQ-017`–`019`.
2. Design audits the document-first task, editor hierarchy, and existing
   presentation-only controls against DB12.
3. Backend completes Composition collection/document reads and creation.
4. Design delivers collection, new-artifact, and document entry in the shared
   shell.
5. Backend completes exact local/base/current editing and durable save commands.
6. Design delivers continuous editing, save acknowledgment, conflict
   preservation, and recoverable local state.
7. Backend binds scoped model requests and late results to exact selections and
   revisions.
8. Design delivers contextual Petra for passage, section, and whole artifact.
9. Backend completes provenance, support, findings, and source-context reads.
10. Design delivers inline inspection without displacing the document.
11. Backend completes revision comparison, restoration, and stale-assessment
    reconciliation.
12. Design delivers comparison and restore with selection and author work
    preserved.
13. Backend completes validation, Felicity, renderer, citation, and output
    operations with distinct effects.
14. Design delivers findings, revalidation, render, citation, and Felicity
    feedback in the document task.
15. Backend completes exact export capture, status carriage, output members,
    clipboard/download observations, retry, partial delivery, and cancellation.
16. Design delivers marked working-copy export and observable delivery outcomes.
17. Backend completes exact revision promotion through Review and History.
18. Design delivers send-to-Review, return, and post-promotion document state.
19. Backend executes a fresh-store end-to-end Composition trace with an actual
    model, restart, conflict, partial delivery, and no duplicate effects.
20. Design executes the mandatory operation, visual, interaction, and Felicity
    inventory audit before the remediation reserve.

## Slices 21–64: remediation and acceptance reserve

21–24 fix the highest-severity backend and design findings, then repeat the
fresh-store and guided browser traces. Slices 25–28 run cumulative Wave 6 and 7
operation gates, paired-profile Composition, visual/responsive review, failure
and recovery, and model-result conflict tests. Slices 29–32 run the first final
critic, complete repository, stable URL, reset, and clean pushed-branch
reconciliation. Slices 33–63 repeat those remediation and evidence cycles in
severity order. The controller may publish the guided Composition task and
return `needs_user` for `USER-TESTABLE-02` as soon as every automated gate has
passed. Slice 64 is the final safety boundary and cannot convert missing
evidence into completion.

## Stop rules

- A disabled Save, export, model, validation, render, restore, or promotion
  control assigned to Wave 7 blocks exit.
- Fixture-only content, local-only save, or prepared-but-unobserved delivery does
  not count as an operation.
- Late model or validator results must never overwrite or certify newer text.
- When only the user acceptance record remains, return `needs_user` with the
  stable URL, exact task, starting revision, expected outcomes, reset, and limits.
