import loadtest
import pytest


@pytest.mark.parametrize(
    ("server_version", "expected"),
    [
        ("0.19.4", "0.19.4"),
        ("0.19.9", "0.19.4"),
        ("0.20.0", "0.20.0b1"),
        ("0.17.0", "0.18.4"),
    ],
)
def test_har_fallback_is_newest_not_newer_than_server(
    tmp_path, monkeypatch, server_version, expected
):
    monkeypatch.setattr(loadtest, "HAR_FILES_DIR", str(tmp_path))
    for version in ("0.18.4", "0.19.4", "0.20.0b1", "0.21.0"):
        (tmp_path / f"lesson_flow_kolibri_{version}.har").write_text("{}")
    assert loadtest._find_har_file(server_version) == str(
        tmp_path / f"lesson_flow_kolibri_{expected}.har"
    )
