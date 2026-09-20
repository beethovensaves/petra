# Wave 6 — exact open-Review relationship composition

Status: backend remediation passed

Date: 2026-09-20

Backend base: `786684bc670b8c72503ff2c8854f76adde83f0b2`

Exact design counterpart inspected:
`eb2d39a9ecce4ab993981f7c633dfbc9c40a6785`

## Bounded result

The production focused-Graph reader now preserves the exact scientific
`WorkingRelationship` retained by a unique open Review member. The server
resolves the Review member from the exact Project-scoped focus Claim inside the
same repeatable-read PostgreSQL snapshot; the client does not supply a
`WorkingCandidate`, `WorkingRelationship`, Actor, capability, or mutation
decision.

For the registered scientific Review shape, the composed working view contains
the retained WorkVersion source endpoint, the exact WorkingCandidate profile
Claim, and the Review-bound WorkVersion → WorkingCandidate `ASSERTS`
relationship. Its relationship record hash is the same exact revision consumed
by the existing governed correction-preview matcher and by Review Apply's stale
binding checks. Graph inspection and selection remain read-only and grant no
Review, Apply, or domain authority.

The resolver fails closed when the focus belongs to more than one open Review
member, when the Review is not open, when the working binding or profile records
do not reproduce their exact hashes, when the ProjectSource no longer retains
the exact WorkVersion, or when finite result limits cannot contain both
endpoints and the relationship.

No React component, CSS, browser route, migration, or frozen design-owned file
changed in this slice.

## Verification boundary

- focused contract test composes the registered source term, exact focus Claim,
  exact WorkingRelationship record hash, and one complete source-to-candidate
  path without querying renderer geometry;
- real PostgreSQL integration resolves the open Review member through normalized
  candidate membership and proves the composed Review returns the same exact
  WorkingCandidate and WorkingRelationship revisions;
- a mismatched focus hash returns no Review binding;
- all 48 migrations apply and validate from an empty PostgreSQL 18.6 store, and
  all 172 PostgreSQL tests pass;
- `npm run gate:wave6:user-testable` correctly remains red with 97 incomplete
  milestone-6 operations and missing executed evidence; and
- the complete `npm run verify` passes with Node 24.20.0.

This slice does not claim the complete
`UX1.6-REVIEW/correct-reject-defer-apply` browser scenario or Wave completion.
