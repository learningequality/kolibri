import os
import tarfile

import click
import pytest
import template
from targets import Target
from template import pack_template
from template import template_key


def test_pack_template_roundtrip(tmp_path):
    home = tmp_path / "home"
    (home / "content").mkdir(parents=True)
    (home / "db.sqlite3").write_text("db")
    (home / "content" / "f.mp4").write_text("video")
    tarball = str(tmp_path / "t.tar.gz")
    content_hash = pack_template(str(home), tarball)
    assert len(content_hash) == 12
    os.utime(home / "db.sqlite3", (1, 1))
    os.utime(home / "content" / "f.mp4", (1, 1))
    assert content_hash == pack_template(str(home), tarball)
    assert content_hash == pack_template(str(home), str(tmp_path / "other-name.tar.gz"))
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


class FailingStartExecutor:
    def __init__(self, port, run_home):
        self.server_url = f"http://localhost:{port}"

    def prepare(self, target):
        pass

    def start(self):
        raise click.ClickException("port 8001 is already in use")

    def stop(self):
        raise click.ClickException("no server running")


def test_ensure_template_reports_start_failure(tmp_path, monkeypatch):
    monkeypatch.setattr(template, "TEMPLATES_DIR", str(tmp_path))
    monkeypatch.setattr(template, "LocalExecutor", FailingStartExecutor)
    baseline = Target("base", "wheel-path", str(tmp_path / "kolibri.whl"))
    baseline._wheel_sha = "abc"
    with pytest.raises(click.ClickException, match="already in use"):
        template.ensure_template(baseline, 50, "channel", "admin", "admin", 8001)
