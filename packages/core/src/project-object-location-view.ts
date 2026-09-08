import type {
  PetraProjectObjectLocationView,
  ProjectObjectLocationRequestContent,
} from "@petra/contracts";

export interface ProjectObjectLocationRequest extends ProjectObjectLocationRequestContent {
  readonly project_id: string;
}

/**
 * Project-scoped semantic destination resolution. Implementations return
 * semantic place roles and exact identities only; clients retain route,
 * layout, focus, and browser-history ownership.
 */
export interface ProjectObjectLocationViewReader {
  locateProjectObject(
    request: ProjectObjectLocationRequest,
  ): Promise<PetraProjectObjectLocationView | undefined>;
}
