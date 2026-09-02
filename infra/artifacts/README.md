# Petra artifact storage

Petra stores immutable bytes behind the storage-neutral `ArtifactStore` port in
`@petra/core`. The accepted M1 adapter in `@petra/s3` uses the official AWS S3
client and is exercised against SeaweedFS, but neither the domain nor an
Artifact manifest depends on SeaweedFS-specific behavior.

## Publication boundary

An acquisition follows one closed sequence:

1. stream bytes to `<namespace>/staging/<stage-id>` while calculating SHA-256,
   byte count, and a bounded media-signature sample;
2. reject and remove a staged object when its declared size, expected hash, or
   media type conflicts with the observed bytes;
3. replace the staged object's metadata with the verified identity and read it
   back before publication;
4. copy the verified object to `sha256/<first-two-hex>/<remaining-hex>`, verify
   the final object's headers and metadata, then remove the staging key; and
5. allow PostgreSQL Artifact authority only after `inspectByHash` reproduces the
   manifest's store name, object key, hash, byte size, media type, and warning
   status.

S3 object copy gives readers one complete final key rather than a partially
written object. Exact duplicate bytes converge on the same final key. The
PostgreSQL check is intentionally outside the object store: it closes admission
to scientific authority, while deployment retention, versioning, backups, and
object-lock policy remain hosting responsibilities.

## Verification scope

The adapter recognizes deterministic signatures for PDF, PNG, JPEG, GIF, gzip,
and ZIP, structured prefixes for JSON and HTML, and valid UTF-8 samples for
other text types. A recognized conflicting signature fails closed. Formats
without a deterministic registered rule remain available only as
`verified_with_warnings`; the Artifact manifest may retain that warning but may
not silently promote it to fully verified.

`readByHash` checks the full byte count and SHA-256 before its iterator
completes. Callers must treat a read as successful only after consuming the
stream to completion.

## Disposable integration proof

Run:

```sh
npm run test:s3:integration
```

The command starts a uniquely named, loopback-only SeaweedFS 4.41 Compose
project on a dynamic port, runs the real adapter tests, emits service logs on
failure, and removes its container, network, and temporary volume in all paths.
The cleanup API itself is bounded to at most 1,000 objects and can address only
validated stage IDs below the configured staging prefix; it cannot enumerate or
delete content-addressed final keys.
