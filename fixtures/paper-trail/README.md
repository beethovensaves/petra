# Frozen Paper Trail baseline

This directory preserves the small OpenAlex-derived regression corpus that
predates Petra. It is a deterministic retrieval floor, not Petra's production
literature database and not a curated set of scientific facts.

## Identity and origin

| File | SHA-256 | Origin |
| --- | --- | --- |
| `openalex_works.json` | `3f3086df898fc2769b88209043c5ea374f2bf721ac7a6e46eaf0f155edd0e017` | Exact byte copy of the pinned `course/data/openalex_works.json` snapshot |
| `source-manifest.json` | `ed529c3b9a06879045baa65e183586c94219214e55cbc4a365a4cf9fba446620` | Exact byte copy of its source manifest |

The source manifest records an OpenAlex API query for “graph retrieval
augmented generation,” fetched at `2026-08-25T03:29:48+00:00`, with 50 works
under CC0. The legacy implementation and test files were inspected but not
copied into Petra; their source hashes at import were respectively
`e6ff9defc654f560d5712e7ba2f185915f0272b3fe0d9c1408ae15409d6c58fe` and
`d37b957d4ae96a83b0a626a3143253b25f34e8d5c90ed77605da70c359e09545`.

## Preserved behavior

`@petra/retrieval` independently ports the observable baseline:

- lowercase tokenization with hyphenated or apostrophized ASCII terms;
- BM25 with title frequency weighted `2.5`, `k1 = 1.5`, and `b = 0.75`;
- explicit year filtering and deterministic ranking ties;
- directed reference and cited-by neighborhoods;
- breadth-first paths bounded to one through six steps;
- source-native `CITES` orientation; and
- chronology-quality flags and explicit unknown-Work failures.

Tests pin both the legacy three-Work examples and actual rankings, scores,
neighbors, and paths from this exact 50-Work file.

## Scientific limits

This is an abstract-only, relevance-ranked search sample. It does not establish
field coverage, peer-review status, methodological quality, agreement,
influence, or support for any proposition. OpenAlex metadata may be missing or
wrong. The frozen snapshot contains 711 reference IDs outside the sample, three
duplicate-title groups, and nine chronology-flagged internal edges—including
papers dated 2024 or 2025 that are recorded as citing one Work dated 2026.

Petra therefore preserves every citation edge only as `CITES` and retains the
source warnings. The adapter contains no scientific-support predicate and
cannot produce a detailed method, validity, or reproduction Claim from these
abstract records.
