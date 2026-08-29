import { PetraInteractionClient } from "@petra/adapters";

export const createInteractionClient = (
  endpoint: string,
  token: string,
): PetraInteractionClient => new PetraInteractionClient({ endpoint, token });
