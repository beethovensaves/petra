import type {
  FocusedGraphActionPreviewViewRequest,
  FocusedGraphReadRequest,
} from "@petra/core";

/**
 * Browser boundary for graph requests already emitted by Petra's typed UI or
 * returned by an authenticated Petra read. The server parses the same payload
 * against the authoritative core contract before executing it.
 *
 * Importing the broad core barrel in a browser initializes server-only modules
 * such as artifact hashing. Keep this boundary deliberately small so browser
 * code cannot acquire server authority or Node-only dependencies.
 */
export const parseFocusedGraphActionPreviewViewRequest = (
  value: unknown,
): FocusedGraphActionPreviewViewRequest =>
  structuredClone(value) as FocusedGraphActionPreviewViewRequest;

export const parseFocusedGraphViewRequest = (
  value: unknown,
): FocusedGraphReadRequest => structuredClone(value) as FocusedGraphReadRequest;

export { examinationAuthorityProposal } from "@petra/core/examination-command";
