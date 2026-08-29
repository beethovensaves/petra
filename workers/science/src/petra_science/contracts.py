"""Strict access to Petra's repository-owned cross-runtime contracts."""

from __future__ import annotations

import hashlib
import json
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any, NoReturn
from urllib.parse import urldefrag, urljoin

import rfc8785
from jsonschema import Draft202012Validator, FormatChecker, ValidationError
from referencing import Registry, Resource

PETRA_FORMAT_ALLOWLIST = frozenset({"date", "date-time", "uri"})
DRAFT_2020_12 = "https://json-schema.org/draft/2020-12/schema"


class ContractRegistryError(ValueError):
    """A typed canonical-registry or boundary-validation failure."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class ContractRegistryEntry:
    """One immutable schema identity from Petra's registry."""

    name: str
    version: str
    schema_id: str
    path: str
    canonical_sha256: str


def _fail(code: str, message: str) -> NoReturn:
    raise ContractRegistryError(code, message)


def _read_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as source:
        return json.load(source)


def _schema_objects(value: Any) -> Iterator[dict[str, Any]]:
    if isinstance(value, list):
        for member in value:
            yield from _schema_objects(member)
    elif isinstance(value, dict):
        yield value
        for member in value.values():
            yield from _schema_objects(member)


def schema_digest(schema: Any) -> str:
    """Return Petra's RFC 8785 SHA-256 identity for a schema."""

    digest = hashlib.sha256(rfc8785.dumps(schema)).hexdigest()
    return f"sha256:{digest}"


def assert_portable_schema(schema: Any, registered_ids: frozenset[str]) -> None:
    """Enforce Petra's local-reference and format-allowlist profile."""

    if not isinstance(schema, dict):
        _fail(
            "CONTRACT_SCHEMA_PROFILE_INVALID",
            "A canonical Petra schema must be a JSON object.",
        )
    schema_id = schema.get("$id")
    if (
        schema.get("$schema") != DRAFT_2020_12
        or not isinstance(schema_id, str)
        or not isinstance(schema.get("title"), str)
        or not schema["title"]
    ):
        _fail(
            "CONTRACT_SCHEMA_PROFILE_INVALID",
            "A canonical Petra schema must declare Draft 2020-12, an immutable "
            "$id, and a title.",
        )
    for member in _schema_objects(schema):
        if "format" in member:
            schema_format = member["format"]
            if isinstance(schema_format, str) and (
                schema_format not in PETRA_FORMAT_ALLOWLIST
            ):
                _fail(
                    "CONTRACT_SCHEMA_PROFILE_INVALID",
                    f"Schema {schema_id} uses unregistered format {schema_format}.",
                )
        if "$ref" in member:
            reference = member["$ref"]
            if not isinstance(reference, str):
                continue
            target_id = urldefrag(urljoin(schema_id, reference)).url
            if target_id not in registered_ids:
                _fail(
                    "CONTRACT_SCHEMA_PROFILE_INVALID",
                    f"Schema {schema_id} resolves $ref {reference} outside the local "
                    "Petra registry.",
                )


class PetraContractRegistry:
    """Loads, audits, and validates the exact versioned Petra contract set."""

    def __init__(self, contracts_root: Path) -> None:
        registry = _read_json(contracts_root / "registry.json")
        if (
            not isinstance(registry, dict)
            or not isinstance(registry.get("registry_version"), str)
            or not isinstance(registry.get("schemas"), list)
        ):
            _fail(
                "CONTRACT_REGISTRY_INVALID",
                "The Petra schema registry has an invalid root shape.",
            )
        raw_entries = registry["schemas"]
        schema_ids = [entry.get("$id") for entry in raw_entries]
        if any(not isinstance(schema_id, str) for schema_id in schema_ids) or len(
            set(schema_ids)
        ) != len(schema_ids):
            _fail(
                "CONTRACT_REGISTRY_INVALID",
                "Canonical schema $ids must be present and unique.",
            )
        registered_ids = frozenset(schema_ids)
        loaded: list[tuple[ContractRegistryEntry, dict[str, Any]]] = []
        entries: dict[tuple[str, str], ContractRegistryEntry] = {}
        for raw_entry in raw_entries:
            try:
                entry = ContractRegistryEntry(
                    name=raw_entry["name"],
                    version=raw_entry["version"],
                    schema_id=raw_entry["$id"],
                    path=raw_entry["path"],
                    canonical_sha256=raw_entry["canonical_sha256"],
                )
            except (KeyError, TypeError) as error:
                raise ContractRegistryError(
                    "CONTRACT_REGISTRY_INVALID",
                    "A Petra schema registry entry is incomplete.",
                ) from error
            key = (entry.name, entry.version)
            if key in entries:
                _fail(
                    "CONTRACT_REGISTRY_INVALID",
                    "Duplicate canonical schema identity "
                    f"{entry.name}@{entry.version}.",
                )
            schema = _read_json(contracts_root / entry.path)
            assert_portable_schema(schema, registered_ids)
            Draft202012Validator.check_schema(schema)
            if (
                schema["$id"] != entry.schema_id
                or schema_digest(schema) != entry.canonical_sha256
            ):
                _fail(
                    "CONTRACT_REGISTRY_INVALID",
                    f"Canonical schema {entry.name}@{entry.version} does not match "
                    "its accepted registry identity.",
                )
            entries[key] = entry
            loaded.append((entry, schema))

        resource_registry = Registry().with_resources(
            [
                (entry.schema_id, Resource.from_contents(schema))
                for entry, schema in loaded
            ]
        )
        self._entries = entries
        self._validators = {
            (entry.name, entry.version): Draft202012Validator(
                schema,
                registry=resource_registry,
                format_checker=FormatChecker(),
            )
            for entry, schema in loaded
        }

    @property
    def entries(self) -> tuple[ContractRegistryEntry, ...]:
        return tuple(self._entries.values())

    def has(self, name: str, version: str) -> bool:
        return (name, version) in self._entries

    def validator(self, name: str, version: str) -> Draft202012Validator:
        validator = self._validators.get((name, version))
        if validator is None:
            _fail(
                "CONTRACT_SCHEMA_NOT_REGISTERED",
                f"Contract {name}@{version} is not registered.",
            )
        return validator

    def is_valid(self, name: str, version: str, value: Any) -> bool:
        return self.validator(name, version).is_valid(value)

    def assert_valid(self, name: str, version: str, value: Any) -> None:
        try:
            self.validator(name, version).validate(value)
        except ValidationError as error:
            raise ContractRegistryError(
                "CONTRACT_VALUE_INVALID",
                f"Value does not satisfy {name}@{version}: {error.message}",
            ) from error
