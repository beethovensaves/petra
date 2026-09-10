ALTER TABLE petra.project_source_replacement_retractions
  DROP CONSTRAINT
    project_source_replacement_r_project_source_replacement_r_check;

ALTER TABLE petra.project_source_replacement_retractions
  ADD CONSTRAINT project_source_retractions_canonical_id_check
  CHECK (
    project_source_replacement_retraction_id
      ~ '^project_source_retraction_[0-9A-HJKMNP-TV-Z]{26}$'
  ) NOT VALID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM petra.project_source_replacement_retractions
     WHERE project_source_replacement_retraction_id
           !~ '^project_source_retraction_[0-9A-HJKMNP-TV-Z]{26}$'
  ) THEN
    ALTER TABLE petra.project_source_replacement_retractions
      VALIDATE CONSTRAINT project_source_retractions_canonical_id_check;
  END IF;
END;
$$;

COMMENT ON CONSTRAINT project_source_retractions_canonical_id_check
  ON petra.project_source_replacement_retractions IS
  'Enforces the canonical Petra ID-kind bound for all new replacement retractions; a pre-release local row may remain unvalidated until removed.';
