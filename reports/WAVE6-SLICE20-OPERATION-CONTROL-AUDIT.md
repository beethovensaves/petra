# Wave 6 slice 20 — mandatory operation-control audit

Date: 2026-09-19

Status: the `WAVE6-OPERATION-CONTROL/complete-ui-operation-audit` inventory
scenario passed with findings. Wave 6 remains open for remediation and executed
product evidence.

## Result

`npm run audit:wave6:operation-control` reconciles every one of the 97 Wave 6
operations at design commit `19c5ab8ccbe0986c0fa21b6567dcba00611a473a`
and counterpart commit `da6a24150180be6c020c1139149591e134e02f5d`.
The retained machine-readable artifact is
`reports/WAVE6-OPERATION-CONTROL-AUDIT.json`.

Each row records the declared route and visible control, inspected production
surface sources, backend contract owner and operation-ledger binding, required
material outcomes, exact-return requirement, attached executed evidence, and
the concrete design disposition. The audit validates completeness against both
the 116-entry operation ledger and the 97-entry Wave 6 backend baseline. It
does not treat source inspection, a route, a report, or an uninvoked test as
product-path evidence.

## Findings

| Boundary | Result | Disposition |
| --- | ---: | --- |
| Wave 6 operations reconciled | 97 | Complete for this audit |
| Live in the current ledger | 43 | Execute material outcomes, exact return, and named evidence before retaining live status for exit |
| Partial | 41 | Complete control, outcome, recovery, return, owner binding, and evidence gaps |
| Presentation only | 2 | Make the client-owned personal-setting operations usable and execute them |
| Unavailable | 7 | Add or finish the registered owner, then enable and execute the control |
| Missing | 4 | Add the production owner where required and the visible control |
| Missing operation-ledger runtime owner | 71 | Bind the exact production or intentionally client-owned boundary |
| Missing attached executed evidence | 97 | Run the owning named scenario and retain its command, artifact, and honest boundary |

The backend baseline reports 66 owned operations, 14 partial owners, nine
missing owners, and eight intentionally client-owned operations. Design must
not invent any of the missing or partial server commands. In particular,
Project import/recovery, Objective framing, source intake/processing, Review
rejection, saved Graph questions, and complete Work restart transitions still
need backend authority before their UI can be complete.

The in-product guide is now implemented and the operation inventory names its
production React route, while the older backend baseline still calls its
design-owned boundary missing. This is ledger drift, not permission for Design
to rewrite a backend-owned baseline. A later integration slice should reconcile
the authoritative status while preserving the current guide.

Resume and Start again remain correctly unavailable, and personal preferences
remain presentation-only. The model, Work, source, Review, Graph, History,
recovery, responsive, language, critic, operation-gate, exit, and user
acceptance scenarios are all still outstanding.

## Evidence boundary

This audit scenario is passed because its complete 97-row reconciliation was
actually invoked and retained. Its boundary is static source and ledger
inspection at the two pinned commits. It does not establish that any control
was invoked in a production browser, that material outcomes or exact return
worked, or that any other frozen evidence scenario passed.

## Next safe boundary

Backend should take the highest-severity missing or partial production owner
identified by the retained artifact, without changing design-owned controls.
After that owner is integrated, Design can perform the corresponding bounded
UI remediation and execute its owning scenario. Wave 6 cannot approach the
user checkpoint until the operation gate has all 97 rows live with attached
executed evidence and every non-user frozen scenario has passed.
