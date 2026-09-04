import type { PetraRenderedArtifact } from "@petra/contracts";

type DeepReadonly<Value> = Value extends (...args: never[]) => unknown
  ? Value
  : Value extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : Value extends object
      ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
      : Value;

/**
 * Durable authority boundary for a representation of an already-authoritative
 * composition aggregate. A RenderedArtifact records exact lineage and bytes;
 * it never becomes scientific authority itself.
 */
export interface RenderedArtifactAuthorityRepository {
  register(
    record: PetraRenderedArtifact,
  ): Promise<DeepReadonly<PetraRenderedArtifact>>;
  get(
    renderedArtifactId: string,
    revision?: number,
  ): Promise<PetraRenderedArtifact | undefined>;
  getForDraft(
    draftArtifactId: string,
    draftRevision: number,
  ): Promise<readonly PetraRenderedArtifact[]>;
}
