CREATE TABLE petra.composition_requests (
  composition_request_id text PRIMARY KEY
    CHECK (composition_request_id ~ '^composition_request_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL CHECK (revision = 1),
  project_id text NOT NULL,
  snapshot_id text NOT NULL
    CHECK (snapshot_id ~ '^snapshot_[0-9A-HJKMNP-TV-Z]{26}$'),
  snapshot_revision bigint NOT NULL CHECK (snapshot_revision >= 1),
  snapshot_event_position bigint NOT NULL CHECK (snapshot_event_position >= 1),
  snapshot_hash text NOT NULL CHECK (snapshot_hash ~ '^sha256:[0-9a-f]{64}$'),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  requested_by_actor_id text NOT NULL,
  requested_by_actor_kind text NOT NULL,
  requested_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.composition-request')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'composition_request_id' = composition_request_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{snapshot_ref,snapshot_id}' = snapshot_id)
    CHECK ((payload #>> '{snapshot_ref,snapshot_revision}')::bigint = snapshot_revision)
    CHECK ((payload #>> '{snapshot_ref,event_position}')::bigint = snapshot_event_position)
    CHECK (payload #>> '{snapshot_ref,content_hash}' = snapshot_hash)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{requested_by,actor_id}' = requested_by_actor_id)
    CHECK (payload #>> '{requested_by,actor_kind}' = requested_by_actor_kind)
    CHECK ((payload ->> 'requested_at')::timestamptz = requested_at)
    CHECK (payload #>> '{content,authority_boundary,request_is_scientific_authority}' = 'false')
    CHECK (payload #>> '{content,authority_boundary,request_authorizes_publication}' = 'false'),
  UNIQUE (
    composition_request_id, project_id, snapshot_id, snapshot_revision,
    snapshot_event_position, snapshot_hash, content_hash
  ),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (requested_by_actor_id, requested_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.composition_request_subjects (
  composition_request_id text NOT NULL,
  position integer NOT NULL CHECK (position >= 1),
  object_kind text NOT NULL
    CHECK (object_kind IN ('claim', 'assertion', 'source_span', 'work_version')),
  object_id text NOT NULL,
  object_revision bigint NOT NULL CHECK (object_revision >= 1),
  object_hash text NOT NULL CHECK (object_hash ~ '^sha256:[0-9a-f]{64}$'),
  PRIMARY KEY (composition_request_id, position),
  UNIQUE (
    composition_request_id, object_kind, object_id, object_revision, object_hash
  ),
  FOREIGN KEY (composition_request_id)
    REFERENCES petra.composition_requests (composition_request_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

ALTER TABLE petra.evidence_packets
  ADD CONSTRAINT evidence_packets_composition_identity_key
  UNIQUE (
    evidence_packet_id, project_id, snapshot_id, snapshot_revision,
    snapshot_event_position, snapshot_hash, content_hash
  );

CREATE TABLE petra.composition_plans (
  composition_plan_id text PRIMARY KEY
    CHECK (composition_plan_id ~ '^composition_plan_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL CHECK (revision = 1),
  project_id text NOT NULL,
  composition_request_id text NOT NULL,
  composition_request_hash text NOT NULL
    CHECK (composition_request_hash ~ '^sha256:[0-9a-f]{64}$'),
  evidence_packet_id text NOT NULL,
  evidence_packet_hash text NOT NULL
    CHECK (evidence_packet_hash ~ '^sha256:[0-9a-f]{64}$'),
  snapshot_id text NOT NULL,
  snapshot_revision bigint NOT NULL,
  snapshot_event_position bigint NOT NULL,
  snapshot_hash text NOT NULL,
  plan_state text NOT NULL CHECK (plan_state IN ('ready', 'blocked')),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  compiled_by_actor_id text NOT NULL,
  compiled_by_actor_kind text NOT NULL CHECK (compiled_by_actor_kind = 'service'),
  compiled_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.composition-plan')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'composition_plan_id' = composition_plan_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{composition_request_ref,composition_request_id}' = composition_request_id)
    CHECK (payload #>> '{composition_request_ref,content_hash}' = composition_request_hash)
    CHECK (payload #>> '{evidence_packet_ref,evidence_packet_id}' = evidence_packet_id)
    CHECK (payload #>> '{evidence_packet_ref,content_hash}' = evidence_packet_hash)
    CHECK (payload #>> '{snapshot_ref,snapshot_id}' = snapshot_id)
    CHECK ((payload #>> '{snapshot_ref,snapshot_revision}')::bigint = snapshot_revision)
    CHECK ((payload #>> '{snapshot_ref,event_position}')::bigint = snapshot_event_position)
    CHECK (payload #>> '{snapshot_ref,content_hash}' = snapshot_hash)
    CHECK (payload #>> '{content,state}' = plan_state)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{compiled_by,actor_id}' = compiled_by_actor_id)
    CHECK (payload #>> '{compiled_by,actor_kind}' = compiled_by_actor_kind)
    CHECK ((payload ->> 'compiled_at')::timestamptz = compiled_at)
    CHECK (payload #>> '{content,authority_boundary,plan_is_scientific_authority}' = 'false')
    CHECK (payload #>> '{content,authority_boundary,prose_may_exceed_evidence}' = 'false'),
  UNIQUE (composition_plan_id, project_id, content_hash),
  FOREIGN KEY (
    composition_request_id, project_id, snapshot_id, snapshot_revision,
    snapshot_event_position, snapshot_hash, composition_request_hash
  ) REFERENCES petra.composition_requests (
    composition_request_id, project_id, snapshot_id, snapshot_revision,
    snapshot_event_position, snapshot_hash, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    evidence_packet_id, project_id, snapshot_id, snapshot_revision,
    snapshot_event_position, snapshot_hash, evidence_packet_hash
  ) REFERENCES petra.evidence_packets (
    evidence_packet_id, project_id, snapshot_id, snapshot_revision,
    snapshot_event_position, snapshot_hash, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (compiled_by_actor_id, compiled_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.composition_plan_evidence_refs (
  composition_plan_id text NOT NULL,
  section_position integer NOT NULL CHECK (section_position >= 1),
  move_position integer NOT NULL CHECK (move_position >= 1),
  evidence_position integer NOT NULL CHECK (evidence_position >= 1),
  context_selection_order bigint NOT NULL CHECK (context_selection_order >= 1),
  object_kind text NOT NULL
    CHECK (object_kind IN ('claim', 'assertion', 'source_span', 'work_version')),
  object_id text NOT NULL,
  object_revision bigint NOT NULL CHECK (object_revision >= 1),
  object_hash text NOT NULL CHECK (object_hash ~ '^sha256:[0-9a-f]{64}$'),
  relation text NOT NULL
    CHECK (relation IN ('direct_report', 'qualification', 'supports_inference', 'context')),
  PRIMARY KEY (
    composition_plan_id, section_position, move_position, evidence_position
  ),
  UNIQUE (
    composition_plan_id, section_position, move_position,
    context_selection_order, object_kind, object_id, object_revision, object_hash
  ),
  FOREIGN KEY (composition_plan_id)
    REFERENCES petra.composition_plans (composition_plan_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE FUNCTION petra.guard_immutable_composition_control()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Composition control records are immutable'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER composition_requests_immutable
BEFORE UPDATE OR DELETE ON petra.composition_requests
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_composition_control();

CREATE TRIGGER composition_request_subjects_immutable
BEFORE UPDATE OR DELETE ON petra.composition_request_subjects
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_composition_control();

CREATE TRIGGER composition_plans_immutable
BEFORE UPDATE OR DELETE ON petra.composition_plans
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_composition_control();

CREATE TRIGGER composition_plan_evidence_refs_immutable
BEFORE UPDATE OR DELETE ON petra.composition_plan_evidence_refs
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_composition_control();
