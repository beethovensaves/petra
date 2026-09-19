import { readFileSync } from "node:fs";

import type {
  PetraSynthesistRoleCertification,
  ProjectModelContextBinding,
} from "@petra/contracts";
import type {
  CertifiedProjectModelBinding,
  ProjectModelAuthorityRead,
  ProjectModelAuthorityReader,
} from "@petra/core";
import { describe, expect, it, vi } from "vitest";

import type { M1GroundedSynthesisRuntime } from "../src/m1-grounded-synthesis.js";
import { M1_GROUNDED_SYNTHESIS_QUESTION } from "../src/m1-grounded-synthesis.js";
import { ProjectModelReadinessService } from "../src/project-model-readiness.js";

const certification = (
  JSON.parse(
    readFileSync(
      new URL(
        "../../../config/model-certifications/codex-terra-synthesist-1.1.0.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as { certification: PetraSynthesistRoleCertification }
).certification;
const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const binding: CertifiedProjectModelBinding = {
  project_id: projectId,
  role_semantic_key: "scientific.grounded-synthesist",
  role_contract: {
    name: "petra.model-role-certification",
    version: "1.1.0",
    content_hash:
      "sha256:7bab65763e37fc2bec0b9fa64d178ae37e769882717a445bb2a5f0fb650a40f1",
  },
  role_certification_ref: {
    role_certification_id: certification.role_certification_id,
    revision: certification.revision,
    content_hash: certification.content_hash,
  },
  snapshot_ref: {
    snapshot_id: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FCE",
    snapshot_revision: 1,
    event_position: 3,
    content_hash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  },
  context_packet_ref: {
    record_id: "context_packet_01ARZ3NDEKTSV4RRFFQ69G5FCD",
    revision: 1,
    content_hash:
      "sha256:d78e5ebed5060507812eeeede6154f82e8f9bbfb19897bd8ade82909088432df",
  },
  evidence_packet_ref: {
    record_id: "evidence_packet_01ARZ3NDEKTSV4RRFFQ69G5FCG",
    revision: 1,
    content_hash:
      "sha256:e3d7679bec56bc80f2bbb9702398526ca69edac1c10836132efc365c36393d64",
  },
};
const context: ProjectModelContextBinding = {
  project_id: projectId,
  project_revision: 1,
  project_definition_ref: {
    project_definition_id: "project_definition_01K4C000000000000000000001",
    revision: 3,
    content_hash:
      "sha256:2f184efe9610fc19e8e42e7e9a1a8765b47999929a6331fb0cf5bb0bd50c366c",
    record_hash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    definition_family: "petra.scientific-evidence",
  },
  objective_ref: {
    objective_id: "objective_01K4C000000000000000000005",
    revision: 3,
    content_hash:
      "sha256:335ccee3cdd67d50a07b0e3acef369fb57ee6b2d83b0397a4bdddd48b97358f7",
    record_hash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  },
  snapshot_ref: binding.snapshot_ref,
  context_packet_ref: binding.context_packet_ref,
  evidence_packet_ref: binding.evidence_packet_ref,
  role_certification_ref: binding.role_certification_ref,
};

describe("ProjectModelReadinessService", () => {
  it("composes ready provider state with exact Project authority and guards the command", async () => {
    const authorityRead: ProjectModelAuthorityRead = {
      project_id: projectId,
      project_revision: 1,
      project_definition_ref: context.project_definition_ref,
      objective_ref: context.objective_ref,
      role: {
        state: "selected",
        semantic_key: binding.role_semantic_key,
        label: "Grounded synthesist",
        meaning: "A certified advisory model role.",
      },
      context: { state: "bound", binding: context },
    };
    const authority: ProjectModelAuthorityReader = {
      readProjectModelAuthority: vi.fn(() => Promise.resolve(authorityRead)),
    };
    const runtime = {
      projectModelBinding: binding,
      terminalContext: { roleCertification: certification },
      inspectProviderReadiness: vi.fn(() =>
        Promise.resolve({
          state: "ready" as const,
          provider_kind: "codex_app_server" as const,
          auth_state: "authenticated" as const,
          auth_mode: "chatgpt" as const,
          model: certification.deployment.provider_model,
          message: "The certified provider is ready.",
        }),
      ),
    } as unknown as M1GroundedSynthesisRuntime;
    const service = new ProjectModelReadinessService({
      authority,
      runtime,
      now: () => "2026-09-19T05:30:00.000Z",
    });

    const readiness = await service.getProjectModelReadiness(projectId);

    expect(readiness).toMatchObject({
      project_id: projectId,
      readiness: {
        state: "ready",
        role: {
          semantic_key: binding.role_semantic_key,
          certification_ref: binding.role_certification_ref,
          authority_effect: "none",
        },
        provider: { state: "ready", auth_mode: "chatgpt" },
        context: { state: "bound", binding: context },
        command: {
          endpoint: "/api/interactions/run",
          registered_prompt: M1_GROUNDED_SYNTHESIS_QUESTION,
          request_context: context,
          authority_effect: "none",
        },
      },
    });
    await expect(
      service.authorizeProjectModelInteraction({
        project_id: projectId,
        prompt: M1_GROUNDED_SYNTHESIS_QUESTION,
        request_context: context,
      }),
    ).resolves.toMatchObject({ project_id: projectId });

    const stale = structuredClone(context);
    stale.project_revision = 2;
    await expect(
      service.authorizeProjectModelInteraction({
        project_id: projectId,
        prompt: M1_GROUNDED_SYNTHESIS_QUESTION,
        request_context: stale,
      }),
    ).rejects.toMatchObject({ code: "PROJECT_MODEL_INTERACTION_STALE" });
  });
});
