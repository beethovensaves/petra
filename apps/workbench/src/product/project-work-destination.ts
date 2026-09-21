export interface ProjectWorkDestinationRef {
  readonly work_unit_id: string;
  readonly revision: number;
  readonly spec_hash: string;
  readonly record_hash: string;
}

export interface ProjectWorkReturnContext {
  readonly path: string;
  readonly label: string;
  readonly focusId?: string;
}

const WORK_UNIT_ID = /^work_unit_[0-9A-HJKMNP-TV-Z]{26}$/u;
const CONTENT_HASH = /^sha256:[0-9a-f]{64}$/u;

export const projectWorkDestinationPath = (
  projectId: string,
  ref: ProjectWorkDestinationRef,
  returnContext?: ProjectWorkReturnContext,
): string => {
  assertProjectWorkDestinationRef(ref);
  const query = new URLSearchParams({
    expected_work_revision: String(ref.revision),
    expected_work_spec_hash: ref.spec_hash,
    expected_work_record_hash: ref.record_hash,
  });
  if (returnContext !== undefined) {
    query.set("return_to", returnContext.path);
    query.set("return_label", returnContext.label);
    if (returnContext.focusId !== undefined)
      query.set("return_focus", returnContext.focusId);
  }
  return `/projects/${encodeURIComponent(projectId)}/work/${encodeURIComponent(ref.work_unit_id)}?${query}`;
};

export const expectedProjectWorkDestinationFromSearch = (
  search: URLSearchParams,
):
  | {
      readonly revision: number;
      readonly specHash: string;
      readonly recordHash: string;
    }
  | undefined => {
  const names = [
    "expected_work_revision",
    "expected_work_spec_hash",
    "expected_work_record_hash",
  ] as const;
  const values = names.map((name) => search.getAll(name));
  if (values.every((matches) => matches.length === 0)) return undefined;
  if (values.some((matches) => matches.length !== 1))
    throw new TypeError(
      "An exact Work destination requires one revision, specification hash, and record hash.",
    );
  const revision = Number(values[0]![0]);
  const specHash = values[1]![0]!;
  const recordHash = values[2]![0]!;
  if (
    !Number.isSafeInteger(revision) ||
    revision < 1 ||
    !CONTENT_HASH.test(specHash) ||
    !CONTENT_HASH.test(recordHash)
  )
    throw new TypeError("The exact Work destination identity is invalid.");
  return { revision, specHash, recordHash };
};

export const assertProjectWorkDestinationRef = (
  ref: ProjectWorkDestinationRef,
): void => {
  if (
    !WORK_UNIT_ID.test(ref.work_unit_id) ||
    !Number.isSafeInteger(ref.revision) ||
    ref.revision < 1 ||
    !CONTENT_HASH.test(ref.spec_hash) ||
    !CONTENT_HASH.test(ref.record_hash)
  )
    throw new TypeError(
      "The Project shell supplied an invalid Work destination.",
    );
};
