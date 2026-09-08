/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * A versioned ProjectDefinition-owned mapping from Petra's line-of-inquiry product role to an existing domain record. It does not create a universal Inquiry identity.
 */
export interface PetraProjectInquiryRole {
  schema_name: "petra.project-inquiry-role";
  schema_version: "1.0.0";
  project_inquiry_role_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: RoleContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  updated_at: string;
}
export interface RoleContent {
  project_definition_ref: DefinitionRef;
  role_semantic_key: string;
  representation: ObjectiveRepresentation;
  status: "active" | "superseded";
}
export interface DefinitionRef {
  project_definition_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ObjectiveRepresentation {
  representation_kind: "project_objective";
  registration_kind: "objective_schema";
  objective_kind: string;
  contract: RegistrationContract;
}
export interface RegistrationContract {
  name: "petra.project-objective";
  version: "1.0.0";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
