# FE-A1 live model trace review

The user authorized one live success check after the destination and payload
were stated. It passed on 2026-09-29. An earlier automatic approval review had
rejected the same kind of rerun because it may send Project context to an
external model provider. The provider-free failure and automatic replay trace
had already passed in
[`FRONTEND-LIVE-MODEL-RECOVERY-BROWSER.json`](../FRONTEND-LIVE-MODEL-RECOVERY-BROWSER.json).

The approved check made one remote call through Petra's certified Codex
app-server using the managed ChatGPT session and the pinned grounded-synthesist
role. The recorded runtime in
[`codex-terra-synthesist-1.1.0.json`](../../config/model-certifications/codex-terra-synthesist-1.1.0.json)
pins OpenAI model `gpt-5.6-terra`; readiness checks the managed account's model
catalogue and the certification fingerprint before submission. The check uses
this provider because the production Agent's grounded answer route uses it.
The provider-free failure and replay trace cannot establish that a successful
answer appears in Agent. The approved call's exact registered user question
was:

> What does the selected study report, and what limits the claim?

The outbound context is the disposable scientific Project built from the
repository's accepted [Claim](../../packages/contracts/fixtures/accepted/claim.json),
[ASSERTS relationship](../../packages/contracts/fixtures/accepted/assertion.json),
[SourceSpan](../../packages/contracts/fixtures/accepted/source-span.json),
[ContextPacket](../../packages/contracts/fixtures/accepted/context-packet.json),
and [EvidencePacket](../../packages/contracts/fixtures/accepted/evidence-packet.json)
fixtures. The registered request selects canonical text, predicate, exact span
text, and limitations, together with rights decision and immutable Project
binding metadata. The role is advisory and has no Project authority effect.

The observer is
[`wave6-actual-model-ui-observer.mjs`](../../scripts/wave6-actual-model-ui-observer.mjs).
The [browser result](../FRONTEND-LIVE-MODEL-SUCCESS-BROWSER.json) verifies that
the production Agent rendered the answer, progress, references, limits, and
producing Work destination after one interaction POST. The
[backend result](../FRONTEND-LIVE-MODEL-SUCCESS-BACKEND.json) records one
ModelRequest, one ModelCall with a provider request ID, one GroundedResponse,
one InteractionRun, and one interaction delivery record. The terminal's
authority effect is `none`. The success observer did not issue a separate
retained-run GET after completion, so it does not prove success replay from a
fresh browser. Interrupted failure replay is covered by the provider-free
trace above; success replay remains a narrower open check and would not
require another model call if the retained test store is kept available in a
future run.
