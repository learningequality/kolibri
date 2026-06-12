"""
Unit tests for build_tools/install_cexts.py.

The C-extension install step downloads a dozen-plus independent wheels with one
`pip install` subprocess each. These tests pin the behaviour of the concurrent
executor: every collected task is installed, a PyPI failure is fatal, and a
Piwheels failure is tolerated (the site is flaky by design).
"""

import importlib.util
import os
import threading

import pytest

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


def test_run_installs_fatal_on_pypi_failure(monkeypatch):
    monkeypatch.setattr(install_cexts, "run_pip_install", lambda *a, **k: 1)

    with pytest.raises(SystemExit):
        install_cexts.run_installs([_task(index_url=install_cexts.PYPI_DOWNLOAD)])


def test_run_installs_tolerates_piwheels_failure(monkeypatch):
    monkeypatch.setattr(install_cexts, "run_pip_install", lambda *a, **k: 1)

    # Must not raise: Piwheels is flaky and its failures are non-fatal.
    install_cexts.run_installs([_task(index_url=install_cexts.PIWHEEL_DOWNLOAD)])
