CREATE FUNCTION petra.guard_evidence_entity_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'evidence entities cannot be deleted'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.evidence_id <> OLD.evidence_id
     OR NEW.evidence_kind <> OLD.evidence_kind
     OR NEW.created_by_actor_id <> OLD.created_by_actor_id
     OR NEW.created_by_actor_kind <> OLD.created_by_actor_kind
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'evidence identity and authorship are immutable'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.current_revision <> OLD.current_revision + 1 THEN
    RAISE EXCEPTION 'evidence current revision must advance exactly once'
      USING ERRCODE = '40001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TABLE petra.evidence_entities (
  evidence_id text PRIMARY KEY,
  evidence_kind text NOT NULL CHECK (evidence_kind IN ('claim', 'assertion')),
  current_revision bigint NOT NULL CHECK (current_revision >= 1),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (evidence_id, evidence_kind),
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (evidence_kind = 'claim'
      AND evidence_id ~ '^claim_[0-9A-HJKMNP-TV-Z]{26}$')
    OR (evidence_kind = 'assertion'
      AND evidence_id ~ '^assertion_[0-9A-HJKMNP-TV-Z]{26}$')
  )
);

CREATE TABLE petra.evidence_entity_revisions (
  evidence_id text NOT NULL,
  evidence_kind text NOT NULL CHECK (evidence_kind IN ('claim', 'assertion')),
  revision bigint NOT NULL CHECK (revision = 1),
  authority_zone text NOT NULL CHECK (authority_zone = 'quarantine'),
  review_state text NOT NULL CHECK (
    review_state IN ('unreviewed', 'machine_checked', 'human_rejected', 'disputed')
  ),
  admission_kind text NOT NULL DEFAULT 'proposal'
    CHECK (admission_kind = 'proposal'),
  schema_name text NOT NULL,
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload #>> '{authority,zone}' = authority_zone)
    CHECK (payload #>> '{authority,review_state}' = review_state),
  recorded_at timestamptz NOT NULL,
  PRIMARY KEY (evidence_id, revision),
  UNIQUE (evidence_id, evidence_kind, revision),
  FOREIGN KEY (evidence_id, evidence_kind)
    REFERENCES petra.evidence_entities (evidence_id, evidence_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,
  CHECK (
    (evidence_kind = 'claim'
      AND schema_name = 'petra.claim'
      AND payload ->> 'claim_id' = evidence_id)
    OR (evidence_kind = 'assertion'
      AND schema_name = 'petra.assertion'
      AND payload ->> 'assertion_id' = evidence_id)
  )
);

ALTER TABLE petra.evidence_entities
  ADD CONSTRAINT evidence_entities_current_revision_fkey
  FOREIGN KEY (evidence_id, evidence_kind, current_revision)
  REFERENCES petra.evidence_entity_revisions (
    evidence_id, evidence_kind, revision
  )
  ON UPDATE RESTRICT ON DELETE RESTRICT
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE petra.claim_revisions (
  claim_id text NOT NULL,
  evidence_kind text NOT NULL DEFAULT 'claim' CHECK (evidence_kind = 'claim'),
  revision bigint NOT NULL,
  canonical_text text NOT NULL
    CHECK (char_length(canonical_text) BETWEEN 1 AND 20000),
  claim_kind text NOT NULL CHECK (
    claim_kind IN (
      'descriptive', 'comparative', 'causal', 'mechanistic',
      'methodological', 'theoretical', 'measurement'
    )
  ),
  normalization_status text NOT NULL
    CHECK (normalization_status IN ('verbatim', 'normalized', 'composed')),
  basis_kind text NOT NULL CHECK (basis_kind IN ('source', 'synthesis', 'researcher')),
  source_work_version_id text,
  source_work_version_kind text
    CHECK (source_work_version_kind IS NULL OR source_work_version_kind = 'work_version'),
  source_scope text CHECK (source_scope IN ('full_text', 'abstract_only')),
  detail_level text CHECK (detail_level IN ('broad', 'detailed')),
  source_stance text CHECK (
    source_stance IN ('states', 'hypothesizes', 'reports', 'qualifies', 'rejects')
  ),
  modality text CHECK (modality IN ('asserted', 'hedged', 'conditional', 'speculative')),
  negated boolean,
  scope jsonb NOT NULL CHECK (jsonb_typeof(scope) = 'object'),
  basis jsonb NOT NULL CHECK (jsonb_typeof(basis) = 'object'),
  basis_actor_id text NOT NULL,
  basis_actor_kind text NOT NULL,
  basis_recorded_at timestamptz NOT NULL,
  derivation_kind text CHECK (
    derivation_kind IN (
      'deterministic_mapping', 'model_extraction', 'human_extraction'
    )
  ),
  derivation_ref text,
  composition_kind text CHECK (
    composition_kind IN ('human', 'model_assisted', 'deterministic')
  ),
  composition_ref text,
  supersedes_claim_id text,
  PRIMARY KEY (claim_id, revision),
  FOREIGN KEY (claim_id, evidence_kind, revision)
    REFERENCES petra.evidence_entity_revisions (
      evidence_id, evidence_kind, revision
    ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (source_work_version_id, source_work_version_kind)
    REFERENCES petra.canonical_entities (entity_id, entity_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (basis_actor_id, basis_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (supersedes_claim_id, evidence_kind)
    REFERENCES petra.evidence_entities (evidence_id, evidence_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,
  CHECK (
    (basis_kind = 'source'
      AND source_work_version_id IS NOT NULL
      AND source_work_version_kind = 'work_version'
      AND source_scope IS NOT NULL
      AND detail_level IS NOT NULL
      AND source_stance IS NOT NULL
      AND modality IS NOT NULL
      AND negated IS NOT NULL
      AND derivation_kind IS NOT NULL
      AND derivation_ref IS NOT NULL
      AND composition_kind IS NULL
      AND composition_ref IS NULL
      AND normalization_status <> 'composed')
    OR (basis_kind = 'synthesis'
      AND source_work_version_id IS NULL
      AND source_work_version_kind IS NULL
      AND source_scope IS NULL
      AND detail_level IS NULL
      AND source_stance IS NULL
      AND modality IS NULL
      AND negated IS NULL
      AND derivation_kind IS NULL
      AND derivation_ref IS NULL
      AND composition_kind IS NOT NULL
      AND composition_ref IS NOT NULL
      AND normalization_status = 'composed')
    OR (basis_kind = 'researcher'
      AND source_work_version_id IS NULL
      AND source_work_version_kind IS NULL
      AND source_scope IS NULL
      AND detail_level IS NULL
      AND source_stance IS NULL
      AND modality IS NULL
      AND negated IS NULL
      AND derivation_kind IS NULL
      AND derivation_ref IS NULL
      AND composition_kind IS NULL
      AND composition_ref IS NULL
      AND normalization_status = 'composed')
  ),
  CHECK (
    source_scope <> 'abstract_only'
    OR (detail_level = 'broad'
      AND claim_kind IN ('descriptive', 'comparative', 'theoretical'))
  )
);

CREATE TABLE petra.claim_source_spans (
  claim_id text NOT NULL,
  claim_revision bigint NOT NULL,
  position bigint NOT NULL CHECK (position >= 1),
  source_span_id text NOT NULL,
  PRIMARY KEY (claim_id, claim_revision, position),
  UNIQUE (claim_id, claim_revision, source_span_id),
  FOREIGN KEY (claim_id, claim_revision)
    REFERENCES petra.claim_revisions (claim_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (source_span_id)
    REFERENCES petra.source_spans (source_span_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.claim_basis_claims (
  claim_id text NOT NULL,
  claim_revision bigint NOT NULL,
  position bigint NOT NULL CHECK (position >= 1),
  basis_claim_id text NOT NULL,
  basis_evidence_kind text NOT NULL DEFAULT 'claim'
    CHECK (basis_evidence_kind = 'claim'),
  PRIMARY KEY (claim_id, claim_revision, position),
  UNIQUE (claim_id, claim_revision, basis_claim_id),
  FOREIGN KEY (claim_id, claim_revision)
    REFERENCES petra.claim_revisions (claim_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (basis_claim_id, basis_evidence_kind)
    REFERENCES petra.evidence_entities (evidence_id, evidence_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.claim_basis_assertions (
  claim_id text NOT NULL,
  claim_revision bigint NOT NULL,
  position bigint NOT NULL CHECK (position >= 1),
  basis_assertion_id text NOT NULL,
  basis_evidence_kind text NOT NULL DEFAULT 'assertion'
    CHECK (basis_evidence_kind = 'assertion'),
  PRIMARY KEY (claim_id, claim_revision, position),
  UNIQUE (claim_id, claim_revision, basis_assertion_id),
  FOREIGN KEY (claim_id, claim_revision)
    REFERENCES petra.claim_revisions (claim_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (basis_assertion_id, basis_evidence_kind)
    REFERENCES petra.evidence_entities (evidence_id, evidence_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.claim_validator_results (
  claim_id text NOT NULL,
  claim_revision bigint NOT NULL,
  position bigint NOT NULL CHECK (position >= 1),
  validator_name text NOT NULL,
  validator_version text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('pass', 'warning')),
  code text NOT NULL CHECK (code ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  message text,
  PRIMARY KEY (claim_id, claim_revision, position),
  FOREIGN KEY (claim_id, claim_revision)
    REFERENCES petra.claim_revisions (claim_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.assertion_revisions (
  assertion_id text NOT NULL,
  evidence_kind text NOT NULL DEFAULT 'assertion'
    CHECK (evidence_kind = 'assertion'),
  revision bigint NOT NULL,
  subject_id text NOT NULL
    CHECK (subject_id ~ '^[a-z][a-z0-9_]{1,31}_[0-9A-HJKMNP-TV-Z]{26}$'),
  predicate text NOT NULL CHECK (
    predicate IN (
      'VERSION_OF', 'REPRESENTED_BY', 'LOCATED_IN', 'CITES',
      'CITES_AS_BACKGROUND', 'ASSERTS', 'ADDRESSES', 'SUPPORTS',
      'CONTRADICTS', 'QUALIFIES', 'ADOPTS', 'DIRECTLY_TESTS', 'EXTENDS',
      'REFRAMES', 'CHALLENGES', 'CRITIQUES_METHOD', 'ASSUMES', 'PREDICTS',
      'RIVAL_OF', 'TESTS', 'IMPLEMENTS', 'USES', 'PRODUCED', 'ANALYZES',
      'EVALUATES', 'GOVERNS', 'INTERPRETS', 'COMPOSED_FROM', 'GROUNDS',
      'RENDERS', 'REPLICATES', 'FAILS_TO_REPLICATE', 'INVESTIGATES',
      'TESTS_CAUSE', 'CORRECTS', 'DEPENDS_ON', 'SUPERSEDES'
    )
  ),
  object_kind text NOT NULL
    CHECK (object_kind IN ('entity', 'string', 'boolean', 'integer', 'decimal', 'timestamp')),
  object_entity_id text,
  object_value jsonb,
  assertion_kind text NOT NULL CHECK (
    assertion_kind IN (
      'source_native', 'source_stated', 'deterministic_derivation',
      'model_inference', 'human_judgment', 'experimental_observation', 'synthesis'
    )
  ),
  scope jsonb NOT NULL CHECK (jsonb_typeof(scope) = 'object'),
  scope_comparison_relation text CHECK (
    scope_comparison_relation IN (
      'aligned', 'overlapping', 'narrower', 'broader', 'disjoint', 'unknown'
    )
  ),
  rationale text NOT NULL CHECK (char_length(rationale) BETWEEN 1 AND 8000),
  occurred_at timestamptz,
  recorded_at timestamptz NOT NULL,
  valid_from timestamptz,
  valid_to timestamptz,
  supersedes_assertion_id text,
  PRIMARY KEY (assertion_id, revision),
  FOREIGN KEY (assertion_id, evidence_kind, revision)
    REFERENCES petra.evidence_entity_revisions (
      evidence_id, evidence_kind, revision
    ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (supersedes_assertion_id, evidence_kind)
    REFERENCES petra.evidence_entities (evidence_id, evidence_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,
  CHECK (
    (object_kind = 'entity' AND object_entity_id IS NOT NULL AND object_value IS NULL)
    OR (object_kind <> 'entity' AND object_entity_id IS NULL AND object_value IS NOT NULL)
  ),
  CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from),
  CHECK (
    predicate <> 'ASSERTS'
    OR (
      subject_id ~ '^work_version_'
      AND object_kind = 'entity'
      AND object_entity_id ~ '^claim_'
      AND assertion_kind IN ('source_stated', 'source_native')
    )
  ),
  CHECK (
    predicate NOT IN (
      'SUPPORTS', 'CONTRADICTS', 'QUALIFIES', 'ADOPTS', 'DIRECTLY_TESTS',
      'EXTENDS', 'REFRAMES', 'CHALLENGES', 'CRITIQUES_METHOD', 'INTERPRETS',
      'REPLICATES', 'FAILS_TO_REPLICATE'
    )
    OR scope_comparison_relation IS NOT NULL
  )
);

CREATE TABLE petra.assertion_provenance (
  assertion_id text NOT NULL,
  assertion_revision bigint NOT NULL,
  position bigint NOT NULL CHECK (position >= 1),
  provenance_kind text NOT NULL CHECK (
    provenance_kind IN ('source_span', 'structured_field', 'basis_assertion', 'actor', 'record')
  ),
  source_span_id text,
  artifact_id text,
  basis_assertion_id text,
  basis_evidence_kind text CHECK (
    basis_evidence_kind IS NULL OR basis_evidence_kind = 'assertion'
  ),
  actor_id text,
  actor_kind text,
  record_id text,
  record_role text CHECK (
    record_role IN ('derivation', 'input', 'output', 'model_call', 'run', 'result', 'analysis')
  ),
  provenance jsonb NOT NULL CHECK (jsonb_typeof(provenance) = 'object'),
  PRIMARY KEY (assertion_id, assertion_revision, position),
  FOREIGN KEY (assertion_id, assertion_revision)
    REFERENCES petra.assertion_revisions (assertion_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (source_span_id)
    REFERENCES petra.source_spans (source_span_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (artifact_id)
    REFERENCES petra.artifacts (artifact_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (basis_assertion_id, basis_evidence_kind)
    REFERENCES petra.evidence_entities (evidence_id, evidence_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (actor_id, actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (provenance_kind = 'source_span'
      AND source_span_id IS NOT NULL
      AND artifact_id IS NULL AND basis_assertion_id IS NULL
      AND basis_evidence_kind IS NULL AND actor_id IS NULL
      AND actor_kind IS NULL AND record_id IS NULL AND record_role IS NULL)
    OR (provenance_kind = 'structured_field'
      AND source_span_id IS NULL
      AND artifact_id IS NOT NULL AND basis_assertion_id IS NULL
      AND basis_evidence_kind IS NULL AND actor_id IS NULL
      AND actor_kind IS NULL AND record_id IS NULL AND record_role IS NULL)
    OR (provenance_kind = 'basis_assertion'
      AND source_span_id IS NULL
      AND artifact_id IS NULL AND basis_assertion_id IS NOT NULL
      AND basis_evidence_kind = 'assertion' AND actor_id IS NULL
      AND actor_kind IS NULL AND record_id IS NULL AND record_role IS NULL)
    OR (provenance_kind = 'actor'
      AND source_span_id IS NULL
      AND artifact_id IS NULL AND basis_assertion_id IS NULL
      AND basis_evidence_kind IS NULL AND actor_id IS NOT NULL
      AND actor_kind IS NOT NULL AND record_id IS NULL AND record_role IS NULL)
    OR (provenance_kind = 'record'
      AND source_span_id IS NULL
      AND artifact_id IS NULL AND basis_assertion_id IS NULL
      AND basis_evidence_kind IS NULL AND actor_id IS NULL
      AND actor_kind IS NULL AND record_id IS NOT NULL AND record_role IS NOT NULL)
  )
);

CREATE FUNCTION petra.validate_claim_relation_completeness()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  claim_payload jsonb;
  expected_source_count bigint;
  expected_basis_claim_count bigint;
  expected_basis_assertion_count bigint;
  expected_validator_count bigint;
BEGIN
  SELECT revision.payload INTO claim_payload
    FROM petra.evidence_entity_revisions AS revision
   WHERE revision.evidence_id = NEW.claim_id
     AND revision.revision = NEW.revision;

  expected_source_count := COALESCE(jsonb_array_length(claim_payload #> '{basis,source_span_ids}'), 0);
  expected_basis_claim_count := COALESCE(jsonb_array_length(claim_payload #> '{basis,basis_claim_ids}'), 0);
  expected_basis_assertion_count := COALESCE(jsonb_array_length(claim_payload #> '{basis,basis_assertion_ids}'), 0);
  expected_validator_count := COALESCE(jsonb_array_length(claim_payload #> '{basis,validator_results}'), 0);

  IF expected_source_count <> (
      SELECT count(*) FROM petra.claim_source_spans
       WHERE claim_id = NEW.claim_id AND claim_revision = NEW.revision
    ) OR expected_basis_claim_count <> (
      SELECT count(*) FROM petra.claim_basis_claims
       WHERE claim_id = NEW.claim_id AND claim_revision = NEW.revision
    ) OR expected_basis_assertion_count <> (
      SELECT count(*) FROM petra.claim_basis_assertions
       WHERE claim_id = NEW.claim_id AND claim_revision = NEW.revision
    ) OR expected_validator_count <> (
      SELECT count(*) FROM petra.claim_validator_results
       WHERE claim_id = NEW.claim_id AND claim_revision = NEW.revision
    ) THEN
    RAISE EXCEPTION 'Claim provenance relations are incomplete'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.basis_kind = 'source' AND EXISTS (
    SELECT 1
      FROM petra.claim_source_spans AS grounding
      JOIN petra.source_spans AS span
        ON span.source_span_id = grounding.source_span_id
      JOIN petra.parsed_documents AS document
        ON document.parsed_document_id = span.parsed_document_id
     WHERE grounding.claim_id = NEW.claim_id
       AND grounding.claim_revision = NEW.revision
       AND (
         span.verification_status = 'unresolved'
         OR document.work_version_id <> NEW.source_work_version_id
       )
  ) THEN
    RAISE EXCEPTION 'Claim SourceSpans must be resolved and belong to its WorkVersion'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.guard_claim_revision_payload()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  claim_payload jsonb;
  expected_basis_actor_id text;
  expected_basis_actor_kind text;
  expected_basis_recorded_at timestamptz;
BEGIN
  SELECT payload INTO claim_payload
    FROM petra.evidence_entity_revisions
   WHERE evidence_id = NEW.claim_id
     AND evidence_kind = 'claim'
     AND revision = NEW.revision;

  IF claim_payload #>> '{basis,basis_kind}' = 'synthesis' THEN
    expected_basis_actor_id := claim_payload #>> '{basis,composed_by,actor_id}';
    expected_basis_actor_kind := claim_payload #>> '{basis,composed_by,actor_kind}';
    expected_basis_recorded_at := (claim_payload #>> '{basis,composed_at}')::timestamptz;
  ELSE
    expected_basis_actor_id := claim_payload #>> '{basis,proposed_by,actor_id}';
    expected_basis_actor_kind := claim_payload #>> '{basis,proposed_by,actor_kind}';
    expected_basis_recorded_at := (claim_payload #>> '{basis,proposed_at}')::timestamptz;
  END IF;

  IF claim_payload IS NULL
     OR claim_payload ->> 'canonical_text' IS DISTINCT FROM NEW.canonical_text
     OR claim_payload ->> 'claim_kind' IS DISTINCT FROM NEW.claim_kind
     OR claim_payload ->> 'normalization_status' IS DISTINCT FROM NEW.normalization_status
     OR claim_payload #>> '{basis,basis_kind}' IS DISTINCT FROM NEW.basis_kind
     OR claim_payload #>> '{basis,work_version_id}' IS DISTINCT FROM NEW.source_work_version_id
     OR claim_payload #>> '{basis,source_scope}' IS DISTINCT FROM NEW.source_scope
     OR claim_payload #>> '{basis,detail_level}' IS DISTINCT FROM NEW.detail_level
     OR claim_payload #>> '{basis,source_stance}' IS DISTINCT FROM NEW.source_stance
     OR claim_payload #>> '{basis,modality}' IS DISTINCT FROM NEW.modality
     OR (claim_payload #>> '{basis,negated}')::boolean IS DISTINCT FROM NEW.negated
     OR claim_payload -> 'scope' IS DISTINCT FROM NEW.scope
     OR claim_payload -> 'basis' IS DISTINCT FROM NEW.basis
     OR expected_basis_actor_id IS DISTINCT FROM NEW.basis_actor_id
     OR expected_basis_actor_kind IS DISTINCT FROM NEW.basis_actor_kind
     OR expected_basis_recorded_at IS DISTINCT FROM NEW.basis_recorded_at
     OR claim_payload #>> '{basis,derivation,derivation_kind}' IS DISTINCT FROM NEW.derivation_kind
     OR claim_payload #>> '{basis,derivation,derivation_ref}' IS DISTINCT FROM NEW.derivation_ref
     OR claim_payload #>> '{basis,composition_kind}' IS DISTINCT FROM NEW.composition_kind
     OR claim_payload #>> '{basis,composition_ref}' IS DISTINCT FROM NEW.composition_ref
     OR claim_payload ->> 'supersedes_claim_id' IS DISTINCT FROM NEW.supersedes_claim_id THEN
    RAISE EXCEPTION 'Claim query columns differ from canonical payload'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.guard_assertion_revision_payload()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  assertion_payload jsonb;
BEGIN
  SELECT payload INTO assertion_payload
    FROM petra.evidence_entity_revisions
   WHERE evidence_id = NEW.assertion_id
     AND evidence_kind = 'assertion'
     AND revision = NEW.revision;

  IF assertion_payload IS NULL
     OR assertion_payload ->> 'subject_id' IS DISTINCT FROM NEW.subject_id
     OR assertion_payload ->> 'predicate' IS DISTINCT FROM NEW.predicate
     OR assertion_payload #>> '{object,object_kind}' IS DISTINCT FROM NEW.object_kind
     OR assertion_payload #>> '{object,entity_id}' IS DISTINCT FROM NEW.object_entity_id
     OR assertion_payload #> '{object,value}' IS DISTINCT FROM NEW.object_value
     OR assertion_payload ->> 'assertion_kind' IS DISTINCT FROM NEW.assertion_kind
     OR assertion_payload -> 'scope' IS DISTINCT FROM NEW.scope
     OR assertion_payload #>> '{scope_comparison,relation}' IS DISTINCT FROM NEW.scope_comparison_relation
     OR assertion_payload ->> 'rationale' IS DISTINCT FROM NEW.rationale
     OR (assertion_payload ->> 'occurred_at')::timestamptz IS DISTINCT FROM NEW.occurred_at
     OR (assertion_payload ->> 'recorded_at')::timestamptz IS DISTINCT FROM NEW.recorded_at
     OR (assertion_payload #>> '{valid_time,valid_from}')::timestamptz IS DISTINCT FROM NEW.valid_from
     OR (assertion_payload #>> '{valid_time,valid_to}')::timestamptz IS DISTINCT FROM NEW.valid_to
     OR assertion_payload ->> 'supersedes_assertion_id' IS DISTINCT FROM NEW.supersedes_assertion_id THEN
    RAISE EXCEPTION 'Assertion query columns differ from canonical payload'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.validate_assertion_provenance_completeness()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  assertion_payload jsonb;
  expected_count bigint;
  target_claim_id text;
  target_work_version_id text;
BEGIN
  SELECT revision.payload INTO assertion_payload
    FROM petra.evidence_entity_revisions AS revision
   WHERE revision.evidence_id = NEW.assertion_id
     AND revision.revision = NEW.revision;

  expected_count := jsonb_array_length(assertion_payload -> 'provenance_refs');
  IF expected_count <> (
    SELECT count(*) FROM petra.assertion_provenance
     WHERE assertion_id = NEW.assertion_id
       AND assertion_revision = NEW.revision
  ) THEN
    RAISE EXCEPTION 'Assertion provenance is incomplete'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.assertion_kind = 'source_stated' AND NOT EXISTS (
    SELECT 1 FROM petra.assertion_provenance
     WHERE assertion_id = NEW.assertion_id
       AND assertion_revision = NEW.revision
       AND provenance_kind = 'source_span'
  ) THEN
    RAISE EXCEPTION 'Source-stated Assertion requires SourceSpan provenance'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.predicate IN (
       'SUPPORTS', 'CONTRADICTS', 'QUALIFIES', 'ADOPTS', 'DIRECTLY_TESTS',
       'EXTENDS', 'REFRAMES', 'CHALLENGES', 'CRITIQUES_METHOD', 'INTERPRETS',
       'REPLICATES', 'FAILS_TO_REPLICATE'
     ) AND NOT EXISTS (
       SELECT 1 FROM petra.assertion_provenance
        WHERE assertion_id = NEW.assertion_id
          AND assertion_revision = NEW.revision
          AND (
            provenance_kind IN ('source_span', 'structured_field')
            OR (provenance_kind = 'record'
              AND record_role IN ('run', 'result', 'analysis'))
          )
     ) THEN
    RAISE EXCEPTION 'Scientific relation requires exact source or experimental provenance'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.predicate = 'ASSERTS' THEN
    target_claim_id := NEW.object_entity_id;
    SELECT source_work_version_id INTO target_work_version_id
      FROM petra.claim_revisions AS claim
      JOIN petra.evidence_entities AS entity
        ON entity.evidence_id = claim.claim_id
       AND entity.current_revision = claim.revision
     WHERE claim.claim_id = target_claim_id
       AND claim.basis_kind = 'source';

    IF target_work_version_id IS NULL
       OR target_work_version_id <> NEW.subject_id
       OR NOT EXISTS (
         SELECT 1
           FROM petra.assertion_provenance AS provenance
           JOIN petra.claim_source_spans AS claim_span
             ON claim_span.claim_id = target_claim_id
            AND claim_span.source_span_id = provenance.source_span_id
          WHERE provenance.assertion_id = NEW.assertion_id
            AND provenance.assertion_revision = NEW.revision
            AND provenance.provenance_kind = 'source_span'
       )
       OR EXISTS (
         SELECT 1
           FROM petra.assertion_provenance AS provenance
          WHERE provenance.assertion_id = NEW.assertion_id
            AND provenance.assertion_revision = NEW.revision
            AND provenance.provenance_kind = 'source_span'
            AND NOT EXISTS (
              SELECT 1 FROM petra.claim_source_spans AS claim_span
               WHERE claim_span.claim_id = target_claim_id
                 AND claim_span.source_span_id = provenance.source_span_id
            )
       ) THEN
      RAISE EXCEPTION 'ASSERTS endpoints or SourceSpan provenance do not match the target Claim'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.guard_claim_ordered_relation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  claim_payload jsonb;
  expected_value text;
BEGIN
  SELECT payload INTO claim_payload
    FROM petra.evidence_entity_revisions
   WHERE evidence_id = NEW.claim_id AND revision = NEW.claim_revision;

  IF TG_TABLE_NAME = 'claim_source_spans' THEN
    expected_value := claim_payload #>> ARRAY['basis', 'source_span_ids', (NEW.position - 1)::text];
    IF expected_value IS NULL OR expected_value <> NEW.source_span_id THEN
      RAISE EXCEPTION 'Claim SourceSpan order differs from payload' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'claim_basis_claims' THEN
    expected_value := claim_payload #>> ARRAY['basis', 'basis_claim_ids', (NEW.position - 1)::text];
    IF expected_value IS NULL OR expected_value <> NEW.basis_claim_id THEN
      RAISE EXCEPTION 'Claim basis-Claim order differs from payload' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'claim_basis_assertions' THEN
    expected_value := claim_payload #>> ARRAY['basis', 'basis_assertion_ids', (NEW.position - 1)::text];
    IF expected_value IS NULL OR expected_value <> NEW.basis_assertion_id THEN
      RAISE EXCEPTION 'Claim basis-Assertion order differs from payload' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'claim_validator_results' THEN
    IF claim_payload #>> ARRAY['basis', 'validator_results', (NEW.position - 1)::text, 'validator_name'] IS DISTINCT FROM NEW.validator_name
       OR claim_payload #>> ARRAY['basis', 'validator_results', (NEW.position - 1)::text, 'validator_version'] IS DISTINCT FROM NEW.validator_version
       OR claim_payload #>> ARRAY['basis', 'validator_results', (NEW.position - 1)::text, 'outcome'] IS DISTINCT FROM NEW.outcome
       OR claim_payload #>> ARRAY['basis', 'validator_results', (NEW.position - 1)::text, 'code'] IS DISTINCT FROM NEW.code
       OR claim_payload #>> ARRAY['basis', 'validator_results', (NEW.position - 1)::text, 'message'] IS DISTINCT FROM NEW.message THEN
      RAISE EXCEPTION 'Claim validator order differs from payload' USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.guard_assertion_provenance_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_value jsonb;
BEGIN
  SELECT payload -> 'provenance_refs' -> ((NEW.position - 1)::integer)
    INTO expected_value
    FROM petra.evidence_entity_revisions
   WHERE evidence_id = NEW.assertion_id
     AND revision = NEW.assertion_revision;

  IF expected_value IS NULL OR expected_value <> NEW.provenance THEN
    RAISE EXCEPTION 'Assertion provenance order differs from payload'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER evidence_entity_identity_is_immutable
BEFORE UPDATE OR DELETE ON petra.evidence_entities
FOR EACH ROW EXECUTE FUNCTION petra.guard_evidence_entity_identity();

CREATE TRIGGER evidence_entity_revisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.evidence_entity_revisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER claim_revisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.claim_revisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER claim_source_spans_are_immutable
BEFORE UPDATE OR DELETE ON petra.claim_source_spans
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER claim_basis_claims_are_immutable
BEFORE UPDATE OR DELETE ON petra.claim_basis_claims
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER claim_basis_assertions_are_immutable
BEFORE UPDATE OR DELETE ON petra.claim_basis_assertions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER claim_validator_results_are_immutable
BEFORE UPDATE OR DELETE ON petra.claim_validator_results
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER assertion_revisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.assertion_revisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER assertion_provenance_is_immutable
BEFORE UPDATE OR DELETE ON petra.assertion_provenance
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER claim_source_span_order_is_exact
BEFORE INSERT ON petra.claim_source_spans
FOR EACH ROW EXECUTE FUNCTION petra.guard_claim_ordered_relation();

CREATE TRIGGER claim_basis_claim_order_is_exact
BEFORE INSERT ON petra.claim_basis_claims
FOR EACH ROW EXECUTE FUNCTION petra.guard_claim_ordered_relation();

CREATE TRIGGER claim_basis_assertion_order_is_exact
BEFORE INSERT ON petra.claim_basis_assertions
FOR EACH ROW EXECUTE FUNCTION petra.guard_claim_ordered_relation();

CREATE TRIGGER claim_validator_order_is_exact
BEFORE INSERT ON petra.claim_validator_results
FOR EACH ROW EXECUTE FUNCTION petra.guard_claim_ordered_relation();

CREATE TRIGGER assertion_provenance_order_is_exact
BEFORE INSERT ON petra.assertion_provenance
FOR EACH ROW EXECUTE FUNCTION petra.guard_assertion_provenance_order();

CREATE TRIGGER claim_revision_payload_is_exact
BEFORE INSERT ON petra.claim_revisions
FOR EACH ROW EXECUTE FUNCTION petra.guard_claim_revision_payload();

CREATE TRIGGER assertion_revision_payload_is_exact
BEFORE INSERT ON petra.assertion_revisions
FOR EACH ROW EXECUTE FUNCTION petra.guard_assertion_revision_payload();

CREATE CONSTRAINT TRIGGER claim_relations_are_complete
AFTER INSERT ON petra.claim_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_claim_relation_completeness();

CREATE CONSTRAINT TRIGGER assertion_provenance_is_complete
AFTER INSERT ON petra.assertion_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_assertion_provenance_completeness();

CREATE INDEX evidence_entity_revisions_authority_idx
  ON petra.evidence_entity_revisions (
    authority_zone, review_state, evidence_kind, recorded_at, evidence_id
  );
CREATE INDEX claim_revisions_work_version_idx
  ON petra.claim_revisions (source_work_version_id, claim_id, revision)
  WHERE source_work_version_id IS NOT NULL;
CREATE INDEX claim_source_spans_span_idx
  ON petra.claim_source_spans (source_span_id, claim_id, claim_revision);
CREATE INDEX assertion_revisions_subject_idx
  ON petra.assertion_revisions (subject_id, predicate, assertion_id, revision);
CREATE INDEX assertion_revisions_object_entity_idx
  ON petra.assertion_revisions (object_entity_id, predicate, assertion_id, revision)
  WHERE object_entity_id IS NOT NULL;
CREATE INDEX assertion_provenance_span_idx
  ON petra.assertion_provenance (source_span_id, assertion_id, assertion_revision)
  WHERE source_span_id IS NOT NULL;

COMMENT ON TABLE petra.evidence_entities IS
  'Stable global Claim and Assertion identities with current immutable revision pointers.';
COMMENT ON TABLE petra.evidence_entity_revisions IS
  'Immutable scientific evidence revisions; V005 admits quarantine proposals only.';
COMMENT ON TABLE petra.claim_source_spans IS
  'Ordered exact SourceSpan grounding for source-derived Claims.';
COMMENT ON TABLE petra.assertion_provenance IS
  'Ordered typed provenance edges retained separately from Assertion payloads.';
