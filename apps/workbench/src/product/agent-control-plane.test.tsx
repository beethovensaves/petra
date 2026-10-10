import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AgentControlPortal } from "./AgentControlPlane.js";

describe("Agent control plane", () => {
  it("retains exact operation and object identity when no portal target exists", () => {
    const markup = renderToStaticMarkup(
      <AgentControlPortal
        title="Control this Work"
        description="Use the authoritative Work owner."
        operationIds={["work.steer", "work.cancel", "work.resume"]}
        objectRef="work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2"
      >
        <button type="button">Cancel work</button>
      </AgentControlPortal>,
    );

    expect(markup).toContain(
      'data-operation-ids="work.steer work.cancel work.resume"',
    );
    expect(markup).toContain(
      'data-object-ref="work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2"',
    );
    expect(markup).toContain("Cancel work");
    expect(markup).toContain("Operation identity");
  });
});
