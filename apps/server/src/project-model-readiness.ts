import type {
  PetraProjectModelReadinessView,
  ProjectModelSelectedRole,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  ProjectModelReadinessError,
  type ProjectModelAuthorityReader,
  type ProjectModelInteractionAuthorization,
  type ProjectModelReadinessReader,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";

import {
  M1_GROUNDED_SYNTHESIS_QUESTION,
  type M1GroundedSynthesisRuntime,
} from "./m1-grounded-synthesis.js";

const LIMITATIONS = [
  "This model role is advisory. Its response does not create facts, permission, approval, or authoritative Project state.",
  "The certified runtime accepts only the registered grounded-synthesis prompt and exact immutable Project context shown here.",
  "Model output is presented only after schema and grounding validation; malformed or ungrounded output fails closed.",
] as const;

export interface ProjectModelReadinessServiceOptions {
  readonly authority: ProjectModelAuthorityReader;
  readonly runtime: M1GroundedSynthesisRuntime;
  readonly contracts?: PetraContractRegistry;
  readonly now?: () => string;
}

/** Composes live provider state with exact PostgreSQL Project authority. */
export class ProjectModelReadinessService implements ProjectModelReadinessReader {
  readonly #authority: ProjectModelAuthorityReader;
  readonly #runtime: M1GroundedSynthesisRuntime;
  readonly #contracts: PetraContractRegistry;
  readonly #now: () => string;

  constructor(options: ProjectModelReadinessServiceOptions) {
    this.#authority = options.authority;
    this.#runtime = options.runtime;
    this.#contracts = options.contracts ?? new PetraContractRegistry();
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  async getProjectModelReadiness(
    projectId: string,
  ): Promise<PetraProjectModelReadinessView | undefined> {
    const authority = await this.#authority.readProjectModelAuthority(
      projectId,
      this.#runtime.projectModelBinding,
    );
    if (authority === undefined) return undefined;

    const certification = this.#runtime.terminalContext.roleCertification;
    const role: PetraProjectModelReadinessView["readiness"]["role"] =
      authority.role.state === "unavailable"
        ? authority.role
        : ({
            ...authority.role,
            certification_ref:
              this.#runtime.projectModelBinding.role_certification_ref,
            deployment: {
              model_deployment_id: certification.deployment.model_deployment_id,
              provider_kind: "codex_app_server",
              provider_model: certification.deployment.provider_model,
              execution_location: "remote",
            },
            authority_effect: "none",
          } satisfies ProjectModelSelectedRole);
    const provider = await this.#runtime.inspectProviderReadiness();
    const context = authority.context;
    const unavailableReason =
      role.state === "unavailable"
        ? "role_unavailable"
        : provider.state !== "ready"
          ? "provider_unavailable"
          : context.state !== "bound"
            ? "context_unavailable"
            : undefined;
    const readiness: PetraProjectModelReadinessView["readiness"] =
      unavailableReason === undefined &&
      role.state === "selected" &&
      provider.state === "ready" &&
      context.state === "bound"
        ? {
            state: "ready",
            role,
            provider,
            context,
            command: {
              state: "ready",
              method: "POST",
              endpoint: "/api/interactions/run",
              workflow: "grounded_synthesis",
              prompt_policy: "exact_registered_prompt",
              registered_prompt: M1_GROUNDED_SYNTHESIS_QUESTION,
              request_context: context.binding,
              delivery: "streaming_and_replay",
              authority_effect: "none",
            },
          }
        : {
            state: "unavailable",
            reason: unavailableReason!,
            role,
            provider,
            context,
            command: {
              state: "unavailable",
              reason: unavailableReason!,
              message:
                unavailableReason === "role_unavailable"
                  ? "No exact certified model role is registered for this ProjectDefinition."
                  : unavailableReason === "provider_unavailable"
                    ? "The certified provider is not ready. No prompt will be submitted."
                    : "Exact immutable Project context is unavailable or stale. No prompt will be submitted.",
            },
          };
    const view: PetraProjectModelReadinessView = {
      schema_name: "petra.project-model-readiness-view",
      schema_version: "1.0.0",
      project_id: authority.project_id,
      project_revision: authority.project_revision,
      project_definition_ref: authority.project_definition_ref,
      ...(authority.objective_ref === undefined
        ? {}
        : { objective_ref: authority.objective_ref }),
      readiness,
      limitations: [...LIMITATIONS],
      read_at: this.#now(),
    };
    this.#contracts.assertValid("project-model-readiness-view", "1.0.0", view);
    return view;
  }

  async authorizeProjectModelInteraction(
    request: ProjectModelInteractionAuthorization,
  ): Promise<PetraProjectModelReadinessView> {
    const readiness = await this.getProjectModelReadiness(request.project_id);
    if (readiness === undefined || readiness.readiness.state !== "ready") {
      throw new ProjectModelReadinessError(
        "PROJECT_MODEL_INTERACTION_UNAVAILABLE",
        "The Project does not currently have a ready certified model command.",
      );
    }
    if (request.prompt !== readiness.readiness.command.registered_prompt) {
      throw new ProjectModelReadinessError(
        "PROJECT_MODEL_PROMPT_UNREGISTERED",
        "The certified role accepts only its exact registered prompt.",
      );
    }
    if (
      canonicalize(request.request_context) !==
      canonicalize(readiness.readiness.command.request_context)
    ) {
      throw new ProjectModelReadinessError(
        "PROJECT_MODEL_INTERACTION_STALE",
        "The Project, definition, Objective, snapshot, packets, or certification changed after readiness was read.",
      );
    }
    return readiness;
  }
}
