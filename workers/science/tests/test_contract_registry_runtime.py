from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import pytest

from petra_science import (
    ContractRegistryError,
    PetraContractRegistry,
    assert_portable_schema,
)

PETRA_ROOT = Path(__file__).resolve().parents[3]
CONTRACTS_ROOT = PETRA_ROOT / "packages" / "contracts"


def read_json(relative_path: str) -> Any:
    with (CONTRACTS_ROOT / relative_path).open(encoding="utf-8") as source:
        return json.load(source)


def test_runtime_registry_enforces_shared_fixtures_without_mutation() -> None:
    registry = PetraContractRegistry(CONTRACTS_ROOT)
    manifest = read_json("fixtures/manifest.json")

    for fixture in manifest["accepted"]:
        value = read_json(fixture["path"])
        before = json.loads(json.dumps(value))
        registry.assert_valid(fixture["schema"], "1.0.0", value)
        assert value == before
    for fixture in manifest["rejected"]:
        assert not registry.is_valid(
            fixture["schema"], "1.0.0", read_json(fixture["path"])
        )


def test_runtime_registry_rejects_non_finite_numbers() -> None:
    registry = PetraContractRegistry(CONTRACTS_ROOT)
    accepted = read_json("fixtures/accepted/contract-smoke.json")

    for sequence in [math.nan, math.inf, -math.inf]:
        value = {**accepted, "sequence": sequence}
        assert not registry.is_valid("contract-smoke", "1.0.0", value)
        with pytest.raises(ContractRegistryError) as error:
            registry.assert_valid("contract-smoke", "1.0.0", value)
        assert error.value.code == "CONTRACT_VALUE_INVALID"


def test_profile_allows_only_registered_formats_and_local_refs() -> None:
    schema_id = "https://petra.local/schemas/profile-test/1.0.0/schema.json"
    base = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": schema_id,
        "title": "ProfileTest",
        "type": "string",
    }
    assert_portable_schema({**base, "format": "date"}, frozenset({schema_id}))

    with pytest.raises(ContractRegistryError) as format_error:
        assert_portable_schema(
            {**base, "format": "petra-unregistered"}, frozenset({schema_id})
        )
    assert format_error.value.code == "CONTRACT_SCHEMA_PROFILE_INVALID"

    with pytest.raises(ContractRegistryError) as reference_error:
        assert_portable_schema(
            {**base, "$ref": "https://example.org/remote-schema.json"},
            frozenset({schema_id}),
        )
    assert reference_error.value.code == "CONTRACT_SCHEMA_PROFILE_INVALID"


def test_unsupported_version_transition_is_explicitly_rejected() -> None:
    registry = PetraContractRegistry(CONTRACTS_ROOT)
    manifest = read_json("fixtures/manifest.json")
    transition = read_json(manifest["version_transitions"][0]["path"])
    source = read_json(transition["source_fixture_path"])

    assert transition["strategy"] == "reject"
    registry.assert_valid(transition["schema_name"], transition["from_version"], source)
    assert not registry.is_valid(
        transition["schema_name"],
        transition["from_version"],
        transition["target_payload"],
    )
    assert not registry.has(transition["schema_name"], transition["to_version"])
    with pytest.raises(ContractRegistryError) as error:
        registry.assert_valid(
            transition["schema_name"],
            transition["to_version"],
            transition["target_payload"],
        )
    assert error.value.code == transition["expected_error"]
