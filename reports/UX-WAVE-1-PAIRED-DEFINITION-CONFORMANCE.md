# Wave 1 paired ProjectDefinition conformance

Status: paired neutral-read evidence passed; broader profile-specific runtime work remains partial
Date: 2026-09-08
Design boundary: `UX-DESIGN-FREEZE-01`

## Result

Petra now carries two independently project-authored Project examples through
the same contract, PostgreSQL authority, Project-shell, effective-control, and
workbench-mapping boundaries:

- a scientific-evidence Project whose focus, finding, and reference terms are
  Research question, Claim, and Source; and
- a controlled-writing Project whose corresponding terms are Document purpose,
  Requirement, and Authority source.

These are conformance examples, not mandatory Project categories or templates.
Both definitions declare `origin_kind: project_authored`, bind the same
`petra.project-kernel@1.0.0`, and retain their own exact identity, objective
schema, terminology, registrations, and enabled evidence namespaces. Reusable
templates remain an optional seed mechanism only.

## Executable proof

The accepted controlled-writing Project, ProjectDefinition, and Objective
fixtures have canonical hashes and pass the existing language-neutral contract
registry. The real PostgreSQL case registers the controlled-writing records
beside the existing scientific records and proves that:

- each shell resolves its own exact ProjectDefinition and current Objective;
- the same generic place roles remain available while the Sources label resolves
  to either `Sources` or `Authority sources` from the effective definition;
- the same control reader returns each Project's own evidence namespaces while
  preserving identical unsupported policy states;
- both stored definitions remain `project_authored`; and
- a registered controlled-writing semantic key with no installed location
  adapter returns a definition-bound `OBJECT_KIND_UNSUPPORTED` result and safe
  Brief fallback rather than borrowing scientific object behavior.

The unchanged workbench adapter maps generic term families from the definition;
it contains no scientific-versus-writing branch. No CSS, component hierarchy,
or frozen layout changed.

## Verification

The paired increment passes:

- 323 TypeScript schema, registry, generation, hash, and fixture cases;
- 95 real PostgreSQL 18.6 cases after Flyway V001-V021; and
- 78 workbench cases, including the paired terminology mapping.

The complete repository gate passes with 652 always-on tests and seven expected
service-dependent skips, together with generated-contract/hash checks, the M1
retrieval-floor check, formatting, lint, TypeScript/Python type checks, and the
production workbench build.

## Boundary and remaining work

This evidence closes the paired-definition proof requested for the initial
Wave 1 neutral read foundation. It does not claim that controlled-writing
Requirement records, governing relationships, review renderers, or composition
collections are implemented. Those require their own registered contracts and
runtime adapters.

`UX-REQ-001`, `UX-REQ-004`, and `UX-REQ-020` therefore remain partial beyond
this conformance proof. The next runtime sequence moves to Wave 2 Project Work
collection/detail reads, then durable thread and definition-valid inquiry
records, without reopening the frozen presentation.
