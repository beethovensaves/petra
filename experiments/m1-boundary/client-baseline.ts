export interface BaselineClient {
  endpoint: string;
  token: string;
}

export const createInteractionClient = (
  endpoint: string,
  token: string,
): BaselineClient => ({ endpoint, token });
