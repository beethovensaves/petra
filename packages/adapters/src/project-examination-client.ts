import type {
  PetraProjectExaminationRequest,
  PetraProjectExaminationAuthorityRequest,
  PetraProjectExaminationAuthorityReceipt,
  PetraProjectExaminationReceipt,
  PetraProjectExaminationView,
} from "@petra/contracts";
import type {
  ProjectExaminationRecord,
  ProjectExaminationCommandResult,
} from "@petra/core";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";
export const examinationContentHash = async (
  value: unknown,
): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};
export const examinationReference = async (
  record: ProjectExaminationRecord,
) => ({
  schema_name: record.schema_name,
  schema_version: record.schema_version,
  record_id:
    "hypothesis_id" in record
      ? record.hypothesis_id
      : "hypothesis_assessment_id" in record
        ? record.hypothesis_assessment_id
        : "posture_decision_id" in record
          ? record.posture_decision_id
          : record.cycle_disposition_id,
  revision: record.revision,
  record_hash: await examinationContentHash(record),
});
export class ExaminationRequestRejected extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ExaminationRequestRejected";
  }
}
const object = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
export class ProjectExaminationClient {
  constructor(
    readonly options: { baseUrl: string; token: string; fetch?: typeof fetch },
  ) {}
  async #request(path: string, init?: RequestInit): Promise<unknown> {
    const response = await (this.options.fetch ?? fetch)(
      new URL(path, this.options.baseUrl),
      {
        ...init,
        headers: {
          authorization: `Bearer ${this.options.token}`,
          ...(init?.body === undefined
            ? {}
            : { "content-type": "application/json" }),
        },
      },
    );
    const reader = response.body?.getReader();
    if (!reader) throw new Error("The examination response was interrupted.");
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.byteLength;
        if (size > 12_000_000) {
          await reader.cancel();
          throw new Error("The examination response exceeds its read budget.");
        }
        chunks.push(next.value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let position = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, position);
      position += chunk.byteLength;
    }
    const value: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
    if (!response.ok) {
      const error = object(object(value).error);
      const message =
        typeof error.message === "string"
          ? error.message
          : "This exact examination is unavailable.";
      const uncertain = new Set([
        "EXAMINATION_UNAVAILABLE",
        "EXAMINATION_COMMAND_CONFLICT",
        "EXAMINATION_COMMAND_NOT_AVAILABLE",
        "EXAMINATION_RECEIPT_CORRUPT",
        "EXAMINATION_CONCURRENT_CHANGE",
      ]);
      if (
        [403, 409, 422].includes(response.status) &&
        typeof error.code === "string" &&
        !uncertain.has(error.code)
      )
        throw new ExaminationRequestRejected(error.code, message);
      throw new Error(message);
    }
    return value;
  }
  #project(projectId: string): void {
    if (!/^project_[0-9A-HJKMNP-TV-Z]{26}$/u.test(projectId))
      throw new Error("The Project identity is malformed.");
  }
  async #record(
    projectId: string,
    record: ProjectExaminationRecord,
  ): Promise<void> {
    new PetraContractRegistry().assertValid(
      record.schema_name.replace(/^petra\./u, ""),
      record.schema_version,
      record,
    );
    if (
      record.project_id !== projectId ||
      (await examinationContentHash(record.content)) !== record.content_hash
    )
      throw new Error(
        "The examination record belongs to a different or incoherent Project basis.",
      );
  }
  async read(
    projectId: string,
    afterSequence = 0,
    signal?: AbortSignal,
  ): Promise<PetraProjectExaminationView> {
    this.#project(projectId);
    if (!Number.isSafeInteger(afterSequence) || afterSequence < 0)
      throw new Error("The examination history cursor is malformed.");
    const value = await this.#request(
      `/api/queries/projects/${projectId}/examinations?after=${afterSequence}`,
      signal === undefined ? undefined : { signal },
    );
    new PetraContractRegistry().assertValid(
      "project-examination-view",
      "1.0.0",
      value,
    );
    const view = value as PetraProjectExaminationView;
    if (
      view.project_id !== projectId ||
      view.graph.project_id !== projectId ||
      (await examinationContentHash(view.graph.content)) !==
        view.graph.content_hash ||
      (view.has_more && view.next_sequence === undefined)
    )
      throw new Error(
        "The examination view is not bound to its exact Project graph or history page.",
      );
    await Promise.all(
      view.records.map((record) => this.#record(projectId, record)),
    );
    for (const catalog of [view.profile, view.policy])
      if (
        catalog !== null &&
        (await examinationContentHash(catalog.content)) !== catalog.content_hash
      )
        throw new Error(
          "The examination profile or policy hash is incoherent.",
        );
    if ((view.profile === null) !== (view.policy === null))
      throw new Error(
        "The examination profile and policy must be selected together.",
      );
    if (
      view.profile !== null &&
      view.policy !== null &&
      view.policy.content.profile_ref.record_hash !==
        (await examinationContentHash(view.profile))
    )
      throw new Error("The policy belongs to a different profile revision.");
    if (view.scene !== undefined) {
      if (
        view.scene.project_id !== projectId ||
        view.scene.content.graph_content_hash !== view.graph.content_hash ||
        (await examinationContentHash(view.scene.content)) !==
          view.scene.content_hash
      )
        throw new Error(
          "The examination scene belongs to a different Project or examined graph.",
        );
      const keys = view.scene.content.nodes.map((node) => node.key);
      if (
        new Set(keys).size !== keys.length ||
        view.scene.content.relationships.some(
          (edge) =>
            !keys.includes(edge.subject_key) || !keys.includes(edge.object_key),
        )
      )
        throw new Error(
          "The examination scene has duplicated identities or unrepresented endpoints.",
        );
    }
    const exactRefs = await Promise.all(view.records.map(examinationReference));
    for (const receipt of view.receipts) {
      if (
        receipt.project_id !== projectId ||
        (await examinationContentHash(receipt.content)) !==
          receipt.content_hash ||
        !exactRefs.some(
          (ref) =>
            canonicalize(ref) === canonicalize(receipt.content.record_ref),
        )
      )
        throw new Error(
          "The history receipt belongs to a different Project or record revision.",
        );
    }
    return view;
  }
  async #result(
    projectId: string,
    value: unknown,
  ): Promise<ProjectExaminationCommandResult> {
    const result = object(value);
    if (result.outcome !== "recorded" && result.outcome !== "replayed")
      throw new Error("The examination command outcome is malformed.");
    const record = result.record as ProjectExaminationRecord;
    const receipt = result.receipt as PetraProjectExaminationReceipt;
    await this.#record(projectId, record);
    new PetraContractRegistry().assertValid(
      "project-examination-receipt",
      "1.0.0",
      receipt,
    );
    if (
      receipt.project_id !== projectId ||
      (await examinationContentHash(receipt.content)) !==
        receipt.content_hash ||
      canonicalize(receipt.content.record_ref) !==
        canonicalize(await examinationReference(record)) ||
      canonicalize(receipt.content.actor) !== canonicalize(record.created_by)
    )
      throw new Error(
        "The retained receipt and exact examination record do not agree.",
      );
    return { outcome: result.outcome, record, receipt };
  }
  async submit(
    request: PetraProjectExaminationRequest,
  ): Promise<ProjectExaminationCommandResult> {
    this.#project(request.project_id);
    new PetraContractRegistry().assertValid(
      "project-examination-request",
      "1.0.0",
      request,
    );
    if (
      (await examinationContentHash(request.proposed_content)) !==
      request.review.content_hash
    )
      throw new Error("The reviewed content changed before submission.");
    const result = await this.#result(
      request.project_id,
      await this.#request(
        `/api/commands/projects/${request.project_id}/examinations`,
        { method: "POST", body: JSON.stringify(request) },
      ),
    );
    if (
      result.receipt.content.command_id !== request.command_id ||
      result.receipt.content.request_hash !==
        (await examinationContentHash(request)) ||
      result.receipt.content.graph_content_hash !== request.expected_graph_hash
    )
      throw new Error(
        "The receipt belongs to another reviewed command or graph snapshot.",
      );
    return result;
  }
  async recover(
    projectId: string,
    commandId: string,
  ): Promise<ProjectExaminationCommandResult | undefined> {
    this.#project(projectId);
    if (!/^command_[0-9A-HJKMNP-TV-Z]{26}$/u.test(commandId))
      throw new Error("The command identity is malformed.");
    const value = await this.#request(
      `/api/queries/projects/${projectId}/examinations/commands/${commandId}`,
    );
    const state = object(value).state;
    if (state === "not_recorded") return undefined;
    if (state !== "recorded")
      throw new Error("The retained command read is malformed.");
    const result = await this.#result(projectId, value);
    if (result.receipt.content.command_id !== commandId)
      throw new Error("The retained receipt belongs to another command.");
    return result;
  }
  async #authorityReceipt(
    projectId: string,
    value: unknown,
  ): Promise<PetraProjectExaminationAuthorityReceipt> {
    const receipt = value as PetraProjectExaminationAuthorityReceipt;
    new PetraContractRegistry().assertValid(
      "project-examination-authority-receipt",
      "1.0.0",
      receipt,
    );
    const grant = receipt.content.grant;
    if (
      receipt.project_id !== projectId ||
      grant.project_id !== projectId ||
      (await examinationContentHash(receipt.content)) !==
        receipt.content_hash ||
      (await examinationContentHash(grant.content)) !== grant.content_hash ||
      canonicalize(grant.grantee) !== canonicalize(receipt.content.actor) ||
      canonicalize(grant.issued_by) !== canonicalize(receipt.content.actor) ||
      grant.content.allowed_commands.length !== 1 ||
      grant.content.allowed_commands[0] !== "ConductProjectExamination"
    )
      throw new Error(
        "The retained authority receipt does not bind this owner-only examination grant.",
      );
    return receipt;
  }
  async authorizeOwner(request: PetraProjectExaminationAuthorityRequest) {
    this.#project(request.project_id);
    new PetraContractRegistry().assertValid(
      "project-examination-authority-request",
      "1.0.0",
      request,
    );
    const receipt = await this.#authorityReceipt(
      request.project_id,
      await this.#request(
        `/api/commands/projects/${request.project_id}/examinations/authority`,
        { method: "POST", body: JSON.stringify(request) },
      ),
    );
    if (
      receipt.content.command_id !== request.command_id ||
      receipt.content.idempotency_key !== request.idempotency_key ||
      receipt.content.request_hash !==
        (await examinationContentHash(request)) ||
      receipt.content.graph_content_hash !== request.graph_content_hash ||
      canonicalize(receipt.content.review) !== canonicalize(request.review)
    )
      throw new Error(
        "The authority receipt belongs to a different reviewed request.",
      );
    return receipt;
  }
  async recoverOwnerAuthority(projectId: string, commandId: string) {
    this.#project(projectId);
    if (!/^command_[0-9A-HJKMNP-TV-Z]{26}$/u.test(commandId))
      throw new Error("The command identity is malformed.");
    const value = object(
      await this.#request(
        `/api/queries/projects/${projectId}/examinations/authority/${commandId}`,
      ),
    );
    if (value.state === "not_recorded") return undefined;
    if (value.state !== "recorded")
      throw new Error("The retained authority command read is malformed.");
    const receipt = await this.#authorityReceipt(projectId, value.receipt);
    if (receipt.content.command_id !== commandId)
      throw new Error("The receipt belongs to another authority command.");
    return receipt;
  }
}
