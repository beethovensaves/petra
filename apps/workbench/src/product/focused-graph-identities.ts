const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const encodeTime = (value: number): string => {
  let remaining = value;
  let result = "";
  for (let index = 0; index < 10; index += 1) {
    result = CROCKFORD[remaining % 32] + result;
    remaining = Math.floor(remaining / 32);
  }
  return result;
};

const createRequestId = (prefix: string): string => {
  const random = new Uint8Array(16);
  crypto.getRandomValues(random);
  let randomPart = "";
  let accumulator = 0;
  let bits = 0;
  for (const byte of random) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5 && randomPart.length < 16) {
      bits -= 5;
      randomPart += CROCKFORD[(accumulator >>> bits) & 31];
      accumulator &= (1 << bits) - 1;
    }
    if (randomPart.length === 16) break;
  }
  return `${prefix}_${encodeTime(Date.now())}${randomPart}`;
};

/** Creates a client query identity only; it grants no domain authority. */
export const createFocusedGraphRequestId = (): string =>
  createRequestId("focused_graph_request");

/** Creates a read-only Details request identity; it grants no domain authority. */
export const createFocusedGraphDetailsRequestId = (): string =>
  createRequestId("focused_graph_details_request");
