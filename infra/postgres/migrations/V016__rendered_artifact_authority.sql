ALTER TABLE petra.draft_artifact_revisions
  ADD CONSTRAINT draft_artifact_revisions_render_identity_key
  UNIQUE (draft_artifact_id, revision, project_id, content_hash);

ALTER TABLE petra.citation_bundles
  ADD CONSTRAINT citation_bundles_render_identity_key
  UNIQUE (
    citation_bundle_id, revision, project_id, draft_artifact_id,
    draft_artifact_revision, draft_content_hash, content_hash
  );

ALTER TABLE petra.artifacts
  ADD CONSTRAINT artifacts_render_identity_key
  UNIQUE (artifact_id, revision, content_hash, byte_size, media_type);

CREATE TABLE petra.rendered_artifacts (
  rendered_artifact_id text NOT NULL
    CHECK (
      rendered_artifact_id ~ '^rendered_artifact_[0-9A-HJKMNP-TV-Z]{26}$'
    ),
  revision bigint NOT NULL CHECK (revision = 1),
  project_id text NOT NULL,
  draft_artifact_id text NOT NULL,
  draft_artifact_revision bigint NOT NULL,
  draft_content_hash text NOT NULL
    CHECK (draft_content_hash ~ '^sha256:[0-9a-f]{64}$'),
  citation_bundle_id text NOT NULL,
  citation_bundle_revision bigint NOT NULL CHECK (citation_bundle_revision = 1),
  citation_bundle_hash text NOT NULL
    CHECK (citation_bundle_hash ~ '^sha256:[0-9a-f]{64}$'),
  render_format text NOT NULL CHECK (
    render_format IN ('markdown', 'latex', 'bibtex')
  ),
  content_scope text NOT NULL CHECK (
    content_scope IN ('draft_with_citations', 'citations_only')
  ),
  renderer_name text NOT NULL CHECK (char_length(renderer_name) BETWEEN 1 AND 200),
  renderer_version text NOT NULL CHECK (
    char_length(renderer_version) BETWEEN 1 AND 100
  ),
  renderer_hash text NOT NULL
    CHECK (renderer_hash ~ '^sha256:[0-9a-f]{64}$'),
  output_artifact_id text NOT NULL,
  output_artifact_revision bigint NOT NULL CHECK (output_artifact_revision = 1),
  output_artifact_hash text NOT NULL
    CHECK (output_artifact_hash ~ '^sha256:[0-9a-f]{64}$'),
  output_byte_size bigint NOT NULL CHECK (
    output_byte_size BETWEEN 0 AND 9007199254740991
  ),
  output_media_type text NOT NULL CHECK (
    char_length(output_media_type) BETWEEN 3 AND 300
  ),
  semantic_content_hash text NOT NULL
    CHECK (semantic_content_hash ~ '^sha256:[0-9a-f]{64}$'),
  warning_count integer NOT NULL CHECK (warning_count BETWEEN 0 AND 10000),
  transformation_count integer NOT NULL CHECK (
    transformation_count BETWEEN 1 AND 100
  ),
  rendered_by_actor_id text NOT NULL,
  rendered_by_actor_kind text NOT NULL CHECK (rendered_by_actor_kind = 'service'),
  rendered_at timestamptz NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.rendered-artifact')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'rendered_artifact_id' = rendered_artifact_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{draft_ref,draft_artifact_id}' = draft_artifact_id)
    CHECK ((payload #>> '{draft_ref,revision}')::bigint = draft_artifact_revision)
    CHECK (payload #>> '{draft_ref,content_hash}' = draft_content_hash)
    CHECK (
      payload #>> '{citation_bundle_ref,citation_bundle_id}' = citation_bundle_id
    )
    CHECK (
      (payload #>> '{citation_bundle_ref,revision}')::bigint =
        citation_bundle_revision
    )
    CHECK (
      payload #>> '{citation_bundle_ref,content_hash}' = citation_bundle_hash
    )
    CHECK (payload #>> '{content,format}' = render_format)
    CHECK (payload #>> '{content,content_scope}' = content_scope)
    CHECK (payload #>> '{content,renderer,name}' = renderer_name)
    CHECK (payload #>> '{content,renderer,version}' = renderer_version)
    CHECK (payload #>> '{content,renderer,content_hash}' = renderer_hash)
    CHECK (
      payload #>> '{content,output_artifact_ref,artifact_id}' =
        output_artifact_id
    )
    CHECK (
      (payload #>> '{content,output_artifact_ref,revision}')::bigint =
        output_artifact_revision
    )
    CHECK (
      payload #>> '{content,output_artifact_ref,content_hash}' =
        output_artifact_hash
    )
    CHECK (
      (payload #>> '{content,output_artifact_ref,byte_size}')::bigint =
        output_byte_size
    )
    CHECK (
      payload #>> '{content,output_artifact_ref,media_type}' =
        output_media_type
    )
    CHECK (
      payload #>> '{content,semantic_content_hash}' = semantic_content_hash
    )
    CHECK (
      jsonb_array_length(payload #> '{content,warnings}') = warning_count
    )
    CHECK (
      jsonb_array_length(payload #> '{content,transformations}') =
        transformation_count
    )
    CHECK (
      (payload #>> '{content,authority_boundary,rendered_artifact_is_scientific_authority}')::boolean
        IS FALSE
    )
    CHECK (
      (payload #>> '{content,authority_boundary,renderer_may_change_support}')::boolean
        IS FALSE
    )
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{rendered_by,actor_id}' = rendered_by_actor_id)
    CHECK (payload #>> '{rendered_by,actor_kind}' = rendered_by_actor_kind)
    CHECK ((payload ->> 'rendered_at')::timestamptz = rendered_at),
  PRIMARY KEY (rendered_artifact_id, revision),
  UNIQUE (
    draft_artifact_id, draft_artifact_revision, render_format,
    renderer_name, renderer_version, renderer_hash
  ),
  FOREIGN KEY (
    draft_artifact_id, draft_artifact_revision, project_id, draft_content_hash
  ) REFERENCES petra.draft_artifact_revisions (
    draft_artifact_id, revision, project_id, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    citation_bundle_id, citation_bundle_revision, project_id,
    draft_artifact_id, draft_artifact_revision, draft_content_hash,
    citation_bundle_hash
  ) REFERENCES petra.citation_bundles (
    citation_bundle_id, revision, project_id, draft_artifact_id,
    draft_artifact_revision, draft_content_hash, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    output_artifact_id, output_artifact_revision, output_artifact_hash,
    output_byte_size, output_media_type
  ) REFERENCES petra.artifacts (
    artifact_id, revision, content_hash, byte_size, media_type
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (rendered_by_actor_id, rendered_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (semantic_content_hash = draft_content_hash),
  CHECK (
    (render_format = 'bibtex' AND content_scope = 'citations_only')
    OR
    (render_format IN ('markdown', 'latex')
      AND content_scope = 'draft_with_citations')
  )
);

CREATE INDEX rendered_artifacts_draft_idx
  ON petra.rendered_artifacts (
    draft_artifact_id, draft_artifact_revision, render_format
  );

CREATE FUNCTION petra.guard_immutable_rendered_artifact()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'RenderedArtifact records are immutable'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER rendered_artifacts_immutable
BEFORE UPDATE OR DELETE ON petra.rendered_artifacts
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_rendered_artifact();

COMMENT ON TABLE petra.rendered_artifacts IS
  'Immutable presentation lineage from an exact DraftArtifact and CitationBundle to verified export bytes; never scientific authority.';
