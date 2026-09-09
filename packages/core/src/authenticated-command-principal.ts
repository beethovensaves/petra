import type { ActorRef } from "@petra/contracts";

import type { CommandAuthorizationRequest } from "./evidence-registry.js";

export type AuthenticatedCommandPrincipalDenialReason =
  "actor_not_registered" | "active_grant_not_found" | "active_grant_ambiguous";

export type AuthenticatedCommandPrincipalResolution =
  | {
      readonly state: "resolved";
      readonly actor: ActorRef;
      readonly capabilityGrantId: string;
    }
  | {
      readonly state: "denied";
      readonly reason: AuthenticatedCommandPrincipalDenialReason;
    };

/**
 * Resolves server-authenticated identity and authority without accepting either
 * value from a command request body.
 */
export interface AuthenticatedCommandPrincipalResolver {
  resolveCommandPrincipal(input: {
    readonly projectId: string;
    readonly commandName: CommandAuthorizationRequest["commandName"];
  }): Promise<AuthenticatedCommandPrincipalResolution>;
}
