"""Tests for the document worker's manifested input boundary."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import pytest

from petra_science.contracts import PetraContractRegistry
from petra_science.document_job import (
    BindingIndex,
    DocumentJobError,
    ScopedInputReader,
    WorkerInputManifest,
    load_document_job_inputs,
    load_manifest,
    read_json,
)

REPOSITORY_ROOT = Path(__file__).parents[3]
CONTRACTS_ROOT = REPOSITORY_ROOT / "packages/contracts"
FIXTURE_ROOT = REPOSITORY_ROOT / "fixtures/full-text/fair-guiding-principles"


def _job() -> tuple[PetraContractRegistry, WorkerInputManifest, ScopedInputReader]:
    contracts = PetraContractRegistry(CONTRACTS_ROOT)
    _raw, manifest = load_manifest(
        FIXTURE_ROOT / "records/worker-input-manifest.json", contracts
    )
    index = BindingIndex.model_validate(
        read_json(FIXTURE_ROOT / "records/worker-input-bindings.json")
    )
    reader = ScopedInputReader(
        root=FIXTURE_ROOT,
        index=index,
        manifest=manifest,
        contracts=contracts,
    )
    return contracts, manifest, reader


def test_loads_one_exact_authorized_artifact_chain() -> None:
    _contracts, manifest, reader = _job()
    source_path, inputs = load_document_job_inputs(reader, manifest)

    assert source_path.name == "wilkinson-et-al-2016.pdf"
    assert len(inputs.source_pdf) == 254_899
    assert inputs.source_artifact["content_hash"].endswith(
        "cdddd9f4808f7e3e1f013139c3915ef4d7cdccb008fa947ef5f72b4c7b6ffde7"
    )
    assert inputs.rights_decision["decision_status"] == "verified"
    assert inputs.rights_decision["permissions"]["parse"] is True
    assert inputs.rights_decision["permissions"]["send_selected_text_remotely"] is False


def test_rejects_manifest_content_changed_beneath_hash(tmp_path: Path) -> None:
    contracts = PetraContractRegistry(CONTRACTS_ROOT)
    value = read_json(FIXTURE_ROOT / "records/worker-input-manifest.json")
    value["content"]["resource_limits"]["max_parallelism"] = 2
    path = tmp_path / "manifest.json"
    path.write_text(json.dumps(value), encoding="utf-8")

    with pytest.raises(DocumentJobError) as rejected:
        load_manifest(path, contracts)

    assert rejected.value.code == "WORKER_MANIFEST_HASH_MISMATCH"


def test_rejects_artifact_bytes_changed_beneath_binding(tmp_path: Path) -> None:
    copied = tmp_path / "fixture"
    shutil.copytree(FIXTURE_ROOT, copied)
    source = copied / "source/wilkinson-et-al-2016.pdf"
    source.write_bytes(source.read_bytes() + b"changed")
    contracts = PetraContractRegistry(CONTRACTS_ROOT)
    _raw, manifest = load_manifest(
        copied / "records/worker-input-manifest.json", contracts
    )
    index = BindingIndex.model_validate(
        read_json(copied / "records/worker-input-bindings.json")
    )
    reader = ScopedInputReader(
        root=copied,
        index=index,
        manifest=manifest,
        contracts=contracts,
    )

    with pytest.raises(DocumentJobError) as rejected:
        reader.path_for_artifact("source_pdf")

    assert rejected.value.code == "ARTIFACT_IDENTITY_MISMATCH"


def test_rejects_a_bound_path_outside_input_scope(tmp_path: Path) -> None:
    contracts, manifest, _reader = _job()
    outside = tmp_path / "outside.pdf"
    outside.write_bytes(b"%PDF-outside")
    raw_index = read_json(FIXTURE_ROOT / "records/worker-input-bindings.json")
    raw_index["bindings"]["source_pdf"] = str(outside)
    reader = ScopedInputReader(
        root=FIXTURE_ROOT,
        index=BindingIndex.model_validate(raw_index),
        manifest=manifest,
        contracts=contracts,
    )

    with pytest.raises(DocumentJobError) as rejected:
        reader.path_for_artifact("source_pdf")

    assert rejected.value.code == "INPUT_PATH_OUTSIDE_SCOPE"
