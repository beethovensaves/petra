import { createHash } from "node:crypto";

const PETRA_ID_PATTERN = /^([a-z][a-z0-9_]{1,31})_([0-9A-HJKMNP-TV-Z]{26})$/;
const PETRA_KIND_PATTERN = /^[a-z][a-z0-9_]{1,31}$/;
const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

declare const petraIdBrand: unique symbol;

export type PetraId<Kind extends string = string> = `${Kind}_${string}` & {
  readonly [petraIdBrand]: Kind;
};

export type PetraIdentityErrorCode =
  | "INVALID_PETRA_ID"
  | "INVALID_PETRA_ID_KIND"
  | "INVALID_ULID_PAYLOAD"
  | "PETRA_ID_KIND_MISMATCH";

export class PetraIdentityError extends Error {
  readonly code: PetraIdentityErrorCode;

  constructor(code: PetraIdentityErrorCode, message: string) {
    super(message);
    this.name = "PetraIdentityError";
    this.code = code;
  }
}

export const createPetraId = <Kind extends string>(
  kind: Kind,
  ulid: string,
): PetraId<Kind> => {
  if (!PETRA_KIND_PATTERN.test(kind)) {
    throw new PetraIdentityError(
      "INVALID_PETRA_ID_KIND",
      "A Petra ID kind must be lowercase, start with a letter, and contain at most 32 letters, digits, or underscores.",
    );
  }
  if (!ULID_PATTERN.test(ulid)) {
    throw new PetraIdentityError(
      "INVALID_ULID_PAYLOAD",
      "A Petra ID payload must be a canonical 26-character uppercase ULID.",
    );
  }
  return `${kind}_${ulid}` as PetraId<Kind>;
};

export const derivePetraId = <Kind extends string>(
  kind: Kind,
  immutableIdentity: string,
): PetraId<Kind> => {
  const digest = createHash("sha256")
    .update(`${kind}:${immutableIdentity}`, "utf8")
    .digest()
    .subarray(0, 16);
  let value = BigInt(`0x${digest.toString("hex")}`);
  let payload = "";
  for (let index = 0; index < 26; index += 1) {
    payload = CROCKFORD_BASE32[Number(value & 31n)] + payload;
    value >>= 5n;
  }
  return createPetraId(kind, payload);
};

export const parsePetraId = <Kind extends string>(
  value: string,
  expectedKind?: Kind,
): PetraId<Kind> => {
  const match = PETRA_ID_PATTERN.exec(value);
  if (match === null) {
    throw new PetraIdentityError(
      "INVALID_PETRA_ID",
      "The value is not a canonical kind-prefixed Petra ID.",
    );
  }
  const kind = match[1];
  if (expectedKind !== undefined && kind !== expectedKind) {
    throw new PetraIdentityError(
      "PETRA_ID_KIND_MISMATCH",
      `Expected a ${expectedKind} ID but received ${kind}.`,
    );
  }
  return value as PetraId<Kind>;
};

export const petraIdKind = (value: string): string => {
  const match = PETRA_ID_PATTERN.exec(value);
  if (match?.[1] === undefined) {
    throw new PetraIdentityError(
      "INVALID_PETRA_ID",
      "The value is not a canonical kind-prefixed Petra ID.",
    );
  }
  return match[1];
};
