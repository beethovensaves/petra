import type {
  ConversationAuthorityProposal,
  PetraCopilotAuthorityRequest,
  PetraCopilotAuthorityReceipt,
  PetraProject,
} from "@petra/contracts";
import { COPILOT_PROFILE, copilotHash } from "./project-copilot.js";
export const conversationAuthorityProposal = (
  project: PetraProject,
  actorId: string,
): ConversationAuthorityProposal => ({
  project_id: project.project_id,
  project_revision: project.revision,
  project_record_hash: copilotHash(project),
  actor_id: actorId,
  allowed_commands: ["RunProjectCopilot"],
  limits: {
    max_wall_time_ms: COPILOT_PROFILE.timeout_ms,
    max_output_bytes: 256000,
    max_attempts: 1,
    max_parallelism: 1,
  },
  domain_authority: false,
});
export type ConversationPermissionRead =
  | { state: "ready"; grant_id: string }
  | {
      state: "required";
      reason: string;
      proposal: ConversationAuthorityProposal;
    }
  | { state: "unavailable"; reason: string };
export interface ConversationPermissionAuthority {
  read(projectId: string): Promise<ConversationPermissionRead>;
  execute(
    projectId: string,
    request: PetraCopilotAuthorityRequest,
  ): Promise<PetraCopilotAuthorityReceipt>;
}
