# D015: Language-neutral runtime contracts with JSON Schema

- **Status:** Accepted
- **Accepted:** 2026-08-28
- **Scope:** Canonical runtime-schema representation, TypeScript and Python validation, generated bindings, Pydantic's role, portable JSON profile, canonical hashing, schema evolution, and cross-runtime conformance
- **Depends on:** [D001](D001-local-first-runtime.md), [D002](D002-postgres-neo4j-artifacts.md), [D004](D004-docling-ingestion-and-claim-extraction.md), [D005](D005-trusted-graph-review-and-direct-editing.md), [D007](D007-model-gateway-role-registry-and-routing.md), [D011](D011-experiment-sandbox-and-reproducibility.md), [D013](D013-ag-ui-sdk-interaction-boundary.md), [D014](D014-hono-react-vite-workbench-shell.md)
- **Resolves:** `M1.0-DEC04` and `DISC-03`

## Decision

Petra will use repository-owned JSON Schema Draft 2020-12 documents as the sole canonical representation of data that crosses a runtime boundary or must remain interpretable after the code that created it changes.

The M1 contract toolchain is:

| Concern | Selected mechanism | Authority limit |
| --- | --- | --- |
| Canonical contract | Hand-authored JSON Schema Draft 2020-12 | Owns the portable shape and validation vocabulary, not scientific or authorization decisions |
| TypeScript runtime validation | Ajv's Draft 2020-12 implementation | Enforces canonical schemas; Hono remains only the HTTP adapter |
| TypeScript bindings | Pinned `json-schema-to-typescript` generation | Generated declarations aid development but cannot accept data or redefine the schema |
| Python runtime validation | `jsonschema.Draft202012Validator` | Enforces the same canonical schemas at worker boundaries |
| Python worker models | Pydantic v2 after canonical validation | Provides internal ergonomics; it is not the cross-language contract authority |
| Canonical JSON bytes | RFC 8785 JSON Canonicalization Scheme | Applies only to a schema-defined hash input after successful validation |
| Contract equivalence | Shared accepted, rejected, and canonical-hash fixtures | Determines whether the two runtime implementations agree |

The durable shape is therefore:

```text
contracts/schemas/*.schema.json
             │
             ├── Ajv 2020 validation ── generated TypeScript declarations
             │
             └── Python Draft202012Validator ── optional internal Pydantic model
                              │
                              ▼
                   shared conformance fixtures
```

Petra will not generate the canonical schema from Pydantic, Zod, Hono, database definitions, AG-UI types, or TypeScript interfaces. Those systems consume or map to Petra contracts through visible adapters.

## Where canonical schemas are required

JSON Schema governs records whose meaning must survive a process, language, persistence, or protocol boundary:

- command and query inputs and outputs;
- domain-event and outbox envelopes;
- persisted graph records and projection messages;
- WorkUnit and Python worker request, progress, result, and error manifests;
- model structured-output envelopes before they enter quarantine;
- ContextPackets, EvidencePackets, interaction records, and replay records;
- Petra-owned AG-UI custom-event payloads;
- provenance-bearing artifact manifests and other records used as hash inputs.

JSON Schema is not required for private function parameters, React view state, temporary Python analysis objects, dataframe rows, tensor contents, or other data that does not cross a durable boundary. Domain invariants that depend on history, authority, graph state, or several objects remain application-core rules rather than being forced into a structural schema.

## Repository and generation layout

M1 will establish these logical locations:

```text
contracts/
├── schemas/                  # canonical, human-reviewed JSON Schemas
├── fixtures/
│   ├── accepted/             # payloads both runtimes must accept
│   ├── rejected/             # payloads both runtimes must reject
│   └── canonical/            # expected JCS bytes and hashes
└── registry.json             # schema name, version, $id, and lifecycle status

packages/contracts/src/generated/
└── *.ts                      # generated TypeScript declarations
```

Python workers read the canonical schemas from the packaged `contracts` directory. M1 does not require generated Pydantic source. A Python generator may be added later if it reduces measured worker-development friction, but its output remains replaceable and cannot become a second validator.

Generated TypeScript files are committed for editor, compiler, and review visibility. They carry a generated-file marker and are reproduced by one pinned repository command. CI regenerates them and fails on a diff. Generation must use repository-owned schemas and local references; it must not resolve arbitrary remote schemas during a normal build.

## Petra's portable JSON Schema profile

Every canonical root schema must declare:

- `"$schema": "https://json-schema.org/draft/2020-12/schema"`;
- an immutable, version-specific `$id`;
- a stable title and Petra schema registry entry;
- required and optional properties explicitly;
- the discriminator and `schema_version` needed to interpret the record;
- closed-object behavior unless the schema names a deliberate extension map.

The shared profile imposes these constraints:

| ID | Portable-contract rule | Why Petra requires it |
| --- | --- | --- |
| `D015-PC01` | Persistent records, commands, events, and worker manifests reject unknown properties by default. | A misspelled or newer field must not disappear silently. |
| `D015-PC02` | Extension points are explicit, typed, and namespaced maps. | Extensibility must not reopen every contract to arbitrary data. |
| `D015-PC03` | Validators do not coerce types, inject defaults, remove properties, or otherwise mutate boundary input. | Both runtimes must evaluate the same submitted value. |
| `D015-PC04` | `format` assertions use one Petra allowlist and equivalent TypeScript and Python checkers. | JSON Schema formats are otherwise annotations or implementation-dependent behavior. |
| `D015-PC05` | A `pattern` or custom format enters a shared contract only with accepted and rejected fixtures in both runtimes. | JavaScript and Python regular-expression behavior is not identical. |
| `D015-PC06` | Discriminated unions use an explicit stable discriminator; ambiguous unions are rejected. | Generated types and runtime validators must select the same variant. |
| `D015-PC07` | JSON numbers are finite. Cross-runtime integers remain within JavaScript's safe-integer range. Exact decimals and larger integers use canonical strings. | Scientific and identity values must not change through language-specific number handling. |
| `D015-PC08` | Binary data, large arrays, matrices, tensors, and tables remain content-addressed Artifacts with schema-governed manifests. | Contract JSON should describe scientific data rather than become an inefficient substitute for artifact storage. |
| `D015-PC09` | `$ref` targets resolve through Petra's local versioned registry during builds and validation. | Contract interpretation cannot depend on a mutable remote document or network availability. |
| `D015-PC10` | A schema version is immutable after acceptance. Evolution creates a new schema and an explicit compatibility, migration, or supersession rule. | Persisted scientific meaning must remain recoverable. |

Petra keeps the profile intentionally smaller than the full JSON Schema language. A Draft 2020-12 feature may be added when both validators, the TypeScript generator, and the shared fixtures demonstrate the required behavior. Schema expressiveness is not useful if another runtime silently interprets it differently.

## Runtime boundary behavior

The TypeScript path is:

```text
decoded JSON
  → Ajv 2020 canonical-schema validation
  → typed Petra command, query, or adapter input
  → application behavior
```

Ajv runs in strict schema mode. Input-coercion, default-injection, and additional-property removal remain disabled. Hono middleware may reject size, media-type, authentication, or transport failures earlier, but a Hono validator or inferred route type cannot replace canonical validation.

The Python worker path is:

```text
decoded JSON
  → Draft202012Validator with Petra's format checker
  → optional strict Pydantic model
  → scientific processing
  → JSON-compatible result
  → Draft202012Validator
  → return manifest
```

Pydantic worker models that mirror a boundary contract use a Petra base configuration equivalent to strict input, forbidden extra fields, immutable instances, and validated defaults. Custom Pydantic validators may enforce additional worker-local requirements, but they cannot broaden canonical acceptance or create an undocumented shared-wire rule. A returned `model_dump` is ordinary JSON input until it passes the canonical result schema.

Petra never computes a persistent content identity from Pydantic serialization, JavaScript property insertion order, a generated declaration, or a framework response serializer.

## Canonical hashing

When a contract declares content-derived identity, it also declares the exact hash projection: the fields whose meaning contributes to that identity. After canonical validation, Petra serializes that projection with RFC 8785 JCS and hashes the resulting UTF-8 bytes with SHA-256. The stored textual form is `sha256:<lowercase hexadecimal digest>`.

Canonicalization does not repair invalid data. It runs only after the payload has passed its versioned schema and the JCS-compatible numeric and Unicode constraints. Non-finite numbers fail. Exact values outside IEEE 754 binary64 representation use schema-constrained strings or referenced Artifacts.

TypeScript and Python must produce identical canonical bytes and hashes for every canonical fixture before a content-derived identifier can enter persistent state.

## Schema evolution

Each schema registry entry records its stable name, version, `$id`, lifecycle status, compatibility relation, and replacement when applicable. Petra does not overwrite an accepted schema at the same `$id`.

Unknown fields fail at authoritative boundaries. Compatibility is achieved through explicit schema negotiation, adapter translation, or migration rather than silent field removal. Persisted records retain the schema version under which they were written. A migration that changes scientific meaning creates an auditable new revision or event; it does not disguise reinterpretation as serialization maintenance.

Generated TypeScript declarations may change when the pinned generator changes, but a generator upgrade cannot change accepted or rejected payload behavior. The shared fixtures and canonical schemas decide whether an upgrade is compatible.

## Options considered

### Canonical JSON Schema with direct validation in both runtimes

Selected. It gives TypeScript and Python one language-neutral, inspectable contract while leaving both runtime libraries replaceable.

### Pydantic as the canonical source

Rejected for shared contracts. Pydantic is well suited to Python workers, but coercion, custom validators, serializers, and distinct validation and serialization schemas can express behavior that generated JSON Schema and TypeScript do not reproduce. It would also make Petra's TypeScript control plane downstream of Python model code.

### Zod or another TypeScript schema library as the canonical source

Rejected. This would reverse the same asymmetry and make Python and persisted records depend on the fidelity of a TypeScript-to-schema conversion. A TypeScript validator may wrap canonical validation at an adapter, but it cannot own the contract.

### OpenAPI as the canonical source

Rejected for the domain contract. OpenAPI may later describe Petra's external HTTP surface, but commands, events, worker manifests, persisted objects, and AG-UI adapter records are broader than HTTP endpoints.

### Protocol Buffers

Deferred. Protobuf is strong for high-volume service messages but adds an encoding and schema system that Petra does not need for its JSON-native workbench, AG-UI boundary, visible records, and initial worker traffic. It can be reconsidered for a measured high-throughput internal path without replacing persisted scientific contracts.

### Handwritten TypeScript and Python models

Rejected for shared payloads. Parallel definitions make semantic drift an ordinary maintenance outcome and provide no neutral record for future API, MCP, or migration tooling.

## Consequences

### Benefits

- Cross-runtime meaning is inspectable without running Python or TypeScript.
- Hono, AG-UI, Pydantic, and code generators remain replaceable adapters.
- TypeScript receives concrete interfaces without making those interfaces runtime authority.
- Python retains Pydantic where it improves scientific programming.
- Persistent records have explicit version, unknown-field, numeric, and canonical-hash behavior.
- The same fixtures can certify future API, MCP, sandbox, or additional-language adapters.

### Costs and risks

- Hand-authoring JSON Schema is more verbose than defining a single language-native model.
- Some useful Python or TypeScript type features cannot enter the portable contract directly.
- Format, regular-expression, number, and union behavior need deliberate parity tests.
- Generated TypeScript declarations approximate constraints that the TypeScript type system cannot express; runtime validation remains mandatory.
- Direct canonical validation followed by Pydantic construction performs two checks at a Python boundary. Petra accepts that small boundary cost unless profiling shows it is material.

## M1 conformance

D015 is implemented when:

| ID | Required evidence |
| --- | --- |
| `D015-VC01` | Every canonical schema validates against the Draft 2020-12 meta-schema and resolves all `$ref` targets from the local registry. |
| `D015-VC02` | Ajv and `Draft202012Validator` accept every shared accepted fixture and reject every shared rejected fixture. |
| `D015-VC03` | Fixtures prove that unknown fields, coercible wrong types, ambiguous unions, unsafe integers, non-finite numbers, and unregistered formats fail as specified. |
| `D015-VC04` | Validation leaves the decoded input unchanged in both runtimes. |
| `D015-VC05` | TypeScript generation is deterministic, committed output matches regeneration, and the generated declarations pass the pinned TypeScript compiler. |
| `D015-VC06` | A representative strict Pydantic worker model consumes a canonically valid request and its JSON result passes the canonical result schema. |
| `D015-VC07` | TypeScript and Python produce byte-identical RFC 8785 output and identical SHA-256 digests for every canonical fixture. |
| `D015-VC08` | Hono, AG-UI, Pydantic, database, and generated-type definitions are absent from the canonical schema package. |
| `D015-VC09` | Changing an accepted schema without changing its version or registry identity fails CI. |
| `D015-VC10` | One version-transition fixture demonstrates explicit compatibility, translation, migration, or rejection. |

## Revisit triggers

Reconsider part of D015 if:

- a required contract cannot be expressed within the portable profile without duplicating semantics;
- Ajv and Python `jsonschema` repeatedly disagree on a required Draft 2020-12 behavior;
- direct Python validation creates a measured worker bottleneck;
- the TypeScript generator cannot represent the structural types needed by M1;
- a high-volume binary path demonstrates a material need for Protobuf, Arrow, or another bounded representation;
- a public API introduces a concrete compatibility requirement not covered by the internal schema registry.

A revisit may replace a validator or generator without changing canonical schemas. Replacing JSON Schema as the contract authority requires a migration plan for accepted schemas, stored versions, fixtures, and external adapters.

## References considered

- [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12)
- [JSON Schema specification](https://json-schema.org/specification)
- [Ajv JSON Schema support](https://ajv.js.org/json-schema.html)
- [Ajv format validation](https://ajv.js.org/guide/formats.html)
- [Python `jsonschema` validation](https://python-jsonschema.readthedocs.io/en/stable/validate/)
- [Pydantic strict mode](https://docs.pydantic.dev/latest/concepts/strict_mode/)
- [Pydantic configuration](https://docs.pydantic.dev/latest/api/config/)
- [Pydantic JSON Schema](https://docs.pydantic.dev/latest/concepts/json_schema/)
- [Pydantic serialization](https://docs.pydantic.dev/latest/concepts/serialization/)
- [`json-schema-to-typescript`](https://github.com/bcherny/json-schema-to-typescript)
- [RFC 8785: JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785.html)
