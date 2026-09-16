/**
 * Browser-only test boundary for the one runtime parser imported by the
 * focused-graph HTTP client. The UX-FX25 harness injects every read and never
 * invokes an action-preview request; production server validation remains the
 * authority for that request.
 */
export const parseFocusedGraphActionPreviewViewRequest = (
  value: unknown,
): unknown => value;
