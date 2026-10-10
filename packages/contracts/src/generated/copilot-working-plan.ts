/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * Non-authoritative typed proposals against exact server-owned previews. A proposal cannot execute a command or promote domain authority.
 */
export interface PetraCopilotWorkingPlan {
  schema_name: "petra.copilot-working-plan";
  schema_version: "1.0.0";
  authority: "proposed_only";
  explanation: string;
  /**
   * @maxItems 8
   */
  proposals:
    | []
    | [
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
      ]
    | [
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
      ]
    | [
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
      ]
    | [
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
      ]
    | [
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
      ]
    | [
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
      ]
    | [
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
      ]
    | [
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
        {
          preview_key: string;
          /**
           * @maxItems 12
           */
          changes:
            | []
            | [
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ]
            | [
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
                {
                  path: string;
                  value_json: string;
                },
              ];
          reason: string;
          /**
           * @maxItems 12
           */
          basis_keys:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
        },
      ];
}
