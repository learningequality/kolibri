"""
Integration tests for the ``kolibri plugin create`` scaffolder
(``kolibri.utils.plugin_scaffold``).

These are bare pytest-style function tests (the scaffolder is pure, non-Django
code). They favour whole-plugin integration over unit-level checks: each test
scaffolds a real plugin and asserts things about the result — that its
``kolibri_plugin.py`` imports and exposes the right hooks, that its entry point
is registered, and (in module mode) that it is discoverable and enable-able
through Kolibri's real plugin registry — across both modes and every surface.
"""

import importlib
import importlib.util
import json
import sys
import tempfile

import pytest

from kolibri.core.content.hooks import ContentRendererHook
from kolibri.core.hooks import FrontEndBaseSyncHook
from kolibri.core.hooks import NavigationHook
from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.utils import disable_plugins
from kolibri.plugins.utils import enable_plugins
from kolibri.plugins.utils import initialize_kolibri_plugin
from kolibri.utils.plugin_scaffold import BACKEND_ONLY
from kolibri.utils.plugin_scaffold import CONTENT_VIEWER
from kolibri.utils.plugin_scaffold import GLOBAL_INJECTOR
from kolibri.utils.plugin_scaffold import MODE_MODULE
from kolibri.utils.plugin_scaffold import MODE_PACKAGE
from kolibri.utils.plugin_scaffold import scaffold_plugin
from kolibri.utils.plugin_scaffold import SINGLE_PAGE_APP

FRONTEND_SURFACES = [CONTENT_VIEWER, SINGLE_PAGE_APP, GLOBAL_INJECTOR]
ALL_SURFACES = [BACKEND_ONLY] + FRONTEND_SURFACES


def _scaffold(target, mode, surface, name="My Thing"):
    """Scaffold a plugin with placeholder metadata, so each test shows only its
    varying axis (mode/surface/name)."""
    return scaffold_plugin(name, str(target), mode, surface, "Desc", "Auth", "e@x")


def _load_kolibri_plugin(path, unique):
    """
    Import a generated ``kolibri_plugin.py`` under a unique module name.

    ``register_hook`` requires the defining module's name to end with
    ``kolibri_plugin``, so the unique prefix is suffixed accordingly.
    """
    name = "{}_kolibri_plugin".format(unique)
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _hook_subclasses(module, base):
    return [
        value
        for value in vars(module).values()
        if isinstance(value, type) and issubclass(value, base) and value is not base
    ]


def _assert_surface_plugin(module, surface):
    """Assert the imported ``kolibri_plugin`` module matches the surface."""
    assert _hook_subclasses(module, KolibriPluginBase), "no KolibriPluginBase subclass"

    if surface == BACKEND_ONLY:
        return
    if surface == CONTENT_VIEWER:
        hooks = _hook_subclasses(module, ContentRendererHook)
        assert len(hooks) == 1
        assert hooks[0].bundle_id == "main"
        assert hooks[0].presets == ()
    elif surface == SINGLE_PAGE_APP:
        assert any(
            getattr(h, "bundle_id", None) == "app"
            for h in _hook_subclasses(module, WebpackBundleHook)
        )
        assert _hook_subclasses(module, NavigationHook)
    elif surface == GLOBAL_INJECTOR:
        inclusion = _hook_subclasses(module, FrontEndBaseSyncHook)
        assert len(inclusion) == 1
        asset = inclusion[0].bundle_class
        assert issubclass(asset, WebpackBundleHook)
        assert asset.bundle_id == "main"


@pytest.fixture
def plugins():
    """Temp plugin config, mirroring the fixture in test_cli.py."""
    from kolibri import plugins

    _, config_file = tempfile.mkstemp(suffix="json")
    old_config_file = plugins.conf_file
    plugins.conf_file = config_file
    plugins.config.set_defaults()
    yield plugins
    plugins.conf_file = old_config_file


# ---------------------------------------------------------------------------
# Package mode: every surface imports and registers its own entry point.
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("surface", ALL_SURFACES)
def test_package_mode_plugin_imports_and_registers_entry_point(tmp_path, surface):
    result = _scaffold(tmp_path, MODE_PACKAGE, surface)
    outer = tmp_path / "kolibri-my-thing-plugin"
    pkg = outer / "kolibri_my_thing_plugin"
    assert (pkg / "__init__.py").is_file()

    # Package mode declares its own entry point in its own pyproject.toml.
    assert result.entry_point_name == "kolibri_my_thing_plugin"
    assert result.registration_note is None
    assert (
        'kolibri_my_thing_plugin = "kolibri_my_thing_plugin"'
        in (outer / "pyproject.toml").read_text()
    )

    module = _load_kolibri_plugin(
        str(pkg / "kolibri_plugin.py"), "pkg_" + surface.replace("-", "_")
    )
    _assert_surface_plugin(module, surface)

    if surface == BACKEND_ONLY:
        # No frontend or backend files, and no package.json.
        assert not (pkg / "frontend").exists()
        assert not (pkg / "buildConfig.js").exists()
        assert not (outer / "package.json").exists()
    else:
        # package.json lives at the package root (like kolibri-sentry-plugin),
        # not nested inside the plugin module.
        assert (outer / "package.json").is_file()
        assert not (pkg / "package.json").exists()


# ---------------------------------------------------------------------------
# Module mode: every surface is discoverable and enable-able via the registry.
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("surface", ALL_SURFACES)
def test_module_mode_plugin_discoverable_and_enableable(tmp_path, plugins, surface):
    # Pre-existing entries so we also exercise the sorted entry-point insertion.
    (tmp_path / "pyproject.toml").write_text(
        '[project.entry-points."kolibri.plugins"]\n"aaa" = "aaa"\n"zzz" = "zzz"\n'
    )
    result = _scaffold(tmp_path, MODE_MODULE, surface)
    import_path = result.entry_point_name
    assert import_path == "my_thing"

    # Entry point inserted at its sorted position; existing entries preserved.
    lines = (tmp_path / "pyproject.toml").read_text().splitlines()
    assert (
        lines.index('"aaa" = "aaa"')
        < lines.index('"my_thing" = "my_thing"')
        < lines.index('"zzz" = "zzz"')
    )

    sys.path.insert(0, str(tmp_path))
    try:
        # Discoverable: the registry loads the generated kolibri_plugin.py.
        plugin = initialize_kolibri_plugin(import_path, initialize_hooks=False)
        assert isinstance(plugin, KolibriPluginBase)
        _assert_surface_plugin(
            importlib.import_module(import_path + ".kolibri_plugin"), surface
        )

        # Enable-able: enabling records the module path in the config.
        assert not enable_plugins([import_path])
        assert import_path in plugins.config["INSTALLED_PLUGINS"]
    finally:
        # Unregister the plugin's hooks before dropping it from the import
        # system, to avoid cross-test pollution.
        try:
            disable_plugins([import_path])
        except Exception:
            pass
        sys.path.remove(str(tmp_path))
        for name in list(sys.modules):
            if name == import_path or name.startswith(import_path + "."):
                del sys.modules[name]


def test_module_mode_without_enclosing_pyproject_returns_registration_note(tmp_path):
    # No enclosing pyproject.toml: the plugin is still created, and the result
    # carries the entry-point line the author must add manually.
    result = _scaffold(tmp_path, MODE_MODULE, BACKEND_ONLY)
    assert (tmp_path / "my_thing" / "kolibri_plugin.py").is_file()
    assert result.entry_point_name == "my_thing"
    assert result.registration_note is not None
    assert '"my_thing" = "my_thing"' in result.registration_note


def test_scaffold_refuses_to_overwrite_existing_plugin(tmp_path):
    _scaffold(tmp_path, MODE_PACKAGE, BACKEND_ONLY)
    with pytest.raises(FileExistsError):
        _scaffold(tmp_path, MODE_PACKAGE, BACKEND_ONLY)


# ---------------------------------------------------------------------------
# Single-page-app specifics: the generated SPA wires up its own API and nav.
# ---------------------------------------------------------------------------


def test_single_page_app_frontend_and_api_files(tmp_path):
    _scaffold(tmp_path, MODE_PACKAGE, SINGLE_PAGE_APP)
    pkg = tmp_path / "kolibri-my-thing-plugin" / "kolibri_my_thing_plugin"
    for rel in (
        "api_urls.py",
        "urls.py",
        "viewsets.py",
        "views.py",
        "frontend/app.js",
        "frontend/routes.js",
        "frontend/views/MyThingPage.vue",
        "frontend/views/MyThingSideNavEntry.js",
        "templates/my_thing/my_thing.html",
    ):
        assert (pkg / rel).is_file(), rel

    # No Vuex is scaffolded (it is deprecated).
    assert not (pkg / "frontend" / "modules").exists()
    assert "vuex" not in (pkg / "frontend" / "app.js").read_text()

    build = (pkg / "buildConfig.js").read_text()
    assert build.lstrip().startswith("module.exports = [")
    assert "bundle_id: 'app'" in build
    assert "my_thing_side_nav" in build

    # The rendered HTML resolves the webpack asset for this plugin's module path.
    html = (pkg / "templates" / "my_thing" / "my_thing.html").read_text()
    assert "{% webpack_asset 'kolibri_my_thing_plugin.app' %}" in html

    # The page (translated urls) and the API endpoint (untranslated urls) share
    # a namespace, so they must use distinct URL names — otherwise the side-nav
    # reverse of ``kolibri:<module>:my_thing`` resolves to the API endpoint
    # instead of the page.
    assert 'name="my_thing"' in (pkg / "urls.py").read_text()
    assert 'name="my_thing"' not in (pkg / "api_urls.py").read_text()
    side_nav = (pkg / "frontend" / "views" / "MyThingSideNavEntry.js").read_text()
    assert "urls['kolibri:kolibri_my_thing_plugin:my_thing']" in side_nav


# ---------------------------------------------------------------------------
# package.json dependency resolution against the enclosing pnpm workspace.
# ---------------------------------------------------------------------------


def _write_pnpm_workspace(root, catalog=(), member_names=()):
    """
    Create a minimal pnpm workspace under ``root``.

    Writes a ``pnpm-workspace.yaml`` listing a ``packages/*`` glob and the given
    ``catalog`` entries, plus a member ``package.json`` under ``packages/`` for
    each name in ``member_names``.
    """
    lines = ["packages:", "  - packages/*"]
    if catalog:
        lines.append("catalog:")
        for name in catalog:
            lines.append('  "{}": "1.0.0"'.format(name))
    (root / "pnpm-workspace.yaml").write_text("\n".join(lines) + "\n")
    for name in member_names:
        member = root / "packages" / name
        member.mkdir(parents=True)
        (member / "package.json").write_text(json.dumps({"name": name}))


def test_package_json_uses_workspace_and_catalog_inside_a_workspace(tmp_path):
    # A workspace providing kolibri/kolibri-viewer as members and
    # kolibri-design-system/vue in the catalog.
    _write_pnpm_workspace(
        tmp_path,
        catalog=("kolibri-design-system", "vue"),
        member_names=("kolibri", "kolibri-common", "kolibri-viewer"),
    )
    target = tmp_path / "plugins"
    target.mkdir()

    _scaffold(target, MODE_PACKAGE, CONTENT_VIEWER)
    outer = target / "kolibri-my-thing-plugin"
    deps = json.loads((outer / "package.json").read_text())["dependencies"]
    # Member packages -> workspace:*, catalog entries -> catalog:.
    assert deps["kolibri"] == "workspace:*"
    assert deps["kolibri-viewer"] == "workspace:*"
    assert deps["kolibri-design-system"] == "catalog:"
    assert deps["vue"] == "catalog:"


def test_package_json_falls_back_to_pins_outside_a_workspace(tmp_path):
    # No enclosing pnpm-workspace.yaml: every specifier is a pinned version.
    _scaffold(tmp_path, MODE_PACKAGE, CONTENT_VIEWER)
    outer = tmp_path / "kolibri-my-thing-plugin"
    deps = json.loads((outer / "package.json").read_text())["dependencies"]
    assert deps["kolibri"] == "^0.18.0"
    assert deps["kolibri-viewer"] == "^1.0.0"
    assert deps["kolibri-design-system"] == "^5.7.0"
    assert deps["vue"] == "^2.7.16"
