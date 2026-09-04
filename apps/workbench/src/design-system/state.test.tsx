import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  EvidenceRelationLine,
  SourceDepthFlag,
  StateMarker,
  getDimensionLabel,
  getStateLabel,
  type StateMarkerViewModel,
} from "./state.js";

describe("Petra foundation state grammar", () => {
  it("renders the state and its dimension as visible, non-color text", () => {
    const marker: StateMarkerViewModel = {
      dimension: "scientific_authority",
      value: "proposal",
      detail: "No trusted graph mutation has occurred.",
    };
    const markup = renderToStaticMarkup(
      <StateMarker marker={marker} showDimension />,
    );

    expect(markup).toContain("Proposal");
    expect(markup).toContain("Scientific authority");
    expect(markup).toContain('data-state="proposal"');
    expect(markup).toContain(
      "Scientific authority: Proposal. No trusted graph mutation has occurred.",
    );
  });

  it("keeps shared labels stable for consuming modules", () => {
    expect(
      getStateLabel({
        dimension: "work_freshness",
        value: "projection_catching_up",
      }),
    ).toBe("Catching up");
    expect(getStateLabel({ dimension: "origin", value: "extraction" })).toBe(
      "Extracted from source",
    );
    expect(getDimensionLabel("source_depth")).toBe("Source depth");
  });

  it("keeps abstract-only limitations adjacent to the source depth", () => {
    const markup = renderToStaticMarkup(
      <SourceDepthFlag
        source={{
          depth: "abstract_only",
          sourceLabel: "Preprint abstract",
          permittedUse: "Report the authors' broad conclusion.",
          limitation: "Do not describe detailed methods from this source.",
        }}
      />,
    );

    expect(markup).toContain("Abstract only");
    expect(markup).toContain("Permitted use");
    expect(markup).toContain("Do not describe detailed methods");
  });

  it("renders evidence relations with explicit endpoints and relation text", () => {
    const markup = renderToStaticMarkup(
      <EvidenceRelationLine
        relation={{
          relation: "qualifies",
          subjectLabel: "Claim A",
          objectLabel: "H12 — Position bias persists",
          detail: "The population differs.",
        }}
      />,
    );

    expect(markup).toContain("Claim A");
    expect(markup).toContain("Qualifies");
    expect(markup).toContain("H12 — Position bias persists");
    expect(markup).toContain('data-relation="qualifies"');
  });
});
