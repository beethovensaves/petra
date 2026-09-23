import type {
  PetraProjectDefinitionDraftCommandReceipt,
  PetraProjectDefinitionDraftCommandRequest,
  PetraProjectDefinitionDraftRequest,
  PetraProjectDefinitionDraftView,
} from "@petra/contracts";
import type {
  ProjectDefinitionDraftCommandAuthority,
  ProjectDefinitionDraftReader,
} from "@petra/core";
import { describe, expect, it, vi } from "vitest";

import { createPetraApp } from "../src/app.js";

const token = "definition-draft-route";
const hash =
  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const request: PetraProjectDefinitionDraftRequest = {
  schema_name: "petra.project-definition-draft-request",
  schema_version: "1.0.0",
  request_id: "definition_draft_request_01K6P000000000000000000601",
  outcome: "Plan a neighborhood block party with a budget and rain date.",
};
const draft: PetraProjectDefinitionDraftView = {
  schema_name: "petra.project-definition-draft-view",
  schema_version: "1.0.0",
  draft_id: "project_definition_draft_01K6P000000000000000000601",
  content: {
    request,
    project: {
      name: "Neighborhood block party",
      description: "Outcome-first Project created from the exact objective.",
    },
    definition_family: "petra.project-authored",
    definition_origin: { origin_kind: "project_authored" },
    definition_content: {
      label: "Outcome-led Project",
      description: "A domain-neutral Project definition.",
      kernel_compatibility: "petra.project-kernel@1.0.0",
      registrations: [
        {
          registration_kind: "objective_schema",
          semantic_key: "project.outcome",
          contract: {
            name: "petra.project-objective",
            version: "1.0.0",
            content_hash: hash,
          },
        },
      ],
      terms: [
        {
          semantic_key: "project.outcome",
          singular: "Outcome",
          plural: "Outcomes",
          definition: "The desired result.",
          generic_family: "focus",
        },
        {
          semantic_key: "project.result",
          singular: "Result",
          plural: "Results",
          definition: "A durable result.",
          generic_family: "finding",
        },
        {
          semantic_key: "project.reference",
          singular: "Reference",
          plural: "References",
          definition: "An exact basis.",
          generic_family: "reference",
        },
      ],
      supported_places: ["brief", "sources", "review", "graph", "work"],
      omitted_flows: ["Domain-specific automation not selected"],
    },
    objective: {
      objective_kind: "project.outcome",
      statement: request.outcome,
    },
    enabled_evidence_namespaces: ["personal"],
    selected_capabilities: [
      {
        capability_id: "project.outcome",
        label: "Outcome-led Project",
        source: "petra_kernel",
        reason: "The shared Petra kernel supports the exact objective.",
      },
    ],
    assumptions: [
      {
        code: "project.private",
        statement: "The Project is private.",
        consequence: "Only its creator receives authority.",
      },
    ],
    unsupported_capabilities: [
      {
        capability: "Domain-specific automation",
        reason: "No domain capability was registered.",
      },
    ],
    initial_material_plan: [],
  },
  content_hash: hash,
  read_at: "2026-09-22T18:00:00.000Z",
};
const command: PetraProjectDefinitionDraftCommandRequest = {
  schema_name: "petra.project-definition-draft-command-request",
  schema_version: "1.0.0",
  command_id: "command_01K6P000000000000000000601",
  idempotency_key: "definition-draft:route:601",
  draft,
  accepted_assumption_codes: ["project.private"],
};
const receipt: PetraProjectDefinitionDraftCommandReceipt = {
  schema_name: "petra.project-definition-draft-command-receipt",
  schema_version: "1.0.0",
  receipt_id: "definition_draft_receipt_01K6P000000000000000000601",
  command_id: command.command_id,
  idempotency_key: command.idempotency_key,
  actor: {
    actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    actor_kind: "human",
  },
  draft_ref: { draft_id: draft.draft_id, content_hash: draft.content_hash },
  project_ref: {
    project_id: "project_01K6P000000000000000000601",
    revision: 1,
  },
  project_definition_ref: {
    project_definition_id: "project_definition_01K6P000000000000000000601",
    revision: 1,
    content_hash: hash,
  },
  objective_ref: {
    objective_id: "objective_01K6P000000000000000000601",
    revision: 1,
    content_hash: hash,
  },
  initial_material_plan: [],
  destination: {
    place_role: "brief",
    project_id: "project_01K6P000000000000000000601",
  },
  recorded_at: "2026-09-22T18:00:01.000Z",
};

const authorized = (path: string, body: unknown): Request =>
  new Request(`http://petra.local${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

describe("outcome-first Project definition routes", () => {
  it("drafts and creates through separate exact server-owned boundaries", async () => {
    const compose = vi.fn(() => Promise.resolve(structuredClone(draft)));
    const execute = vi.fn(() => Promise.resolve(structuredClone(receipt)));
    const drafts: ProjectDefinitionDraftReader = {
      draftProjectDefinition: compose,
    };
    const commands: ProjectDefinitionDraftCommandAuthority = {
      executeProjectDefinitionDraftCommand: execute,
    };
    const app = createPetraApp({
      authToken: token,
      projectDefinitionDrafts: drafts,
      projectDefinitionDraftCommands: commands,
    });

    const draftResponse = await app.app.fetch(
      authorized("/api/queries/project-definition-drafts", request),
    );
    const commandResponse = await app.app.fetch(
      authorized("/api/commands/projects/from-definition-draft", command),
    );

    expect(draftResponse.status).toBe(200);
    expect(draftResponse.headers.get("cache-control")).toBe("no-store");
    expect(await draftResponse.json()).toStrictEqual(draft);
    expect(compose).toHaveBeenCalledWith(request);
    expect(commandResponse.status).toBe(201);
    expect(commandResponse.headers.get("cache-control")).toBe("no-store");
    expect(await commandResponse.json()).toStrictEqual(receipt);
    expect(execute).toHaveBeenCalledWith(command);
  });

  it("rejects unauthenticated access and changed request identity", async () => {
    const drafts: ProjectDefinitionDraftReader = {
      draftProjectDefinition: vi.fn(() =>
        Promise.resolve({
          ...structuredClone(draft),
          content: {
            ...structuredClone(draft.content),
            request: {
              ...request,
              request_id: "definition_draft_request_01K6P000000000000000000602",
            },
          },
        }),
      ),
    };
    const app = createPetraApp({
      authToken: token,
      projectDefinitionDrafts: drafts,
    });
    const unauthenticated = await app.app.fetch(
      new Request("http://petra.local/api/queries/project-definition-drafts", {
        method: "POST",
      }),
    );
    const crossed = await app.app.fetch(
      authorized("/api/queries/project-definition-drafts", request),
    );
    expect(unauthenticated.status).toBe(401);
    expect(crossed.status).toBe(503);
  });
});
