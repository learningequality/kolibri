"""Tests for cdp_helper.py."""

import asyncio
import json
import os
import subprocess
from unittest import mock

import pytest

from scripts import cdp_helper

# ── get_ws_url ──────────────────────────────────────────────────────────


FAKE_UNIX_OUTPUT = """\
Num       RefCount Protocol Flags    Type St Inode Path
0000000000000000: 00000002 00000000 00010000 0001 01 12345 @webview_devtools_remote_1234
"""

FAKE_PAGE_JSON = json.dumps(
    [{"webSocketDebuggerUrl": "ws://localhost:9222/devtools/page/ABC"}]
).encode()


def _mock_urlopen(data=FAKE_PAGE_JSON):
    """Create a mock for urllib.request.urlopen that acts as a context manager."""
    resp = mock.Mock()
    resp.read.return_value = data
    cm = mock.MagicMock()
    cm.__enter__.return_value = resp
    return cm


FAKE_UNIX_OUTPUT_MALFORMED = """\
Num       RefCount Protocol Flags    Type St Inode Path
0000000000000000: 00000002 00000000 00010000 0001 01 11111 webview_devtools_remote_bad
0000000000000000: 00000002 00000000 00010000 0001 01 12345 @webview_devtools_remote_1234
"""


def test_get_ws_url_happy_path():
    """get_ws_url returns the WebSocket URL from the first page."""
    with (
        mock.patch("subprocess.check_output", return_value=FAKE_UNIX_OUTPUT),
        mock.patch("subprocess.run") as mock_run,
        mock.patch("urllib.request.urlopen", return_value=_mock_urlopen()),
    ):
        url = cdp_helper.get_ws_url()

    assert url == "ws://localhost:9222/devtools/page/ABC"
    mock_run.assert_called_once()
    assert mock_run.call_args[1].get("check") is True


def test_get_ws_url_adb_forward_failure():
    """get_ws_url propagates CalledProcessError from adb forward."""
    with (
        mock.patch("subprocess.check_output", return_value=FAKE_UNIX_OUTPUT),
        mock.patch(
            "subprocess.run",
            side_effect=subprocess.CalledProcessError(1, "adb"),
        ),
    ):
        with pytest.raises(subprocess.CalledProcessError):
            cdp_helper.get_ws_url()


def test_get_ws_url_configurable_port():
    """get_ws_url respects CDP_PORT env var."""
    with (
        mock.patch("subprocess.check_output", return_value=FAKE_UNIX_OUTPUT),
        mock.patch("subprocess.run") as mock_run,
        mock.patch(
            "urllib.request.urlopen", return_value=_mock_urlopen()
        ) as mock_urlopen,
        mock.patch.dict(os.environ, {"CDP_PORT": "9333"}),
    ):
        cdp_helper.get_ws_url()

    fwd_cmd = mock_run.call_args[0][0]
    assert "tcp:9333" in fwd_cmd
    mock_urlopen.assert_called_once_with("http://localhost:9333/json")


def test_get_ws_url_skips_malformed_socket_line():
    """get_ws_url skips lines with no @ and uses the valid one."""
    with (
        mock.patch(
            "subprocess.check_output", return_value=FAKE_UNIX_OUTPUT_MALFORMED
        ),
        mock.patch("subprocess.run"),
        mock.patch("urllib.request.urlopen", return_value=_mock_urlopen()),
    ):
        url = cdp_helper.get_ws_url()

    assert url == "ws://localhost:9222/devtools/page/ABC"


def test_get_ws_url_empty_pages():
    """get_ws_url exits when /json returns an empty list."""
    with (
        mock.patch("subprocess.check_output", return_value=FAKE_UNIX_OUTPUT),
        mock.patch("subprocess.run"),
        mock.patch(
            "urllib.request.urlopen",
            return_value=_mock_urlopen(data=json.dumps([]).encode()),
        ),
    ):
        with pytest.raises(SystemExit):
            cdp_helper.get_ws_url()


def test_get_ws_url_missing_ws_debugger_url():
    """get_ws_url exits when page entry lacks webSocketDebuggerUrl."""
    page_no_ws = json.dumps(
        [{"title": "Kolibri", "url": "http://localhost"}]
    ).encode()
    with (
        mock.patch("subprocess.check_output", return_value=FAKE_UNIX_OUTPUT),
        mock.patch("subprocess.run"),
        mock.patch(
            "urllib.request.urlopen",
            return_value=_mock_urlopen(data=page_no_ws),
        ),
    ):
        with pytest.raises(SystemExit):
            cdp_helper.get_ws_url()


# ── run_js ──────────────────────────────────────────────────────────────


def _make_ws_mock(cdp_response):
    """Create a mock websocket connection returning the given CDP response."""
    mock_ws = mock.AsyncMock()
    mock_ws.recv.return_value = cdp_response
    mock_connect = mock.AsyncMock()
    mock_connect.__aenter__.return_value = mock_ws
    return mock_connect


def test_run_js_returns_value():
    """run_js returns the value from a successful CDP response."""
    cdp_response = json.dumps(
        {"id": 1, "result": {"result": {"type": "string", "value": "hello"}}}
    )
    with mock.patch(
        "websockets.connect", return_value=_make_ws_mock(cdp_response)
    ):
        result = asyncio.run(cdp_helper.run_js("ws://fake", "1+1"))

    assert result == "hello"


def test_run_js_returns_none_for_undefined():
    """run_js returns None when the result type is undefined."""
    cdp_response = json.dumps(
        {"id": 1, "result": {"result": {"type": "undefined"}}}
    )
    with mock.patch(
        "websockets.connect", return_value=_make_ws_mock(cdp_response)
    ):
        result = asyncio.run(cdp_helper.run_js("ws://fake", "void 0"))

    assert result is None


def test_run_js_handles_exception_details(capsys):
    """run_js returns None and prints error when CDP reports exceptionDetails."""
    cdp_response = json.dumps(
        {
            "id": 1,
            "result": {
                "result": {"type": "object", "subtype": "error"},
                "exceptionDetails": {
                    "text": "Uncaught ReferenceError: foo is not defined"
                },
            },
        }
    )
    with mock.patch(
        "websockets.connect", return_value=_make_ws_mock(cdp_response)
    ):
        result = asyncio.run(cdp_helper.run_js("ws://fake", "foo"))

    assert result is None
    captured = capsys.readouterr()
    assert "exception" in captured.err.lower()


# ── dump_elements ───────────────────────────────────────────────────────


def test_dump_elements_none_guard(capsys):
    """dump_elements prints error and doesn't crash when run_js returns None."""
    with mock.patch("scripts.cdp_helper.asyncio") as mock_asyncio:
        mock_asyncio.run.return_value = None
        cdp_helper.dump_elements("ws://fake")

    captured = capsys.readouterr()
    assert "error" in captured.err.lower()


def test_dump_elements_prints_elements(capsys):
    """dump_elements prints each element as a JSON line."""
    elements = [
        {"tag": "button", "text": "OK"},
        {"tag": "a", "text": "Link", "id": "link1"},
    ]
    with mock.patch("scripts.cdp_helper.asyncio") as mock_asyncio:
        mock_asyncio.run.return_value = json.dumps(elements)
        cdp_helper.dump_elements("ws://fake")

    captured = capsys.readouterr()
    lines = captured.out.strip().split("\n")
    assert len(lines) == 2
    assert json.loads(lines[0]) == {"tag": "button", "text": "OK"}


# ── click_by_text ───────────────────────────────────────────────────────


def test_click_by_text_escapes_special_chars():
    """click_by_text properly escapes quotes, backslashes, and newlines."""
    captured_args = []

    async def fake_run_js(_ws_url, js):
        captured_args.append(js)
        return "clicked"

    with mock.patch.object(cdp_helper, "run_js", fake_run_js):
        cdp_helper.click_by_text("ws://fake", 'it\'s a "test"\nwith\\backslash')

    assert len(captured_args) == 1
    sent_js = captured_args[0]
    # The json-encoded text should appear in the JS (json.dumps includes quotes)
    encoded = json.dumps('it\'s a "test"\nwith\\backslash')
    assert encoded in sent_js
    # No raw unescaped single quotes in JS string context
    assert "\\'" not in sent_js


def test_click_by_text_simple(capsys):
    """click_by_text sends correct JS and prints the result."""
    with mock.patch("scripts.cdp_helper.asyncio") as mock_asyncio:
        mock_asyncio.run.return_value = "clicked: CONTINUE"
        cdp_helper.click_by_text("ws://fake", "CONTINUE")

    captured = capsys.readouterr()
    assert "clicked: CONTINUE" in captured.out
