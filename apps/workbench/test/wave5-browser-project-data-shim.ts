/** Server-owned actions are outside UX-FX25; any unexpected use fails closed. */
export class ProjectDataError extends Error {}

const unavailable = (): never => {
  throw new Error("UX-FX25 did not authorize a Project action transport.");
};

export const cancelProjectSuggestedActionWork = unavailable;
export const createSuggestedActionInvocationRequest = unavailable;
export const createSuggestedActionInteractionReplayRequest = unavailable;
export const createSuggestedActionWorkCancellationRequest = unavailable;
export const getProjectSuggestedActionInvocation = unavailable;
export const invokeProjectSuggestedAction = unavailable;
export const replayProjectSuggestedActionInteraction = unavailable;
