"""Petra's bounded scientific worker package."""

from .contracts import (
    PETRA_FORMAT_ALLOWLIST,
    ContractRegistryEntry,
    ContractRegistryError,
    PetraContractRegistry,
    assert_portable_schema,
    schema_digest,
)
from .document_job import DocumentJobError

WORKER_BOUNDARY = "petra-science"

__all__ = [
    "PETRA_FORMAT_ALLOWLIST",
    "WORKER_BOUNDARY",
    "ContractRegistryEntry",
    "ContractRegistryError",
    "DocumentJobError",
    "PetraContractRegistry",
    "assert_portable_schema",
    "schema_digest",
]
