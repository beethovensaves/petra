import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PetraLockup, PetraMark } from "./brand.js";

describe("Petra brand components", () => {
  it("keeps a mark inside a text lockup decorative", () => {
    const markup = renderToStaticMarkup(<PetraLockup variant="compact" />);

    expect(markup).toContain("PETRA");
    expect(markup).toContain('data-brand-element="rock-mark"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain("Where hypotheses earn their edges.");
  });

  it("gives a standalone labeled mark an image role and name", () => {
    const markup = renderToStaticMarkup(
      <PetraMark label="Petra" tone="on_dark" />,
    );

    expect(markup).toContain('role="img"');
    expect(markup).toContain('alt="Petra"');
    expect(markup).toContain('data-tone="on_dark"');
    expect(markup).not.toContain('aria-hidden="true"');
  });

  it("keeps the tagline opt-in for brand and entry surfaces", () => {
    const compact = renderToStaticMarkup(<PetraLockup variant="compact" />);
    const brand = renderToStaticMarkup(
      <PetraLockup variant="horizontal" showTagline />,
    );

    expect(compact).not.toContain("Where hypotheses earn their edges.");
    expect(brand).toContain("Where hypotheses earn their edges.");
  });
});
