"""Validated, least-privileged inputs for Petra document-processing jobs."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Annotated, Any, Literal

import rfc8785
from pydantic import BaseModel, ConfigDict, Field

from .contracts import PetraContractRegistry


class DocumentJobError(ValueError):
    """A typed worker-boundary failure safe to expose as a diagnostic."""

    def __init__(self, code: str, message: str, *, retryable: bool = False) -> None:
        super().__init__(message)
        self.code = code
        self.retryable = retryable


class StrictModel(BaseModel):
    """Pydantic is an internal view after canonical JSON Schema validation."""

    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)


class TaskDescriptor(StrictModel):
    task_family: str
    task_name: str
    task_version: str


class WorkerDescriptor(StrictModel):
    executor_kind: str
    worker_name: str
    worker_version: str
    runtime_name: str
    runtime_version: str
    entrypoint: str


class ArtifactInputBinding(StrictModel):
    binding_kind: Literal["artifact"]
    name: str
    artifact_id: str
    content_hash: str
    byte_size: int


class RecordInputBinding(StrictModel):
    binding_kind: Literal["record"]
    name: str
    record_id: str
    record_revision: int
    snapshot_hash: str


InputBinding = Annotated[
    ArtifactInputBinding | RecordInputBinding,
    Field(discriminator="binding_kind"),
]


class ContractRef(StrictModel):
    schema_name: str
    schema_version: str
    schema_hash: str


class ExpectedOutput(StrictModel):
    output_name: str
    output_role: str
    required: bool
    media_type: str
    max_bytes: int
    contract: ContractRef | None = None


class MonetaryLimit(StrictModel):
    currency: str
    max_microunits: int


class ResourceLimits(StrictModel):
    max_wall_time_ms: int
    max_output_bytes: int
    max_attempts: int
    max_parallelism: int
    max_cpu_time_ms: int | None = None
    max_memory_bytes: int | None = None
    max_storage_bytes: int | None = None
    max_network_bytes: int | None = None
    max_gpu_time_ms: int | None = None
    max_input_tokens: int | None = None
    max_output_tokens: int | None = None
    monetary_limit: MonetaryLimit | None = None


class BlockedNetworkPolicy(StrictModel):
    network_mode: Literal["blocked"]


class AllowlistedNetworkPolicy(StrictModel):
    network_mode: Literal["allowlist"]
    allowed_destinations: list[str]


NetworkPolicy = Annotated[
    BlockedNetworkPolicy | AllowlistedNetworkPolicy,
    Field(discriminator="network_mode"),
]


class WorkerInputContent(StrictModel):
    task: TaskDescriptor
    worker: WorkerDescriptor
    inputs: list[InputBinding]
    expected_outputs: list[ExpectedOutput]
    resource_limits: ResourceLimits
    network_policy: NetworkPolicy
    partial_result_policy: str


class ActorRef(StrictModel):
    actor_id: str
    actor_kind: str


class WorkerInputManifest(StrictModel):
    schema_name: Literal["petra.worker-input-manifest"]
    schema_version: Literal["1.0.0"]
    worker_input_manifest_id: str
    revision: Literal[1]
    work_unit_id: str
    project_id: str
    content: WorkerInputContent
    content_hash: str
    issued_by: ActorRef
    issued_at: str


class BindingIndex(StrictModel):
    binding_index_version: Literal["1.0.0"]
    bindings: dict[str, str]


class DocumentJobInputs(StrictModel):
    source_pdf: bytes
    source_artifact: dict[str, Any]
    source_artifact_manifest: dict[str, Any]
    rights_decision: dict[str, Any]
    work_version: dict[str, Any]


def canonical_hash(value: Any) -> str:
    """Return Petra's RFC 8785 SHA-256 identity for a JSON-compatible value."""

    return f"sha256:{hashlib.sha256(rfc8785.dumps(value)).hexdigest()}"


def byte_hash(value: bytes) -> str:
    """Return Petra's raw-byte SHA-256 identity."""

    return f"sha256:{hashlib.sha256(value).hexdigest()}"


def read_json(path: Path) -> Any:
    try:
        with path.open(encoding="utf-8") as source:
            return json.load(source)
    except (OSError, json.JSONDecodeError) as error:
        raise DocumentJobError(
            "INPUT_JSON_INVALID", f"Could not read valid JSON from {path.name}."
        ) from error


class ScopedInputReader:
    """Reads only launcher-bound files under one explicit input root."""

    def __init__(
        self,
        *,
        root: Path,
        index: BindingIndex,
        manifest: WorkerInputManifest,
        contracts: PetraContractRegistry,
    ) -> None:
        self._root = root.resolve(strict=True)
        self._index = index
        self._contracts = contracts
        self._bindings = {binding.name: binding for binding in manifest.content.inputs}
        expected_names = set(self._bindings)
        supplied_names = set(index.bindings)
        if expected_names != supplied_names:
            raise DocumentJobError(
                "INPUT_BINDINGS_MISMATCH",
                "The scoped binding index must name exactly the manifested inputs.",
            )

    def _path(self, name: str) -> Path:
        relative = self._index.bindings.get(name)
        if relative is None:
            raise DocumentJobError(
                "INPUT_BINDING_MISSING", f"Input binding {name} is not available."
            )
        candidate = (self._root / relative).resolve(strict=True)
        if not candidate.is_relative_to(self._root) or not candidate.is_file():
            raise DocumentJobError(
                "INPUT_PATH_OUTSIDE_SCOPE",
                f"Input binding {name} does not resolve to a permitted file.",
            )
        return candidate

    def path_for_artifact(self, name: str) -> Path:
        binding = self._bindings.get(name)
        if not isinstance(binding, ArtifactInputBinding):
            raise DocumentJobError(
                "ARTIFACT_BINDING_REQUIRED", f"Input {name} is not an Artifact binding."
            )
        path = self._path(name)
        try:
            value = path.read_bytes()
        except OSError as error:
            raise DocumentJobError(
                "ARTIFACT_READ_FAILED", f"Artifact input {name} could not be read."
            ) from error
        if len(value) != binding.byte_size or byte_hash(value) != binding.content_hash:
            raise DocumentJobError(
                "ARTIFACT_IDENTITY_MISMATCH",
                f"Artifact input {name} does not match its manifested bytes.",
            )
        return path

    def read_record(self, name: str, schema_name: str) -> dict[str, Any]:
        binding = self._bindings.get(name)
        if not isinstance(binding, RecordInputBinding):
            raise DocumentJobError(
                "RECORD_BINDING_REQUIRED", f"Input {name} is not a record binding."
            )
        value = read_json(self._path(name))
        if not isinstance(value, dict):
            raise DocumentJobError(
                "INPUT_RECORD_INVALID", f"Input record {name} must be a JSON object."
            )
        self._contracts.assert_valid(schema_name, "1.0.0", value)
        if (
            canonical_hash(value) != binding.snapshot_hash
            or binding.record_id not in value.values()
            or value.get("revision") != binding.record_revision
        ):
            raise DocumentJobError(
                "RECORD_IDENTITY_MISMATCH",
                f"Input record {name} does not match its manifested snapshot.",
            )
        return value


def load_manifest(
    path: Path, contracts: PetraContractRegistry
) -> tuple[dict[str, Any], WorkerInputManifest]:
    """Validate the portable contract before constructing the Pydantic view."""

    value = read_json(path)
    if not isinstance(value, dict):
        raise DocumentJobError(
            "WORKER_MANIFEST_INVALID", "The worker input manifest must be an object."
        )
    contracts.assert_valid("worker-input-manifest", "1.0.0", value)
    manifest = WorkerInputManifest.model_validate(value)
    if canonical_hash(value["content"]) != manifest.content_hash:
        raise DocumentJobError(
            "WORKER_MANIFEST_HASH_MISMATCH",
            "The worker input manifest content does not match its content hash.",
        )
    return value, manifest


def load_document_job_inputs(
    reader: ScopedInputReader,
    manifest: WorkerInputManifest,
) -> tuple[Path, DocumentJobInputs]:
    """Resolve and cross-check the exact records required by the parser."""

    content = manifest.content
    if content.task.model_dump() != {
        "task_family": "document_processing",
        "task_name": "petra.document.parse",
        "task_version": "1.0.0",
    }:
        raise DocumentJobError(
            "WORKER_TASK_UNSUPPORTED",
            "This worker only accepts petra.document.parse@1.0.0.",
        )
    if (
        content.worker.executor_kind != "python_worker"
        or content.worker.worker_name != "petra.science"
        or content.worker.worker_version != "0.0.0"
        or content.worker.entrypoint != "petra_science.document_worker:main"
    ):
        raise DocumentJobError(
            "WORKER_IDENTITY_MISMATCH",
            "The job is not addressed to this exact Petra science worker.",
        )
    if content.network_policy.network_mode != "blocked":
        raise DocumentJobError(
            "NETWORK_POLICY_NOT_BLOCKED",
            "The M1.4 local Docling worker requires a blocked network policy.",
        )
    if content.resource_limits.max_parallelism != 1:
        raise DocumentJobError(
            "PARALLELISM_POLICY_INVALID",
            "The M1.4 document job must execute with max_parallelism 1.",
        )

    source_path = reader.path_for_artifact("source_pdf")
    artifact = reader.read_record("source_artifact", "artifact")
    artifact_manifest = reader.read_record(
        "source_artifact_manifest", "artifact-manifest"
    )
    rights = reader.read_record("rights_decision", "rights-decision")
    work_version = reader.read_record("work_version", "work-version")
    source_binding = next(
        binding
        for binding in content.inputs
        if isinstance(binding, ArtifactInputBinding) and binding.name == "source_pdf"
    )
    if (
        artifact["artifact_id"] != source_binding.artifact_id
        or artifact["content_hash"] != source_binding.content_hash
        or artifact["byte_size"] != source_binding.byte_size
        or artifact_manifest["artifact_id"] != artifact["artifact_id"]
        or artifact_manifest["storage_ref"]["content_hash"] != artifact["content_hash"]
        or artifact_manifest["origin"].get("work_version_id")
        != work_version["work_version_id"]
        or artifact_manifest["rights_decision_id"] != rights["rights_decision_id"]
        or rights["artifact_manifest_id"] != artifact_manifest["artifact_manifest_id"]
    ):
        raise DocumentJobError(
            "AUTHORITY_INPUT_MISMATCH",
            "Artifact, WorkVersion, and RightsDecision inputs do not form one "
            "authority chain.",
        )
    if rights["decision_status"] != "verified" or not rights["permissions"]["parse"]:
        raise DocumentJobError(
            "PARSING_NOT_AUTHORIZED",
            "The exact Artifact does not have a verified permission to parse.",
        )
    return source_path, DocumentJobInputs(
        source_pdf=source_path.read_bytes(),
        source_artifact=artifact,
        source_artifact_manifest=artifact_manifest,
        rights_decision=rights,
        work_version=work_version,
    )
