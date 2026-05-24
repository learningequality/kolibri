# Unit tests for the Flathub release scripts. Both scripts gate what ships to
# Flathub, so the guard/pin paths are covered here. The scripts have hyphenated
# filenames (not importable modules), so they are loaded by path.
import importlib.util
import json
import subprocess
from pathlib import Path

import pytest

FLATPAK_DIR = Path(__file__).resolve().parents[1]


def load(filename):
    name = filename.removesuffix(".py").replace("-", "_")
    spec = importlib.util.spec_from_file_location(name, FLATPAK_DIR / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


sync = load("sync-flathub.py")
prepare = load("prepare-kolibri-module.py")


def manifest(sources):
    return {
        "modules": [
            "modules/iproute2.json",
            {"name": "kolibri-gnome", "sources": sources},
        ]
    }


# --- sync-flathub.pin_kolibri_gnome ------------------------------------------


def test_pin_sets_tag_and_commit_on_git_source():
    data = manifest([{"type": "git", "url": "x", "tag": "old", "commit": "old"}])
    sync.pin_kolibri_gnome(data, "v9.9", "abc123")
    source = data["modules"][1]["sources"][0]
    assert source["tag"] == "v9.9"
    assert source["commit"] == "abc123"


def test_pin_selects_git_source_when_not_first():
    data = manifest([{"type": "file", "path": "p"}, {"type": "git", "url": "x"}])
    sync.pin_kolibri_gnome(data, "v9.9", "abc123")
    assert data["modules"][1]["sources"][0] == {"type": "file", "path": "p"}
    assert data["modules"][1]["sources"][1]["commit"] == "abc123"


def test_pin_errors_when_module_missing():
    with pytest.raises(SystemExit):
        sync.pin_kolibri_gnome({"modules": ["modules/iproute2.json"]}, "v9.9", "abc")


def test_pin_errors_when_no_git_source():
    with pytest.raises(SystemExit):
        sync.pin_kolibri_gnome(manifest([{"type": "file", "path": "p"}]), "v9.9", "abc")


def test_main_resolves_ref_against_this_repo_not_cwd(tmp_path):
    # Run from an unrelated git repo: the ref names a kolibri-gnome commit, so
    # a run from the flathub checkout must not pin that repo's HEAD instead.
    decoy = tmp_path / "decoy"
    decoy.mkdir()
    git = ["git", "-c", "user.name=t", "-c", "user.email=t@e"]
    subprocess.run([*git, "init", "-q"], cwd=decoy, check=True)
    subprocess.run(
        [*git, "commit", "-q", "--allow-empty", "-m", "x"], cwd=decoy, check=True
    )
    decoy_head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=decoy, text=True
    ).strip()
    expected = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=FLATPAK_DIR, text=True
    ).strip()

    dest = tmp_path / "flathub"
    dest.mkdir()
    subprocess.run(
        ["python3", str(FLATPAK_DIR / "sync-flathub.py"), str(dest), "HEAD"],
        cwd=decoy,
        check=True,
    )

    text = (dest / sync.MANIFEST).read_text()
    assert expected in text
    assert decoy_head not in text


# --- prepare-kolibri-module --------------------------------------------------


@pytest.fixture
def rendered(tmp_path, monkeypatch):
    template = tmp_path / "python3-kolibri.json.in"
    template.write_text(json.dumps({"name": "python3-kolibri", "build-commands": []}))
    output = tmp_path / "python3-kolibri.json"
    monkeypatch.setattr(prepare, "MODULES_DIR", tmp_path)
    monkeypatch.setattr(prepare, "TEMPLATE", template)
    monkeypatch.setattr(prepare, "OUTPUT", output)
    return output


def test_pin_renders_url_and_sha256(rendered, monkeypatch):
    monkeypatch.setattr(prepare, "fetch_bytes", lambda url: b"wheel-bytes")
    prepare.main(
        ["--url", "https://example.test/kolibri-0.19-py2.py3-none-any.whl", "--pin"]
    )
    source = json.loads(rendered.read_text())["sources"][0]
    assert source["type"] == "file"
    assert source["url"].endswith(".whl")
    assert len(source["sha256"]) == 64


def test_local_file_renders_path_source(rendered, tmp_path):
    wheel = tmp_path / "kolibri-0.19-py2.py3-none-any.whl"
    wheel.write_bytes(b"wheel")
    prepare.main(["--file", str(wheel)])
    source = json.loads(rendered.read_text())["sources"][0]
    assert source == {"type": "file", "path": wheel.name}


def test_pin_requires_url_not_file(rendered, tmp_path):
    wheel = tmp_path / "kolibri.whl"
    wheel.write_bytes(b"wheel")
    with pytest.raises(SystemExit):
        prepare.main(["--file", str(wheel), "--pin"])


def test_pin_rejects_non_wheel_url(rendered):
    with pytest.raises(SystemExit):
        prepare.main(["--url", "https://example.test/kolibri.tar.gz", "--pin"])
