# Petra — Brand Inspiration Kit

This package translates the latest Petra visual direction into a machine-readable reference for future design work, model prompting, prototyping, and implementation.

## Intent

Petra is a graph-native scientific research workbench. The brand should communicate:

- evidence-first scientific reasoning;
- inspectable graph structure;
- calm, durable, precise tooling;
- skepticism without cynicism;
- collaborative human + AI research;
- dense information without visual noise.

## Primary visual direction

### Mark

A single irregular black rock with a small number of subtle internal facet lines. The facets may read as graph edges on closer inspection, but the mark should first read as a rock rather than a network diagram, crystal, gemstone, mountain, or occult symbol.

The rock is compact and slightly asymmetric. It should remain recognizable at favicon/app-icon scale.

### Wordmark

**PETRA** in **Bebas Neue**, uppercase, condensed, high-impact, with restrained tracking. The narrow letterforms give the brand a technical/editorial character while keeping the mark visually dominant.

### Supporting type

Use **Inter** for UI, body text, labels, tables, captions, and product surfaces. Use a monospaced face only for code, identifiers, metrics, and provenance metadata.

### Color

The system is mostly off-white, stone, gray, graphite, and charcoal. Amber is the primary functional accent. Semantic states use disciplined secondary colors rather than decorative color.

### Interaction language

The core interface remains a synchronized three-view research workbench:

1. Graph canvas
2. Evidence inspector
3. Collaborative assistant

Graph edges, badges, status colors, evidence cards, and annotations should expose state and provenance. The interaction pattern should feel closer to a scientific IDE than a chatbot.

## Machine-readable files

- `petra_brand_tokens.json` — design tokens and semantic roles.
- `petra_brand_spec.yaml` — structured brand and interaction specification.
- `petra_logo_inspiration.svg` — simple vector approximation of the rock + wordmark direction. It is an inspiration asset, not a final production logo.
- `prompt_seed.txt` — compact prompt for generating additional on-brand visual concepts.
- `petra_latest_design_reference.png` — raster reference from the latest design iteration.

## Implementation notes

- Keep the rock solid black in its primary form.
- Do not turn the rock into a node-heavy network icon.
- Use graph semantics in the product UI, not as decoration in every brand surface.
- Amber should indicate focus, active paths, or key actions, not become a large decorative field.
- Maintain generous whitespace around the wordmark while allowing product screens themselves to be information-dense.
- Prefer thin rules, tight labels, compact tables, small semantic badges, and precise alignment.

## Font fallback

Bebas Neue and Inter are referenced by name only. If unavailable, use:

- Display fallback: `Arial Narrow`, `Roboto Condensed`, or another neutral condensed sans.
- UI fallback: `Arial`, `Helvetica Neue`, or another neutral grotesk sans.
