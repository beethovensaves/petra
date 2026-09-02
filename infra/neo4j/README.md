# Petra Neo4j authority-graph projection

Neo4j is Petra's rebuildable graph read model. PostgreSQL remains authoritative
for records, review, event order, outbox delivery, projection receipts, and
freshness checkpoints.

## Runtime boundary

`@petra/neo4j` pins the official JavaScript driver at `6.2.0`. The M1.3 adapter
uses Community-compatible Cypher, uniqueness constraints, relationship indexes,
and bookmarks. It does not require APOC or Graph Data Science.

The projector performs this ordered operation:

1. read the next contiguous `neo4j_graph` outbox record;
2. match its embedded Claim and Assertion to the exact PostgreSQL revisions;
3. resolve Project, Work, WorkVersion, Artifact, and SourceSpan dependencies
   through storage-neutral repositories;
4. commit one idempotent Neo4j transaction;
5. record the Neo4j bookmark in PostgreSQL and advance the checkpoint.

A process failure between steps 4 and 5 is recoverable: retrying the same exact
outbox identity converges on the same graph. A gap, changed record hash,
different endpoint, or lower authoritative revision aborts the graph
transaction.

## Visible graph shape

The first authority projection uses these domain labels:

- `Project`
- `Work`
- `WorkVersion`
- `Artifact`
- `SourceSpan`
- `Claim`

It uses native visible relationship types, including `PROJECTS`, `VERSION_OF`,
`REPRESENTED_BY`, `LOCATED_IN`, `GROUNDED_IN`, `ASSERTS`, `CITES`, and the
controlled scientific predicates. Each Assertion relationship carries its
Assertion ID, authoritative revision, record hash, Project, relation class,
trust zone, review state, and provenance IDs. Projection-only structural edges
carry stable deterministic edge identities and are labelled as structural,
provenance, or Project scope.

SourceSpan nodes contain Artifact identity, content/selection hashes, selector
type, page or section coordinates, parser IDs, and verification state. They do
not contain selected source text; authorized Artifact inspection remains the
content boundary.

## Browser inspection

Start the development services and migrations:

```sh
npm run services:up
npm run db:migrate
```

Open Neo4j Browser at `http://127.0.0.1:7474` using the local credentials in
`.env`. After a projection has run, these read-only queries expose its shape:

```cypher
MATCH path = (project:Project)-[:PROJECTS]->(claim:Claim)
RETURN path
LIMIT 50;
```

```cypher
MATCH path = (work:Work)<-[:VERSION_OF]-(version:WorkVersion)
             -[assertion:ASSERTS]->(claim:Claim)
             -[:GROUNDED_IN]->(span:SourceSpan)
             -[:LOCATED_IN]->(artifact:Artifact)
RETURN path, assertion.assertion_id, assertion.authority_zone,
       assertion.review_state
LIMIT 50;
```

```cypher
MATCH ()-[citation:CITES]->()
RETURN citation.assertion_id, citation.relation_class,
       citation.authority_zone, citation.review_state
LIMIT 50;
```

Neo4j Browser is an inspection surface, not a mutation route. Product changes
must enter through Petra commands and PostgreSQL authority.

## Verification and rebuild

Run the isolated real-service proof:

```sh
npm run test:neo4j:integration
```

The harness uses dynamic loopback ports, migrates a disposable PostgreSQL 18.6
database, starts Neo4j Community 2026.07.1, projects and queries the real graph,
tests semantic separation and stale refusal, deletes and rebuilds the Project,
and removes every labeled container, network, and volume even after failure.

Project clearing deletes Project-scoped relationships and the Project node,
then removes only nodes no remaining Project includes. Shared scholarly nodes
therefore survive while another Project still references them. Rebuild requires
the complete contiguous outbox stream beginning at target sequence one.
