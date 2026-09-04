# M1 recovery exercise

Run the isolated recovery gate with:

```sh
npm run test:m1:recovery
```

The harness creates disposable source and restored services under a unique
Compose project. It migrates a clean PostgreSQL database, stores two verified
objects in SeaweedFS, records a Project-to-SourceSpan evidence path, promotes
one Claim and Assertion, and retains the graph outbox. It then:

1. makes a logical PostgreSQL backup with `pg_dump`;
2. copies every content-addressed object with its media type and Petra metadata;
3. restores the database into a clean PostgreSQL service;
4. validates the restored Flyway history against repository migrations;
5. restores the objects into a clean S3-compatible service;
6. compares authoritative IDs, revisions, and canonical record and byte hashes;
7. rebuilds an empty Neo4j from the restored ordered outbox; and
8. verifies the active Assertion edge and its SourceSpan provenance path.

Neo4j is intentionally rebuilt, not backed up. PostgreSQL remains the source of
authority, while ArtifactStore bytes are independently content-verified.

## Consistency boundary

The M1 exercise is a quiescent backup: it performs no writes between the
authority snapshot and object capture. A hosted multi-writer deployment must
add an explicit backup epoch or coordinated write barrier before claiming a
cross-store point-in-time backup. Database and object-store backups taken at
unrelated times are not a consistent Petra recovery set.

The printed result is operational evidence only. It does not become scientific
evidence or a new source of graph authority.
