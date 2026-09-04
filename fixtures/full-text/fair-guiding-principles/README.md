# M1.4 lawful full-text calibration fixture

This fixture freezes the publisher PDF for Wilkinson et al. (2016), “The FAIR
Guiding Principles for scientific data management and stewardship,” Scientific
Data 3:160018, DOI `10.1038/sdata.2016.18`.

## Why this source

The paper is a legitimate peer-reviewed journal publication and its publisher
page, Crossref record, and PDF identify the version of record as Creative
Commons Attribution 4.0. The license permits Petra to retain and redistribute
this exact 254,899-byte copy with attribution and notice. Petra's fixture rights
decision still disables remote-model egress: a reusable copy license and a
runtime egress grant are separate decisions.

The nine-page PDF is small but structurally useful. It contains ordinary
multi-column prose, Box 1 definitions, Box 2's hierarchical FAIR principles,
references, and a long author/affiliation region. M1.4 uses it to test reading
order, box boundaries, geometry, exact quotation, and a broad-claim/
qualification pair. It does not select Petra's eventual demonstration research
question.

The PDF displays an addendum notice. The 2019 addendum changes the URL of a
living document; it does not overwrite this acquired artifact. Petra records
that relationship instead of silently calling the bytes a newer version.

## Reproducibility and attribution

- Source: <https://www.nature.com/articles/sdata201618.pdf>
- Landing page: <https://www.nature.com/articles/sdata201618>
- DOI: <https://doi.org/10.1038/sdata.2016.18>
- License: <https://creativecommons.org/licenses/by/4.0/>
- Exact PDF SHA-256:
  `cdddd9f4808f7e3e1f013139c3915ef4d7cdccb008fa947ef5f72b4c7b6ffde7`

Attribution: Wilkinson, M. D. et al. The FAIR Guiding Principles for scientific
data management and stewardship. Scientific Data 3, 160018 (2016).

`source-manifest.json` records the acquisition, rights evidence, layout targets,
and initial source-span judgments. `source/crossref-response.json` is the exact
metadata response observed for this fixture; it is evidence input, not Petra's
database of truth. Files in `records/` are deterministic Petra contract records
generated from those frozen inputs. They include the exact worker job and its
scoped file-binding index, so the executable parse cannot broaden its own
inputs, output slots, retry allowance, resource envelope, or network policy.

Run `npm run fixtures:check-generated` to verify both source hashes and prove
that every generated record is current. The ordinary contract test suite also
validates each generated record against its registered JSON Schema and checks
the cross-record identities. After preparing the ignored local model cache with
`npm run models:docling`, run `npm run test:docling:integration` for the real
two-pass parse, TypeScript/Python SourceSpan acceptance, and malformed-PDF
failure proof.
