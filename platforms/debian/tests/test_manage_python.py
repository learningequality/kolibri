import hashlib
from pathlib import Path

import pytest

from build_tools import manage_python
from build_tools.manage_python import (
    SUPPORTED_ARCHES,
    download,
    download_file,
    find_release,
    read_config,
    sha256_file,
    tarball_filename,
    tarball_url,
    updated_config,
    verify_sha256,
    write_config,
)

SUFFIX = "-unknown-linux-gnu-install_only_stripped.tar.gz"

SAMPLE_CONFIG_VALUES = {
    "PYTHON_VERSION": "3.10.20",
    "PYTHON_BUILD_STANDALONE_TAG": "20260510",
    "PYTHON_BUILD_STANDALONE_VERSION": "3.10.20+20260510",
    "PYTHON_SHA256_X86_64": "a" * 64,
    "PYTHON_SHA256_AARCH64": "b" * 64,
    "PYTHON_URL_BASE": "https://example.invalid/download",
    "PYTHON_MIN_MAJOR": "3",
    "PYTHON_MIN_MINOR": "10",
}


def make_release(tag, versions, arches=SUPPORTED_ARCHES):
    """Build a GitHub release dict with a tarball asset per version/arch."""
    assets = [
        {
            "name": f"cpython-{version}-{arch}{SUFFIX}",
            "browser_download_url": f"https://example.invalid/{tag}/cpython-{version}-{arch}{SUFFIX}",
        }
        for version in versions
        for arch in arches
    ]
    return {"tag_name": tag, "assets": assets}


# --- Tests for tarball naming ---

def test_tarball_filename():
    assert tarball_filename("3.10.20+20260510", "x86_64") == (
        "cpython-3.10.20+20260510-x86_64-unknown-linux-gnu-install_only_stripped.tar.gz"
    )


def test_tarball_url_encodes_plus():
    """The + in the build version must be %2B-encoded in the URL."""
    url = tarball_url(
        "https://example.invalid/download", "20260510", "3.10.20+20260510", "aarch64"
    )
    assert url == (
        "https://example.invalid/download/20260510/"
        "cpython-3.10.20%2B20260510-aarch64-unknown-linux-gnu-install_only_stripped.tar.gz"
    )
    assert "+" not in url


# --- Tests for config read/write ---

def test_write_read_config_round_trip(tmp_path):
    path = tmp_path / "python_versions.env"
    write_config(path, SAMPLE_CONFIG_VALUES)
    assert read_config(path) == SAMPLE_CONFIG_VALUES


def test_read_config_ignores_comments_and_strips_quoting(tmp_path):
    path = tmp_path / "python_versions.env"
    path.write_text(
        '# a comment\n'
        '\n'
        '  PYTHON_VERSION = "3.10.20"  \n'
        '# another comment\n'
        'PYTHON_MIN_MINOR=10\n'
    )
    assert read_config(path) == {"PYTHON_VERSION": "3.10.20", "PYTHON_MIN_MINOR": "10"}


# --- Tests for checksums ---

def test_sha256_file(tmp_path):
    path = tmp_path / "blob"
    path.write_bytes(b"kolibri" * 10000)
    assert sha256_file(path) == hashlib.sha256(b"kolibri" * 10000).hexdigest()


def test_verify_sha256_returns_digest_on_match(tmp_path):
    path = tmp_path / "blob"
    path.write_bytes(b"kolibri")
    expected = hashlib.sha256(b"kolibri").hexdigest()
    assert verify_sha256(path, expected) == expected


def test_verify_sha256_raises_on_mismatch(tmp_path):
    path = tmp_path / "blob"
    path.write_bytes(b"kolibri")
    with pytest.raises(SystemExit) as excinfo:
        verify_sha256(path, "0" * 64)
    assert "SHA256 mismatch" in str(excinfo.value)


# --- Tests for find_release ---

def test_find_release_returns_versions_and_urls():
    releases = [make_release("20260510", ["3.10.20+20260510"])]
    tag, python_version, full_version, urls = find_release(releases, "3.10")
    assert tag == "20260510"
    assert python_version == "3.10.20"
    assert full_version == "3.10.20+20260510"
    assert set(urls) == set(SUPPORTED_ARCHES)
    assert urls["x86_64"].endswith(f"cpython-3.10.20+20260510-x86_64{SUFFIX}")


def test_find_release_returns_first_matching_release():
    """Releases are newest-first; the first with a full arch set wins."""
    releases = [
        make_release("20260510", ["3.10.20+20260510"]),
        make_release("20260325", ["3.10.19+20260325"]),
    ]
    tag, _, full_version, _ = find_release(releases, "3.10")
    assert tag == "20260510"
    assert full_version == "3.10.20+20260510"


def test_find_release_skips_release_missing_an_arch():
    releases = [
        make_release("20260510", ["3.10.20+20260510"], arches=("x86_64",)),
        make_release("20260325", ["3.10.19+20260325"]),
    ]
    tag, _, full_version, urls = find_release(releases, "3.10")
    assert tag == "20260325"
    assert full_version == "3.10.19+20260325"
    assert set(urls) == set(SUPPORTED_ARCHES)


def test_find_release_returns_none_when_version_absent():
    releases = [make_release("20260510", ["3.10.20+20260510"])]
    assert find_release(releases, "3.12") is None


def test_find_release_ignores_other_versions_in_same_release():
    releases = [make_release("20260510", ["3.10.20+20260510", "3.12.5+20260510"])]
    _, python_version, _, urls = find_release(releases, "3.12")
    assert python_version == "3.12.5"
    assert urls["aarch64"].endswith(f"cpython-3.12.5+20260510-aarch64{SUFFIX}")


def test_find_release_does_not_match_longer_minor_version():
    """"3.1" must not resolve to a 3.10 tarball — the version prefix is
    anchored on the dot separating minor from patch."""
    releases = [make_release("20260510", ["3.10.20+20260510"])]
    assert find_release(releases, "3.1") is None


@pytest.mark.parametrize("flag", ["draft", "prerelease"])
def test_find_release_skips_unpublished_releases(flag):
    """A prerelease carries the full asset set and sorts newest-first."""
    newest = make_release("20260901", ["3.10.21+20260901"])
    newest[flag] = True
    releases = [newest, make_release("20260510", ["3.10.20+20260510"])]
    tag, _, full_version, _ = find_release(releases, "3.10")
    assert tag == "20260510"
    assert full_version == "3.10.20+20260510"


# --- Tests for downloading ---

def fake_urlretrieve(payload, error=None):
    def urlretrieve(url, filename, reporthook=None):
        Path(filename).write_bytes(payload)
        if error is not None:
            raise error
    return urlretrieve


def test_download_file_renames_a_temp_file_into_place(tmp_path, monkeypatch):
    dest = tmp_path / "cpython.tar.gz"
    monkeypatch.setattr(
        manage_python.urllib.request, "urlretrieve", fake_urlretrieve(b"payload")
    )
    download_file("https://example.invalid/cpython.tar.gz", dest)
    assert dest.read_bytes() == b"payload"
    assert list(tmp_path.iterdir()) == [dest]


def test_download_file_discards_a_partial_download(tmp_path, monkeypatch):
    dest = tmp_path / "cpython.tar.gz"
    monkeypatch.setattr(
        manage_python.urllib.request,
        "urlretrieve",
        fake_urlretrieve(b"trunc", error=OSError("connection reset")),
    )
    with pytest.raises(OSError):
        download_file("https://example.invalid/cpython.tar.gz", dest)
    assert list(tmp_path.iterdir()) == []


def write_download_config(tmp_path, payload, **overrides):
    path = tmp_path / "python_versions.env"
    values = dict(
        SAMPLE_CONFIG_VALUES,
        PYTHON_SHA256_X86_64=hashlib.sha256(payload).hexdigest(),
        **overrides,
    )
    write_config(path, values)
    return path


def cached_tarball(dest_dir, contents):
    dest_dir.mkdir()
    path = dest_dir / tarball_filename("3.10.20+20260510", "x86_64")
    path.write_bytes(contents)
    return path


def unreachable_urlretrieve(url, filename, reporthook=None):
    raise AssertionError(f"unexpected download of {url}")


def test_download_keeps_a_cached_tarball_that_verifies(tmp_path, monkeypatch):
    config = write_download_config(tmp_path, b"good")
    cached = cached_tarball(tmp_path / "build_src", b"good")
    monkeypatch.setattr(manage_python.urllib.request, "urlretrieve", unreachable_urlretrieve)
    download(["x86_64"], config, tmp_path / "build_src")
    assert cached.read_bytes() == b"good"


def test_download_replaces_a_cached_tarball_that_fails_verification(tmp_path, monkeypatch):
    config = write_download_config(tmp_path, b"good")
    cached = cached_tarball(tmp_path / "build_src", b"corrupt")
    monkeypatch.setattr(manage_python.urllib.request, "urlretrieve", fake_urlretrieve(b"good"))
    download(["x86_64"], config, tmp_path / "build_src")
    assert cached.read_bytes() == b"good"


def test_download_deletes_a_fresh_download_that_fails_verification(tmp_path, monkeypatch):
    config = write_download_config(tmp_path, b"good")
    monkeypatch.setattr(manage_python.urllib.request, "urlretrieve", fake_urlretrieve(b"bad"))
    with pytest.raises(SystemExit, match="SHA256 mismatch"):
        download(["x86_64"], config, tmp_path / "build_src")
    assert list((tmp_path / "build_src").iterdir()) == []


def test_download_refuses_a_bundle_below_the_declared_floor(tmp_path, monkeypatch):
    config = write_download_config(tmp_path, b"good", PYTHON_MIN_MINOR="11")
    monkeypatch.setattr(manage_python.urllib.request, "urlretrieve", unreachable_urlretrieve)
    with pytest.raises(SystemExit, match="below the declared floor 3.11"):
        download(["x86_64"], config, tmp_path / "build_src")


# --- Tests for the updated config ---

def test_updated_config_keeps_the_existing_supported_floor():
    values = updated_config(
        SAMPLE_CONFIG_VALUES, "20260901", "3.12.5", "3.12.5+20260901", "12"
    )
    assert values["PYTHON_VERSION"] == "3.12.5"
    assert values["PYTHON_MIN_MAJOR"] == "3"
    assert values["PYTHON_MIN_MINOR"] == "10"


def test_updated_config_falls_back_to_the_target_version():
    values = updated_config({}, "20260901", "3.12.5", "3.12.5+20260901", "12")
    assert values["PYTHON_MIN_MAJOR"] == "3"
    assert values["PYTHON_MIN_MINOR"] == "12"


def test_updated_config_refuses_a_bundle_below_the_existing_floor():
    with pytest.raises(SystemExit, match="below the declared floor 3.10"):
        updated_config(
            SAMPLE_CONFIG_VALUES, "20260901", "3.9.23", "3.9.23+20260901", "9"
        )


@pytest.mark.parametrize(
    "tag,full_version",
    [
        ('20260901"; rm -rf /; #', "3.12.5+20260901"),
        ("20260901", '3.12.5+20260901"; rm -rf /; #'),
        ("20260901\nPYTHON_MIN_MINOR=0", "3.12.5+20260901"),
        ("20260901", "3.12.5+$(id)"),
    ],
)
def test_updated_config_rejects_metadata_that_escapes_the_env_file(tag, full_version):
    with pytest.raises(SystemExit):
        updated_config(SAMPLE_CONFIG_VALUES, tag, "3.12.5", full_version, "12")
