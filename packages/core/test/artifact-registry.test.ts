import { createHash } from "node:crypto";

import type {
  PetraArtifact,
  PetraArtifactManifest,
  PetraRightsDecision,
} from "@petra/contracts";
import { describe, expect, it } from "vitest";

import {
  InMemoryArtifactRegistry,
  type RegisterVerifiedArtifactInput,
} from "../src/artifact-registry.js";

const ORIGINAL_BYTES = new TextEncoder().encode("Petra artifact bytes\n");
const ARTIFACT_ID = "artifact_01ARZ3NDEKTSV4RRFFQ69G5FB1";
const MANIFEST_ID = "artifact_manifest_01ARZ3NDEKTSV4RRFFQ69G5FB2";
const RIGHTS_ID = "rights_decision_01ARZ3NDEKTSV4RRFFQ69G5FB3";
const SOURCE_URL = "https://aclanthology.org/2025.example.pdf";

const contentHash = (bytes: Uint8Array): string =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

const makeInput = (): RegisterVerifiedArtifactInput => {
  const artifact: PetraArtifact = {
    schema_name: "petra.artifact",
    schema_version: "1.0.0",
    artifact_id: ARTIFACT_ID,
    revision: 1,
    artifact_kind: "pdf",
    media_type: "application/pdf",
    content_hash: contentHash(ORIGINAL_BYTES),
    byte_size: ORIGINAL_BYTES.byteLength,
    created_by: {
      actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      actor_kind: "service",
    },
    created_at: "2026-08-28T18:10:00.000Z",
  };
  const manifest: PetraArtifactManifest = {
    schema_name: "petra.artifact-manifest",
    schema_version: "1.0.0",
    artifact_manifest_id: MANIFEST_ID,
    revision: 1,
    artifact_id: ARTIFACT_ID,
    rights_decision_id: RIGHTS_ID,
    origin: {
      origin_kind: "acquired",
      work_version_id: "work_version_01ARZ3NDEKTSV4RRFFQ69G5FB0",
      source_connector: "acl-anthology",
      connector_version: "1.0.0",
      retrieval_url: SOURCE_URL,
      retrieved_at: "2026-08-28T18:09:00.000Z",
      response_metadata: {
        status_code: 200,
        content_type: "application/pdf",
        content_length: ORIGINAL_BYTES.byteLength,
      },
    },
    storage_ref: {
      storage_kind: "content_addressed_object",
      store_name: "petra-local",
      object_key: `sha256/${contentHash(ORIGINAL_BYTES).slice(7)}`,
      content_hash: contentHash(ORIGINAL_BYTES),
      availability: "available",
      verified_at: "2026-08-28T18:10:00.000Z",
    },
    integrity: {
      status: "verified",
      checked_at: "2026-08-28T18:10:00.000Z",
      problems: [],
    },
    recorded_by: {
      actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      actor_kind: "service",
    },
    recorded_at: "2026-08-28T18:10:00.000Z",
  };
  const rightsDecision: PetraRightsDecision = {
    schema_name: "petra.rights-decision",
    schema_version: "1.0.0",
    rights_decision_id: RIGHTS_ID,
    revision: 1,
    artifact_manifest_id: MANIFEST_ID,
    source_location: SOURCE_URL,
    license_status: "known",
    observed_license: {
      identifier: "CC-BY-4.0",
      source: "repository_record",
    },
    access_basis: "open_license",
    decision_status: "verified",
    permissions: {
      store_raw_bytes: true,
      parse: true,
      index: true,
      embed: true,
      send_selected_text_remotely: false,
      quote_publicly: true,
      redistribute_artifact: true,
    },
    conditions: ["attribution"],
    required_notices: [],
    decision_maker: {
      actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      actor_kind: "service",
    },
    rationale: "The repository identifies the acquired copy as CC BY 4.0.",
    observed_at: "2026-08-28T18:09:00.000Z",
    policy_version: "petra-rights/1.0.0",
    created_at: "2026-08-28T18:10:00.000Z",
  };

  return { artifact, manifest, rightsDecision, bytes: ORIGINAL_BYTES };
};

const assignNewContent = (
  input: RegisterVerifiedArtifactInput,
  text: string,
): void => {
  const bytes = new TextEncoder().encode(text);
  const hash = contentHash(bytes);
  input.bytes = bytes;
  input.artifact.content_hash = hash;
  input.artifact.byte_size = bytes.byteLength;
  input.manifest.storage_ref.content_hash = hash;
};

describe("immutable Artifact registration", () => {
  it("registers verified bytes, manifest, and copy-specific rights as immutable snapshots", () => {
    const input = makeInput();
    const registry = new InMemoryArtifactRegistry();

    const registered = registry.register(input);
    input.artifact.media_type = "application/octet-stream";
    input.rightsDecision.rationale = "Changed after registration.";

    expect(registry.size).toBe(1);
    expect(registry.getByArtifactId(ARTIFACT_ID)).toBe(registered);
    expect(registered.artifact.media_type).toBe("application/pdf");
    expect(registered.rightsDecision.rationale).toContain("CC BY 4.0");
    expect(Object.isFrozen(registered)).toBe(true);
    expect(Object.isFrozen(registered.manifest.origin)).toBe(true);
    expect(Object.isFrozen(registered.rightsDecision.permissions)).toBe(true);
  });

  it("deduplicates identical bytes while preserving copy-specific acquisition and rights records", () => {
    const registry = new InMemoryArtifactRegistry();
    const first = makeInput();
    registry.register(first);

    const second = makeInput();
    second.manifest.artifact_manifest_id =
      "artifact_manifest_01ARZ3NDEKTSV4RRFFQ69G5FB4";
    second.manifest.rights_decision_id =
      "rights_decision_01ARZ3NDEKTSV4RRFFQ69G5FB5";
    if (second.manifest.origin.origin_kind !== "acquired") {
      throw new Error("The test fixture must represent an acquired copy.");
    }
    second.manifest.origin.retrieval_url =
      "https://repository.example.org/petra-copy.pdf";
    second.manifest.origin.source_connector = "institutional-repository";
    second.rightsDecision.rights_decision_id =
      second.manifest.rights_decision_id;
    second.rightsDecision.artifact_manifest_id =
      second.manifest.artifact_manifest_id;
    second.rightsDecision.source_location =
      second.manifest.origin.retrieval_url;
    second.rightsDecision.license_status = "unknown";
    delete second.rightsDecision.observed_license;
    second.rightsDecision.access_basis = "public_repository";
    second.rightsDecision.decision_status = "unknown";
    second.rightsDecision.permissions.parse = false;
    second.rightsDecision.permissions.index = false;
    second.rightsDecision.permissions.embed = false;
    second.rightsDecision.permissions.quote_publicly = false;
    second.rightsDecision.permissions.redistribute_artifact = false;

    registry.attachManifest({
      artifactId: ARTIFACT_ID,
      manifest: second.manifest,
      rightsDecision: second.rightsDecision,
    });

    const acquisitions = registry.getAcquisitionsForArtifact(ARTIFACT_ID);
    expect(registry.size).toBe(1);
    expect(registry.acquisitionCount).toBe(2);
    expect(acquisitions).toHaveLength(2);
    expect(acquisitions[0]?.artifact).toBe(acquisitions[1]?.artifact);
    expect(
      acquisitions.map(({ rightsDecision }) => rightsDecision.license_status),
    ).toEqual(["known", "unknown"]);
  });

  it.each([
    {
      name: "changed bytes",
      mutate: (input: RegisterVerifiedArtifactInput) => {
        input.bytes = new TextEncoder().encode("changed bytes");
      },
      code: "ARTIFACT_HASH_MISMATCH",
    },
    {
      name: "wrong byte size",
      mutate: (input: RegisterVerifiedArtifactInput) => {
        input.artifact.byte_size += 1;
      },
      code: "ARTIFACT_SIZE_MISMATCH",
    },
    {
      name: "wrong manifest Artifact",
      mutate: (input: RegisterVerifiedArtifactInput) => {
        input.manifest.artifact_id = "artifact_01ARZ3NDEKTSV4RRFFQ69G5FB4";
      },
      code: "MANIFEST_ARTIFACT_MISMATCH",
    },
    {
      name: "wrong storage hash",
      mutate: (input: RegisterVerifiedArtifactInput) => {
        input.manifest.storage_ref.content_hash =
          "sha256:0000000000000000000000000000000000000000000000000000000000000000";
      },
      code: "MANIFEST_HASH_MISMATCH",
    },
    {
      name: "unlinked rights decision",
      mutate: (input: RegisterVerifiedArtifactInput) => {
        input.rightsDecision.artifact_manifest_id =
          "artifact_manifest_01ARZ3NDEKTSV4RRFFQ69G5FB4";
      },
      code: "RIGHTS_MANIFEST_MISMATCH",
    },
    {
      name: "rights for another source copy",
      mutate: (input: RegisterVerifiedArtifactInput) => {
        input.rightsDecision.source_location =
          "https://example.org/another-copy.pdf";
      },
      code: "RIGHTS_SOURCE_MISMATCH",
    },
    {
      name: "storage denied by rights",
      mutate: (input: RegisterVerifiedArtifactInput) => {
        input.rightsDecision.permissions.store_raw_bytes = false;
      },
      code: "STORAGE_NOT_PERMITTED",
    },
  ])("rejects $name without partial registration", ({ mutate, code }) => {
    const input = makeInput();
    const registry = new InMemoryArtifactRegistry();
    mutate(input);

    expect(() => registry.register(input)).toThrowError(
      expect.objectContaining({ code }),
    );
    expect(registry.size).toBe(0);
  });

  it("rejects reused object IDs and duplicate byte identities", () => {
    const registry = new InMemoryArtifactRegistry();
    registry.register(makeInput());

    expect(() => registry.register(makeInput())).toThrowError(
      expect.objectContaining({ code: "ARTIFACT_ID_ALREADY_REGISTERED" }),
    );

    const duplicateBytes = makeInput();
    duplicateBytes.artifact.artifact_id = "artifact_01ARZ3NDEKTSV4RRFFQ69G5FB4";
    duplicateBytes.manifest.artifact_id = duplicateBytes.artifact.artifact_id;
    duplicateBytes.manifest.artifact_manifest_id =
      "artifact_manifest_01ARZ3NDEKTSV4RRFFQ69G5FB5";
    duplicateBytes.rightsDecision.artifact_manifest_id =
      duplicateBytes.manifest.artifact_manifest_id;
    duplicateBytes.rightsDecision.rights_decision_id =
      "rights_decision_01ARZ3NDEKTSV4RRFFQ69G5FB6";
    duplicateBytes.manifest.rights_decision_id =
      duplicateBytes.rightsDecision.rights_decision_id;

    expect(() => registry.register(duplicateBytes)).toThrowError(
      expect.objectContaining({ code: "CONTENT_HASH_ALREADY_REGISTERED" }),
    );
    expect(registry.size).toBe(1);
  });

  it("rejects independently reused manifest and rights-decision IDs", () => {
    const registry = new InMemoryArtifactRegistry();
    registry.register(makeInput());

    const reusedManifest = makeInput();
    assignNewContent(reusedManifest, "a distinct artifact\n");
    reusedManifest.artifact.artifact_id = "artifact_01ARZ3NDEKTSV4RRFFQ69G5FB4";
    reusedManifest.manifest.artifact_id = reusedManifest.artifact.artifact_id;
    reusedManifest.rightsDecision.rights_decision_id =
      "rights_decision_01ARZ3NDEKTSV4RRFFQ69G5FB5";
    reusedManifest.manifest.rights_decision_id =
      reusedManifest.rightsDecision.rights_decision_id;
    expect(() => registry.register(reusedManifest)).toThrowError(
      expect.objectContaining({
        code: "ARTIFACT_MANIFEST_ID_ALREADY_REGISTERED",
      }),
    );

    const reusedRights = makeInput();
    assignNewContent(reusedRights, "another distinct artifact\n");
    reusedRights.artifact.artifact_id = "artifact_01ARZ3NDEKTSV4RRFFQ69G5FB6";
    reusedRights.manifest.artifact_id = reusedRights.artifact.artifact_id;
    reusedRights.manifest.artifact_manifest_id =
      "artifact_manifest_01ARZ3NDEKTSV4RRFFQ69G5FB7";
    reusedRights.rightsDecision.artifact_manifest_id =
      reusedRights.manifest.artifact_manifest_id;
    expect(() => registry.register(reusedRights)).toThrowError(
      expect.objectContaining({
        code: "RIGHTS_DECISION_ID_ALREADY_REGISTERED",
      }),
    );
    expect(registry.size).toBe(1);
  });
});
