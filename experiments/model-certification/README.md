# Live model certification

Petra activates a model deployment for one bounded role only after it passes a
versioned behavioral fixture and the real gateway path. Provider identity or a
schema-valid response is not enough.

## Local extractor

The current local candidate is Docker's verified
`docker.io/ai/qwen3.5:35b-a3b-q4_K_XL` artifact. It runs through Docker Model
Runner's loopback-only OpenAI-compatible endpoint. Enable the endpoint and
prepare the exact runtime with:

```sh
docker desktop enable model-runner --tcp=12434
docker model pull ai/qwen3.5:35b-a3b-q4_K_XL
docker model configure --context-size 8192 ai/qwen3.5:35b-a3b-q4_K_XL -- --chat-template-kwargs '{"enable_thinking":false}'
npm run models:certify:local
```

Do not expose port `12434` beyond loopback. Docker Model Runner does not require
authentication on this local API, and Petra's adapter rejects non-loopback base
URLs.

Use `PETRA_LOCAL_MODEL` to evaluate another installed and configured artifact.
Use `PETRA_LOCAL_MODEL_BASE_URL` only to select another loopback endpoint. A
candidate must expose an exact immutable digest and one inspected llama.cpp
configuration with a context size of at least 4,096 tokens.

The command prints one JSON evidence record and exits nonzero unless all of the
following hold:

1. every synthetic certification case is canonical-schema valid;
2. every quote resolves exactly to the authorized SourceSpan;
3. source stance, proposal role, detail level, modality, and negation match the
   case's bounded scientific expectation;
4. abstract-only content remains broad and uses an allowed claim kind; and
5. an active certification routes a fourth call through `ModelGateway` into a
   machine-checked quarantine proposal.

The provider-facing JSON grammar is a bounded projection of Petra's canonical
contract because llama.cpp supports only a subset of JSON Schema and rejects
very large repetition bounds. Petra independently validates the returned object
against the complete canonical contract. The projection can narrow generation;
it cannot grant authority or make invalid output valid.

Certification identity includes the model digest, prompt and dataset hashes,
canonical contracts, required validators, effective runtime configuration,
Docker Model Runner versions, and local hardware profile. A material change
requires another certification.

## Subscription-backed extractor

The initial remote candidates use the existing Codex-managed ChatGPT OAuth
session. No Platform API key is required:

```sh
npm run test:codex-extractor:integration
```

The command discovers the current entitlement through App Server `model/list`,
evaluates GPT-5.6 Luna and Terra by default, records each result independently,
and passes the portfolio gate only when at least one model earns active
extractor certification and produces a machine-checked quarantine proposal.
It uses ephemeral read-only threads, rejects any tool activity, and reports
subscription token and per-call cost accounting as unavailable.

Override the candidate list only for an explicit comparison:

```sh
PETRA_CODEX_CERTIFICATION_MODELS=gpt-5.6-luna npm run test:codex-extractor:integration
```

## Optional Platform extractor

The official OpenAI TypeScript SDK and Responses API adapter remains available
for a future metered Platform deployment. It is not required by Petra's
individual-workbench baseline and is not part of the M1.5 completion gate.

## Subscription-backed synthesist

The synthesist is certified independently from the extractor through the same
Codex-managed ChatGPT OAuth session:

```sh
npm run test:codex-synthesist:certification
```

The command first evaluates one exact ContextPacket/EvidencePacket response and
two deterministic negative controls. Only an active role certification allows a
second model turn through `SynthesistGateway`. That turn records the exact
prompt, packet records, routing choice, validation, timing, and unavailable
subscription accounting in `model-request@1.1.0` and `model-call@1.1.0` objects.
It accepts no API-key configuration.
