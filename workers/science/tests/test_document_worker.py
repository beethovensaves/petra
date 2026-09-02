"""Tests for worker failure containment and proposal staging."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from petra_science.document_job import DocumentJobError
from petra_science.document_worker import run_document_worker

REPOSITORY_ROOT = Path(__file__).parents[3]
CONTRACTS_ROOT = REPOSITORY_ROOT / "packages/contracts"
FIXTURE_ROOT = REPOSITORY_ROOT / "fixtures/full-text/fair-guiding-principles"


class RejectingParser:
    def parse(self, **_arguments: Any) -> Any:
        raise DocumentJobError(
            "CALIBRATION_PARSE_REJECTED",
            "The injected parser rejected this calibration job.",
        )


def test_parser_failure_emits_only_a_typed_failure_manifest(tmp_path: Path) -> None:
    output_root = tmp_path / "output"

    result = run_document_worker(
        contracts_root=CONTRACTS_ROOT,
        input_root=FIXTURE_ROOT,
        manifest_path=Path("records/worker-input-manifest.json"),
        bindings_path=Path("records/worker-input-bindings.json"),
        models_path=tmp_path / "unused-models",
        output_root=output_root,
        parser_factory=RejectingParser,
    )

    assert result == 1
    assert [path.name for path in output_root.iterdir()] == [
        "worker-output-manifest.json"
    ]
    manifest = json.loads(
        (output_root / "worker-output-manifest.json").read_text(encoding="utf-8")
    )
    assert manifest["content"]["outcome"] == {
        "outcome_kind": "worker_failed",
        "failure": {
            "code": "CALIBRATION_PARSE_REJECTED",
            "message": "The injected parser rejected this calibration job.",
            "retryable": False,
        },
        "produced_outputs": [],
    }
    assert manifest["content"]["network_activity"] == []
    assert manifest["content"]["resource_usage"]["network_bytes"] == 0
