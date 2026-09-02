import type { PetraReviewInterruptResponse } from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";

import { InteractionInputError } from "./ag-ui.js";

const contracts = new PetraContractRegistry();

export const parseAgUiReviewResponse = (
  value: unknown,
): PetraReviewInterruptResponse => {
  try {
    contracts.assertValid("review-interrupt-response", "1.0.0", value);
  } catch (error) {
    throw new InteractionInputError("The review response is malformed.", [
      error instanceof Error ? error.message : String(error),
    ]);
  }
  return structuredClone(value) as PetraReviewInterruptResponse;
};
