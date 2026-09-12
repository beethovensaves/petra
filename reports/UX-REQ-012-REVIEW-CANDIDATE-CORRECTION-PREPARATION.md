# UX-REQ-012 server-composed Review candidate correction

Status: bounded Wave 4 backend composition slice complete; frozen-interface
integration and later Review operations remain open
Date: 2026-09-12
Design counterpart: `084887a4a349843107f9d78d3d683bc598cb639f`

## Result

The authenticated candidate-correction endpoint now accepts one compact,
registered human edit: replacement text for the exact scientific Claim in one
open single-member Review. The browser still supplies the exact ReviewSession,
member, WorkingCandidate, and WorkingRelationship references plus its command
and idempotency identities. It no longer needs to reconstruct the full Claim or
WorkingCandidate to use this path.

The server composes the complete corrected Claim and WorkingCandidate inside
the existing serializable correction authority. It retains the Claim identity,
kind, normalization, scope, scientific source identity, stance, attribution,
modality, uncertainty, and validator results. It binds the authenticated human
Actor and server submission time, advances contiguous Claim and candidate
lineage, retains the prior candidate as exact input and provenance, preserves
the candidate's ProjectDefinition, task, snapshot, basis, qualifications,
authority boundary, recorder, and creation time, resets validation to pending,
and computes the profile and working hashes.

## Contract, API, and typed client

Command envelope 1.7 adds a second `CorrectReviewCandidate` input shape. It
retains the exact 1.6 Review and working references but replaces caller-composed
records with:

```json
{
  "correction_input": {
    "input_kind": "human_scientific_claim_text_edit",
    "canonical_text": "The corrected scientific Claim text."
  }
}
```

The input rejects extra fields, so callers cannot set scope, source basis,
profile authority, authorship, timestamps, producer, task, provenance,
validation, lineage, or hashes. The existing authenticated endpoint and
`CorrectReviewCandidate` capability remain unchanged:

`POST /api/commands/projects/{project_id}/reviews/{review_session_id}/candidate-correction`

`ReviewCandidateCorrectionClient.correctFromHumanEdit` validates the compact
request before transport. On success it validates each returned contract, the
edited Claim text, the receipt-to-Claim and candidate profile linkages, and the
WorkingCandidate, WorkingRelationship, member, and ReviewSession identities.
The earlier `correct` method and command envelope 1.6 remain available for
trusted adapters that already hold complete registered records.

## Persistence and authority boundary

V038 only permits command envelope 1.7 in the existing canonical command
ledger. It adds no table. Composition occurs after authorization, exact-current
locking, and exact replay lookup within the existing candidate-correction
transaction. The governed retry fingerprint covers the compact edit and exact
references but excludes transport correlation and submission time. An exact
retry after an uncertain client result therefore returns the retained records;
changed text under the same command or idempotency identity fails closed.

The operation still advances the same Claim, WorkingCandidate, ASSERTS
WorkingRelationship, Review member, and ReviewSession identities. It creates no
preparation ledger, candidate ledger, Review ledger, decision, ChangeSet,
Approval, domain event, outbox record, projection instruction, History entry,
or recovery record. Its result remains non-authoritative working state.

## Failure behavior

The compact path shares the existing correction authority's closed failures for
unauthorized, stale, missing, or mismatched Review and working references;
non-open or multi-member Reviews; unsupported profiles; corrupt stored records;
invalid lineage or provenance; incompatible source basis; and concurrent head
changes. It additionally rejects non-human principals, unchanged Claim text,
blank or oversized text, unregistered input kinds, extra edit fields, and
changed-content retries. No prefix of a failed transaction is retained.

## Verification

All checks used pinned Node 24.20.0 and npm 11.19.0.

- Focused contract tests validate both correction envelope versions and reject
  blank text, extra profile fields, incomplete exact references, and implicit
  authority.
- Focused renderer-neutral client tests cover compact transport, local field
  rejection, preserved server errors, and mismatched success rejection.
- Focused authenticated route tests prove server-resolved Actor and capability,
  command envelope 1.7 construction, absence of caller-composed records, strict
  input rejection, and stable authority-error mapping.
- A fresh PostgreSQL 18.6 store validated and applied Flyway V001 through V038.
  All 126 PostgreSQL tests across 16 files passed. The new integration test
  verifies profile and working composition, retained source identity, same-ID
  revision advancement, exact replay after an uncertain result, and retry
  mismatch rejection.
- The complete `npm run verify` gate passed generated-contract and fixture
  checks, the retrieval floor, formatting, lint, TypeScript and Python
  typechecks, the production workbench build, all repository test suites, and
  handoff automation. The production build retained its existing non-failing
  chunk-size advisory.

## Remaining boundary

This is one scientific Claim-text adapter, not general profile correction or
paired-profile conformance. It does not let the browser edit Claim scope,
source basis, uncertainty, relationship meaning, or any authority field.
Material-basis revision remains a separate operation.

The next safe design slice is the bounded frozen **Edit candidate** integration
using `correctFromHumanEdit`. It should retain unsent text and exact command
identity while outcome is uncertain, accept only the matching typed result,
reload the authenticated Review read after success, and present stale,
unauthorized, unsupported, or uncertain failures without implying a Review
decision or authoritative application.

Wave 4 is not complete. Material-basis revision, separation, member recovery,
another materially different profile, ProjectBriefView, CommunicationPlan,
multi-member presentation, and the cumulative live exit proof remain open.
