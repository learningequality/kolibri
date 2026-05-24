# Smoke tests for the vendored kolibri_app_desktop_xdg_plugin launcher logic.
# This repo is the sole live consumer (upstream endlessm is unmaintained), so
# regressions here surface only as broken desktop launchers at runtime.
#
# The plugin imports a small Kolibri surface at module load; rather than install
# all of Kolibri, we stub just those symbols so the real launcher-diffing and
# Pillow icon-rendering code runs against a temp content dir and a fake channel.
import base64
import configparser
import functools
import sys
import types
from io import BytesIO
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "src"))


def _stub_module(name):
    module = types.ModuleType(name)
    sys.modules[name] = module
    return module


# Minimal Kolibri stubs, installed before importing the plugin. Only the symbols
# channel_launchers/path_utils reference at import time are provided; the DB
# query surface (ChannelMetadata.objects) is set per-test.
for _pkg in (
    "kolibri",
    "kolibri.core",
    "kolibri.core.content",
    "kolibri.core.content.utils",
    "kolibri.dist",
    "kolibri.dist.django",
    "kolibri.dist.django.utils",
):
    _stub_module(_pkg)
_stub_module("kolibri.core.content.models").ChannelMetadata = type(
    "ChannelMetadata", (), {}
)
_stub_module("kolibri.core.content.utils.paths").get_content_dir_path = (
    lambda: "/nonexistent"
)
_stub_module("kolibri.dist.django.utils.functional").cached_property = (
    functools.cached_property
)

from kolibri_app_desktop_xdg_plugin import channel_launchers, path_utils  # noqa: E402
from PIL import Image  # noqa: E402


def _thumbnail_data_uri(size=(300, 200), mimetype="image/png", fmt="PNG"):
    buffer = BytesIO()
    Image.new("RGBA", size, (10, 120, 200, 255)).save(buffer, fmt)
    return "data:{};base64,{}".format(
        mimetype, base64.b64encode(buffer.getvalue()).decode()
    )


class FakeChannel:
    def __init__(self, id, version, name, thumbnail):
        self.id = id
        self.version = version
        self.name = name
        self.tagline = "A test channel"
        self.thumbnail = thumbnail


class FakeManager:
    def __init__(self, channels):
        self._channels = channels

    def filter(self, **kwargs):
        return self._channels


@pytest.fixture
def content_dir(tmp_path, monkeypatch):
    # Point the plugin's XDG share dir at a temp KOLIBRI_HOME/content.
    monkeypatch.setattr(
        path_utils, "get_content_dir_path", lambda: str(tmp_path / "content")
    )
    return tmp_path / "content" / "xdg" / "share"


def _set_channels(monkeypatch, channels):
    monkeypatch.setattr(
        channel_launchers.ChannelMetadata,
        "objects",
        FakeManager(channels),
        raising=False,
    )


# --- update_channel_launchers lifecycle --------------------------------------


def test_creates_launcher_files_for_a_channel(content_dir, monkeypatch):
    _set_channels(
        monkeypatch,
        [FakeChannel("abc123", 3, "Test Channel", _thumbnail_data_uri())],
    )

    channel_launchers.update_channel_launchers()

    desktop = (
        content_dir
        / "applications"
        / "org.learningequality.Kolibri.channel_abc123.desktop"
    )
    search_provider = (
        content_dir
        / "gnome-shell"
        / "search-providers"
        / "org.learningequality.Kolibri.channel_abc123.ini"
    )
    icon = (
        content_dir
        / "icons"
        / "hicolor"
        / "256x256"
        / "apps"
        / "org.learningequality.Kolibri.channel_abc123.png"
    )

    assert desktop.is_file()
    assert search_provider.is_file()
    assert icon.is_file()

    parser = configparser.ConfigParser()
    parser.read(desktop)
    assert parser["Desktop Entry"]["X-Kolibri-Channel-Id"] == "abc123"
    assert "abc123" in parser["Desktop Entry"]["Exec"]

    # The rendered icon is always a 256x256 PNG regardless of thumbnail shape.
    with Image.open(icon) as image:
        assert image.format == "PNG"
        assert image.size == (256, 256)


def test_removes_launcher_when_channel_gone(content_dir, monkeypatch):
    _set_channels(
        monkeypatch,
        [FakeChannel("abc123", 3, "Test Channel", _thumbnail_data_uri())],
    )
    channel_launchers.update_channel_launchers()

    _set_channels(monkeypatch, [])
    channel_launchers.update_channel_launchers()

    desktop = (
        content_dir
        / "applications"
        / "org.learningequality.Kolibri.channel_abc123.desktop"
    )
    icon = (
        content_dir
        / "icons"
        / "hicolor"
        / "256x256"
        / "apps"
        / "org.learningequality.Kolibri.channel_abc123.png"
    )
    assert not desktop.exists()
    assert not icon.exists()


# --- ChannelIcon rendering ---------------------------------------------------


def test_channel_icon_renders_square_png(tmp_path):
    icon = channel_launchers.ChannelIcon(_thumbnail_data_uri(size=(64, 300)))
    out = tmp_path / "icon.png"
    with out.open("wb") as icon_file:
        icon.write(icon_file)
    with Image.open(out) as image:
        assert image.format == "PNG"
        assert image.size == (256, 256)


def test_channel_icon_normalizes_jpg_mimetype():
    icon = channel_launchers.ChannelIcon(
        _thumbnail_data_uri(mimetype="image/jpg", fmt="PNG")
    )
    assert icon.mimetype == "image/jpeg"


def test_channel_icon_rejects_non_data_uri():
    with pytest.raises(ValueError):
        channel_launchers.ChannelIcon("https://example.test/thumb.png")
