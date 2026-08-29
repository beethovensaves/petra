import os
import socket
from urllib.parse import urlparse


def required(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise AssertionError(f"Missing {name}")
    return value


def assert_reachable(url: str) -> None:
    parsed = urlparse(url)
    if parsed.hostname is None or parsed.port is None:
        raise AssertionError(f"Expected an explicit host and port: {url}")
    assert parsed.hostname == "127.0.0.1"
    with socket.create_connection((parsed.hostname, parsed.port), timeout=3):
        pass


def test_disposable_service_ports_are_loopback_bound_and_reachable() -> None:
    assert_reachable(required("PETRA_TEST_POSTGRES_URL"))
    assert_reachable(required("PETRA_TEST_NEO4J_HTTP_URL"))
    assert_reachable(required("PETRA_TEST_NEO4J_BOLT_URL"))
    assert_reachable(required("PETRA_TEST_S3_URL"))


def test_controlled_failure_probe_is_disabled() -> None:
    assert os.environ.get("PETRA_DISC04_FORCE_FAILURE") != "1"
