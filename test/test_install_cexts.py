"""
Unit tests for build_tools/install_cexts.py.

The C-extension install step downloads a dozen-plus independent wheels with one
`pip install` subprocess each. These tests pin the behaviour of the concurrent
executor: every collected task is installed, each index page is fetched by one
install before others share it, a PyPI failure is fatal, and a Piwheels failure
is tolerated (the site is flaky by design).
"""

import importlib.util
import io
import os
import ssl
import threading
import time

import pytest
import requests
import urllib3

_MODULE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.realpath(__file__))),
    "build_tools",
    "install_cexts.py",
)
_spec = importlib.util.spec_from_file_location("install_cexts", _MODULE_PATH)
install_cexts = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(install_cexts)


def _task(
    name="cffi",
    index_url=install_cexts.PYPI_DOWNLOAD,
    platform="manylinux1_x86_64",
    version="38",
):
    return {
        "package_name": name,
        "package_version": "1.0.0",
        "index_url": index_url,
        "platform": platform,
        "implementation": "cp",
        "python_version": version,
        "abi": "cp38",
        "cache_path": "/tmp/cext_cache",
    }


def test_run_installs_attempts_every_task(monkeypatch):
    tasks = [
        _task(platform="manylinux1_x86_64", version="38"),
        _task(platform="manylinux1_x86_64", version="39"),
        _task(platform="win_amd64", version="310"),
    ]
    called = []
    lock = threading.Lock()

    def fake_run_pip_install(
        path,
        platform,
        version,
        implementation,
        abi,
        name,
        pk_version,
        index_url,
        cache_path,
    ):
        with lock:
            called.append((platform, version))
        return 0

    monkeypatch.setattr(install_cexts, "run_pip_install", fake_run_pip_install)

    install_cexts.run_installs(tasks)

    assert sorted(called) == sorted(
        [(t["platform"], t["python_version"]) for t in tasks]
    )


def test_run_installs_refreshes_each_index_page_before_sharing_it(monkeypatch):
    tasks = [
        _task(name="cffi", version="38"),
        _task(name="cffi", version="39"),
        _task(name="cffi", version="310"),
        _task(name="cffi", index_url=install_cexts.PIWHEEL_DOWNLOAD, version="38"),
        _task(name="cffi", index_url=install_cexts.PIWHEEL_DOWNLOAD, version="39"),
        _task(name="cryptography", version="38"),
        _task(name="cryptography", version="39"),
    ]
    events = []
    lock = threading.Lock()

    def fake_call(argv):
        page = (argv[argv.index("-i") + 1], argv[-1])
        with lock:
            events.append(("start", page))
        # Long enough for installs that run together to overlap.
        time.sleep(0.05)
        with lock:
            events.append(("end", page))
        return 0

    monkeypatch.setattr(install_cexts.subprocess, "call", fake_call)

    install_cexts.run_installs(tasks)

    pages = {page for _, page in events}
    assert len(pages) == 3
    for page in pages:
        assert [event for event, p in events if p == page][:2] == ["start", "end"]


def test_run_installs_fatal_on_pypi_failure(monkeypatch):
    monkeypatch.setattr(install_cexts, "run_pip_install", lambda *a, **k: 1)

    with pytest.raises(SystemExit):
        install_cexts.run_installs([_task(index_url=install_cexts.PYPI_DOWNLOAD)])


def test_run_installs_tolerates_piwheels_failure(monkeypatch):
    monkeypatch.setattr(install_cexts, "run_pip_install", lambda *a, **k: 1)

    # Must not raise: Piwheels is flaky and its failures are non-fatal.
    install_cexts.run_installs([_task(index_url=install_cexts.PIWHEEL_DOWNLOAD)])


SAMPLE_INDEX_PAGE = """
<!DOCTYPE html>
<html>
  <body>
    <a href="https://files.pythonhosted.org/packages/ab/cd/cffi-1.17.1-cp36-cp36m-manylinux1_x86_64.whl#sha256=0123456789abcdef">cffi-1.17.1-cp36-cp36m-manylinux1_x86_64.whl</a>
    <a href="cffi-1.17.1-cp36-cp36m-win32.whl">cffi-1.17.1-cp36-cp36m-win32.whl</a>
    <a href="cffi-1.17.1.tar.gz">cffi-1.17.1.tar.gz</a>
  </body>
</html>
"""


def test_parse_package_page_extracts_wheel_links_from_index_page():
    parser = install_cexts.PackagePageParser()
    parser.feed(SAMPLE_INDEX_PAGE)

    tasks = install_cexts.parse_package_page(
        parser.links,
        "1.17.1",
        install_cexts.PYPI_DOWNLOAD,
        "/tmp/cext_cache",
    )

    assert tasks == [
        {
            "package_name": "cffi",
            "package_version": "1.17.1",
            "index_url": install_cexts.PYPI_DOWNLOAD,
            "platform": "manylinux1_x86_64",
            "implementation": "cp",
            "python_version": "36",
            "abi": "cp36m",
            "cache_path": "/tmp/cext_cache",
        },
        {
            "package_name": "cffi",
            "package_version": "1.17.1",
            "index_url": install_cexts.PYPI_DOWNLOAD,
            "platform": "win32",
            "implementation": "cp",
            "python_version": "36",
            "abi": "cp36m",
            "cache_path": "/tmp/cext_cache",
        },
    ]


class _StubAdapter(requests.adapters.HTTPAdapter):
    def __init__(self, outcomes):
        super().__init__()
        self.outcomes = outcomes
        self.timeouts = []

    def send(self, request, timeout=None, **kwargs):
        self.timeouts.append(timeout)
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return self.build_response(request, outcome)


class _BadRecordMacBody(io.RawIOBase):
    def readinto(self, b):
        raise ssl.SSLError("[SSL: DECRYPTION_FAILED_OR_BAD_RECORD_MAC]")


def _response(status, body=b""):
    if isinstance(body, bytes):
        body = io.BytesIO(body)
    return urllib3.HTTPResponse(body=body, status=status, preload_content=False)


def _session(outcomes_by_url):
    session = requests.Session()
    adapters = {}
    for url, outcomes in outcomes_by_url.items():
        adapters[url] = _StubAdapter(outcomes)
        session.mount(url, adapters[url])
    return session, adapters


PAGE = SAMPLE_INDEX_PAGE.encode("utf-8")
PYPI_CFFI = install_cexts.PYPI_DOWNLOAD + "cffi"
PIWHEELS_CFFI = install_cexts.PIWHEEL_DOWNLOAD + "cffi"


def test_parse_pypi_and_piwheels_backs_off_until_index_page_loads(monkeypatch):
    sleeps = []
    monkeypatch.setattr(install_cexts.time, "sleep", sleeps.append)
    session, adapters = _session(
        {
            PYPI_CFFI: [_response(200, PAGE)],
            PIWHEELS_CFFI: [
                requests.ConnectionError("connection reset"),
                _response(503),
                _response(200, PAGE),
            ],
        }
    )

    tasks = install_cexts.parse_pypi_and_piwheels(
        "cffi", "1.17.1", "/tmp/cext_cache", session
    )

    assert [t["index_url"] for t in tasks] == [install_cexts.PYPI_DOWNLOAD] * 2 + [
        install_cexts.PIWHEEL_DOWNLOAD
    ] * 2
    assert sleeps == [2, 4]
    assert None not in adapters[PIWHEELS_CFFI].timeouts


def test_parse_pypi_and_piwheels_retries_tls_error_in_body(monkeypatch):
    monkeypatch.setattr(install_cexts.time, "sleep", lambda delay: None)
    session, _ = _session(
        {
            PYPI_CFFI: [_response(200, _BadRecordMacBody()), _response(200, PAGE)],
            PIWHEELS_CFFI: [_response(200, PAGE)],
        }
    )

    tasks = install_cexts.parse_pypi_and_piwheels(
        "cffi", "1.17.1", "/tmp/cext_cache", session
    )

    assert len(tasks) == 4


def test_parse_pypi_and_piwheels_exits_naming_last_error(monkeypatch, caplog):
    sleeps = []
    monkeypatch.setattr(install_cexts.time, "sleep", sleeps.append)
    failures = [
        requests.ConnectionError(f"failure {n}")
        for n in range(install_cexts.INDEX_ATTEMPTS)
    ]
    session, adapters = _session({PYPI_CFFI: failures})

    with caplog.at_level("WARNING"), pytest.raises(SystemExit) as excinfo:
        install_cexts.parse_pypi_and_piwheels(
            "cffi", "1.17.1", "/tmp/cext_cache", session
        )

    last = f"failure {install_cexts.INDEX_ATTEMPTS - 1}"
    assert last in str(excinfo.value.code)
    assert sleeps == [2, 4, 8, 16, 32]
    warnings = [r for r in caplog.records if r.levelname == "WARNING"]
    assert len(warnings) == install_cexts.INDEX_ATTEMPTS - 1
    assert None not in adapters[PYPI_CFFI].timeouts
