import type {
  PetraAuthor,
  PetraExternalIdentifier,
  PetraWork,
  PetraWorkVersion,
} from "@petra/contracts";

/**
 * PostgreSQL and test implementations share this port for the canonical
 * scholarly identity graph. A Work remains distinct from each WorkVersion,
 * and every external identifier stays bound to its exact identity level.
 */
export interface ScholarlyIdentityRepository {
  registerAuthorRevision(author: PetraAuthor): Promise<PetraAuthor>;
  getAuthor(
    authorId: string,
    revision?: number,
  ): Promise<PetraAuthor | undefined>;
  registerWorkRevision(work: PetraWork): Promise<PetraWork>;
  getWork(workId: string, revision?: number): Promise<PetraWork | undefined>;
  registerWorkVersionRevision(
    workVersion: PetraWorkVersion,
  ): Promise<PetraWorkVersion>;
  getWorkVersion(
    workVersionId: string,
    revision?: number,
  ): Promise<PetraWorkVersion | undefined>;
  registerExternalIdentifierRevision(
    identifier: PetraExternalIdentifier,
  ): Promise<PetraExternalIdentifier>;
  getExternalIdentifier(
    externalIdentifierId: string,
    revision?: number,
  ): Promise<PetraExternalIdentifier | undefined>;
}
