/**
 * Browser-only UX-FX25 boundary. The harness injects every focused-graph read;
 * an unexpected transport call fails closed instead of loading server adapters.
 */
export class FocusedGraphClient {
  constructor() {}

  read(): never {
    throw new Error("UX-FX25 requires its injected focused-graph read.");
  }

  readDetails(): never {
    throw new Error("UX-FX25 did not authorize a Details transport read.");
  }

  readActionPreview(): never {
    throw new Error(
      "UX-FX25 did not authorize an action-preview transport read.",
    );
  }
}

export class FocusedGraphClientError extends Error {
  readonly status = 503;
}
