CREATE FUNCTION petra.validate_project_source_replacement_head()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  has_retraction boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM petra.project_source_replacements AS replacement
     WHERE replacement.project_source_replacement_id =
           NEW.current_project_source_replacement_id
       AND replacement.project_id = NEW.project_id
       AND replacement.replaced_project_source_id =
           NEW.replaced_project_source_id
  ) THEN
    RAISE EXCEPTION 'replacement head must identify its exact Project and predecessor'
      USING ERRCODE = '23514';
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM petra.project_source_replacement_retractions AS retraction
     WHERE retraction.project_source_replacement_id =
           NEW.current_project_source_replacement_id
  ) INTO has_retraction;

  IF (NEW.state = 'active' AND has_retraction)
     OR (NEW.state = 'retracted' AND NOT has_retraction)
  THEN
    RAISE EXCEPTION 'replacement head state must agree with immutable retraction history'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER project_source_replacement_head_is_valid
BEFORE INSERT OR UPDATE ON petra.project_source_replacement_heads
FOR EACH ROW EXECUTE FUNCTION petra.validate_project_source_replacement_head();

CREATE TRIGGER project_source_replacement_heads_cannot_be_deleted
BEFORE DELETE ON petra.project_source_replacement_heads
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

COMMENT ON FUNCTION petra.validate_project_source_replacement_head() IS
  'Prevents the derived effective head from disagreeing with immutable replacement and retraction history.';
