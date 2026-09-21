/**
 * Browser-only test boundary for the one runtime parser imported by the
 * focused-graph HTTP client. Production server validation remains the
 * authority for the request; browser harnesses retain the exact JSON payload.
 */
export const parseFocusedGraphActionPreviewViewRequest = (
  value: unknown,
): unknown => value;

export const parseFocusedGraphViewRequest = (value: unknown): unknown =>
  structuredClone(value);
