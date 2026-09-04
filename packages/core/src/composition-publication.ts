import { createHash } from "node:crypto";

import type {
  ActorRef,
  PetraActor,
  PetraArtifact,
  PetraArtifactManifest,
  PetraRenderedArtifact,
  PetraRightsDecision,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

import type {
  ArtifactAuthorityRepository,
  RegisteredArtifact,
} from "./artifact-registry.js";
import type { ArtifactStore, AvailableArtifact } from "./artifact-store.js";
import type { RenderedCompositionArtifact } from "./composition-renderer.js";
import { derivePetraId } from "./identity.js";
import type { RenderedArtifactAuthorityRepository } from "./rendered-artifact-authority-repository.js";

export type CompositionPublicationErrorCode =
  | "COMPOSITION_PUBLICATION_ACTOR_INVALID"
  | "COMPOSITION_PUBLICATION_RENDER_INVALID"
  | "COMPOSITION_PUBLICATION_ARTIFACT_CONFLICT";

export class CompositionPublicationError extends Error {
  readonly code: CompositionPublicationErrorCode;

  constructor(code: CompositionPublicationErrorCode, message: string) {
    super(message);
    this.name = "CompositionPublicationError";
    this.code = code;
  }
}

export interface CompositionArtifactPublisherOptions {
  readonly serviceActor: PetraActor;
  readonly artifactStore: ArtifactStore;
  readonly artifacts: ArtifactAuthorityRepository;
  readonly renderedArtifacts: RenderedArtifactAuthorityRepository;
  readonly contracts?: PetraContractRegistry;
}

export interface PublishedCompositionArtifact {
  readonly renderedArtifact: PetraRenderedArtifact;
  readonly artifactRegistration: RegisteredArtifact;
  readonly availableArtifact: AvailableArtifact;
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const byteHash = (bytes: Uint8Array): string =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

const same = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);

const serviceRef = (actor: PetraActor): ActorRef => ({
  actor_id: actor.actor_id,
  actor_kind: "service",
});

const integrity = (
  verification: AvailableArtifact["verification"],
  checkedAt: string,
): PetraArtifactManifest["integrity"] => {
  if (verification.status === "verified") {
    return { status: "verified", checked_at: checkedAt, problems: [] };
  }
  const problems = verification.problems.map((message, index) => ({
    code: `STORE_WARNING_${String(index + 1).padStart(2, "0")}`,
    severity: "warning" as const,
    message,
  }));
  const first = problems[0] ?? {
    code: "STORE_WARNING_01",
    severity: "warning" as const,
    message: "The ArtifactStore reported verification with warnings.",
  };
  return {
    status: "verified_with_warnings",
    checked_at: checkedAt,
    problems: [first, ...problems.slice(1)],
  };
};

const publicationRecords = (
  rendered: RenderedCompositionArtifact,
  available: AvailableArtifact,
  actor: PetraActor,
): {
  artifact: PetraArtifact;
  manifest: PetraArtifactManifest;
  rightsDecision: PetraRightsDecision;
} => {
  const actorRef = serviceRef(actor);
  const seed = `${rendered.record.rendered_artifact_id}|${available.contentHash}`;
  const manifestId = derivePetraId("artifact_manifest", seed);
  const rightsId = derivePetraId("rights_decision", seed);
  const manifest: PetraArtifactManifest = {
    schema_name: "petra.artifact-manifest",
    schema_version: "1.0.0",
    artifact_manifest_id: manifestId,
    revision: 1,
    artifact_id: rendered.artifact.artifact_id,
    rights_decision_id: rightsId,
    origin: {
      origin_kind: "generated",
      generator_name: rendered.record.content.renderer.name,
      generator_version: rendered.record.content.renderer.version,
      generated_at: rendered.record.rendered_at,
      input_artifact_ids: [],
    },
    storage_ref: {
      storage_kind: "content_addressed_object",
      store_name: available.storeName,
      object_key: available.objectKey,
      content_hash: available.contentHash,
      availability: "available",
      verified_at: available.availableAt,
    },
    integrity: integrity(available.verification, available.availableAt),
    recorded_by: actorRef,
    recorded_at: available.availableAt,
  };
  const rightsDecision: PetraRightsDecision = {
    schema_name: "petra.rights-decision",
    schema_version: "1.0.0",
    rights_decision_id: rightsId,
    revision: 1,
    artifact_manifest_id: manifestId,
    source_location: `urn:petra:rendered-artifact:${rendered.record.rendered_artifact_id}`,
    license_status: "known",
    observed_license: {
      statement:
        "Petra-generated private research export. Rights attached to source materials do not transfer to this representation.",
      source: "artifact",
    },
    access_basis: "permission",
    decision_status: "verified",
    permissions: {
      store_raw_bytes: true,
      parse: true,
      index: true,
      embed: true,
      send_selected_text_remotely: false,
      quote_publicly: false,
      redistribute_artifact: false,
    },
    conditions: [],
    required_notices: [
      "Consult the cited source ArtifactManifests before quoting or redistributing source-derived material.",
    ],
    authorization_reference: "petra-private-rendered-export/1.0.0",
    decision_maker: actorRef,
    rationale:
      "Petra may retain and locally process this generated export, while public quotation and redistribution remain closed until source-specific rights are evaluated.",
    observed_at: available.availableAt,
    policy_version: "petra-rights/1.0.0",
    created_at: available.availableAt,
  };
  return {
    artifact: clone(rendered.artifact),
    manifest,
    rightsDecision,
  };
};

export class CompositionArtifactPublisher {
  readonly #options: CompositionArtifactPublisherOptions;
  readonly #contracts: PetraContractRegistry;

  constructor(options: CompositionArtifactPublisherOptions) {
    this.#options = options;
    this.#contracts = options.contracts ?? new PetraContractRegistry();
    if (options.serviceActor.actor_kind !== "service") {
      throw new CompositionPublicationError(
        "COMPOSITION_PUBLICATION_ACTOR_INVALID",
        "Composition publication requires one registered service Actor.",
      );
    }
  }

  async publish(
    rendered: RenderedCompositionArtifact,
  ): Promise<PublishedCompositionArtifact> {
    this.#assertRendered(rendered);
    const available = await this.#makeAvailable(rendered);
    const records = publicationRecords(
      rendered,
      available,
      this.#options.serviceActor,
    );
    this.#contracts.assertValid("artifact-manifest", "1.0.0", records.manifest);
    this.#contracts.assertValid(
      "rights-decision",
      "1.0.0",
      records.rightsDecision,
    );
    const artifactRegistration = await this.#persistArtifact(records);
    const persisted = await this.#options.renderedArtifacts.register(
      clone(rendered.record),
    );
    return {
      renderedArtifact: clone(persisted) as PetraRenderedArtifact,
      artifactRegistration,
      availableArtifact: clone(available),
    };
  }

  async publishAll(
    rendered: readonly RenderedCompositionArtifact[],
  ): Promise<readonly PublishedCompositionArtifact[]> {
    const published: PublishedCompositionArtifact[] = [];
    for (const item of rendered) published.push(await this.publish(item));
    return published;
  }

  #assertRendered(rendered: RenderedCompositionArtifact): void {
    try {
      this.#contracts.assertValid("artifact", "1.0.0", rendered.artifact);
      this.#contracts.assertValid(
        "rendered-artifact",
        "1.0.0",
        rendered.record,
      );
    } catch (error) {
      throw new CompositionPublicationError(
        "COMPOSITION_PUBLICATION_RENDER_INVALID",
        `The rendered output failed contract validation: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
    const expectedActor = serviceRef(this.#options.serviceActor);
    if (
      !same(rendered.record.rendered_by, expectedActor) ||
      !same(rendered.artifact.created_by, expectedActor) ||
      !same(rendered.record.content.output_artifact_ref, {
        artifact_id: rendered.artifact.artifact_id,
        revision: rendered.artifact.revision,
        content_hash: rendered.artifact.content_hash,
        byte_size: rendered.artifact.byte_size,
        media_type: rendered.artifact.media_type,
      }) ||
      rendered.artifact.content_hash !== byteHash(rendered.bytes) ||
      rendered.artifact.byte_size !== rendered.bytes.byteLength ||
      rendered.text !==
        new TextDecoder("utf-8", { fatal: true }).decode(rendered.bytes) ||
      rendered.semanticContentHash !==
        rendered.record.content.semantic_content_hash ||
      !same(rendered.draftRef, rendered.record.draft_ref) ||
      !same(rendered.citationBundleRef, rendered.record.citation_bundle_ref)
    ) {
      throw new CompositionPublicationError(
        "COMPOSITION_PUBLICATION_RENDER_INVALID",
        "Publication requires exact service, byte, Artifact, draft, citation, and semantic identities from the deterministic renderer.",
      );
    }
  }

  async #makeAvailable(
    rendered: RenderedCompositionArtifact,
  ): Promise<AvailableArtifact> {
    const expected = {
      byteSize: rendered.artifact.byte_size,
      mediaType: rendered.artifact.media_type,
    };
    const existing = await this.#options.artifactStore.inspectByHash(
      rendered.artifact.content_hash,
      expected,
    );
    if (existing !== undefined) return existing;
    const staged = await this.#options.artifactStore.stage({
      bytes: [rendered.bytes],
      declaredByteSize: rendered.artifact.byte_size,
      declaredMediaType: rendered.artifact.media_type,
      expectedContentHash: rendered.artifact.content_hash,
    });
    return this.#options.artifactStore.makeAvailable(staged);
  }

  async #persistArtifact(records: {
    artifact: PetraArtifact;
    manifest: PetraArtifactManifest;
    rightsDecision: PetraRightsDecision;
  }): Promise<RegisteredArtifact> {
    const existing = await this.#options.artifacts.getArtifact(
      records.artifact.artifact_id,
    );
    if (existing === undefined) {
      try {
        return await this.#options.artifacts.registerVerifiedAcquisition(
          records,
        );
      } catch (error) {
        const concurrent = await this.#options.artifacts.getArtifact(
          records.artifact.artifact_id,
        );
        if (concurrent === undefined || !same(concurrent, records.artifact)) {
          throw error;
        }
      }
    } else if (!same(existing, records.artifact)) {
      throw new CompositionPublicationError(
        "COMPOSITION_PUBLICATION_ARTIFACT_CONFLICT",
        "The rendered byte identity is already bound to a different Artifact record.",
      );
    }
    return this.#options.artifacts.attachVerifiedManifest({
      artifactId: records.artifact.artifact_id,
      manifest: records.manifest,
      rightsDecision: records.rightsDecision,
    });
  }
}
