"""Quarantine-only document worker for Petra's M1.4 parse boundary."""

from __future__ import annotations

import argparse
import json
import os
import resource
import sys
import time
from collections.abc import Callable, Sequence
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Protocol

from .contracts import ContractRegistryError, PetraContractRegistry
from .docling_adapter import DoclingDocumentParser, DoclingParseProduct, stable_id
from .document_job import (
    DocumentJobError,
    ScopedInputReader,
    WorkerInputManifest,
    byte_hash,
    canonical_hash,
    load_document_job_inputs,
    load_manifest,
    read_json,
)

OUTPUT_FILENAMES = {
    "docling_document": "docling-document.json.gz",
    "document_parse_bundle": "document-parse-bundle.json",
    "worker_log": "worker.log",
}


class DocumentParser(Protocol):
    """Minimal injectable parser seam used by the worker and its tests."""

    def parse(
        self,
        *,
        source_path: Path,
        models_path: Path,
        source_artifact: dict[str, Any],
        source_artifact_manifest: dict[str, Any],
        rights_decision: dict[str, Any],
        work_version: dict[str, Any],
        created_by: dict[str, str],
        timeout_seconds: float,
    ) -> DoclingParseProduct: ...


def _utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _json_bytes(value: Any) -> bytes:
    return (
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    ).encode("utf-8")


def _safe_path(root: Path, value: Path) -> Path:
    resolved_root = root.resolve(strict=True)
    candidate = value if value.is_absolute() else resolved_root / value
    resolved = candidate.resolve(strict=True)
    if not resolved.is_relative_to(resolved_root) or not resolved.is_file():
        raise DocumentJobError(
            "INPUT_PATH_OUTSIDE_SCOPE",
            "A worker control file does not resolve inside the explicit input root.",
        )
    return resolved


def _peak_memory_bytes() -> int:
    maximum = int(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss)
    return maximum if sys.platform == "darwin" else maximum * 1024


def _usage(
    *,
    wall_started: float,
    cpu_started: float,
    input_bytes: int,
    output_bytes: int,
) -> dict[str, int]:
    return {
        "wall_time_ms": max(0, round((time.monotonic() - wall_started) * 1000)),
        "cpu_time_ms": max(0, round((time.process_time() - cpu_started) * 1000)),
        "peak_memory_bytes": max(0, _peak_memory_bytes()),
        "input_bytes": max(0, input_bytes),
        "output_bytes": max(0, output_bytes),
        "network_bytes": 0,
    }


def _expected_output_profile(
    manifest: WorkerInputManifest,
    contracts: PetraContractRegistry,
) -> dict[str, Any]:
    outputs = {
        output.output_name: output for output in manifest.content.expected_outputs
    }
    expected_names = set(OUTPUT_FILENAMES)
    if set(outputs) != expected_names:
        raise DocumentJobError(
            "OUTPUT_PROFILE_INVALID",
            "The document worker requires exactly its native, bundle, and log outputs.",
        )
    native = outputs["docling_document"]
    bundle = outputs["document_parse_bundle"]
    log = outputs["worker_log"]
    entry = next(
        (
            value
            for value in contracts.entries
            if value.name == "document-parse-bundle" and value.version == "1.0.0"
        ),
        None,
    )
    if (
        native.output_role != "result"
        or not native.required
        or native.media_type != "application/gzip"
        or native.contract is not None
        or bundle.output_role != "proposal"
        or not bundle.required
        or bundle.media_type != "application/json"
        or bundle.contract is None
        or entry is None
        or bundle.contract.model_dump()
        != {
            "schema_name": "petra.document-parse-bundle",
            "schema_version": "1.0.0",
            "schema_hash": entry.canonical_sha256,
        }
        or log.output_role != "log"
        or log.required
        or log.media_type != "text/plain"
        or log.contract is not None
    ):
        raise DocumentJobError(
            "OUTPUT_PROFILE_INVALID",
            "The manifested document-worker output profile is not the accepted "
            "profile.",
        )
    return outputs


def _enforce_resource_limits(
    manifest: WorkerInputManifest,
    usage: dict[str, int],
    output_sizes: dict[str, int],
    expected_outputs: dict[str, Any],
) -> None:
    limits = manifest.content.resource_limits
    if any(
        output_sizes[name] > expected_outputs[name].max_bytes for name in output_sizes
    ):
        raise DocumentJobError(
            "OUTPUT_SLOT_LIMIT_EXCEEDED",
            "A staged worker output exceeds its manifested slot limit.",
        )
    checks = (
        ("wall_time_ms", limits.max_wall_time_ms),
        ("cpu_time_ms", limits.max_cpu_time_ms),
        ("peak_memory_bytes", limits.max_memory_bytes),
        ("output_bytes", limits.max_output_bytes),
    )
    for field, maximum in checks:
        if maximum is not None and usage[field] > maximum:
            raise DocumentJobError(
                "RESOURCE_LIMIT_EXCEEDED",
                f"Measured {field} exceeds the manifested resource limit.",
            )


def _diagnostics_for_manifest(
    diagnostics: Sequence[dict[str, Any]],
) -> list[dict[str, str]]:
    return [
        {
            "code": str(value.get("code", "WORKER_DIAGNOSTIC"))[:64],
            "severity": str(value.get("severity", "warning")),
            "message": str(value.get("message", "Worker diagnostic."))[:4000],
        }
        for value in diagnostics
    ]


def _output_descriptor(
    *,
    name: str,
    payload: bytes,
    expected: Any,
) -> dict[str, Any]:
    descriptor: dict[str, Any] = {
        "output_name": name,
        "output_role": expected.output_role,
        "output_handle": f"output:{OUTPUT_FILENAMES[name]}",
        "content_hash": byte_hash(payload),
        "byte_size": len(payload),
        "media_type": expected.media_type,
    }
    if expected.contract is not None:
        descriptor["contract"] = expected.contract.model_dump()
    return descriptor


def _output_manifest(
    *,
    manifest: WorkerInputManifest,
    attempt: int,
    started_at: str,
    completed_at: str,
    outcome: dict[str, Any],
    diagnostics: Sequence[dict[str, Any]],
    usage: dict[str, int],
) -> dict[str, Any]:
    content = {
        "worker": manifest.content.worker.model_dump(),
        "started_at": started_at,
        "completed_at": completed_at,
        "outcome": outcome,
        "diagnostics": _diagnostics_for_manifest(diagnostics),
        "network_activity": [],
        "resource_usage": usage,
    }
    identity = f"{manifest.worker_input_manifest_id}|{attempt}"
    return {
        "schema_name": "petra.worker-output-manifest",
        "schema_version": "1.0.0",
        "worker_output_manifest_id": stable_id("worker_output_manifest", identity),
        "revision": 1,
        "work_unit_id": manifest.work_unit_id,
        "project_id": manifest.project_id,
        "attempt": attempt,
        "worker_input_manifest_id": manifest.worker_input_manifest_id,
        "worker_input_manifest_hash": manifest.content_hash,
        "content": content,
        "content_hash": canonical_hash(content),
        "reported_at": completed_at,
    }


def _prepare_output_root(output_root: Path) -> Path:
    root = output_root.resolve()
    root.mkdir(parents=True, exist_ok=True)
    managed_names = {*OUTPUT_FILENAMES.values(), "worker-output-manifest.json"}
    if any((root / name).exists() for name in managed_names):
        raise DocumentJobError(
            "OUTPUT_ALREADY_EXISTS",
            "The worker refuses to overwrite an existing attempt output.",
        )
    return root


def _stage_files(root: Path, files: dict[str, bytes]) -> None:
    staged: list[tuple[Path, Path]] = []
    try:
        for filename, payload in files.items():
            temporary = root / f".{filename}.{os.getpid()}.tmp"
            with temporary.open("xb") as target:
                target.write(payload)
                target.flush()
                os.fsync(target.fileno())
            staged.append((temporary, root / filename))
        for temporary, final in staged:
            os.replace(temporary, final)
    finally:
        for temporary, _final in staged:
            temporary.unlink(missing_ok=True)


def _failure_manifest(
    *,
    contracts: PetraContractRegistry,
    manifest: WorkerInputManifest,
    attempt: int,
    output_root: Path,
    error: DocumentJobError,
    started_at: str,
    wall_started: float,
    cpu_started: float,
    input_bytes: int,
) -> None:
    completed_at = _utc_now()
    usage = _usage(
        wall_started=wall_started,
        cpu_started=cpu_started,
        input_bytes=input_bytes,
        output_bytes=0,
    )
    outcome_kind = (
        "resource_exhausted"
        if error.code in {"RESOURCE_LIMIT_EXCEEDED", "OUTPUT_SLOT_LIMIT_EXCEEDED"}
        else "timed_out"
        if error.code == "DOCLING_TIMEOUT"
        else "worker_failed"
    )
    output = _output_manifest(
        manifest=manifest,
        attempt=attempt,
        started_at=started_at,
        completed_at=completed_at,
        outcome={
            "outcome_kind": outcome_kind,
            "failure": {
                "code": error.code[:64],
                "message": str(error)[:4000],
                "retryable": error.retryable,
            },
            "produced_outputs": [],
        },
        diagnostics=[],
        usage=usage,
    )
    contracts.assert_valid("worker-output-manifest", "1.0.0", output)
    _stage_files(output_root, {"worker-output-manifest.json": _json_bytes(output)})


def run_document_worker(
    *,
    contracts_root: Path,
    input_root: Path,
    manifest_path: Path,
    bindings_path: Path,
    models_path: Path,
    output_root: Path,
    attempt: int = 1,
    parser_factory: Callable[[], DocumentParser] = DoclingDocumentParser,
) -> int:
    """Execute one bounded parse attempt without persistence authority."""

    wall_started = time.monotonic()
    cpu_started = time.process_time()
    started_at = _utc_now()
    contracts = PetraContractRegistry(contracts_root.resolve(strict=True))
    _raw_manifest, manifest = load_manifest(
        _safe_path(input_root, manifest_path), contracts
    )
    if attempt < 1 or attempt > manifest.content.resource_limits.max_attempts:
        raise DocumentJobError(
            "ATTEMPT_NOT_AUTHORIZED",
            "The requested attempt is outside the manifested retry allowance.",
        )
    root = _prepare_output_root(output_root)
    input_bytes = 0
    try:
        bindings = read_json(_safe_path(input_root, bindings_path))
        from .document_job import BindingIndex  # noqa: PLC0415

        index = BindingIndex.model_validate(bindings)
        reader = ScopedInputReader(
            root=input_root,
            index=index,
            manifest=manifest,
            contracts=contracts,
        )
        source_path, inputs = load_document_job_inputs(reader, manifest)
        input_bytes = len(inputs.source_pdf)
        expected = _expected_output_profile(manifest, contracts)
        product = parser_factory().parse(
            source_path=source_path,
            models_path=models_path,
            source_artifact=inputs.source_artifact,
            source_artifact_manifest=inputs.source_artifact_manifest,
            rights_decision=inputs.rights_decision,
            work_version=inputs.work_version,
            created_by=manifest.issued_by.model_dump(),
            timeout_seconds=manifest.content.resource_limits.max_wall_time_ms / 1000,
        )
        contracts.assert_valid("document-parse-bundle", "1.0.0", product.bundle)
        bundle_bytes = _json_bytes(product.bundle)
        log_bytes = (
            "Petra document worker completed local Docling parsing.\n"
            f"quality_state={product.bundle['document']['quality_state']}\n"
            f"diagnostic_count={len(product.diagnostics)}\n"
            "network_activity=0\n"
        ).encode()
        payloads = {
            "docling_document": product.native_output_gzip,
            "document_parse_bundle": bundle_bytes,
            "worker_log": log_bytes,
        }
        sizes = {name: len(payload) for name, payload in payloads.items()}
        output_bytes = sum(sizes.values())
        usage = _usage(
            wall_started=wall_started,
            cpu_started=cpu_started,
            input_bytes=input_bytes,
            output_bytes=output_bytes,
        )
        _enforce_resource_limits(manifest, usage, sizes, expected)
        produced = [
            _output_descriptor(
                name=name, payload=payloads[name], expected=expected[name]
            )
            for name in OUTPUT_FILENAMES
        ]
        completed_at = _utc_now()
        output_manifest = _output_manifest(
            manifest=manifest,
            attempt=attempt,
            started_at=started_at,
            completed_at=completed_at,
            outcome={"outcome_kind": "succeeded", "produced_outputs": produced},
            diagnostics=product.diagnostics,
            usage=usage,
        )
        contracts.assert_valid("worker-output-manifest", "1.0.0", output_manifest)
        _stage_files(
            root,
            {OUTPUT_FILENAMES[name]: payload for name, payload in payloads.items()}
            | {"worker-output-manifest.json": _json_bytes(output_manifest)},
        )
        return 0
    except ContractRegistryError as error:
        job_error = DocumentJobError(error.code, str(error))
        _failure_manifest(
            contracts=contracts,
            manifest=manifest,
            attempt=attempt,
            output_root=root,
            error=job_error,
            started_at=started_at,
            wall_started=wall_started,
            cpu_started=cpu_started,
            input_bytes=input_bytes,
        )
        return 1
    except DocumentJobError as error:
        _failure_manifest(
            contracts=contracts,
            manifest=manifest,
            attempt=attempt,
            output_root=root,
            error=error,
            started_at=started_at,
            wall_started=wall_started,
            cpu_started=cpu_started,
            input_bytes=input_bytes,
        )
        return 1
    except Exception:
        job_error = DocumentJobError(
            "WORKER_INTERNAL_ERROR",
            "The document worker failed unexpectedly before producing a proposal.",
        )
        _failure_manifest(
            contracts=contracts,
            manifest=manifest,
            attempt=attempt,
            output_root=root,
            error=job_error,
            started_at=started_at,
            wall_started=wall_started,
            cpu_started=cpu_started,
            input_bytes=input_bytes,
        )
        return 1


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--contracts-root", type=Path, required=True)
    parser.add_argument("--input-root", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--bindings", type=Path, required=True)
    parser.add_argument("--models", type=Path, required=True)
    parser.add_argument("--output-root", type=Path, required=True)
    parser.add_argument("--attempt", type=int, default=1)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    """Run the bounded document-worker command."""

    arguments = _parser().parse_args(argv)
    try:
        return run_document_worker(
            contracts_root=arguments.contracts_root,
            input_root=arguments.input_root,
            manifest_path=arguments.manifest,
            bindings_path=arguments.bindings,
            models_path=arguments.models,
            output_root=arguments.output_root,
            attempt=arguments.attempt,
        )
    except (ContractRegistryError, DocumentJobError, OSError) as error:
        print(f"Petra document worker rejected the job: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
