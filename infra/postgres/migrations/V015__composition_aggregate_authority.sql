ALTER TABLE petra.composition_requests
  ADD CONSTRAINT composition_requests_draft_identity_key
  UNIQUE (
    composition_request_id, revision, project_id, snapshot_id,
    snapshot_revision, snapshot_event_position, snapshot_hash, content_hash
  );

ALTER TABLE petra.composition_plans
  ADD CONSTRAINT composition_plans_draft_identity_key
  UNIQUE (composition_plan_id, revision, project_id, content_hash);

ALTER TABLE petra.evidence_packets
  ADD CONSTRAINT evidence_packets_draft_identity_key
  UNIQUE (
    evidence_packet_id, revision, project_id, snapshot_id,
    snapshot_revision, snapshot_event_position, snapshot_hash, content_hash
  );

ALTER TABLE petra.canonical_entity_revisions
  ADD CONSTRAINT canonical_entity_revisions_citation_identity_key
  UNIQUE (entity_id, revision, record_hash);

ALTER TABLE petra.model_calls
  ADD CONSTRAINT model_calls_request_identity_key
  UNIQUE (model_call_id, model_request_id);

CREATE TABLE petra.draft_artifacts (
  draft_artifact_id text PRIMARY KEY
    CHECK (draft_artifact_id ~ '^draft_artifact_[0-9A-HJKMNP-TV-Z]{26}$'),
  project_id text NOT NULL,
  current_revision bigint NOT NULL CHECK (current_revision >= 1),
  created_at timestamptz NOT NULL,
  UNIQUE (draft_artifact_id, project_id),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.draft_artifact_revisions (
  draft_artifact_id text NOT NULL,
  revision bigint NOT NULL CHECK (revision >= 1),
  project_id text NOT NULL,
  snapshot_id text NOT NULL
    CHECK (snapshot_id ~ '^snapshot_[0-9A-HJKMNP-TV-Z]{26}$'),
  snapshot_revision bigint NOT NULL CHECK (snapshot_revision >= 1),
  snapshot_event_position bigint NOT NULL CHECK (snapshot_event_position >= 1),
  snapshot_hash text NOT NULL CHECK (snapshot_hash ~ '^sha256:[0-9a-f]{64}$'),
  composition_request_id text NOT NULL,
  composition_request_revision bigint NOT NULL,
  composition_request_hash text NOT NULL
    CHECK (composition_request_hash ~ '^sha256:[0-9a-f]{64}$'),
  composition_plan_id text NOT NULL,
  composition_plan_revision bigint NOT NULL,
  composition_plan_hash text NOT NULL
    CHECK (composition_plan_hash ~ '^sha256:[0-9a-f]{64}$'),
  evidence_packet_id text NOT NULL,
  evidence_packet_revision bigint NOT NULL,
  evidence_packet_hash text NOT NULL
    CHECK (evidence_packet_hash ~ '^sha256:[0-9a-f]{64}$'),
  provenance_map_id text NOT NULL
    CHECK (provenance_map_id ~ '^provenance_map_[0-9A-HJKMNP-TV-Z]{26}$'),
  provenance_map_revision bigint NOT NULL CHECK (provenance_map_revision = 1),
  citation_bundle_id text NOT NULL
    CHECK (citation_bundle_id ~ '^citation_bundle_[0-9A-HJKMNP-TV-Z]{26}$'),
  citation_bundle_revision bigint NOT NULL CHECK (citation_bundle_revision = 1),
  lineage_kind text NOT NULL CHECK (lineage_kind IN ('root', 'revision')),
  parent_revision bigint,
  edit_origin text CHECK (
    edit_origin IS NULL OR edit_origin IN (
      'researcher_edit', 'felicity_revision', 'model_revision'
    )
  ),
  production_origin text NOT NULL CHECK (
    production_origin IN ('model_generated', 'researcher_authored', 'deterministic')
  ),
  model_request_id text,
  model_call_id text,
  grounded_response_id text,
  grounded_response_revision bigint,
  grounded_response_hash text
    CHECK (
      grounded_response_hash IS NULL
      OR grounded_response_hash ~ '^sha256:[0-9a-f]{64}$'
    ),
  researcher_id text,
  validation_state text NOT NULL CHECK (
    validation_state IN ('pending', 'passed', 'failed', 'stale')
  ),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  aggregate_hash text NOT NULL CHECK (aggregate_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL,
  created_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.draft-artifact')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'draft_artifact_id' = draft_artifact_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{snapshot_ref,snapshot_id}' = snapshot_id)
    CHECK ((payload #>> '{snapshot_ref,snapshot_revision}')::bigint = snapshot_revision)
    CHECK ((payload #>> '{snapshot_ref,event_position}')::bigint = snapshot_event_position)
    CHECK (payload #>> '{snapshot_ref,content_hash}' = snapshot_hash)
    CHECK (payload #>> '{composition_request_ref,record_id}' = composition_request_id)
    CHECK ((payload #>> '{composition_request_ref,revision}')::bigint = composition_request_revision)
    CHECK (payload #>> '{composition_request_ref,content_hash}' = composition_request_hash)
    CHECK (payload #>> '{composition_plan_ref,record_id}' = composition_plan_id)
    CHECK ((payload #>> '{composition_plan_ref,revision}')::bigint = composition_plan_revision)
    CHECK (payload #>> '{composition_plan_ref,content_hash}' = composition_plan_hash)
    CHECK (payload #>> '{evidence_packet_ref,evidence_packet_id}' = evidence_packet_id)
    CHECK ((payload #>> '{evidence_packet_ref,revision}')::bigint = evidence_packet_revision)
    CHECK (payload #>> '{evidence_packet_ref,content_hash}' = evidence_packet_hash)
    CHECK (payload #>> '{provenance_map_ref,provenance_map_id}' = provenance_map_id)
    CHECK ((payload #>> '{provenance_map_ref,revision}')::bigint = provenance_map_revision)
    CHECK (payload #>> '{citation_bundle_ref,citation_bundle_id}' = citation_bundle_id)
    CHECK ((payload #>> '{citation_bundle_ref,revision}')::bigint = citation_bundle_revision)
    CHECK (payload #>> '{lineage,lineage_kind}' = lineage_kind)
    CHECK (payload #>> '{production,origin_kind}' = production_origin)
    CHECK (payload #>> '{validation,state}' = validation_state)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{created_by,actor_id}' = created_by_actor_id)
    CHECK (payload #>> '{created_by,actor_kind}' = created_by_actor_kind)
    CHECK ((payload ->> 'created_at')::timestamptz = created_at),
  PRIMARY KEY (draft_artifact_id, revision),
  UNIQUE (draft_artifact_id, revision, content_hash),
  UNIQUE (
    provenance_map_id, provenance_map_revision, draft_artifact_id, revision
  ),
  UNIQUE (
    citation_bundle_id, citation_bundle_revision, draft_artifact_id, revision
  ),
  FOREIGN KEY (draft_artifact_id, project_id)
    REFERENCES petra.draft_artifacts (draft_artifact_id, project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    composition_request_id, composition_request_revision, project_id,
    snapshot_id, snapshot_revision, snapshot_event_position, snapshot_hash,
    composition_request_hash
  ) REFERENCES petra.composition_requests (
    composition_request_id, revision, project_id, snapshot_id,
    snapshot_revision, snapshot_event_position, snapshot_hash, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    composition_plan_id, composition_plan_revision, project_id,
    composition_plan_hash
  ) REFERENCES petra.composition_plans (
    composition_plan_id, revision, project_id, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    evidence_packet_id, evidence_packet_revision, project_id, snapshot_id,
    snapshot_revision, snapshot_event_position, snapshot_hash,
    evidence_packet_hash
  ) REFERENCES petra.evidence_packets (
    evidence_packet_id, revision, project_id, snapshot_id,
    snapshot_revision, snapshot_event_position, snapshot_hash, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (model_request_id)
    REFERENCES petra.model_requests (model_request_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (model_call_id, model_request_id)
    REFERENCES petra.model_calls (model_call_id, model_request_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    grounded_response_id, grounded_response_revision, grounded_response_hash
  ) REFERENCES petra.grounded_response_revisions (
    grounded_response_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (revision = 1 AND lineage_kind = 'root'
      AND parent_revision IS NULL AND edit_origin IS NULL)
    OR
    (revision > 1 AND lineage_kind = 'revision'
      AND parent_revision = revision - 1 AND edit_origin IS NOT NULL)
  ),
  CHECK (
    (production_origin = 'model_generated'
      AND model_request_id IS NOT NULL AND model_call_id IS NOT NULL
      AND grounded_response_id IS NOT NULL
      AND grounded_response_revision IS NOT NULL
      AND grounded_response_hash IS NOT NULL
      AND researcher_id IS NULL AND created_by_actor_kind = 'model')
    OR
    (production_origin = 'researcher_authored'
      AND model_request_id IS NULL AND model_call_id IS NULL
      AND grounded_response_id IS NULL AND grounded_response_revision IS NULL
      AND grounded_response_hash IS NULL
      AND researcher_id = created_by_actor_id
      AND created_by_actor_kind = 'human')
    OR
    (production_origin = 'deterministic'
      AND model_request_id IS NULL AND model_call_id IS NULL
      AND grounded_response_id IS NULL AND grounded_response_revision IS NULL
      AND grounded_response_hash IS NULL
      AND researcher_id IS NULL AND created_by_actor_kind = 'service')
  )
);

ALTER TABLE petra.draft_artifacts
  ADD CONSTRAINT draft_artifacts_current_revision_fkey
  FOREIGN KEY (draft_artifact_id, current_revision)
  REFERENCES petra.draft_artifact_revisions (draft_artifact_id, revision)
  ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE petra.draft_spans (
  draft_span_id text PRIMARY KEY
    CHECK (draft_span_id ~ '^draft_span_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL CHECK (revision = 1),
  draft_artifact_id text NOT NULL,
  draft_artifact_revision bigint NOT NULL,
  draft_content_hash text NOT NULL,
  project_id text NOT NULL,
  start_codepoint bigint NOT NULL CHECK (start_codepoint >= 0),
  end_codepoint bigint NOT NULL CHECK (end_codepoint > start_codepoint),
  exact_text_hash text NOT NULL CHECK (exact_text_hash ~ '^sha256:[0-9a-f]{64}$'),
  materiality text NOT NULL CHECK (materiality IN ('material', 'nonmaterial')),
  semantic_origin text NOT NULL CHECK (
    semantic_origin IN (
      'source_report', 'petra_inference', 'researcher_statement',
      'structural_language'
    )
  ),
  scientific_force text NOT NULL CHECK (
    scientific_force IN (
      'direct_report', 'descriptive', 'association', 'comparison',
      'qualification', 'causal', 'mechanistic', 'methodological', 'none'
    )
  ),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL,
  created_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.draft-span')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'draft_span_id' = draft_span_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload #>> '{draft_ref,draft_artifact_id}' = draft_artifact_id)
    CHECK ((payload #>> '{draft_ref,revision}')::bigint = draft_artifact_revision)
    CHECK (payload #>> '{draft_ref,content_hash}' = draft_content_hash)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK ((payload #>> '{content,start}')::bigint = start_codepoint)
    CHECK ((payload #>> '{content,end}')::bigint = end_codepoint)
    CHECK (payload #>> '{content,offset_unit}' = 'unicode_code_point')
    CHECK (payload #>> '{content,exact_text_hash}' = exact_text_hash)
    CHECK (payload #>> '{content,materiality}' = materiality)
    CHECK (payload #>> '{content,semantic_origin}' = semantic_origin)
    CHECK (payload #>> '{content,scientific_force}' = scientific_force)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{created_by,actor_id}' = created_by_actor_id)
    CHECK (payload #>> '{created_by,actor_kind}' = created_by_actor_kind)
    CHECK ((payload ->> 'created_at')::timestamptz = created_at),
  UNIQUE (draft_span_id, revision),
  UNIQUE (draft_artifact_id, draft_artifact_revision, draft_span_id),
  FOREIGN KEY (
    draft_artifact_id, draft_artifact_revision, draft_content_hash
  ) REFERENCES petra.draft_artifact_revisions (
    draft_artifact_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.provenance_maps (
  provenance_map_id text NOT NULL
    CHECK (provenance_map_id ~ '^provenance_map_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL CHECK (revision = 1),
  draft_artifact_id text NOT NULL,
  draft_artifact_revision bigint NOT NULL,
  draft_content_hash text NOT NULL,
  evidence_packet_id text NOT NULL,
  evidence_packet_revision bigint NOT NULL,
  evidence_packet_hash text NOT NULL,
  project_id text NOT NULL,
  map_state text NOT NULL CHECK (map_state IN ('current', 'stale')),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  compiled_by_actor_id text NOT NULL,
  compiled_by_actor_kind text NOT NULL CHECK (compiled_by_actor_kind = 'service'),
  compiled_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.provenance-map')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'provenance_map_id' = provenance_map_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload #>> '{draft_ref,draft_artifact_id}' = draft_artifact_id)
    CHECK ((payload #>> '{draft_ref,revision}')::bigint = draft_artifact_revision)
    CHECK (payload #>> '{draft_ref,content_hash}' = draft_content_hash)
    CHECK (payload #>> '{evidence_packet_ref,evidence_packet_id}' = evidence_packet_id)
    CHECK ((payload #>> '{evidence_packet_ref,revision}')::bigint = evidence_packet_revision)
    CHECK (payload #>> '{evidence_packet_ref,content_hash}' = evidence_packet_hash)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{content,state}' = map_state)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{compiled_by,actor_id}' = compiled_by_actor_id)
    CHECK (payload #>> '{compiled_by,actor_kind}' = compiled_by_actor_kind)
    CHECK ((payload ->> 'compiled_at')::timestamptz = compiled_at),
  PRIMARY KEY (provenance_map_id, revision),
  UNIQUE (
    provenance_map_id, revision, draft_artifact_id, draft_artifact_revision
  ),
  FOREIGN KEY (
    draft_artifact_id, draft_artifact_revision, draft_content_hash
  ) REFERENCES petra.draft_artifact_revisions (
    draft_artifact_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (compiled_by_actor_id, compiled_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.provenance_span_mappings (
  provenance_map_id text NOT NULL,
  provenance_map_revision bigint NOT NULL,
  position integer NOT NULL CHECK (position >= 1),
  draft_span_id text NOT NULL,
  draft_span_revision bigint NOT NULL,
  mapping_state text NOT NULL CHECK (mapping_state IN ('current', 'stale')),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  PRIMARY KEY (provenance_map_id, provenance_map_revision, position),
  UNIQUE (provenance_map_id, provenance_map_revision, draft_span_id),
  FOREIGN KEY (provenance_map_id, provenance_map_revision)
    REFERENCES petra.provenance_maps (provenance_map_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (draft_span_id, draft_span_revision)
    REFERENCES petra.draft_spans (draft_span_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.provenance_bases (
  provenance_map_id text NOT NULL,
  provenance_map_revision bigint NOT NULL,
  mapping_position integer NOT NULL,
  basis_position integer NOT NULL CHECK (basis_position >= 1),
  basis_kind text NOT NULL CHECK (
    basis_kind IN (
      'evidence', 'petra_inference', 'researcher', 'structural', 'unsupported'
    )
  ),
  relation text NOT NULL CHECK (
    relation IN (
      'direct_report', 'support', 'qualification', 'comparison',
      'interpretation', 'synthesis', 'structural', 'unsupported'
    )
  ),
  evidence_selection_order bigint,
  object_kind text CHECK (
    object_kind IS NULL OR object_kind IN (
      'claim', 'assertion', 'source_span', 'work_version'
    )
  ),
  object_id text,
  object_revision bigint,
  object_hash text CHECK (
    object_hash IS NULL OR object_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  PRIMARY KEY (
    provenance_map_id, provenance_map_revision, mapping_position, basis_position
  ),
  FOREIGN KEY (
    provenance_map_id, provenance_map_revision, mapping_position
  ) REFERENCES petra.provenance_span_mappings (
    provenance_map_id, provenance_map_revision, position
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (basis_kind = 'evidence'
      AND evidence_selection_order IS NOT NULL
      AND object_kind IS NOT NULL AND object_id IS NOT NULL
      AND object_revision IS NOT NULL AND object_hash IS NOT NULL)
    OR
    (basis_kind <> 'evidence'
      AND evidence_selection_order IS NULL
      AND object_kind IS NULL AND object_id IS NULL
      AND object_revision IS NULL AND object_hash IS NULL)
  )
);

CREATE TABLE petra.citation_bundles (
  citation_bundle_id text NOT NULL
    CHECK (citation_bundle_id ~ '^citation_bundle_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL CHECK (revision = 1),
  draft_artifact_id text NOT NULL,
  draft_artifact_revision bigint NOT NULL,
  draft_content_hash text NOT NULL,
  evidence_packet_id text NOT NULL,
  evidence_packet_revision bigint NOT NULL,
  evidence_packet_hash text NOT NULL,
  project_id text NOT NULL,
  style_kind text NOT NULL CHECK (style_kind IN ('csl', 'bibtex', 'plain')),
  style_name text NOT NULL,
  style_version text NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  compiled_by_actor_id text NOT NULL,
  compiled_by_actor_kind text NOT NULL CHECK (compiled_by_actor_kind = 'service'),
  compiled_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.citation-bundle')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'citation_bundle_id' = citation_bundle_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload #>> '{draft_ref,draft_artifact_id}' = draft_artifact_id)
    CHECK ((payload #>> '{draft_ref,revision}')::bigint = draft_artifact_revision)
    CHECK (payload #>> '{draft_ref,content_hash}' = draft_content_hash)
    CHECK (payload #>> '{evidence_packet_ref,evidence_packet_id}' = evidence_packet_id)
    CHECK ((payload #>> '{evidence_packet_ref,revision}')::bigint = evidence_packet_revision)
    CHECK (payload #>> '{evidence_packet_ref,content_hash}' = evidence_packet_hash)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{content,style,style_kind}' = style_kind)
    CHECK (payload #>> '{content,style,style_name}' = style_name)
    CHECK (payload #>> '{content,style,style_version}' = style_version)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{compiled_by,actor_id}' = compiled_by_actor_id)
    CHECK (payload #>> '{compiled_by,actor_kind}' = compiled_by_actor_kind)
    CHECK ((payload ->> 'compiled_at')::timestamptz = compiled_at),
  PRIMARY KEY (citation_bundle_id, revision),
  UNIQUE (
    citation_bundle_id, revision, draft_artifact_id, draft_artifact_revision
  ),
  FOREIGN KEY (
    draft_artifact_id, draft_artifact_revision, draft_content_hash
  ) REFERENCES petra.draft_artifact_revisions (
    draft_artifact_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (compiled_by_actor_id, compiled_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

ALTER TABLE petra.draft_artifact_revisions
  ADD CONSTRAINT draft_revision_provenance_map_fkey
  FOREIGN KEY (
    provenance_map_id, provenance_map_revision, draft_artifact_id, revision
  ) REFERENCES petra.provenance_maps (
    provenance_map_id, revision, draft_artifact_id, draft_artifact_revision
  ) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE petra.draft_artifact_revisions
  ADD CONSTRAINT draft_revision_citation_bundle_fkey
  FOREIGN KEY (
    citation_bundle_id, citation_bundle_revision, draft_artifact_id, revision
  ) REFERENCES petra.citation_bundles (
    citation_bundle_id, revision, draft_artifact_id, draft_artifact_revision
  ) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE petra.citation_entries (
  citation_bundle_id text NOT NULL,
  citation_bundle_revision bigint NOT NULL,
  position integer NOT NULL CHECK (position >= 1),
  citation_id text NOT NULL UNIQUE
    CHECK (citation_id ~ '^citation_[0-9A-HJKMNP-TV-Z]{26}$'),
  bibliography_key text NOT NULL,
  work_id text NOT NULL,
  work_revision bigint NOT NULL,
  work_hash text NOT NULL,
  work_version_id text NOT NULL,
  work_version_revision bigint NOT NULL,
  work_version_hash text NOT NULL,
  identity_status text NOT NULL CHECK (
    identity_status IN ('resolved', 'provisional', 'disputed')
  ),
  metadata_completeness text NOT NULL CHECK (
    metadata_completeness IN ('complete', 'partial', 'conflicted')
  ),
  processing_depth text NOT NULL CHECK (
    processing_depth IN (
      'metadata_only', 'abstract_only', 'full_text_structured',
      'full_text_analyzed'
    )
  ),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  PRIMARY KEY (citation_bundle_id, citation_bundle_revision, position),
  UNIQUE (citation_bundle_id, citation_bundle_revision, bibliography_key),
  FOREIGN KEY (citation_bundle_id, citation_bundle_revision)
    REFERENCES petra.citation_bundles (citation_bundle_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (work_id, work_revision, work_hash)
    REFERENCES petra.canonical_entity_revisions (entity_id, revision, record_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (work_version_id, work_version_revision, work_version_hash)
    REFERENCES petra.canonical_entity_revisions (entity_id, revision, record_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.citation_author_refs (
  citation_bundle_id text NOT NULL,
  citation_bundle_revision bigint NOT NULL,
  citation_position integer NOT NULL,
  author_position integer NOT NULL CHECK (author_position >= 1),
  author_id text NOT NULL,
  author_revision bigint NOT NULL,
  author_hash text NOT NULL,
  display_name text NOT NULL,
  PRIMARY KEY (
    citation_bundle_id, citation_bundle_revision, citation_position,
    author_position
  ),
  FOREIGN KEY (
    citation_bundle_id, citation_bundle_revision, citation_position
  ) REFERENCES petra.citation_entries (
    citation_bundle_id, citation_bundle_revision, position
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (author_id, author_revision, author_hash)
    REFERENCES petra.canonical_entity_revisions (entity_id, revision, record_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.citation_external_identifier_refs (
  citation_bundle_id text NOT NULL,
  citation_bundle_revision bigint NOT NULL,
  citation_position integer NOT NULL,
  identifier_position integer NOT NULL CHECK (identifier_position >= 1),
  external_identifier_id text NOT NULL,
  external_identifier_revision bigint NOT NULL,
  external_identifier_hash text NOT NULL,
  namespace text NOT NULL,
  normalized_value text NOT NULL,
  verification_status text NOT NULL,
  PRIMARY KEY (
    citation_bundle_id, citation_bundle_revision, citation_position,
    identifier_position
  ),
  FOREIGN KEY (
    citation_bundle_id, citation_bundle_revision, citation_position
  ) REFERENCES petra.citation_entries (
    citation_bundle_id, citation_bundle_revision, position
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    external_identifier_id, external_identifier_revision,
    external_identifier_hash
  ) REFERENCES petra.canonical_entity_revisions (entity_id, revision, record_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.citation_linked_spans (
  citation_bundle_id text NOT NULL,
  citation_bundle_revision bigint NOT NULL,
  citation_position integer NOT NULL,
  span_position integer NOT NULL CHECK (span_position >= 1),
  draft_span_id text NOT NULL,
  draft_span_revision bigint NOT NULL DEFAULT 1,
  PRIMARY KEY (
    citation_bundle_id, citation_bundle_revision, citation_position,
    span_position
  ),
  UNIQUE (
    citation_bundle_id, citation_bundle_revision, citation_position,
    draft_span_id
  ),
  FOREIGN KEY (
    citation_bundle_id, citation_bundle_revision, citation_position
  ) REFERENCES petra.citation_entries (
    citation_bundle_id, citation_bundle_revision, position
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (draft_span_id, draft_span_revision)
    REFERENCES petra.draft_spans (draft_span_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.citation_source_spans (
  citation_bundle_id text NOT NULL,
  citation_bundle_revision bigint NOT NULL,
  citation_position integer NOT NULL,
  source_span_position integer NOT NULL CHECK (source_span_position >= 1),
  source_span_id text NOT NULL,
  PRIMARY KEY (
    citation_bundle_id, citation_bundle_revision, citation_position,
    source_span_position
  ),
  UNIQUE (
    citation_bundle_id, citation_bundle_revision, citation_position,
    source_span_id
  ),
  FOREIGN KEY (
    citation_bundle_id, citation_bundle_revision, citation_position
  ) REFERENCES petra.citation_entries (
    citation_bundle_id, citation_bundle_revision, position
  ) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.citation_bibliography_artifacts (
  citation_bundle_id text NOT NULL,
  citation_bundle_revision bigint NOT NULL,
  position integer NOT NULL CHECK (position >= 1),
  format text NOT NULL CHECK (format IN ('markdown', 'latex', 'bibtex', 'csl_json')),
  artifact_id text NOT NULL,
  artifact_hash text NOT NULL,
  PRIMARY KEY (citation_bundle_id, citation_bundle_revision, position),
  UNIQUE (citation_bundle_id, citation_bundle_revision, format),
  FOREIGN KEY (citation_bundle_id, citation_bundle_revision)
    REFERENCES petra.citation_bundles (citation_bundle_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (artifact_id, artifact_hash)
    REFERENCES petra.artifacts (artifact_id, content_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.draft_authority_dependencies (
  draft_artifact_id text NOT NULL,
  draft_artifact_revision bigint NOT NULL,
  position integer NOT NULL CHECK (position >= 1),
  dependency_role text NOT NULL CHECK (
    dependency_role IN ('provenance', 'citation')
  ),
  object_kind text NOT NULL CHECK (
    object_kind IN (
      'claim', 'assertion', 'source_span', 'work', 'work_version',
      'author', 'external_identifier'
    )
  ),
  object_id text NOT NULL,
  object_revision bigint NOT NULL CHECK (object_revision >= 1),
  object_hash text NOT NULL CHECK (object_hash ~ '^sha256:[0-9a-f]{64}$'),
  PRIMARY KEY (draft_artifact_id, draft_artifact_revision, position),
  UNIQUE (
    draft_artifact_id, draft_artifact_revision, dependency_role,
    object_kind, object_id, object_revision, object_hash
  ),
  FOREIGN KEY (draft_artifact_id, draft_artifact_revision)
    REFERENCES petra.draft_artifact_revisions (draft_artifact_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX draft_authority_dependency_lookup_idx
  ON petra.draft_authority_dependencies (
    object_kind, object_id, object_revision, draft_artifact_id,
    draft_artifact_revision
  );

CREATE FUNCTION petra.guard_draft_artifact_head()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'DraftArtifact identities cannot be deleted'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.draft_artifact_id <> OLD.draft_artifact_id
     OR NEW.project_id <> OLD.project_id
     OR NEW.created_at <> OLD.created_at
     OR NEW.current_revision <> OLD.current_revision + 1 THEN
    RAISE EXCEPTION 'DraftArtifact identity is immutable and revision advances once'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.guard_immutable_composition_aggregate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Composition aggregate records are immutable'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER draft_artifact_head_guard
BEFORE UPDATE OR DELETE ON petra.draft_artifacts
FOR EACH ROW EXECUTE FUNCTION petra.guard_draft_artifact_head();

CREATE TRIGGER draft_artifact_revisions_immutable
BEFORE UPDATE OR DELETE ON petra.draft_artifact_revisions
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_composition_aggregate();

CREATE TRIGGER draft_spans_immutable
BEFORE UPDATE OR DELETE ON petra.draft_spans
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_composition_aggregate();

CREATE TRIGGER provenance_maps_immutable
BEFORE UPDATE OR DELETE ON petra.provenance_maps
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_composition_aggregate();

CREATE TRIGGER provenance_span_mappings_immutable
BEFORE UPDATE OR DELETE ON petra.provenance_span_mappings
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_composition_aggregate();

CREATE TRIGGER provenance_bases_immutable
BEFORE UPDATE OR DELETE ON petra.provenance_bases
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_composition_aggregate();

CREATE TRIGGER citation_bundles_immutable
BEFORE UPDATE OR DELETE ON petra.citation_bundles
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_composition_aggregate();

CREATE TRIGGER citation_entries_immutable
BEFORE UPDATE OR DELETE ON petra.citation_entries
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_composition_aggregate();

CREATE TRIGGER citation_author_refs_immutable
BEFORE UPDATE OR DELETE ON petra.citation_author_refs
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_composition_aggregate();

CREATE TRIGGER citation_external_identifier_refs_immutable
BEFORE UPDATE OR DELETE ON petra.citation_external_identifier_refs
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_composition_aggregate();

CREATE TRIGGER citation_linked_spans_immutable
BEFORE UPDATE OR DELETE ON petra.citation_linked_spans
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_composition_aggregate();

CREATE TRIGGER citation_source_spans_immutable
BEFORE UPDATE OR DELETE ON petra.citation_source_spans
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_composition_aggregate();

CREATE TRIGGER citation_bibliography_artifacts_immutable
BEFORE UPDATE OR DELETE ON petra.citation_bibliography_artifacts
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_composition_aggregate();

CREATE TRIGGER draft_authority_dependencies_immutable
BEFORE UPDATE OR DELETE ON petra.draft_authority_dependencies
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_composition_aggregate();
