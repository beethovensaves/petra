"""Pinned Docling execution and Petra-owned document normalization."""

from __future__ import annotations

import gzip
import hashlib
import json
import math
import os
import re
import socket
import unicodedata
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import Enum
from importlib.metadata import version
from pathlib import Path
from typing import Any, cast
from unittest.mock import patch

from .document_job import DocumentJobError, canonical_hash

DOCLING_VERSION = "2.121.0"
ADAPTER_VERSION = "1.0.0"
NORMALIZATION_VERSION = "petra-text/1.0.0"
PARSER_THREADS = 4
COORDINATE_PRECISION = 4
MODEL_COMPONENTS = [
    {
        "name": "docling-layout-heron",
        "version": "8f39ad3c0b4c58e9c2d2c84a38465abf757272d8",
    },
    {
        "name": "tableformer-accurate",
        "version": "v2.3.0@fc0f2d45e2218ea24bce5045f58a389aed16dc23",
    },
]
MODEL_FILES = {
    "docling-project--docling-layout-heron/config.json": (
        "fdea30805ce2f5666b147fca941dcdd27ad468e27d6ed21902207d3da056a97d"
    ),
    "docling-project--docling-layout-heron/model.safetensors": (
        "00333a43451945aaf89db8ca9c0a17e75d1537c17db60fdb91aa95f4c7929e0c"
    ),
    "docling-project--docling-models/model_artifacts/tableformer/accurate/"
    "tm_config.json": (
        "984e122ceb8ccf84d84c9d2882f6f2302a44b4f1e577babd6289892c36f3cffd"
    ),
    "docling-project--docling-models/model_artifacts/tableformer/accurate/"
    "tableformer_accurate.safetensors": (
        "2a7d6c924b3cd12fb99a09280ca9c33a89c5d60b93253617d2e088c1a40374d9"
    ),
}
PARSER_RECIPE = {
    "recipe": "petra-docling-born-digital/1.0.0",
    "pipeline": "standard_pdf",
    "pdf_backend": "docling_parse",
    "layout_engine": "layout_object_detection",
    "table_structure_engine": "docling_tableformer",
    "table_mode": "accurate",
    "ocr": False,
    "force_full_page_ocr": False,
    "picture_classification": False,
    "picture_description": False,
    "chart_extraction": False,
    "code_enrichment": False,
    "formula_enrichment": False,
    "remote_services": False,
    "external_plugins": False,
    "accelerator": "cpu",
    "threads": PARSER_THREADS,
    "coordinate_precision": COORDINATE_PRECISION,
}
PARSER_CONFIGURATION_HASH = canonical_hash(
    {"recipe": PARSER_RECIPE, "component_models": MODEL_COMPONENTS}
)
_SPACED_LIGATURE = re.compile(
    r"(?:^|\s)(?:ffi|ffl|fi|fl|ff)\s+|\s(?:ffi|ffl|fi|fl|ff)\s"
)
_CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


@dataclass(frozen=True)
class DoclingParseProduct:
    """Staged parser output plus the portable Petra proposal."""

    native_output_gzip: bytes
    bundle: dict[str, Any]
    diagnostics: tuple[dict[str, Any], ...]


def _utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _sha256_text(value: str) -> str:
    return f"sha256:{hashlib.sha256(value.encode('utf-8')).hexdigest()}"


def _sha256_bytes(value: bytes) -> str:
    return f"sha256:{hashlib.sha256(value).hexdigest()}"


def _ulid_payload(seed: str) -> str:
    value = int.from_bytes(hashlib.sha256(seed.encode("utf-8")).digest()[:16], "big")
    encoded = ""
    for _ in range(26):
        encoded = _CROCKFORD[value & 31] + encoded
        value >>= 5
    return encoded


def stable_id(kind: str, seed: str) -> str:
    """Map immutable parse identity to a deterministic Petra ID."""

    return f"{kind}_{_ulid_payload(f'{kind}:{seed}')}"


def verify_docling_models(models_path: Path) -> Path:
    """Verify the exact local model assets before constructing Docling."""

    try:
        models = models_path.resolve(strict=True)
    except OSError as error:
        raise DocumentJobError(
            "DOCLING_MODELS_UNAVAILABLE",
            "The pinned local Docling model directory is unavailable.",
        ) from error
    for relative, expected in MODEL_FILES.items():
        path = models / relative
        digest = hashlib.sha256()
        try:
            with path.open("rb") as source:
                for chunk in iter(lambda: source.read(1024 * 1024), b""):
                    digest.update(chunk)
        except OSError as error:
            raise DocumentJobError(
                "DOCLING_MODELS_UNAVAILABLE",
                f"Pinned local Docling model asset {relative} is unavailable.",
            ) from error
        if digest.hexdigest() != expected:
            raise DocumentJobError(
                "DOCLING_MODEL_HASH_MISMATCH",
                f"Pinned local Docling model asset {relative} failed verification.",
            )
    return models


def _round_coordinate(value: float) -> float:
    rounded = round(float(value), COORDINATE_PRECISION)
    return max(0.0, rounded)


def normalize_text(value: str) -> tuple[str, list[str]]:
    """Apply lossless Unicode normalization without guessing word boundaries."""

    normalized = unicodedata.normalize("NFC", value)
    transformations: list[str] = []
    if normalized != value:
        transformations.append("unicode_nfc")
    return normalized, transformations


def _comparison_text(value: str) -> str:
    return "".join(character.casefold() for character in value if character.isalnum())


def _source_text_by_reference(
    source_path: Path, native_document: dict[str, Any]
) -> dict[str, str]:
    """Recover PDF embedded text only when Docling exposes split ligature tokens."""

    import pypdfium2 as pdfium  # type: ignore[import-untyped]  # noqa: PLC0415

    recovered: dict[str, str] = {}
    with pdfium.PdfDocument(source_path) as document:
        for item in native_document.get("texts", []):
            if not isinstance(item, dict):
                continue
            reference = item.get("self_ref")
            raw_text = item.get("text")
            provenance = item.get("prov")
            if (
                not isinstance(reference, str)
                or not isinstance(raw_text, str)
                or _SPACED_LIGATURE.search(raw_text) is None
                or not isinstance(provenance, list)
                or len(provenance) != 1
            ):
                continue
            location = provenance[0]
            box = location.get("bbox") if isinstance(location, dict) else None
            page_number = (
                location.get("page_no") if isinstance(location, dict) else None
            )
            if not isinstance(box, dict) or not isinstance(page_number, int):
                continue
            coordinates = [box.get(key) for key in ("l", "b", "r", "t")]
            if not all(isinstance(point, int | float) for point in coordinates):
                continue
            left, bottom, right, top = (
                float(cast(int | float, point)) for point in coordinates
            )
            page = document[page_number - 1]
            text_page = page.get_textpage()
            try:
                candidate = text_page.get_text_bounded(left, bottom, right, top)
            finally:
                text_page.close()
            candidate = " ".join(unicodedata.normalize("NFC", candidate).split())
            if candidate and _comparison_text(candidate) == _comparison_text(raw_text):
                recovered[reference] = candidate
    return recovered


@contextmanager
def _blocked_network() -> Iterator[None]:
    """Fail any socket attempt while Docling executes the offline job."""

    previous = {
        name: os.environ.get(name)
        for name in ("HF_HUB_OFFLINE", "TRANSFORMERS_OFFLINE")
    }
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"

    def deny_network(*_args: Any, **_kwargs: Any) -> None:
        raise DocumentJobError(
            "NETWORK_ATTEMPT_BLOCKED",
            "The local document worker attempted network access.",
        )

    try:
        with (
            patch.object(socket.socket, "connect", deny_network),
            patch.object(socket.socket, "connect_ex", deny_network),
            patch.object(socket, "create_connection", deny_network),
        ):
            yield
    finally:
        for name, value in previous.items():
            if value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = value


def _json_value(value: Any) -> Any:
    if value is None or isinstance(value, str | int | bool):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {str(key): _json_value(member) for key, member in value.items()}
    if isinstance(value, list | tuple):
        return [_json_value(member) for member in value]
    model_dump = getattr(value, "model_dump", None)
    if callable(model_dump):
        return _json_value(model_dump(mode="json", exclude_none=True))
    return str(value)


def _index_document(native_document: dict[str, Any]) -> dict[str, dict[str, Any]]:
    indexed: dict[str, dict[str, Any]] = {}
    for collection in ("texts", "tables", "pictures", "groups"):
        members = native_document.get(collection, [])
        if not isinstance(members, list):
            continue
        for member in members:
            if isinstance(member, dict) and isinstance(member.get("self_ref"), str):
                indexed[member["self_ref"]] = member
    return indexed


def _body_items(native_document: dict[str, Any]) -> list[dict[str, Any]]:
    indexed = _index_document(native_document)
    body = native_document.get("body")
    if not isinstance(body, dict):
        return []
    ordered: list[dict[str, Any]] = []
    active: set[str] = set()

    def walk(reference: str) -> None:
        if reference in active:
            raise DocumentJobError(
                "DOCLING_STRUCTURE_CYCLE",
                "Docling returned a cycle in the document hierarchy.",
            )
        item = indexed.get(reference)
        if item is None:
            return
        active.add(reference)
        if reference.startswith("#/groups/"):
            children = item.get("children", [])
            if isinstance(children, list):
                for child in children:
                    if isinstance(child, dict) and isinstance(child.get("$ref"), str):
                        walk(child["$ref"])
        else:
            ordered.append(item)
        active.remove(reference)

    children = body.get("children", [])
    if isinstance(children, list):
        for child in children:
            if isinstance(child, dict) and isinstance(child.get("$ref"), str):
                walk(child["$ref"])
    return ordered


def _page_map(native_document: dict[str, Any]) -> dict[int, dict[str, Any]]:
    pages = native_document.get("pages")
    if not isinstance(pages, dict):
        raise DocumentJobError(
            "DOCLING_PAGES_MISSING", "Docling did not return a PDF page map."
        )
    normalized: dict[int, dict[str, Any]] = {}
    for value in pages.values():
        if not isinstance(value, dict) or not isinstance(value.get("page_no"), int):
            continue
        size = value.get("size")
        if not isinstance(size, dict):
            continue
        width = size.get("width")
        height = size.get("height")
        if not isinstance(width, int | float) or not isinstance(height, int | float):
            continue
        normalized[value["page_no"]] = {
            "page_number": value["page_no"],
            "page_label": str(value["page_no"]),
            "width": _round_coordinate(width),
            "height": _round_coordinate(height),
            "unit": "pt",
            "coordinate_origin": "bottom_left",
            "text_layer_state": "present",
            "parse_state": "complete",
        }
    if not normalized:
        raise DocumentJobError(
            "DOCLING_PAGES_MISSING", "Docling returned no usable PDF page geometry."
        )
    return normalized


def _locations(
    item: dict[str, Any], pages: dict[int, dict[str, Any]]
) -> list[dict[str, Any]]:
    by_page: dict[int, list[dict[str, Any]]] = {}
    provenance = item.get("prov", [])
    if not isinstance(provenance, list):
        return []
    for value in provenance:
        if not isinstance(value, dict) or not isinstance(value.get("page_no"), int):
            continue
        page_number = value["page_no"]
        page = pages.get(page_number)
        box = value.get("bbox")
        if page is None or not isinstance(box, dict):
            continue
        coordinates = [box.get(key) for key in ("l", "t", "r", "b")]
        if not all(isinstance(point, int | float) for point in coordinates):
            continue
        left, top, right, bottom = (
            float(cast(int | float, point)) for point in coordinates
        )
        x = min(max(0.0, left), page["width"])
        y = min(max(0.0, bottom), page["height"])
        width = min(max(0.0, right - left), page["width"] - x)
        height = min(max(0.0, top - bottom), page["height"] - y)
        if width <= 0 or height <= 0:
            continue
        by_page.setdefault(page_number, []).append(
            {
                "x": _round_coordinate(x),
                "y": _round_coordinate(y),
                "width": _round_coordinate(width),
                "height": _round_coordinate(height),
            }
        )
    return [
        {"page_number": page_number, "bounding_boxes": boxes}
        for page_number, boxes in sorted(by_page.items())
    ]


def _reading_order_diagnostics(
    native_document: dict[str, Any], indexed: dict[str, dict[str, Any]]
) -> list[dict[str, Any]]:
    diagnostics: list[dict[str, Any]] = []
    groups = native_document.get("groups", [])
    if not isinstance(groups, list):
        return diagnostics
    for group in groups:
        if not isinstance(group, dict) or not isinstance(group.get("children"), list):
            continue
        previous: tuple[int, float] | None = None
        for child in group["children"]:
            reference = child.get("$ref") if isinstance(child, dict) else None
            item = indexed.get(reference) if isinstance(reference, str) else None
            provenance = item.get("prov", []) if isinstance(item, dict) else []
            first = (
                provenance[0] if isinstance(provenance, list) and provenance else None
            )
            box = first.get("bbox") if isinstance(first, dict) else None
            page = first.get("page_no") if isinstance(first, dict) else None
            top = box.get("t") if isinstance(box, dict) else None
            if not isinstance(page, int) or not isinstance(top, int | float):
                continue
            current = (page, float(top))
            if (
                previous is not None
                and current[0] == previous[0]
                and current[1] > previous[1] + 0.5
            ):
                diagnostics.append(
                    {
                        "code": "READING_ORDER_GEOMETRY_CONFLICT",
                        "severity": "warning",
                        "message": (
                            f"Docling group {group.get('self_ref', 'unknown')} orders "
                            f"{reference} above its preceding item on page {page}."
                        ),
                        "page_number": page,
                    }
                )
                break
            previous = current
    return diagnostics


def _block_kind(label: str) -> str:
    return {
        "title": "document_title",
        "section_header": "heading",
        "paragraph": "paragraph",
        "text": "paragraph",
        "list": "list",
        "list_item": "list_item",
        "footnote": "footnote",
        "reference": "reference",
        "formula": "formula",
        "table": "table",
        "caption": "caption",
        "code": "code_block",
        "picture": "figure",
    }.get(label, "other")


def _item_text(item: dict[str, Any]) -> str | None:
    text = item.get("text")
    if isinstance(text, str) and text.strip():
        return text
    data = item.get("data")
    cells = data.get("table_cells") if isinstance(data, dict) else None
    if isinstance(cells, list):
        values = [
            cell.get("text", "")
            for cell in cells
            if isinstance(cell, dict) and isinstance(cell.get("text"), str)
        ]
        combined = "\n".join(value for value in values if value)
        return combined or None
    return None


def _native_export(result: Any, document: dict[str, Any]) -> bytes:
    envelope = {
        "export_schema": "petra.docling-native-export",
        "export_version": "1.0.0",
        "docling_version": DOCLING_VERSION,
        "conversion": {
            "status": _json_value(result.status),
            "errors": _json_value(result.errors),
            "confidence": _json_value(result.confidence),
            "timings": _json_value(result.timings),
        },
        "document": document,
    }
    serialized = json.dumps(
        envelope,
        allow_nan=False,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return gzip.compress(serialized, compresslevel=9, mtime=0)


def _normalize_document(
    *,
    result: Any,
    native_document: dict[str, Any],
    native_output: bytes,
    source_artifact: dict[str, Any],
    source_artifact_manifest: dict[str, Any],
    rights_decision: dict[str, Any],
    work_version: dict[str, Any],
    source_text_by_reference: dict[str, str],
    created_by: dict[str, str],
    started_at: str,
    completed_at: str,
) -> DoclingParseProduct:
    pages = _page_map(native_document)
    indexed = _index_document(native_document)
    diagnostics = _reading_order_diagnostics(native_document, indexed)
    status = getattr(result.status, "value", str(result.status)).lower()
    for error in result.errors:
        diagnostics.append(
            {
                "code": "DOCLING_CONVERSION_DIAGNOSTIC",
                "severity": "error" if "failure" in status else "warning",
                "message": str(error)[:4000],
            }
        )
    expected_pages = list(range(1, max(pages) + 1))
    if sorted(pages) != expected_pages:
        diagnostics.append(
            {
                "code": "MISSING_PAGE_GEOMETRY",
                "severity": "error",
                "message": "The parsed PDF page map is not contiguous from page 1.",
            }
        )
    if native_document.get("pictures") and any(
        isinstance(picture, dict) and not picture.get("caption")
        for picture in native_document["pictures"]
    ):
        diagnostics.append(
            {
                "code": "FIGURE_CAPTION_UNRESOLVED",
                "severity": "warning",
                "message": (
                    "At least one detected figure has no resolved caption association."
                ),
            }
        )

    parse_seed = (
        f"{source_artifact['content_hash']}|{PARSER_CONFIGURATION_HASH}|"
        f"docling/{DOCLING_VERSION}|adapter/{ADAPTER_VERSION}"
    )
    parser_run_id = stable_id("parser_run", parse_seed)
    parsed_document_id = stable_id("parsed_document", parse_seed)
    parser_output_artifact_id = stable_id("artifact", _sha256_bytes(native_output))
    bundle_id = stable_id("document_parse_bundle", parse_seed)
    headings: list[str] = []
    candidates: list[dict[str, Any]] = []

    for item in _body_items(native_document):
        if item.get("content_layer") == "furniture":
            continue
        label = str(item.get("label", "other"))
        text = _item_text(item)
        locations = _locations(item, pages)
        if not locations:
            diagnostics.append(
                {
                    "code": "BLOCK_WITHOUT_PAGE_GEOMETRY",
                    "severity": "warning",
                    "message": (
                        f"Docling item {item.get('self_ref', 'unknown')} was omitted "
                        "because it has no usable PDF geometry."
                    ),
                }
            )
            continue
        if len(locations) > 1:
            diagnostics.append(
                {
                    "code": "MULTIPAGE_BLOCK_UNRESOLVED",
                    "severity": "warning",
                    "message": (
                        "Docling item "
                        f"{item.get('self_ref', 'unknown')} spans multiple "
                        "pages and was omitted from automatic SourceSpan generation."
                    ),
                }
            )
            continue
        transformations: list[str] = []
        if text is not None:
            recovered_text = source_text_by_reference.get(str(item.get("self_ref")))
            if recovered_text is not None:
                text = recovered_text
                transformations.append(
                    "recover_split_ligatures_from_geometry_bounded_pdf_text"
                )
            text, normalization_transformations = normalize_text(text)
            transformations.extend(normalization_transformations)
        if label == "section_header" and text is not None:
            level = item.get("level", 1)
            heading_level = level if isinstance(level, int) and level > 0 else 1
            headings = headings[: heading_level - 1]
            headings.append(text[:500])
            structural_path = list(headings)
        else:
            structural_path = [*headings, f"{_block_kind(label)} {len(candidates) + 1}"]
        structural_path = [segment[:500] for segment in structural_path[-100:]]
        content: dict[str, Any]
        if text is not None:
            content = {
                "content_kind": "text",
                "text": text,
                "content_hash": _sha256_text(text),
            }
        elif label == "picture":
            content = {"content_kind": "visual_only"}
        else:
            continue
        identity_material = json.dumps(
            {
                "self_ref": item.get("self_ref"),
                "label": label,
                "content": content,
                "locations": locations,
                "path": structural_path,
            },
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        block_id = stable_id("structural_block", f"{parse_seed}|{identity_material}")
        first_location = locations[0]
        page = pages[first_location["page_number"]]
        page_component = {
            "component_kind": "page_region",
            "page_region": {
                "page_number": first_location["page_number"],
                "page_width": page["width"],
                "page_height": page["height"],
                "unit": "pt",
                "coordinate_origin": "bottom_left",
                "regions": [
                    {"region_kind": "bounding_box", **box}
                    for box in first_location["bounding_boxes"]
                ],
            },
        }
        components: list[dict[str, Any]] = [page_component]
        if text is not None:
            components.append(
                {
                    "component_kind": "text_quote",
                    "quote": {
                        "exact_text": text,
                        "selected_text_hash": _sha256_text(text),
                        "start_codepoint": 0,
                        "end_codepoint": len(text),
                        "normalization_version": NORMALIZATION_VERSION,
                    },
                }
            )
        components.append(
            {
                "component_kind": "section_path",
                "section_path": {"segments": structural_path},
            }
        )
        selector_identity = json.dumps(
            components, sort_keys=True, separators=(",", ":")
        )
        span_id = stable_id("source_span", f"{block_id}|{selector_identity}")
        candidates.append(
            {
                "block_id": block_id,
                "span_id": span_id,
                "label": label,
                "path": structural_path,
                "locations": locations,
                "content": content,
                "components": components,
                "transformations": transformations,
            }
        )

    if not candidates:
        raise DocumentJobError(
            "DOCLING_NO_GROUNDED_BLOCKS",
            "Docling returned no content with usable source geometry.",
        )

    blocks: list[dict[str, Any]] = []
    spans: list[dict[str, Any]] = []
    for index, candidate in enumerate(candidates):
        block: dict[str, Any] = {
            "schema_name": "petra.structural-block",
            "schema_version": "1.0.0",
            "structural_block_id": candidate["block_id"],
            "revision": 1,
            "parsed_document_id": parsed_document_id,
            "block_kind": _block_kind(candidate["label"]),
            "content_layer": "source_native",
            "reading_order": index,
            "structural_path": candidate["path"],
            "child_block_ids": [],
            "page_locations": candidate["locations"],
            "content": candidate["content"],
            "source_span_ids": [candidate["span_id"]],
            "created_at": completed_at,
        }
        if index > 0:
            block["previous_block_id"] = candidates[index - 1]["block_id"]
        if index + 1 < len(candidates):
            block["next_block_id"] = candidates[index + 1]["block_id"]
        blocks.append(block)
        is_text = candidate["content"]["content_kind"] == "text"
        spans.append(
            {
                "schema_name": "petra.source-span",
                "schema_version": "1.0.0",
                "source_span_id": candidate["span_id"],
                "revision": 1,
                "artifact_id": source_artifact["artifact_id"],
                "artifact_content_hash": source_artifact["content_hash"],
                "parsed_document_id": parsed_document_id,
                "parser_run_id": parser_run_id,
                "structural_block_id": candidate["block_id"],
                "selector_schema_version": "1.0.0",
                "selector": {
                    "selector_type": "compound",
                    "components": candidate["components"],
                },
                "extraction": {
                    "method": "embedded_text" if is_text else "visual_region",
                    "method_version": f"docling/{DOCLING_VERSION}",
                    "normalization_version": NORMALIZATION_VERSION,
                },
                "verification": {
                    "status": (
                        "normalized"
                        if candidate["transformations"]
                        else "exact_text_and_geometry"
                        if is_text
                        else "visual_only"
                    ),
                    "verified_at": completed_at,
                    "transformations": candidate["transformations"],
                },
                "created_by": created_by,
                "created_at": completed_at,
            }
        )

    quality_state = (
        "partial"
        if diagnostics or status not in {"success", "conversionstatus.success"}
        else "complete"
    )
    for diagnostic in diagnostics:
        page_number = diagnostic.get("page_number")
        if isinstance(page_number, int) and page_number in pages:
            pages[page_number]["parse_state"] = "partial"
    document = {
        "schema_name": "petra.parsed-document",
        "schema_version": "1.0.0",
        "parsed_document_id": parsed_document_id,
        "revision": 1,
        "source_artifact_id": source_artifact["artifact_id"],
        "source_artifact_content_hash": source_artifact["content_hash"],
        "parser_output_artifact_id": parser_output_artifact_id,
        "work_version_id": work_version["work_version_id"],
        "parser_run_id": parser_run_id,
        "source_format": "pdf",
        "document_language": "en",
        "adapter": {"name": "petra-docling-adapter", "version": ADAPTER_VERSION},
        "normalization_version": NORMALIZATION_VERSION,
        "parser_provenance": {
            "parser": {"name": "docling", "version": DOCLING_VERSION},
            "configuration_hash": PARSER_CONFIGURATION_HASH,
            "component_models": MODEL_COMPONENTS,
            "started_at": started_at,
            "completed_at": completed_at,
        },
        "quality_state": quality_state,
        "pages": [pages[number] for number in sorted(pages)],
        "block_ids": [candidate["block_id"] for candidate in candidates],
        "diagnostics": diagnostics,
        "created_by": created_by,
        "created_at": completed_at,
    }
    bundle = {
        "schema_name": "petra.document-parse-bundle",
        "schema_version": "1.0.0",
        "document_parse_bundle_id": bundle_id,
        "revision": 1,
        "source_artifact_manifest_id": source_artifact_manifest["artifact_manifest_id"],
        "rights_decision_id": rights_decision["rights_decision_id"],
        "source_scope": "full_text",
        "document": document,
        "blocks": blocks,
        "spans": spans,
        "diagnostics": diagnostics,
        "created_at": completed_at,
    }
    return DoclingParseProduct(native_output, bundle, tuple(diagnostics))


class DoclingDocumentParser:
    """The one M1.4 Docling recipe behind Petra's worker-owned adapter."""

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
    ) -> DoclingParseProduct:
        if version("docling") != DOCLING_VERSION:
            raise DocumentJobError(
                "DOCLING_VERSION_MISMATCH",
                f"Expected Docling {DOCLING_VERSION}; found {version('docling')}.",
            )
        models = verify_docling_models(models_path)
        started_at = _utc_now()
        from docling.datamodel.accelerator_options import (  # noqa: PLC0415
            AcceleratorDevice,
            AcceleratorOptions,
        )
        from docling.datamodel.base_models import InputFormat  # noqa: PLC0415
        from docling.datamodel.pipeline_options import (  # noqa: PLC0415
            PdfPipelineOptions,
            TableFormerMode,
            TableStructureOptions,
        )
        from docling.document_converter import (  # noqa: PLC0415
            DocumentConverter,
            PdfFormatOption,
        )

        options = PdfPipelineOptions(
            document_timeout=timeout_seconds,
            accelerator_options=AcceleratorOptions(
                num_threads=PARSER_THREADS,
                device=AcceleratorDevice.CPU,
            ),
            enable_remote_services=False,
            allow_external_plugins=False,
            artifacts_path=models,
            do_picture_classification=False,
            do_picture_description=False,
            do_chart_extraction=False,
            generate_page_images=False,
            generate_picture_images=False,
            generate_table_images=False,
            do_table_structure=True,
            table_structure_options=TableStructureOptions(
                mode=TableFormerMode.ACCURATE
            ),
            do_ocr=False,
            do_code_enrichment=False,
            do_formula_enrichment=False,
        )
        converter = DocumentConverter(
            allowed_formats=[InputFormat.PDF],
            format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=options)},
        )
        try:
            with _blocked_network():
                result = converter.convert(
                    source_path,
                    raises_on_error=False,
                    max_num_pages=10000,
                    max_file_size=source_artifact["byte_size"],
                )
        except DocumentJobError:
            raise
        except Exception as error:
            raise DocumentJobError(
                "DOCLING_CONVERSION_FAILED",
                "Docling could not convert the manifested PDF.",
            ) from error
        status = getattr(result.status, "value", str(result.status)).lower()
        if "failure" in status:
            raise DocumentJobError(
                "DOCLING_CONVERSION_FAILED",
                "Docling could not convert the manifested PDF.",
            )
        native_document = result.document.export_to_dict(
            mode="json", by_alias=True, exclude_none=True
        )
        native_output = _native_export(result, native_document)
        source_text_by_reference = _source_text_by_reference(
            source_path, native_document
        )
        completed_at = _utc_now()
        return _normalize_document(
            result=result,
            native_document=native_document,
            native_output=native_output,
            source_artifact=source_artifact,
            source_artifact_manifest=source_artifact_manifest,
            rights_decision=rights_decision,
            work_version=work_version,
            source_text_by_reference=source_text_by_reference,
            created_by=created_by,
            started_at=started_at,
            completed_at=completed_at,
        )
