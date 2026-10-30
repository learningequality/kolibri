import gzip
import json
import os
import subprocess
import sys

import pytest
from django.conf import settings

from build_tools.collect_sandbox_static import collect
from build_tools.collect_sandbox_static import sandbox_sources

HANDLER = "kolibri.plugins.test_viewer.sandbox_handler"
POLYFILLS = "kolibri.core.polyfills"
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SANDBOXED_VIEWERS = (
    "kolibri.plugins.bloompub_viewer",
    "kolibri.plugins.h5p_viewer",
    "kolibri.plugins.html5_viewer",
)


def _package_dir(module_path):
    return os.path.join(os.getcwd(), *module_path.split("."))


@pytest.mark.skipif(
    settings.configured,
    reason="The plugin registry refuses to load once Django is set up; run with -p no:django",
)
def test_sandbox_sources_are_what_the_sandbox_server_mounts():
    source_locations, handler_outputs = sandbox_sources()

    plugin_statics = [
        os.path.join(_package_dir(viewer), "static") for viewer in SANDBOXED_VIEWERS
    ]
    assert source_locations[:2] == [
        ("", os.path.join(_package_dir("kolibri.core.content"), "static")),
        (
            f"{POLYFILLS}/",
            os.path.join(_package_dir("kolibri.core"), "static", POLYFILLS),
        ),
    ]
    assert sorted(source_locations[2:]) == [("", static) for static in plugin_statics]
    assert sorted(handler_outputs) == [
        os.path.join(static, f"{viewer}.sandbox_handler")
        for viewer, static in zip(SANDBOXED_VIEWERS, plugin_statics)
    ]


def test_main_ignores_the_callers_plugins(tmp_path):
    home = tmp_path / "home"
    home.mkdir()
    (home / "plugins.json").write_text(
        json.dumps({"DISABLED_PLUGINS": [SANDBOXED_VIEWERS[0]]})
    )
    script = (
        "import json, sys\n"
        "import build_tools.collect_sandbox_static as c\n"
        "c.collect = lambda sources, outputs, dest: print(json.dumps(outputs)) or 0\n"
        "sys.argv = ['collect', 'out']\n"
        "c.main()\n"
    )
    env = {**os.environ, "KOLIBRI_HOME": str(home)}
    env.pop("KOLIBRI_PLUGIN_DISABLE", None)
    result = subprocess.run(
        [sys.executable, "-c", script],
        cwd=REPO_ROOT,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        universal_newlines=True,
        check=True,
    )

    handler_outputs = json.loads(result.stdout.splitlines()[0])
    assert (
        os.path.join(
            _package_dir(SANDBOXED_VIEWERS[0]),
            "static",
            f"{SANDBOXED_VIEWERS[0]}.sandbox_handler",
        )
        in handler_outputs
    )


def _write(path, contents):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    mode = "wb" if isinstance(contents, bytes) else "w"
    with open(path, mode) as f:
        f.write(contents)


def _compress(path, contents):
    # What compress.js leaves behind.
    _write(path, "")
    _write(path + ".gz", gzip.compress(contents.encode()))
    _write(path + ".file_size", str(len(contents)))


class Tree:
    def __init__(self, root):
        self.core = str(root / "core")
        self.plugin = str(root / "plugin")
        self.polyfills = str(root / "polyfills")
        self.destination = str(root / "dest")
        os.makedirs(self.core)
        os.makedirs(self.polyfills)
        _write(os.path.join(self.plugin, HANDLER, "handler.js"), "handler")

    def __call__(self, sources=None, outputs=None):
        if sources is None:
            sources = (
                ("", self.core),
                (f"{POLYFILLS}/", self.polyfills),
                ("", self.plugin),
            )
        if outputs is None:
            outputs = (os.path.join(self.plugin, HANDLER),)
        return collect(list(sources), list(outputs), self.destination)

    def read(self, *relative):
        with open(os.path.join(self.destination, *relative)) as f:
            return f.read()


@pytest.fixture
def tree(tmp_path):
    return Tree(tmp_path)


def test_collects_from_every_source_dir(tree):
    _write(os.path.join(tree.core, "core.js"), "core")
    _write(os.path.join(tree.plugin, "nested", "plugin.js"), "plugin")

    tree()

    assert tree.read("core.js") == "core"
    assert tree.read("nested", "plugin.js") == "plugin"
    assert tree.read(HANDLER, "handler.js") == "handler"


def test_collects_a_prefixed_location_under_its_prefix(tree):
    _write(os.path.join(tree.polyfills, "polyfills.js"), "polyfills")

    tree()

    assert tree.read(POLYFILLS, "polyfills.js") == "polyfills"


def test_raises_when_a_plugin_shadows_a_prefixed_location(tree):
    _write(os.path.join(tree.polyfills, "polyfills.js"), "polyfills")
    _write(os.path.join(tree.plugin, POLYFILLS, "polyfills.js"), "plugin")

    with pytest.raises(RuntimeError, match="must namespace its static files"):
        tree()


def test_raises_when_two_sources_hold_the_same_path(tree):
    _write(os.path.join(tree.core, "shared.js"), "core")
    _write(os.path.join(tree.plugin, "shared.js"), "plugin")

    with pytest.raises(RuntimeError, match="must namespace its static files"):
        tree()


def test_raises_when_a_source_dir_is_unbuilt(tree):
    with pytest.raises(RuntimeError, match="Static directory not found"):
        tree(sources=(("", tree.core), (f"{POLYFILLS}/", tree.polyfills + "-missing")))
    assert not os.path.exists(tree.destination)


def test_raises_when_the_handler_bundle_is_unbuilt_beside_tracked_static_files(tree):
    # H5P and Bloom keep vendored players in git under static/, so that directory
    # exists whether or not the handler was built.
    _write(os.path.join(tree.plugin, "vendor", "player.js"), "player")

    with pytest.raises(RuntimeError, match="Sandbox handler bundle not built"):
        tree(outputs=(os.path.join(tree.plugin, "other.sandbox_handler"),))


def test_raises_when_no_files_are_found(tree):
    with pytest.raises(RuntimeError, match="No static files found"):
        tree(sources=(("", tree.core),), outputs=())


def test_recollects_over_an_existing_destination(tree):
    _write(os.path.join(tree.destination, "core.js"), "stale")
    _write(os.path.join(tree.core, "core.js"), "core")

    tree()

    assert tree.read("core.js") == "core"


def test_reconstructs_a_file_the_build_compressed_without_its_sidecars(tree):
    _compress(os.path.join(tree.core, "app.js"), "real content")

    tree()

    assert tree.read("app.js") == "real content"
    assert not os.path.exists(os.path.join(tree.destination, "app.js.gz"))
    assert not os.path.exists(os.path.join(tree.destination, "app.js.file_size"))


def test_copies_a_full_size_file_rather_than_inflating_a_stale_gzip_beside_it(tree):
    path = os.path.join(tree.core, "app.js")
    _write(path, "fresh content")
    _write(path + ".gz", gzip.compress(b"stale content"))
    _write(path + ".file_size", str(len("stale content")))

    tree()

    assert tree.read("app.js") == "fresh content"


def test_collects_a_gzip_file_that_has_no_primary(tree):
    _write(os.path.join(tree.core, "archive.gz"), "archive")

    tree()

    assert tree.read("archive.gz") == "archive"
