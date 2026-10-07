import { canonicalize } from "json-canonicalize";
export const intakeBrowserHash = async (value: unknown): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};
export const intakeCreationKey = (id: string): string =>
  `petra:intake:creation:${id}`;
