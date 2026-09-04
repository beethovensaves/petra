ALTER TABLE petra.draft_spans
  ADD CONSTRAINT draft_spans_felicity_identity_key
  UNIQUE (
    draft_span_id, revision, draft_artifact_id, draft_artifact_revision,
    exact_text_hash
  );

CREATE TABLE petra.composition_revision_commands (
  command_id text PRIMARY KEY
    CHECK (command_id ~ '^[a-z][a-z0-9_]*_[0-9A-HJKMNP-TV-Z]{26}$'),
  authority_kind text NOT NULL CHECK (
    authority_kind IN ('draft_support_assessment', 'felicity_revision_record')
  ),
  authority_id text NOT NULL,
  authority_revision bigint NOT NULL CHECK (authority_revision >= 1),
  project_id text NOT NULL,
  registered_by_actor_id text NOT NULL,
  registered_by_actor_kind text NOT NULL CHECK (
    registered_by_actor_kind = 'service'
  ),
  registered_at timestamptz NOT NULL,
  UNIQUE (authority_kind, authority_id, authority_revision),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (registered_by_actor_id, registered_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

INSERT INTO petra.composition_revision_commands (
  command_id, authority_kind, authority_id, authority_revision, project_id,
  registered_by_actor_id, registered_by_actor_kind, registered_at
)
SELECT command_id, 'draft_support_assessment',
       draft_support_assessment_id, revision, project_id,
       assessed_by_actor_id, assessed_by_actor_kind, assessed_at
  FROM petra.draft_support_assessment_revisions;

ALTER TABLE petra.draft_support_assessment_revisions
  ADD CONSTRAINT draft_support_assessment_revision_command_fkey
  FOREIGN KEY (command_id)
  REFERENCES petra.composition_revision_commands (command_id)
  ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE FUNCTION petra.claim_composition_revision_command()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_kind text;
  target_id text;
  target_project_id text;
  target_actor_id text;
  target_actor_kind text;
  target_time timestamptz;
BEGIN
  IF TG_TABLE_NAME = 'draft_support_assessment_revisions' THEN
    target_kind := 'draft_support_assessment';
    target_id := NEW.draft_support_assessment_id;
    target_project_id := NEW.project_id;
    target_actor_id := NEW.assessed_by_actor_id;
    target_actor_kind := NEW.assessed_by_actor_kind;
    target_time := NEW.assessed_at;
  ELSE
    target_kind := 'felicity_revision_record';
    target_id := NEW.felicity_revision_record_id;
    target_project_id := NEW.project_id;
    target_actor_id := NEW.recorded_by_actor_id;
    target_actor_kind := NEW.recorded_by_actor_kind;
    target_time := NEW.recorded_at;
  END IF;

  INSERT INTO petra.composition_revision_commands (
    command_id, authority_kind, authority_id, authority_revision,
    project_id, registered_by_actor_id, registered_by_actor_kind,
    registered_at
  ) VALUES (
    NEW.command_id, target_kind, target_id, NEW.revision,
    target_project_id, target_actor_id, target_actor_kind, target_time
  );
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.guard_immutable_composition_revision_command()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Composition revision command ownership is immutable'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER draft_support_revision_command_claim
BEFORE INSERT ON petra.draft_support_assessment_revisions
FOR EACH ROW EXECUTE FUNCTION petra.claim_composition_revision_command();

CREATE TRIGGER composition_revision_commands_immutable
BEFORE UPDATE OR DELETE ON petra.composition_revision_commands
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_composition_revision_command();

CREATE TABLE petra.felicity_revision_records (
  felicity_revision_record_id text NOT NULL
    CHECK (
      felicity_revision_record_id ~
        '^felicity_revision_record_[0-9A-HJKMNP-TV-Z]{26}$'
    ),
  revision bigint NOT NULL CHECK (revision = 1),
  project_id text NOT NULL,
  command_id text NOT NULL UNIQUE,
  previous_draft_artifact_id text NOT NULL,
  previous_draft_revision bigint NOT NULL CHECK (previous_draft_revision >= 1),
  previous_draft_hash text NOT NULL
    CHECK (previous_draft_hash ~ '^sha256:[0-9a-f]{64}$'),
  revised_draft_artifact_id text NOT NULL,
  revised_draft_revision bigint NOT NULL CHECK (revised_draft_revision >= 2),
  revised_draft_hash text NOT NULL
    CHECK (revised_draft_hash ~ '^sha256:[0-9a-f]{64}$'),
  provenance_map_id text NOT NULL,
  provenance_map_revision bigint NOT NULL CHECK (provenance_map_revision = 1),
  provenance_map_hash text NOT NULL
    CHECK (provenance_map_hash ~ '^sha256:[0-9a-f]{64}$'),
  citation_bundle_id text NOT NULL,
  citation_bundle_revision bigint NOT NULL CHECK (citation_bundle_revision = 1),
  citation_bundle_hash text NOT NULL
    CHECK (citation_bundle_hash ~ '^sha256:[0-9a-f]{64}$'),
  language_contract_name text NOT NULL CHECK (
    language_contract_name = 'petra.felicity'
  ),
  language_contract_version text NOT NULL,
  language_contract_hash text NOT NULL
    CHECK (language_contract_hash ~ '^sha256:[0-9a-f]{64}$'),
  revision_state text NOT NULL CHECK (revision_state = 'passed'),
  transformation_count integer NOT NULL CHECK (transformation_count >= 1),
  validator_result_count integer NOT NULL CHECK (validator_result_count >= 5),
  scientific_force_preserved boolean NOT NULL
    CHECK (scientific_force_preserved IS TRUE),
  epistemic_origin_preserved boolean NOT NULL
    CHECK (epistemic_origin_preserved IS TRUE),
  provenance_bases_preserved boolean NOT NULL
    CHECK (provenance_bases_preserved IS TRUE),
  citation_scope_preserved boolean NOT NULL
    CHECK (citation_scope_preserved IS TRUE),
  record_is_scientific_evidence boolean NOT NULL
    CHECK (record_is_scientific_evidence IS FALSE),
  content_changes_require_new_draft_revision boolean NOT NULL
    CHECK (content_changes_require_new_draft_revision IS TRUE),
  recorded_by_actor_id text NOT NULL,
  recorded_by_actor_kind text NOT NULL CHECK (recorded_by_actor_kind = 'service'),
  recorded_at timestamptz NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.felicity-revision-record')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (
      payload ->> 'felicity_revision_record_id' =
        felicity_revision_record_id
    )
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload ->> 'command_id' = command_id)
    CHECK (
      payload #>> '{previous_draft_ref,draft_artifact_id}' =
        previous_draft_artifact_id
    )
    CHECK (
      (payload #>> '{previous_draft_ref,revision}')::bigint =
        previous_draft_revision
    )
    CHECK (
      payload #>> '{previous_draft_ref,content_hash}' = previous_draft_hash
    )
    CHECK (
      payload #>> '{revised_draft_ref,draft_artifact_id}' =
        revised_draft_artifact_id
    )
    CHECK (
      (payload #>> '{revised_draft_ref,revision}')::bigint =
        revised_draft_revision
    )
    CHECK (payload #>> '{revised_draft_ref,content_hash}' = revised_draft_hash)
    CHECK (
      payload #>> '{provenance_map_ref,provenance_map_id}' = provenance_map_id
    )
    CHECK (
      (payload #>> '{provenance_map_ref,revision}')::bigint =
        provenance_map_revision
    )
    CHECK (
      payload #>> '{provenance_map_ref,content_hash}' = provenance_map_hash
    )
    CHECK (
      payload #>> '{citation_bundle_ref,citation_bundle_id}' =
        citation_bundle_id
    )
    CHECK (
      (payload #>> '{citation_bundle_ref,revision}')::bigint =
        citation_bundle_revision
    )
    CHECK (
      payload #>> '{citation_bundle_ref,content_hash}' = citation_bundle_hash
    )
    CHECK (payload #>> '{language_contract,name}' = language_contract_name)
    CHECK (
      payload #>> '{language_contract,version}' = language_contract_version
    )
    CHECK (
      payload #>> '{language_contract,content_hash}' = language_contract_hash
    )
    CHECK (payload #>> '{content,state}' = revision_state)
    CHECK (
      jsonb_array_length(payload #> '{content,transformations}') =
        transformation_count
    )
    CHECK (
      jsonb_array_length(payload #> '{content,validator_results}') =
        validator_result_count
    )
    CHECK (
      (payload #>> '{content,preservation,scientific_force_preserved}')::boolean =
        scientific_force_preserved
    )
    CHECK (
      (payload #>> '{content,preservation,epistemic_origin_preserved}')::boolean =
        epistemic_origin_preserved
    )
    CHECK (
      (payload #>> '{content,preservation,provenance_bases_preserved}')::boolean =
        provenance_bases_preserved
    )
    CHECK (
      (payload #>> '{content,preservation,citation_scope_preserved}')::boolean =
        citation_scope_preserved
    )
    CHECK (
      (payload #>> '{content,authority_boundary,record_is_scientific_evidence}')::boolean =
        record_is_scientific_evidence
    )
    CHECK (
      (payload #>> '{content,authority_boundary,content_changes_require_new_draft_revision}')::boolean =
        content_changes_require_new_draft_revision
    )
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{recorded_by,actor_id}' = recorded_by_actor_id)
    CHECK (payload #>> '{recorded_by,actor_kind}' = recorded_by_actor_kind)
    CHECK ((payload ->> 'recorded_at')::timestamptz = recorded_at),
  PRIMARY KEY (felicity_revision_record_id, revision),
  UNIQUE (
    felicity_revision_record_id, revision,
    previous_draft_artifact_id, previous_draft_revision,
    revised_draft_artifact_id, revised_draft_revision
  ),
  UNIQUE (revised_draft_artifact_id, revised_draft_revision),
  FOREIGN KEY (command_id)
    REFERENCES petra.composition_revision_commands (command_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    previous_draft_artifact_id, previous_draft_revision,
    project_id, previous_draft_hash
  ) REFERENCES petra.draft_artifact_revisions (
    draft_artifact_id, revision, project_id, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    revised_draft_artifact_id, revised_draft_revision,
    project_id, revised_draft_hash
  ) REFERENCES petra.draft_artifact_revisions (
    draft_artifact_id, revision, project_id, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    provenance_map_id, provenance_map_revision, project_id,
    revised_draft_artifact_id, revised_draft_revision, revised_draft_hash,
    provenance_map_hash
  ) REFERENCES petra.provenance_maps (
    provenance_map_id, revision, project_id, draft_artifact_id,
    draft_artifact_revision, draft_content_hash, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    citation_bundle_id, citation_bundle_revision, project_id,
    revised_draft_artifact_id, revised_draft_revision, revised_draft_hash,
    citation_bundle_hash
  ) REFERENCES petra.citation_bundles (
    citation_bundle_id, revision, project_id, draft_artifact_id,
    draft_artifact_revision, draft_content_hash, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (recorded_by_actor_id, recorded_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (previous_draft_artifact_id = revised_draft_artifact_id),
  CHECK (revised_draft_revision = previous_draft_revision + 1)
);

CREATE TABLE petra.felicity_span_transformations (
  felicity_revision_record_id text NOT NULL,
  record_revision bigint NOT NULL CHECK (record_revision = 1),
  position integer NOT NULL CHECK (position >= 1),
  previous_draft_artifact_id text NOT NULL,
  previous_draft_revision bigint NOT NULL,
  previous_draft_span_id text NOT NULL,
  previous_draft_span_revision bigint NOT NULL CHECK (
    previous_draft_span_revision = 1
  ),
  previous_exact_text_hash text NOT NULL
    CHECK (previous_exact_text_hash ~ '^sha256:[0-9a-f]{64}$'),
  revised_draft_artifact_id text NOT NULL,
  revised_draft_revision bigint NOT NULL,
  revised_draft_span_id text NOT NULL,
  revised_draft_span_revision bigint NOT NULL CHECK (
    revised_draft_span_revision = 1
  ),
  revised_exact_text_hash text NOT NULL
    CHECK (revised_exact_text_hash ~ '^sha256:[0-9a-f]{64}$'),
  transformation_kind text NOT NULL CHECK (
    transformation_kind IN (
      'unchanged', 'filler_reduction', 'whitespace_normalization',
      'filler_and_whitespace'
    )
  ),
  basis_snapshot_hash text NOT NULL
    CHECK (basis_snapshot_hash ~ '^sha256:[0-9a-f]{64}$'),
  previous_citation_count integer NOT NULL CHECK (previous_citation_count >= 0),
  revised_citation_count integer NOT NULL CHECK (revised_citation_count >= 0),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK ((payload ->> 'position')::integer = position)
    CHECK (payload ->> 'previous_draft_span_id' = previous_draft_span_id)
    CHECK (payload ->> 'previous_exact_text_hash' = previous_exact_text_hash)
    CHECK (payload ->> 'revised_draft_span_id' = revised_draft_span_id)
    CHECK (payload ->> 'revised_exact_text_hash' = revised_exact_text_hash)
    CHECK (payload ->> 'transformation_kind' = transformation_kind)
    CHECK (payload ->> 'basis_snapshot_hash' = basis_snapshot_hash)
    CHECK (
      jsonb_array_length(payload -> 'previous_citation_ids') =
        previous_citation_count
    )
    CHECK (
      jsonb_array_length(payload -> 'revised_citation_ids') =
        revised_citation_count
    ),
  PRIMARY KEY (felicity_revision_record_id, record_revision, position),
  UNIQUE (
    felicity_revision_record_id, record_revision, previous_draft_span_id
  ),
  UNIQUE (
    felicity_revision_record_id, record_revision, revised_draft_span_id
  ),
  FOREIGN KEY (
    felicity_revision_record_id, record_revision,
    previous_draft_artifact_id, previous_draft_revision,
    revised_draft_artifact_id, revised_draft_revision
  ) REFERENCES petra.felicity_revision_records (
    felicity_revision_record_id, revision,
    previous_draft_artifact_id, previous_draft_revision,
    revised_draft_artifact_id, revised_draft_revision
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    previous_draft_span_id, previous_draft_span_revision,
    previous_draft_artifact_id, previous_draft_revision,
    previous_exact_text_hash
  ) REFERENCES petra.draft_spans (
    draft_span_id, revision, draft_artifact_id, draft_artifact_revision,
    exact_text_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    revised_draft_span_id, revised_draft_span_revision,
    revised_draft_artifact_id, revised_draft_revision,
    revised_exact_text_hash
  ) REFERENCES petra.draft_spans (
    draft_span_id, revision, draft_artifact_id, draft_artifact_revision,
    exact_text_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX felicity_revision_project_time_idx
  ON petra.felicity_revision_records (project_id, recorded_at);

CREATE FUNCTION petra.guard_immutable_felicity_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'FelicityRevisionRecord records are immutable'
    USING ERRCODE = '55000';
END;
$$;

CREATE FUNCTION petra.validate_composition_revision_command_owner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.authority_kind = 'draft_support_assessment' AND NOT EXISTS (
    SELECT 1
      FROM petra.draft_support_assessment_revisions AS assessment
     WHERE assessment.command_id = NEW.command_id
       AND assessment.draft_support_assessment_id = NEW.authority_id
       AND assessment.revision = NEW.authority_revision
       AND assessment.project_id = NEW.project_id
       AND assessment.assessed_by_actor_id = NEW.registered_by_actor_id
       AND assessment.assessed_by_actor_kind = NEW.registered_by_actor_kind
       AND assessment.assessed_at = NEW.registered_at
  ) THEN
    RAISE EXCEPTION 'A composition revision command must resolve to its exact DraftSupportAssessment owner'
      USING ERRCODE = '23514';
  ELSIF NEW.authority_kind = 'felicity_revision_record' AND NOT EXISTS (
    SELECT 1
      FROM petra.felicity_revision_records AS record
     WHERE record.command_id = NEW.command_id
       AND record.felicity_revision_record_id = NEW.authority_id
       AND record.revision = NEW.authority_revision
       AND record.project_id = NEW.project_id
       AND record.recorded_by_actor_id = NEW.registered_by_actor_id
       AND record.recorded_by_actor_kind = NEW.registered_by_actor_kind
       AND record.recorded_at = NEW.registered_at
  ) THEN
    RAISE EXCEPTION 'A composition revision command must resolve to its exact FelicityRevisionRecord owner'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.validate_felicity_revision_record()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_record_id text;
  target_revision bigint;
  record_row petra.felicity_revision_records%ROWTYPE;
  previous_draft petra.draft_artifact_revisions%ROWTYPE;
  revised_draft petra.draft_artifact_revisions%ROWTYPE;
  actual_count bigint;
  required_validator text;
BEGIN
  target_record_id := NEW.felicity_revision_record_id;
  IF TG_TABLE_NAME = 'felicity_revision_records' THEN
    target_revision := NEW.revision;
  ELSE
    target_revision := NEW.record_revision;
  END IF;

  SELECT * INTO record_row
    FROM petra.felicity_revision_records
   WHERE felicity_revision_record_id = target_record_id
     AND revision = target_revision;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT * INTO previous_draft
    FROM petra.draft_artifact_revisions
   WHERE draft_artifact_id = record_row.previous_draft_artifact_id
     AND revision = record_row.previous_draft_revision;
  SELECT * INTO revised_draft
    FROM petra.draft_artifact_revisions
   WHERE draft_artifact_id = record_row.revised_draft_artifact_id
     AND revision = record_row.revised_draft_revision;

  IF previous_draft.payload #> '{controls,language_contract}'
       IS DISTINCT FROM record_row.payload -> 'language_contract'
     OR revised_draft.payload #> '{controls,language_contract}'
       IS DISTINCT FROM record_row.payload -> 'language_contract'
     OR revised_draft.edit_origin <> 'felicity_revision'
     OR revised_draft.production_origin <> 'deterministic'
     OR revised_draft.validation_state <> 'passed'
     OR revised_draft.created_by_actor_id <> record_row.recorded_by_actor_id
     OR revised_draft.created_by_actor_kind <> record_row.recorded_by_actor_kind
     OR revised_draft.created_at <> record_row.recorded_at
     OR revised_draft.payload #>> '{production,producer,name}' <>
       'petra.felicity-rewriter'
     OR revised_draft.payload #>> '{production,producer,version}' <> '1.0.0'
  THEN
    RAISE EXCEPTION 'A FelicityRevisionRecord requires one exact passed deterministic Felicity draft revision'
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO actual_count
    FROM petra.felicity_span_transformations
   WHERE felicity_revision_record_id = target_record_id
     AND record_revision = target_revision;
  IF actual_count <> record_row.transformation_count OR EXISTS (
    SELECT 1
      FROM jsonb_array_elements(
        record_row.payload #> '{content,transformations}'
      ) WITH ORDINALITY AS expected(payload, position)
      LEFT JOIN petra.felicity_span_transformations AS actual
        ON actual.felicity_revision_record_id = target_record_id
       AND actual.record_revision = target_revision
       AND actual.position = expected.position
     WHERE actual.payload IS DISTINCT FROM expected.payload
  ) THEN
    RAISE EXCEPTION 'Felicity span transformations must exactly reproduce the canonical payload'
      USING ERRCODE = '23514';
  END IF;

  FOREACH required_validator IN ARRAY ARRAY[
    'felicity-language-contract',
    'scientific-force-preservation',
    'epistemic-origin-preservation',
    'provenance-basis-preservation',
    'citation-scope-preservation'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
        FROM jsonb_array_elements(
          record_row.payload #> '{content,validator_results}'
        ) AS validator(payload)
       WHERE validator.payload ->> 'validator' = required_validator
         AND validator.payload ->> 'outcome' = 'pass'
    ) THEN
      RAISE EXCEPTION 'Felicity revision is missing required passing validator %', required_validator
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION petra.require_draft_revision_support_assessment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_edit_origin text;
BEGIN
  IF NEW.current_revision <= 1 THEN
    RETURN NEW;
  END IF;

  SELECT edit_origin INTO target_edit_origin
    FROM petra.draft_artifact_revisions
   WHERE draft_artifact_id = NEW.draft_artifact_id
     AND revision = NEW.current_revision;

  IF target_edit_origin = 'researcher_edit' AND NOT EXISTS (
    SELECT 1
      FROM petra.draft_support_assessments AS assessment
     WHERE assessment.draft_artifact_id = NEW.draft_artifact_id
       AND assessment.draft_artifact_revision = NEW.current_revision
  ) THEN
    RAISE EXCEPTION 'A researcher DraftArtifact revision requires one atomic root DraftSupportAssessment'
      USING ERRCODE = '23514';
  ELSIF target_edit_origin = 'felicity_revision' AND NOT EXISTS (
    SELECT 1
      FROM petra.felicity_revision_records AS record
     WHERE record.revised_draft_artifact_id = NEW.draft_artifact_id
       AND record.revised_draft_revision = NEW.current_revision
  ) THEN
    RAISE EXCEPTION 'A Felicity DraftArtifact revision requires one atomic FelicityRevisionRecord'
      USING ERRCODE = '23514';
  ELSIF target_edit_origin NOT IN ('researcher_edit', 'felicity_revision') THEN
    RAISE EXCEPTION 'This DraftArtifact edit origin has no durable revision authority contract'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER felicity_revision_command_claim
BEFORE INSERT ON petra.felicity_revision_records
FOR EACH ROW EXECUTE FUNCTION petra.claim_composition_revision_command();

CREATE TRIGGER felicity_revision_records_immutable
BEFORE UPDATE OR DELETE ON petra.felicity_revision_records
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_felicity_revision();

CREATE TRIGGER felicity_span_transformations_immutable
BEFORE UPDATE OR DELETE ON petra.felicity_span_transformations
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_felicity_revision();

CREATE CONSTRAINT TRIGGER felicity_revision_record_complete
AFTER INSERT ON petra.felicity_revision_records
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_felicity_revision_record();

CREATE CONSTRAINT TRIGGER felicity_span_transformation_complete
AFTER INSERT ON petra.felicity_span_transformations
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_felicity_revision_record();

CREATE CONSTRAINT TRIGGER composition_revision_command_owner_complete
AFTER INSERT ON petra.composition_revision_commands
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_composition_revision_command_owner();

COMMENT ON TABLE petra.felicity_revision_records IS
  'Immutable operational proof that a bounded language revision preserved scientific force, origin, provenance, and citation scope; never scientific evidence.';
