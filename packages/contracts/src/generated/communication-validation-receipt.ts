/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export interface PetraCommunicationValidationReceipt {
  schema_name: "petra.communication-validation-receipt";
  schema_version: "1.0.0";
  scope: "structured_preservation_and_reference_fidelity";
  outcome: "blocked";
  /**
   * @maxItems 10000
   */
  checks: CommunicationCheck[];
  language_validation: "incomplete";
  repair_provenance: null;
  /**
   * @maxItems 10000
   */
  limitations: string[];
}
export interface CommunicationCheck {
  check: string;
  status: "passed" | "blocked" | "not_performed";
  /**
   * @maxItems 10000
   */
  findings: string[];
}
