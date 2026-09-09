import type { CommandAuthorizationRequest } from "@petra/core";
import type { PoolClient } from "pg";

/**
 * Evaluates command authority inside the same PostgreSQL transaction that will
 * replay or apply the command. Implementations may lock and validate durable
 * grant state through the supplied client before returning.
 */
export interface PostgresCommandAuthorizer {
  authorize(
    request: CommandAuthorizationRequest,
    transaction: PoolClient,
  ): boolean | Promise<boolean>;
}
