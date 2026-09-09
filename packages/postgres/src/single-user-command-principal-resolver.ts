import type {
  AuthenticatedCommandPrincipalResolution,
  AuthenticatedCommandPrincipalResolver,
  CommandAuthorizationRequest,
} from "@petra/core";
import type { Pool } from "pg";

interface ResolutionRow {
  readonly actor_registered: boolean;
  readonly capability_grant_ids: string[] | null;
}

export interface SingleUserCommandPrincipal {
  readonly actor_id: string;
  readonly actor_kind: "human";
}

/**
 * Maps the already-authenticated single-user server principal to exactly one
 * active, unrevoked Project command grant. The caller cannot choose either ID.
 */
export class PostgresSingleUserCommandPrincipalResolver implements AuthenticatedCommandPrincipalResolver {
  readonly #pool: Pool;
  readonly #principal: SingleUserCommandPrincipal;

  constructor(pool: Pool, principal: SingleUserCommandPrincipal) {
    this.#pool = pool;
    this.#principal = { ...principal };
  }

  async resolveCommandPrincipal(input: {
    readonly projectId: string;
    readonly commandName: CommandAuthorizationRequest["commandName"];
  }): Promise<AuthenticatedCommandPrincipalResolution> {
    const result = await this.#pool.query<ResolutionRow>(
      `WITH configured_actor AS (
         SELECT 1
           FROM petra.actors
          WHERE actor_id = $1
            AND actor_kind = $2
       ), eligible_grants AS (
         SELECT capability_grant_id
           FROM petra.capability_grants AS grant_record
          WHERE project_id = $3
            AND grantee_actor_id = $1
            AND grantee_actor_kind = $2
            AND valid_from <= CURRENT_TIMESTAMP
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            AND $4 = ANY(allowed_commands)
            AND NOT EXISTS (
              SELECT 1
                FROM petra.capability_grant_revocations AS revocation
               WHERE revocation.capability_grant_id =
                 grant_record.capability_grant_id
            )
          ORDER BY valid_from DESC, capability_grant_id ASC
          LIMIT 2
       )
       SELECT EXISTS(SELECT 1 FROM configured_actor) AS actor_registered,
              ARRAY(
                SELECT capability_grant_id
                  FROM eligible_grants
              ) AS capability_grant_ids`,
      [
        this.#principal.actor_id,
        this.#principal.actor_kind,
        input.projectId,
        input.commandName,
      ],
    );
    const row = result.rows[0];
    if (row?.actor_registered !== true) {
      return { state: "denied", reason: "actor_not_registered" };
    }
    const grantIds = row.capability_grant_ids ?? [];
    if (grantIds.length === 0) {
      return { state: "denied", reason: "active_grant_not_found" };
    }
    const capabilityGrantId = grantIds[0];
    if (grantIds.length !== 1 || capabilityGrantId === undefined) {
      return { state: "denied", reason: "active_grant_ambiguous" };
    }
    return {
      state: "resolved",
      actor: { ...this.#principal },
      capabilityGrantId,
    };
  }
}
