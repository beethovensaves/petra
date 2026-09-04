ALTER TABLE petra.draft_spans
  ADD CONSTRAINT draft_spans_assessment_identity_key
  UNIQUE (
    draft_span_id, revision, draft_artifact_id, draft_artifact_revision
  );

ALTER TABLE petra.provenance_maps
  ADD CONSTRAINT provenance_maps_assessment_identity_key
  UNIQUE (
    provenance_map_id, revision, project_id, draft_artifact_id,
    draft_artifact_revision, draft_content_hash, content_hash
  );

ALTER TABLE petra.citation_entries
  ADD CONSTRAINT citation_entries_assessment_identity_key
  UNIQUE (citation_id, citation_bundle_id, citation_bundle_revision);

CREATE TABLE petra.draft_support_assessments (
  draft_support_assessment_id text PRIMARY KEY
    CHECK (
      draft_support_assessment_id ~
        '^draft_support_assessment_[0-9A-HJKMNP-TV-Z]{26}$'
    ),
  project_id text NOT NULL,
  draft_artifact_id text NOT NULL,
  draft_artifact_revision bigint NOT NULL CHECK (draft_artifact_revision >= 2),
  draft_content_hash text NOT NULL
    CHECK (draft_content_hash ~ '^sha256:[0-9a-f]{64}$'),
  current_revision bigint NOT NULL CHECK (current_revision >= 1),
  created_at timestamptz NOT NULL,
  UNIQUE (
    draft_support_assessment_id, project_id, draft_artifact_id,
    draft_artifact_revision
  ),
  UNIQUE (draft_artifact_id, draft_artifact_revision),
  FOREIGN KEY (
    draft_artifact_id, draft_artifact_revision, project_id, draft_content_hash
  ) REFERENCES petra.draft_artifact_revisions (
    draft_artifact_id, revision, project_id, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.draft_support_assessment_revisions (
  draft_support_assessment_id text NOT NULL,
  revision bigint NOT NULL CHECK (revision >= 1),
  project_id text NOT NULL,
  draft_artifact_id text NOT NULL,
  draft_artifact_revision bigint NOT NULL,
  draft_content_hash text NOT NULL
    CHECK (draft_content_hash ~ '^sha256:[0-9a-f]{64}$'),
  provenance_map_id text NOT NULL,
  provenance_map_revision bigint NOT NULL CHECK (provenance_map_revision = 1),
  provenance_map_hash text NOT NULL
    CHECK (provenance_map_hash ~ '^sha256:[0-9a-f]{64}$'),
  citation_bundle_id text NOT NULL,
  citation_bundle_revision bigint NOT NULL CHECK (citation_bundle_revision = 1),
  citation_bundle_hash text NOT NULL
    CHECK (citation_bundle_hash ~ '^sha256:[0-9a-f]{64}$'),
  lineage_kind text NOT NULL CHECK (lineage_kind IN ('root', 'revision')),
  parent_revision bigint,
  parent_content_hash text CHECK (
    parent_content_hash IS NULL
    OR parent_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  trigger_kind text NOT NULL CHECK (
    trigger_kind IN ('researcher_edit', 'support_revalidation')
  ),
  command_id text NOT NULL UNIQUE
    CHECK (command_id ~ '^[a-z][a-z0-9_]*_[0-9A-HJKMNP-TV-Z]{26}$'),
  trigger_actor_id text NOT NULL,
  trigger_actor_kind text NOT NULL CHECK (trigger_actor_kind = 'human'),
  executed_by_actor_id text,
  executed_by_actor_kind text CHECK (
    executed_by_actor_kind IS NULL OR executed_by_actor_kind = 'service'
  ),
  assessment_state text NOT NULL CHECK (
    assessment_state IN ('stale', 'passed', 'failed')
  ),
  reuse_allowed boolean NOT NULL,
  assessment_is_scientific_evidence boolean NOT NULL
    CHECK (assessment_is_scientific_evidence IS FALSE),
  assessment_controls_draft_reuse boolean NOT NULL
    CHECK (assessment_controls_draft_reuse IS TRUE),
  span_assessment_count integer NOT NULL CHECK (span_assessment_count >= 1),
  citation_assessment_count integer NOT NULL
    CHECK (citation_assessment_count >= 1),
  validator_result_count integer NOT NULL CHECK (validator_result_count >= 0),
  assessed_by_actor_id text NOT NULL,
  assessed_by_actor_kind text NOT NULL CHECK (assessed_by_actor_kind = 'service'),
  assessed_at timestamptz NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.draft-support-assessment')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (
      payload ->> 'draft_support_assessment_id' =
        draft_support_assessment_id
    )
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{draft_ref,draft_artifact_id}' = draft_artifact_id)
    CHECK (
      (payload #>> '{draft_ref,revision}')::bigint = draft_artifact_revision
    )
    CHECK (payload #>> '{draft_ref,content_hash}' = draft_content_hash)
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
    CHECK (payload #>> '{lineage,lineage_kind}' = lineage_kind)
    CHECK (payload #>> '{trigger,trigger_kind}' = trigger_kind)
    CHECK (payload #>> '{trigger,command_id}' = command_id)
    CHECK (payload #>> '{content,state}' = assessment_state)
    CHECK (
      (payload #>> '{content,reuse_policy,reuse_allowed}')::boolean =
        reuse_allowed
    )
    CHECK (
      (payload #>> '{content,authority_boundary,assessment_is_scientific_evidence}')::boolean =
        assessment_is_scientific_evidence
    )
    CHECK (
      (payload #>> '{content,authority_boundary,assessment_controls_draft_reuse}')::boolean =
        assessment_controls_draft_reuse
    )
    CHECK (
      jsonb_array_length(payload #> '{content,span_assessments}') =
        span_assessment_count
    )
    CHECK (
      jsonb_array_length(payload #> '{content,citation_assessments}') =
        citation_assessment_count
    )
    CHECK (
      jsonb_array_length(payload #> '{content,validator_results}') =
        validator_result_count
    )
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{assessed_by,actor_id}' = assessed_by_actor_id)
    CHECK (payload #>> '{assessed_by,actor_kind}' = assessed_by_actor_kind)
    CHECK ((payload ->> 'assessed_at')::timestamptz = assessed_at),
  PRIMARY KEY (draft_support_assessment_id, revision),
  UNIQUE (draft_support_assessment_id, revision, content_hash),
  FOREIGN KEY (
    draft_support_assessment_id, project_id, draft_artifact_id,
    draft_artifact_revision
  ) REFERENCES petra.draft_support_assessments (
    draft_support_assessment_id, project_id, draft_artifact_id,
    draft_artifact_revision
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    draft_artifact_id, draft_artifact_revision, project_id, draft_content_hash
  ) REFERENCES petra.draft_artifact_revisions (
    draft_artifact_id, revision, project_id, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    provenance_map_id, provenance_map_revision, project_id,
    draft_artifact_id, draft_artifact_revision, draft_content_hash,
    provenance_map_hash
  ) REFERENCES petra.provenance_maps (
    provenance_map_id, revision, project_id, draft_artifact_id,
    draft_artifact_revision, draft_content_hash, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    citation_bundle_id, citation_bundle_revision, project_id,
    draft_artifact_id, draft_artifact_revision, draft_content_hash,
    citation_bundle_hash
  ) REFERENCES petra.citation_bundles (
    citation_bundle_id, revision, project_id, draft_artifact_id,
    draft_artifact_revision, draft_content_hash, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (trigger_actor_id, trigger_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (executed_by_actor_id, executed_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    MATCH FULL ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (assessed_by_actor_id, assessed_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    draft_support_assessment_id, parent_revision, parent_content_hash
  ) REFERENCES petra.draft_support_assessment_revisions (
    draft_support_assessment_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,
  CHECK (
    (revision = 1 AND lineage_kind = 'root'
      AND parent_revision IS NULL AND parent_content_hash IS NULL
      AND trigger_kind = 'researcher_edit'
      AND executed_by_actor_id IS NULL AND executed_by_actor_kind IS NULL
      AND assessment_state = 'stale' AND reuse_allowed IS FALSE)
    OR
    (revision > 1 AND lineage_kind = 'revision'
      AND parent_revision = revision - 1 AND parent_content_hash IS NOT NULL
      AND trigger_kind = 'support_revalidation'
      AND executed_by_actor_id IS NOT NULL
      AND executed_by_actor_kind = 'service'
      AND executed_by_actor_id = assessed_by_actor_id
      AND reuse_allowed = (assessment_state = 'passed'))
  )
);

ALTER TABLE petra.draft_support_assessments
  ADD CONSTRAINT draft_support_assessments_current_revision_fkey
  FOREIGN KEY (draft_support_assessment_id, current_revision)
  REFERENCES petra.draft_support_assessment_revisions (
    draft_support_assessment_id, revision
  ) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE petra.draft_support_span_assessments (
  draft_support_assessment_id text NOT NULL,
  assessment_revision bigint NOT NULL,
  position integer NOT NULL CHECK (position >= 1),
  draft_artifact_id text NOT NULL,
  draft_artifact_revision bigint NOT NULL,
  draft_span_id text NOT NULL,
  draft_span_revision bigint NOT NULL CHECK (draft_span_revision = 1),
  support_state text NOT NULL CHECK (
    support_state IN ('current', 'stale', 'passed', 'failed')
  ),
  citation_state text NOT NULL CHECK (
    citation_state IN ('current', 'stale', 'not_required')
  ),
  basis_snapshot_hash text NOT NULL
    CHECK (basis_snapshot_hash ~ '^sha256:[0-9a-f]{64}$'),
  validator_result_count integer NOT NULL CHECK (validator_result_count >= 0),
  reason_count integer NOT NULL CHECK (reason_count >= 0),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'draft_span_id' = draft_span_id)
    CHECK (payload ->> 'support_state' = support_state)
    CHECK (payload ->> 'citation_state' = citation_state)
    CHECK (
      jsonb_array_length(payload -> 'validator_results') =
        validator_result_count
    )
    CHECK (jsonb_array_length(payload -> 'reasons') = reason_count),
  PRIMARY KEY (
    draft_support_assessment_id, assessment_revision, position
  ),
  UNIQUE (
    draft_support_assessment_id, assessment_revision, draft_span_id
  ),
  FOREIGN KEY (draft_support_assessment_id, assessment_revision)
    REFERENCES petra.draft_support_assessment_revisions (
      draft_support_assessment_id, revision
    ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    draft_span_id, draft_span_revision, draft_artifact_id,
    draft_artifact_revision
  ) REFERENCES petra.draft_spans (
    draft_span_id, revision, draft_artifact_id, draft_artifact_revision
  ) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.draft_support_citation_assessments (
  draft_support_assessment_id text NOT NULL,
  assessment_revision bigint NOT NULL,
  position integer NOT NULL CHECK (position >= 1),
  citation_bundle_id text NOT NULL,
  citation_bundle_revision bigint NOT NULL,
  citation_id text NOT NULL,
  link_state text NOT NULL CHECK (
    link_state IN ('current', 'partially_stale', 'stale')
  ),
  stale_span_count integer NOT NULL CHECK (stale_span_count >= 0),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'citation_id' = citation_id)
    CHECK (payload ->> 'link_state' = link_state)
    CHECK (
      jsonb_array_length(payload -> 'stale_draft_span_ids') = stale_span_count
    ),
  PRIMARY KEY (
    draft_support_assessment_id, assessment_revision, position
  ),
  UNIQUE (
    draft_support_assessment_id, assessment_revision, citation_id
  ),
  FOREIGN KEY (draft_support_assessment_id, assessment_revision)
    REFERENCES petra.draft_support_assessment_revisions (
      draft_support_assessment_id, revision
    ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    citation_id, citation_bundle_id, citation_bundle_revision
  ) REFERENCES petra.citation_entries (
    citation_id, citation_bundle_id, citation_bundle_revision
  ) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.draft_support_citation_stale_spans (
  draft_support_assessment_id text NOT NULL,
  assessment_revision bigint NOT NULL,
  citation_position integer NOT NULL,
  span_position integer NOT NULL CHECK (span_position >= 1),
  draft_span_id text NOT NULL,
  draft_span_revision bigint NOT NULL CHECK (draft_span_revision = 1),
  PRIMARY KEY (
    draft_support_assessment_id, assessment_revision, citation_position,
    span_position
  ),
  UNIQUE (
    draft_support_assessment_id, assessment_revision, citation_position,
    draft_span_id
  ),
  FOREIGN KEY (
    draft_support_assessment_id, assessment_revision, citation_position
  ) REFERENCES petra.draft_support_citation_assessments (
    draft_support_assessment_id, assessment_revision, position
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (draft_span_id, draft_span_revision)
    REFERENCES petra.draft_spans (draft_span_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX draft_support_assessment_reuse_idx
  ON petra.draft_support_assessment_revisions (
    project_id, assessment_state, reuse_allowed, assessed_at
  );

CREATE INDEX draft_support_span_state_idx
  ON petra.draft_support_span_assessments (
    draft_artifact_id, draft_artifact_revision, support_state
  );

CREATE FUNCTION petra.guard_draft_support_assessment_head()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'DraftSupportAssessment identities cannot be deleted'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.draft_support_assessment_id <> OLD.draft_support_assessment_id
     OR NEW.project_id <> OLD.project_id
     OR NEW.draft_artifact_id <> OLD.draft_artifact_id
     OR NEW.draft_artifact_revision <> OLD.draft_artifact_revision
     OR NEW.draft_content_hash <> OLD.draft_content_hash
     OR NEW.created_at <> OLD.created_at
     OR NEW.current_revision <> OLD.current_revision + 1 THEN
    RAISE EXCEPTION 'DraftSupportAssessment identity is immutable and revision advances once'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.guard_immutable_draft_support_assessment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'DraftSupportAssessment records are immutable'
    USING ERRCODE = '55000';
END;
$$;

CREATE FUNCTION petra.validate_draft_support_assessment_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_assessment_id text;
  target_revision bigint;
  assessment_payload jsonb;
  actual_count bigint;
  expected_count bigint;
BEGIN
  target_assessment_id := NEW.draft_support_assessment_id;
  IF TG_TABLE_NAME = 'draft_support_assessment_revisions' THEN
    target_revision := NEW.revision;
  ELSE
    target_revision := NEW.assessment_revision;
  END IF;

  SELECT payload INTO assessment_payload
   FROM petra.draft_support_assessment_revisions
   WHERE draft_support_assessment_id = target_assessment_id
     AND revision = target_revision;
  IF assessment_payload IS NULL THEN
    RETURN NEW;
  END IF;

  expected_count := jsonb_array_length(
    assessment_payload #> '{content,span_assessments}'
  );
  SELECT count(*) INTO actual_count
   FROM petra.draft_support_span_assessments
   WHERE draft_support_assessment_id = target_assessment_id
     AND assessment_revision = target_revision;
  IF actual_count <> expected_count OR EXISTS (
    SELECT 1
      FROM jsonb_array_elements(
        assessment_payload #> '{content,span_assessments}'
      ) WITH ORDINALITY AS expected(payload, position)
      LEFT JOIN petra.draft_support_span_assessments AS actual
        ON actual.draft_support_assessment_id = target_assessment_id
       AND actual.assessment_revision = target_revision
       AND actual.position = expected.position
     WHERE actual.payload IS DISTINCT FROM expected.payload
  ) THEN
    RAISE EXCEPTION 'DraftSupportAssessment span rows must exactly reproduce the canonical payload'
      USING ERRCODE = '23514';
  END IF;

  expected_count := jsonb_array_length(
    assessment_payload #> '{content,citation_assessments}'
  );
  SELECT count(*) INTO actual_count
   FROM petra.draft_support_citation_assessments
   WHERE draft_support_assessment_id = target_assessment_id
     AND assessment_revision = target_revision;
  IF actual_count <> expected_count OR EXISTS (
    SELECT 1
      FROM jsonb_array_elements(
        assessment_payload #> '{content,citation_assessments}'
      ) WITH ORDINALITY AS expected(payload, position)
      LEFT JOIN petra.draft_support_citation_assessments AS actual
        ON actual.draft_support_assessment_id = target_assessment_id
       AND actual.assessment_revision = target_revision
       AND actual.position = expected.position
     WHERE actual.payload IS DISTINCT FROM expected.payload
  ) THEN
    RAISE EXCEPTION 'DraftSupportAssessment citation rows must exactly reproduce the canonical payload'
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO expected_count
    FROM jsonb_array_elements(
      assessment_payload #> '{content,citation_assessments}'
    ) WITH ORDINALITY AS citation(payload, position)
    CROSS JOIN LATERAL jsonb_array_elements_text(
      citation.payload -> 'stale_draft_span_ids'
    ) AS stale_span(draft_span_id);
  SELECT count(*) INTO actual_count
   FROM petra.draft_support_citation_stale_spans
   WHERE draft_support_assessment_id = target_assessment_id
     AND assessment_revision = target_revision;
  IF actual_count <> expected_count OR EXISTS (
    SELECT 1
      FROM jsonb_array_elements(
        assessment_payload #> '{content,citation_assessments}'
      ) WITH ORDINALITY AS citation(payload, citation_position)
      CROSS JOIN LATERAL jsonb_array_elements_text(
        citation.payload -> 'stale_draft_span_ids'
      ) WITH ORDINALITY AS expected(draft_span_id, span_position)
      LEFT JOIN petra.draft_support_citation_stale_spans AS actual
        ON actual.draft_support_assessment_id = target_assessment_id
       AND actual.assessment_revision = target_revision
       AND actual.citation_position = citation.citation_position
       AND actual.span_position = expected.span_position
     WHERE actual.draft_span_id IS DISTINCT FROM expected.draft_span_id
  ) THEN
    RAISE EXCEPTION 'DraftSupportAssessment stale citation spans must exactly reproduce the canonical payload'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.require_draft_revision_support_assessment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.current_revision > 1 AND NOT EXISTS (
    SELECT 1
      FROM petra.draft_support_assessments AS assessment
     WHERE assessment.draft_artifact_id = NEW.draft_artifact_id
       AND assessment.draft_artifact_revision = NEW.current_revision
  ) THEN
    RAISE EXCEPTION 'An additive DraftArtifact revision requires one atomic root DraftSupportAssessment'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER draft_support_assessment_head_guard
BEFORE UPDATE OR DELETE ON petra.draft_support_assessments
FOR EACH ROW EXECUTE FUNCTION petra.guard_draft_support_assessment_head();

CREATE TRIGGER draft_support_assessment_revisions_immutable
BEFORE UPDATE OR DELETE ON petra.draft_support_assessment_revisions
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_draft_support_assessment();

CREATE TRIGGER draft_support_span_assessments_immutable
BEFORE UPDATE OR DELETE ON petra.draft_support_span_assessments
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_draft_support_assessment();

CREATE TRIGGER draft_support_citation_assessments_immutable
BEFORE UPDATE OR DELETE ON petra.draft_support_citation_assessments
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_draft_support_assessment();

CREATE TRIGGER draft_support_citation_stale_spans_immutable
BEFORE UPDATE OR DELETE ON petra.draft_support_citation_stale_spans
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_draft_support_assessment();

CREATE CONSTRAINT TRIGGER draft_support_assessment_revision_complete
AFTER INSERT ON petra.draft_support_assessment_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_draft_support_assessment_revision();

CREATE CONSTRAINT TRIGGER draft_support_span_assessment_complete
AFTER INSERT ON petra.draft_support_span_assessments
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_draft_support_assessment_revision();

CREATE CONSTRAINT TRIGGER draft_support_citation_assessment_complete
AFTER INSERT ON petra.draft_support_citation_assessments
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_draft_support_assessment_revision();

CREATE CONSTRAINT TRIGGER draft_support_stale_span_complete
AFTER INSERT ON petra.draft_support_citation_stale_spans
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_draft_support_assessment_revision();

CREATE CONSTRAINT TRIGGER draft_revision_support_assessment_complete
AFTER UPDATE ON petra.draft_artifacts
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.require_draft_revision_support_assessment();

COMMENT ON TABLE petra.draft_support_assessment_revisions IS
  'Immutable support and citation reuse decisions for one exact edited DraftArtifact; operational validation state, never scientific evidence.';
