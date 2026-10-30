import os
import subprocess
import tarfile

import click
import pytest
import template
from targets import Target
from template import template_content_hash
from template import template_key
from template import template_tarball


def _template_home(tmp_path):
    home = tmp_path / "home"
    (home / "content").mkdir(parents=True)
    (home / "db.sqlite3").write_text("db")
    (home / "content" / "f.mp4").write_text("video")
    return home


def test_template_content_hash_ignores_mtimes_and_tracks_content(tmp_path):
    home = _template_home(tmp_path)
    content_hash = template_content_hash(str(home))
    os.utime(home / "db.sqlite3", (1, 1))
    os.utime(home / "content" / "f.mp4", (1, 1))
    assert template_content_hash(str(home)) == content_hash
    (home / "content" / "f.mp4").write_text("other video")
    assert template_content_hash(str(home)) != content_hash


def test_template_tarball_roundtrip(tmp_path):
    home = _template_home(tmp_path)
    tarball = template_tarball(str(home))
    extracted = tmp_path / "out"
    extracted.mkdir()
    with tarfile.open(tarball) as tar:
        tar.extractall(str(extracted))
    assert (extracted / "db.sqlite3").read_text() == "db"
    assert (extracted / "content" / "f.mp4").read_text() == "video"


def test_template_key_depends_on_admin_credentials():
    key = template_key("abc", 50, "channel", "admin", "admin")
    assert key != template_key("abc", 50, "channel", "admin", "other")
    assert key != template_key("abc", 50, "channel", "other", "admin")


def test_template_key_depends_on_setup_inputs(tmp_path, monkeypatch):
    lesson_resources = tmp_path / "lesson_resources.json"
    lesson_resources.write_text("[1]")
    monkeypatch.setattr(template, "SETUP_INPUTS", (str(lesson_resources),))
    key = template_key("abc", 50, "channel", "admin", "admin")
    lesson_resources.write_text("[2]")
    assert key != template_key("abc", 50, "channel", "admin", "admin")


class FailingStartExecutor:
    def __init__(self, port, run_home):
        self.server_url = f"http://localhost:{port}"

    def prepare(self, target):
        pass

    def start(self):
        raise click.ClickException("port 8001 is already in use")

    def stop(self):
        raise click.ClickException("no server running")


@pytest.fixture()
def tree(tmp_path, monkeypatch):
    tree = {"dirty": False}

    class SeedingExecutor:
        server_url = "http://localhost:8001"

        def __init__(self, port, run_home):
            self.run_home = run_home

        def prepare(self, target):
            pass

        def start(self):
            state = "dirty" if tree["dirty"] else "clean"
            with open(os.path.join(self.run_home, "db.sqlite3"), "w") as f:
                f.write(state)

        def stop(self):
            pass

    monkeypatch.setattr(template, "TEMPLATES_DIR", str(tmp_path / "templates"))
    monkeypatch.setattr(template, "LocalExecutor", SeedingExecutor)
    monkeypatch.setattr(
        template, "worktree_identity", lambda path: ("abc", tree["dirty"])
    )
    monkeypatch.setattr(
        template.subprocess,
        "run",
        lambda cmd, **kwargs: subprocess.CompletedProcess(cmd, 0),
    )
    return tree


def _ensure(tmp_path, users=50):
    template_dir, _ = template.ensure_template(
        Target("base", "dev", str(tmp_path)), users, "channel", "admin", "admin", 8001
    )
    return template_dir


def test_dirty_template_does_not_replace_clean_head_template(tmp_path, tree):
    _ensure(tmp_path)
    tree["dirty"] = True
    _ensure(tmp_path)
    tree["dirty"] = False
    with open(os.path.join(_ensure(tmp_path), "db.sqlite3")) as f:
        assert f.read() == "clean"


def test_generating_a_template_keeps_the_most_recently_used(tmp_path, tree):
    first = _ensure(tmp_path, users=1)
    second = _ensure(tmp_path, users=2)
    os.utime(first, (1, 1))
    os.utime(second, (2, 2))
    _ensure(tmp_path, users=1)
    third = _ensure(tmp_path, users=3)
    assert sorted(os.listdir(tmp_path / "templates")) == sorted(
        os.path.basename(path) + suffix
        for path in (first, third)
        for suffix in ("", ".hash")
    )


def test_local_templates_are_not_packed(tmp_path, tree):
    template_dir = _ensure(tmp_path)
    assert not os.path.exists(template_dir + ".tar.gz")


def test_ensure_template_reports_start_failure(tmp_path, monkeypatch):
    monkeypatch.setattr(template, "TEMPLATES_DIR", str(tmp_path))
    monkeypatch.setattr(template, "LocalExecutor", FailingStartExecutor)
    baseline = Target("base", "wheel-path", str(tmp_path / "kolibri.whl"))
    baseline._wheel_sha = "abc"
    with pytest.raises(click.ClickException) as excinfo:
        template.ensure_template(baseline, 50, "channel", "admin", "admin", 8001)
    assert "already in use" in excinfo.value.message
