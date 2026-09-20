# Wave 6 source reuse authority

Status: authenticated backend owner complete; production Sources control and
executed workflow evidence remain pending
Date: 2026-09-20
Backend baseline: `9648d06302f8ab290029602c15ed420f47044d68`
Design counterpart: `8bc212d67ca27fe0faed97c36156bf1402e9471c`

## Result

Petra now owns the distinct **Use existing source** mutation through:

- `POST /api/commands/projects/:projectId/sources/reuse`; and
- `POST /api/queries/projects/:projectId/source-reuse-recovery`.

The authenticated request binds the exact current target Project and
ProjectDefinition, one registered target source role, one exact current origin
ProjectSource revision, and its Work, WorkVersion, Artifact, ArtifactManifest,
and RightsDecision references. It cannot carry Actor, capability grant, target
ProjectSource identity, storage location, or record timestamps.

The server resolves one human and `ReuseProjectSource` grant, revalidates both
the grant and current target bindings inside a serializable PostgreSQL
transaction, verifies that the selected copy is owned by that human, retained,
storage-permitted, and currently available, and rejects crossed identity/copy
references. An exact copy already linked to the target Project is a duplicate,
including an excluded prior membership that should be restored rather than
silently duplicated.

## Persistence and material outcome

Migration V052 adds the `ReuseProjectSource` capability and one immutable reuse
receipt. The transaction creates only a new target `ProjectSource` membership.
It references the existing canonical Work, WorkVersion, authors,
ArtifactManifest, RightsDecision, Artifact, content-addressed storage, and
bytes. The receipt explicitly reports that canonical identity, Artifact, and
bytes were not cloned and that storage remained unchanged.

The exact command and idempotency identities replay the same receipt and
membership. Conflicting command identities fail closed. The separate recovery
query reports confirmed, unknown, command-conflicted, and differently owned
outcomes and returns either the exact Sources destination or the safe target
Project source collection.

## Client and integration boundary

`ProjectSourceReuseClient` is renderer-neutral. It sends only the versioned
request, attaches the session bearer token, validates the receipt and
ProjectSource, and refuses crossed command, Project, membership, and return
identities. No frozen React component, CSS, or browser route changed.

The `source.reuse` inventory entry now names its production runtime owner but
remains `unavailable`, with no evidence attached. Design can enable **Use
existing source** only after a production permitted-source selector supplies
the exact request refs, renders material/recovery outcomes, and executes the
full Sources lifecycle evidence scenario.
