CREATE FUNCTION petra.guard_project_inquiry_role_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'project inquiry roles cannot be deleted'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.project_inquiry_role_id <> OLD.project_inquiry_role_id
     OR NEW.project_id <> OLD.project_id
     OR NEW.role_semantic_key <> OLD.role_semantic_key
     OR NEW.created_by_actor_id <> OLD.created_by_actor_id
     OR NEW.created_by_actor_kind <> OLD.created_by_actor_kind
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'project inquiry role identity and authorship are immutable'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.current_revision <> OLD.current_revision + 1 THEN
    RAISE EXCEPTION 'project inquiry role revision must advance exactly once'
      USING ERRCODE = '40001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TABLE petra.project_inquiry_roles (
  project_inquiry_role_id text PRIMARY KEY CHECK (
    project_inquiry_role_id ~ '^project_inquiry_role_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  project_id text NOT NULL,
  role_semantic_key text NOT NULL CHECK (
    role_semantic_key ~ '^[a-z][a-z0-9._/-]{1,199}$'
  ),
  current_revision bigint NOT NULL CHECK (current_revision >= 1),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (project_id, role_semantic_key),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.project_inquiry_role_revisions (
  project_inquiry_role_id text NOT NULL,
  revision bigint NOT NULL CHECK (revision >= 1),
  project_id text NOT NULL,
  project_definition_id text NOT NULL,
  project_definition_revision bigint NOT NULL CHECK (
    project_definition_revision >= 1
  ),
  project_definition_content_hash text NOT NULL CHECK (
    project_definition_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  role_semantic_key text NOT NULL CHECK (
    role_semantic_key ~ '^[a-z][a-z0-9._/-]{1,199}$'
  ),
  representation_kind text NOT NULL CHECK (
    representation_kind = 'project_objective'
  ),
  objective_kind text NOT NULL CHECK (
    objective_kind ~ '^[a-z][a-z0-9._/-]{1,199}$'
  ),
  status text NOT NULL CHECK (status IN ('active', 'superseded')),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL CHECK (updated_at >= created_at),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.project-inquiry-role')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'project_inquiry_role_id' = project_inquiry_role_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (
      payload #>> '{content,project_definition_ref,project_definition_id}'
        = project_definition_id
    )
    CHECK (
      (payload #>> '{content,project_definition_ref,revision}')::bigint
        = project_definition_revision
    )
    CHECK (
      payload #>> '{content,project_definition_ref,content_hash}'
        = project_definition_content_hash
    )
    CHECK (payload #>> '{content,role_semantic_key}' = role_semantic_key)
    CHECK (
      payload #>> '{content,representation,representation_kind}'
        = representation_kind
    )
    CHECK (
      payload #>> '{content,representation,registration_kind}'
        = 'objective_schema'
    )
    CHECK (
      payload #>> '{content,representation,objective_kind}' = objective_kind
    )
    CHECK (
      payload #>> '{content,representation,contract,name}'
        = 'petra.project-objective'
    )
    CHECK (
      payload #>> '{content,representation,contract,version}' = '1.0.0'
    )
    CHECK (payload #>> '{content,status}' = status)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{created_by,actor_id}' = created_by_actor_id)
    CHECK (payload #>> '{created_by,actor_kind}' = created_by_actor_kind)
    CHECK ((payload ->> 'created_at')::timestamptz = created_at)
    CHECK ((payload ->> 'updated_at')::timestamptz = updated_at),
  PRIMARY KEY (project_inquiry_role_id, revision),
  UNIQUE (project_inquiry_role_id, revision, content_hash),
  UNIQUE (
    project_id, project_inquiry_role_id, revision, content_hash, record_hash
  ),
  FOREIGN KEY (project_inquiry_role_id) REFERENCES petra.project_inquiry_roles (
    project_inquiry_role_id
  ) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (
    project_id,
    project_definition_id,
    project_definition_revision,
    project_definition_content_hash
  ) REFERENCES petra.project_definition_revisions (
    project_id,
    project_definition_id,
    revision,
    content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

ALTER TABLE petra.project_inquiry_roles
  ADD CONSTRAINT project_inquiry_roles_current_revision_fkey
  FOREIGN KEY (project_inquiry_role_id, current_revision)
  REFERENCES petra.project_inquiry_role_revisions (
    project_inquiry_role_id, revision
  ) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

CREATE TRIGGER project_inquiry_role_identity_is_immutable
BEFORE UPDATE OR DELETE ON petra.project_inquiry_roles
FOR EACH ROW EXECUTE FUNCTION petra.guard_project_inquiry_role_identity();

CREATE TRIGGER project_inquiry_role_revisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_inquiry_role_revisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE FUNCTION petra.guard_project_inquiry_role_semantics()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  definition_payload jsonb;
  registration_contract jsonb;
BEGIN
  SELECT payload INTO definition_payload
    FROM petra.project_definition_revisions
   WHERE project_id = NEW.project_id
     AND project_definition_id = NEW.project_definition_id
     AND revision = NEW.project_definition_revision
     AND content_hash = NEW.project_definition_content_hash;

  SELECT registration -> 'contract' INTO registration_contract
    FROM jsonb_array_elements(
      definition_payload #> '{content,registrations}'
    ) AS registration
   WHERE registration ->> 'registration_kind' = 'objective_schema'
     AND registration ->> 'semantic_key' = NEW.objective_kind;

  IF definition_payload IS NULL
     OR NEW.role_semantic_key <> NEW.objective_kind
     OR registration_contract IS NULL
     OR registration_contract
          <> NEW.payload #> '{content,representation,contract}'
     OR NOT EXISTS (
       SELECT 1
         FROM jsonb_array_elements(
           definition_payload #> '{content,terms}'
         ) AS term
        WHERE term ->> 'semantic_key' = NEW.role_semantic_key
          AND term ->> 'generic_family' = 'focus'
     ) THEN
    RAISE EXCEPTION 'project inquiry role is not registered by its exact ProjectDefinition'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER project_inquiry_role_semantics_are_exact
BEFORE INSERT ON petra.project_inquiry_role_revisions
FOR EACH ROW EXECUTE FUNCTION petra.guard_project_inquiry_role_semantics();

ALTER TABLE petra.project_objective_revisions
  ADD CONSTRAINT project_objective_revisions_exact_inquiry_ref_key
  UNIQUE (project_id, objective_id, revision, content_hash, record_hash);

ALTER TABLE petra.work_unit_revisions
  ADD CONSTRAINT work_unit_revisions_exact_inquiry_ref_key
  UNIQUE (project_id, work_unit_id, revision, spec_hash, record_hash);

ALTER TABLE petra.grounded_response_revisions
  ADD CONSTRAINT grounded_response_revisions_exact_inquiry_ref_key
  UNIQUE (
    project_id, grounded_response_id, revision, content_hash, record_hash
  );

CREATE TABLE petra.project_inquiry_links (
  project_inquiry_link_id text PRIMARY KEY CHECK (
    project_inquiry_link_id ~ '^project_inquiry_link_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  project_id text NOT NULL,
  project_definition_id text NOT NULL,
  project_definition_revision bigint NOT NULL CHECK (
    project_definition_revision >= 1
  ),
  project_definition_content_hash text NOT NULL CHECK (
    project_definition_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  project_inquiry_role_id text NOT NULL,
  project_inquiry_role_revision bigint NOT NULL CHECK (
    project_inquiry_role_revision >= 1
  ),
  project_inquiry_role_content_hash text NOT NULL CHECK (
    project_inquiry_role_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  project_inquiry_role_record_hash text NOT NULL CHECK (
    project_inquiry_role_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  inquiry_semantic_key text NOT NULL CHECK (
    inquiry_semantic_key ~ '^[a-z][a-z0-9._/-]{1,199}$'
  ),
  objective_id text NOT NULL,
  objective_revision bigint NOT NULL CHECK (objective_revision >= 1),
  objective_content_hash text NOT NULL CHECK (
    objective_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  objective_record_hash text NOT NULL CHECK (
    objective_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  target_kind text NOT NULL CHECK (target_kind IN ('work', 'result')),
  relationship text,
  bearing text,
  work_unit_id text,
  work_unit_revision bigint,
  work_unit_spec_hash text,
  work_unit_record_hash text,
  result_schema_name text,
  result_schema_version text,
  result_record_id text,
  result_revision bigint,
  result_content_hash text,
  result_record_hash text,
  produced_by_work_unit_id text,
  produced_by_work_unit_revision bigint,
  produced_by_work_unit_spec_hash text,
  produced_by_work_unit_record_hash text,
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL,
  created_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.project-inquiry-link')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'project_inquiry_link_id' = project_inquiry_link_id)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (
      payload #>> '{content,project_definition_ref,project_definition_id}'
        = project_definition_id
    )
    CHECK (
      (payload #>> '{content,project_definition_ref,revision}')::bigint
        = project_definition_revision
    )
    CHECK (
      payload #>> '{content,project_definition_ref,content_hash}'
        = project_definition_content_hash
    )
    CHECK (
      payload #>> '{content,inquiry_role_ref,project_inquiry_role_id}'
        = project_inquiry_role_id
    )
    CHECK (
      (payload #>> '{content,inquiry_role_ref,revision}')::bigint
        = project_inquiry_role_revision
    )
    CHECK (
      payload #>> '{content,inquiry_role_ref,content_hash}'
        = project_inquiry_role_content_hash
    )
    CHECK (
      payload #>> '{content,inquiry_role_ref,record_hash}'
        = project_inquiry_role_record_hash
    )
    CHECK (
      payload #>> '{content,inquiry_anchor,semantic_key}'
        = inquiry_semantic_key
    )
    CHECK (
      payload #>> '{content,inquiry_anchor,anchor_kind}'
        = 'project_objective'
    )
    CHECK (
      payload #>> '{content,inquiry_anchor,objective_ref,objective_id}'
        = objective_id
    )
    CHECK (
      (payload #>> '{content,inquiry_anchor,objective_ref,revision}')::bigint
        = objective_revision
    )
    CHECK (
      payload #>> '{content,inquiry_anchor,objective_ref,content_hash}'
        = objective_content_hash
    )
    CHECK (
      payload #>> '{content,inquiry_anchor,objective_ref,record_hash}'
        = objective_record_hash
    )
    CHECK (payload #>> '{content,target,target_kind}' = target_kind)
    CHECK (
      relationship IS NOT DISTINCT FROM
        payload #>> '{content,target,relationship}'
    )
    CHECK (
      bearing IS NOT DISTINCT FROM payload #>> '{content,target,bearing}'
    )
    CHECK (
      work_unit_id IS NOT DISTINCT FROM
        payload #>> '{content,target,work_unit_ref,work_unit_id}'
    )
    CHECK (
      work_unit_revision IS NOT DISTINCT FROM
        (payload #>> '{content,target,work_unit_ref,revision}')::bigint
    )
    CHECK (
      work_unit_spec_hash IS NOT DISTINCT FROM
        payload #>> '{content,target,work_unit_ref,spec_hash}'
    )
    CHECK (
      work_unit_record_hash IS NOT DISTINCT FROM
        payload #>> '{content,target,work_unit_ref,record_hash}'
    )
    CHECK (
      result_schema_name IS NOT DISTINCT FROM
        payload #>> '{content,target,result_ref,schema_name}'
    )
    CHECK (
      result_schema_version IS NOT DISTINCT FROM
        payload #>> '{content,target,result_ref,schema_version}'
    )
    CHECK (
      result_record_id IS NOT DISTINCT FROM
        payload #>> '{content,target,result_ref,record_id}'
    )
    CHECK (
      result_revision IS NOT DISTINCT FROM
        (payload #>> '{content,target,result_ref,revision}')::bigint
    )
    CHECK (
      result_content_hash IS NOT DISTINCT FROM
        payload #>> '{content,target,result_ref,content_hash}'
    )
    CHECK (
      result_record_hash IS NOT DISTINCT FROM
        payload #>> '{content,target,result_ref,record_hash}'
    )
    CHECK (
      produced_by_work_unit_id IS NOT DISTINCT FROM
        payload #>> '{content,target,produced_by_work_ref,work_unit_id}'
    )
    CHECK (
      produced_by_work_unit_revision IS NOT DISTINCT FROM
        (payload #>> '{content,target,produced_by_work_ref,revision}')::bigint
    )
    CHECK (
      produced_by_work_unit_spec_hash IS NOT DISTINCT FROM
        payload #>> '{content,target,produced_by_work_ref,spec_hash}'
    )
    CHECK (
      produced_by_work_unit_record_hash IS NOT DISTINCT FROM
        payload #>> '{content,target,produced_by_work_ref,record_hash}'
    )
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{created_by,actor_id}' = created_by_actor_id)
    CHECK (payload #>> '{created_by,actor_kind}' = created_by_actor_kind)
    CHECK ((payload ->> 'created_at')::timestamptz = created_at),
  UNIQUE NULLS NOT DISTINCT (
    project_id,
    objective_id,
    objective_revision,
    target_kind,
    work_unit_id,
    work_unit_revision,
    result_schema_name,
    result_record_id,
    result_revision,
    bearing
  ),
  FOREIGN KEY (
    project_id,
    project_inquiry_role_id,
    project_inquiry_role_revision,
    project_inquiry_role_content_hash,
    project_inquiry_role_record_hash
  ) REFERENCES petra.project_inquiry_role_revisions (
    project_id,
    project_inquiry_role_id,
    revision,
    content_hash,
    record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_id,
    objective_id,
    objective_revision,
    objective_content_hash,
    objective_record_hash
  ) REFERENCES petra.project_objective_revisions (
    project_id,
    objective_id,
    revision,
    content_hash,
    record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_id,
    work_unit_id,
    work_unit_revision,
    work_unit_spec_hash,
    work_unit_record_hash
  ) REFERENCES petra.work_unit_revisions (
    project_id,
    work_unit_id,
    revision,
    spec_hash,
    record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_id,
    produced_by_work_unit_id,
    produced_by_work_unit_revision,
    produced_by_work_unit_spec_hash,
    produced_by_work_unit_record_hash
  ) REFERENCES petra.work_unit_revisions (
    project_id,
    work_unit_id,
    revision,
    spec_hash,
    record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (target_kind = 'work'
      AND relationship = 'addresses'
      AND bearing IS NULL
      AND work_unit_id IS NOT NULL
      AND work_unit_revision >= 1
      AND work_unit_spec_hash IS NOT NULL
      AND work_unit_record_hash IS NOT NULL
      AND result_schema_name IS NULL
      AND result_schema_version IS NULL
      AND result_record_id IS NULL
      AND result_revision IS NULL
      AND result_content_hash IS NULL
      AND result_record_hash IS NULL
      AND produced_by_work_unit_id IS NULL
      AND produced_by_work_unit_revision IS NULL
      AND produced_by_work_unit_spec_hash IS NULL
      AND produced_by_work_unit_record_hash IS NULL)
    OR
    (target_kind = 'result'
      AND relationship IS NULL
      AND bearing IN ('addresses', 'admissible_basis', 'accepted_finding')
      AND work_unit_id IS NULL
      AND work_unit_revision IS NULL
      AND work_unit_spec_hash IS NULL
      AND work_unit_record_hash IS NULL
      AND result_schema_name IS NOT NULL
      AND result_schema_version IS NOT NULL
      AND result_record_id IS NOT NULL
      AND result_revision >= 1
      AND result_content_hash IS NOT NULL
      AND result_record_hash IS NOT NULL)
  )
);

CREATE FUNCTION petra.guard_project_inquiry_link_semantics()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  role_record petra.project_inquiry_role_revisions%ROWTYPE;
  objective_record petra.project_objective_revisions%ROWTYPE;
  response_record petra.grounded_response_revisions%ROWTYPE;
  response_head petra.grounded_responses%ROWTYPE;
BEGIN
  SELECT role_revision.* INTO role_record
    FROM petra.project_inquiry_role_revisions AS role_revision
    JOIN petra.project_inquiry_roles AS role_head
      ON role_head.project_inquiry_role_id
        = role_revision.project_inquiry_role_id
     AND role_head.current_revision = role_revision.revision
   WHERE role_revision.project_inquiry_role_id = NEW.project_inquiry_role_id
     AND role_revision.revision = NEW.project_inquiry_role_revision;

  SELECT * INTO objective_record
    FROM petra.project_objective_revisions
   WHERE objective_id = NEW.objective_id
     AND revision = NEW.objective_revision;

  IF role_record.project_inquiry_role_id IS NULL
     OR objective_record.objective_id IS NULL
     OR role_record.status <> 'active'
     OR role_record.project_id <> NEW.project_id
     OR objective_record.project_id <> NEW.project_id
     OR role_record.project_definition_id <> NEW.project_definition_id
     OR role_record.project_definition_revision <> NEW.project_definition_revision
     OR role_record.project_definition_content_hash <> NEW.project_definition_content_hash
     OR objective_record.project_definition_id <> NEW.project_definition_id
     OR objective_record.project_definition_revision <> NEW.project_definition_revision
     OR objective_record.project_definition_content_hash <> NEW.project_definition_content_hash
     OR role_record.role_semantic_key <> NEW.inquiry_semantic_key
     OR role_record.objective_kind <> objective_record.objective_kind THEN
    RAISE EXCEPTION 'project inquiry link does not match its active role, anchor, and definition'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.target_kind = 'result' THEN
    IF NEW.result_schema_name <> 'petra.grounded-response'
       OR NEW.result_schema_version <> '1.0.0'
       OR NEW.bearing <> 'addresses'
       OR NEW.produced_by_work_unit_id IS NULL THEN
      RAISE EXCEPTION 'this adapter only admits non-authoritative grounded responses as addressing results'
        USING ERRCODE = '0A000';
    END IF;

    SELECT * INTO response_record
      FROM petra.grounded_response_revisions
     WHERE grounded_response_id = NEW.result_record_id
       AND revision = NEW.result_revision;
    SELECT * INTO response_head
      FROM petra.grounded_responses
     WHERE grounded_response_id = NEW.result_record_id;

    IF response_record.grounded_response_id IS NULL
       OR response_head.grounded_response_id IS NULL
       OR response_record.project_id <> NEW.project_id
       OR response_record.content_hash <> NEW.result_content_hash
       OR response_record.record_hash <> NEW.result_record_hash
       OR response_head.work_unit_id <> NEW.produced_by_work_unit_id
       OR response_head.work_unit_revision <> NEW.produced_by_work_unit_revision
       OR response_head.work_unit_spec_hash <> NEW.produced_by_work_unit_spec_hash THEN
      RAISE EXCEPTION 'project inquiry result reference is not an exact grounded response and Work chain'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER project_inquiry_links_validate_semantics
BEFORE INSERT ON petra.project_inquiry_links
FOR EACH ROW EXECUTE FUNCTION petra.guard_project_inquiry_link_semantics();

CREATE TRIGGER project_inquiry_links_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_inquiry_links
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE INDEX project_inquiry_links_anchor_idx
  ON petra.project_inquiry_links (
    project_id, objective_id, objective_revision, created_at
  );

CREATE INDEX project_inquiry_links_work_idx
  ON petra.project_inquiry_links (project_id, work_unit_id)
  WHERE target_kind = 'work';

CREATE INDEX project_inquiry_links_produced_work_idx
  ON petra.project_inquiry_links (project_id, produced_by_work_unit_id)
  WHERE target_kind = 'result';

COMMENT ON TABLE petra.project_inquiry_role_revisions IS
  'Exact ProjectDefinition-owned mappings from a product inquiry role to an existing domain record; no universal Inquiry identity is introduced.';

COMMENT ON TABLE petra.project_inquiry_links IS
  'Immutable many-to-many Work/result associations to exact domain inquiry anchors; operational state never changes inquiry authority.';
