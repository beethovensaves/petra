ALTER TABLE petra.work_units
  ADD CONSTRAINT work_units_project_spec_unique
  UNIQUE (work_unit_id, project_id, spec_hash);

CREATE TABLE petra.project_work_stage_plans (
  stage_plan_id text PRIMARY KEY
    CHECK (stage_plan_id ~ '^work_stage_plan_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL CHECK (revision = 1),
  project_id text NOT NULL,
  work_unit_id text NOT NULL UNIQUE,
  work_unit_spec_hash text NOT NULL
    CHECK (work_unit_spec_hash ~ '^sha256:[0-9a-f]{64}$'),
  workflow_name text NOT NULL,
  workflow_version text NOT NULL,
  task_family text NOT NULL,
  task_name text NOT NULL,
  task_version text NOT NULL,
  stages jsonb NOT NULL CHECK (
    jsonb_typeof(stages) = 'array'
    AND jsonb_array_length(stages) BETWEEN 2 AND 20
  ),
  content_hash text NOT NULL
    CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  plan_payload jsonb NOT NULL CHECK (
    jsonb_typeof(plan_payload) = 'object'
    AND plan_payload ->> 'stage_plan_id' = stage_plan_id
    AND (plan_payload ->> 'revision')::bigint = revision
    AND plan_payload ->> 'project_id' = project_id
    AND plan_payload ->> 'work_unit_id' = work_unit_id
    AND plan_payload ->> 'work_unit_spec_hash' = work_unit_spec_hash
    AND plan_payload #>> '{workflow,workflow_name}' = workflow_name
    AND plan_payload #>> '{workflow,workflow_version}' = workflow_version
    AND plan_payload #>> '{workflow,task_family}' = task_family
    AND plan_payload #>> '{workflow,task_name}' = task_name
    AND plan_payload #>> '{workflow,task_version}' = task_version
    AND plan_payload -> 'stages' = stages
  ),
  registered_at timestamptz NOT NULL,
  UNIQUE (stage_plan_id, revision),
  FOREIGN KEY (work_unit_id, project_id, work_unit_spec_hash)
    REFERENCES petra.work_units (work_unit_id, project_id, spec_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TRIGGER project_work_stage_plans_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_work_stage_plans
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE INDEX project_work_stage_plans_project_idx
  ON petra.project_work_stage_plans (project_id, work_unit_id);

COMMENT ON TABLE petra.project_work_stage_plans IS
  'Immutable exact-Work stage declarations. Read models derive stage posture only from these declarations, registered input state, and canonical WorkUnit lifecycle.';
