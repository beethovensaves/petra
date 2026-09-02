"""Unit tests for deterministic Docling adapter behavior."""

from __future__ import annotations

from pathlib import Path

import pytest

from petra_science.docling_adapter import (
    _json_value,
    _reading_order_diagnostics,
    normalize_text,
    stable_id,
    verify_docling_models,
)
from petra_science.document_job import DocumentJobError


def test_stable_ids_are_deterministic_and_kind_scoped() -> None:
    first = stable_id("parsed_document", "immutable-parse-identity")

    assert first == stable_id("parsed_document", "immutable-parse-identity")
    assert first.startswith("parsed_document_")
    assert len(first.removeprefix("parsed_document_")) == 26
    assert first != stable_id("artifact", "immutable-parse-identity")


def test_normalization_is_explicit_and_does_not_guess_word_boundaries() -> None:
    normalized, transformations = normalize_text("Cafe\u0301 speci fi c")

    assert normalized == "Café speci fi c"
    assert transformations == ["unicode_nfc"]


def test_non_finite_native_metrics_become_strict_json_nulls() -> None:
    assert _json_value(float("nan")) is None
    assert _json_value(float("inf")) is None


def test_rejects_an_unavailable_model_directory(tmp_path: Path) -> None:
    with pytest.raises(DocumentJobError) as rejected:
        verify_docling_models(tmp_path / "absent")

    assert rejected.value.code == "DOCLING_MODELS_UNAVAILABLE"


def test_flags_nonmonotonic_geometry_inside_a_docling_group() -> None:
    native = {
        "groups": [
            {
                "self_ref": "#/groups/0",
                "children": [{"$ref": "#/texts/0"}, {"$ref": "#/texts/1"}],
            }
        ]
    }
    indexed = {
        "#/texts/0": {"prov": [{"page_no": 4, "bbox": {"t": 600.0}}]},
        "#/texts/1": {"prov": [{"page_no": 4, "bbox": {"t": 650.0}}]},
    }

    diagnostics = _reading_order_diagnostics(native, indexed)

    assert diagnostics == [
        {
            "code": "READING_ORDER_GEOMETRY_CONFLICT",
            "severity": "warning",
            "message": (
                "Docling group #/groups/0 orders #/texts/1 above its "
                "preceding item on page 4."
            ),
            "page_number": 4,
        }
    ]
