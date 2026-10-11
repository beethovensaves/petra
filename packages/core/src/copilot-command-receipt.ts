import { PetraContractRegistry } from "@petra/contracts/validator";
import { CopilotBoundaryError, copilotHash } from "./project-copilot.js";
import type { CopilotCommandPreview } from "./copilot-command-preview.js";

const object = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new CopilotBoundaryError(
      "COMMAND_RECEIPT_INVALID",
      "The ordinary command returned no registered receipt.",
    );
  return value as Record<string, unknown>;
};
const require = (condition: boolean): void => {
  if (!condition)
    throw new CopilotBoundaryError(
      "COMMAND_RECEIPT_MISMATCH",
      "The observed receipt differs from the exact decided command, Actor or target. Its effect is not confirmed.",
    );
};
const same = (a: unknown, b: unknown): boolean =>
  copilotHash(a) === copilotHash(b);

/** Validate an observed ordinary-owner result; prose and HTTP success are insufficient. */
export function validateCopilotCommandReceipt(
  command: CopilotCommandPreview,
  request: Record<string, unknown>,
  actorId: string,
  value: unknown,
  contracts = new PetraContractRegistry(),
): Record<string, unknown> {
  const operation = command.ordinary_command.operation_id;
  const name =
    operation === "review.apply"
      ? "review-session-apply-result"
      : operation === "brief.suggested-invoke"
        ? "suggested-action-invocation"
        : operation === "source.start-processing"
          ? "project-source-processing-receipt"
          : operation === "work.resume"
            ? "project-work-resume-receipt"
            : operation === "work.start-again"
              ? "project-work-start-again-receipt"
              : "project-work-operation-receipt";
  contracts.assertValid(name, "1.0.0", value);
  const receipt = object(value);
  if (operation === "review.apply") {
    require(same(receipt.request, request));
    // A valid reconciliation_required result is retained without presenting Apply
    // as completed. The ordinary Review owner remains the recovery authority.
    return structuredClone(receipt);
  }
  require(receipt.project_id === command.preview.project_id);
  const content =
    operation === "brief.suggested-invoke" ? object(receipt.content) : receipt;
  const observed =
    operation === "brief.suggested-invoke"
      ? object(content.command_ref)
      : receipt;
  require(
    observed.command_id === request.command_id &&
      observed.idempotency_key === request.idempotency_key,
  );
  const actor = object(observed.actor);
  require(actor.actor_id === actorId && actor.actor_kind === "human");
  if (operation === "brief.suggested-invoke") {
    require(same(content.action_ref, request.expected_action_ref));
    require(receipt.content_hash === copilotHash(receipt.content));
  } else {
    const { record_hash, ...body } = receipt;
    require(record_hash === copilotHash(body));
    if (operation === "source.start-processing") {
      require(
        same(receipt.expected, request.expected) &&
          receipt.request_hash === copilotHash(request),
      );
    } else {
      const fresh = operation === "work.start-again";
      require(
        same(
          receipt[
            fresh ? "requested_prior_work_unit_ref" : "requested_work_unit_ref"
          ],
          request[
            fresh ? "expected_prior_work_unit_ref" : "expected_work_unit_ref"
          ],
        ),
      );
      if (operation === "work.resume") {
        require(same(receipt.checkpoint, request.expected_checkpoint));
      } else if (fresh) {
        require(
          same(
            receipt.start_again_registration,
            request.start_again_registration_ref,
          ),
        );
      } else require(receipt.operation === request.operation);
    }
  }
  return structuredClone(receipt);
}
