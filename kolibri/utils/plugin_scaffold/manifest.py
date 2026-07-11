"""
Surface manifest for the plugin scaffolder.

Maps each supported plugin *surface* to the list of surface-specific
:class:`~kolibri.utils.plugin_scaffold.render.FileSpec` files it generates.
Common files (``__init__.py``; and, in package mode, ``pyproject.toml``) are
added by the orchestrator, not per-surface.
"""

from kolibri.utils.plugin_scaffold.render import FileSpec

# Surfaces.
BACKEND_ONLY = "backend-only"
CONTENT_VIEWER = "content-viewer"
SINGLE_PAGE_APP = "single-page-app"
GLOBAL_INJECTOR = "global-injector"

SURFACE_CHOICES = (BACKEND_ONLY, CONTENT_VIEWER, SINGLE_PAGE_APP, GLOBAL_INJECTOR)

# Modes.
MODE_PACKAGE = "package"
MODE_MODULE = "module"

MODE_CHOICES = (MODE_PACKAGE, MODE_MODULE)


SURFACES = {
    BACKEND_ONLY: [
        FileSpec("kolibri_plugin/backend_only.py.tmpl", "kolibri_plugin.py"),
    ],
    CONTENT_VIEWER: [
        FileSpec("kolibri_plugin/content_viewer.py.tmpl", "kolibri_plugin.py"),
        FileSpec("common/buildConfig.js.tmpl", "buildConfig.js"),
        FileSpec("content_viewer/frontend/module.js.tmpl", "frontend/module.js"),
        FileSpec(
            "content_viewer/frontend/views/Index.vue.tmpl",
            "frontend/views/{{ pascal }}Index.vue",
        ),
    ],
    SINGLE_PAGE_APP: [
        FileSpec("kolibri_plugin/single_page_app.py.tmpl", "kolibri_plugin.py"),
        FileSpec("single_page_app/buildConfig.js.tmpl", "buildConfig.js"),
        FileSpec("single_page_app/frontend/app.js.tmpl", "frontend/app.js"),
        FileSpec("single_page_app/frontend/routes.js.tmpl", "frontend/routes.js"),
        FileSpec(
            "single_page_app/frontend/views/Page.vue.tmpl",
            "frontend/views/{{ pascal }}Page.vue",
        ),
        FileSpec(
            "single_page_app/frontend/views/SideNavEntry.js.tmpl",
            "frontend/views/{{ pascal }}SideNavEntry.js",
        ),
        FileSpec("single_page_app/api_urls.py.tmpl", "api_urls.py"),
        FileSpec("single_page_app/urls.py.tmpl", "urls.py"),
        FileSpec("single_page_app/viewsets.py.tmpl", "viewsets.py"),
        FileSpec("single_page_app/views.py.tmpl", "views.py"),
        FileSpec(
            "single_page_app/templates/index.html.tmpl",
            "templates/{{ snake }}/{{ snake }}.html",
        ),
    ],
    GLOBAL_INJECTOR: [
        FileSpec("kolibri_plugin/global_injector.py.tmpl", "kolibri_plugin.py"),
        FileSpec("common/buildConfig.js.tmpl", "buildConfig.js"),
        FileSpec("global_injector/frontend/module.js.tmpl", "frontend/module.js"),
    ],
}

# ``package.json`` is shared by every frontend surface (a single template with
# per-surface dependencies injected), so it is added by the orchestrator rather
# than per-surface. ``backend-only`` has no frontend and thus no entry here.
#
# These are *fallback* version specifiers, used only when a scaffolded plugin is
# NOT inside a pnpm workspace that provides the dependency. When the plugin does
# live in Kolibri's workspace (or any workspace exposing these), the orchestrator
# substitutes ``workspace:*`` for member packages and ``catalog:`` for catalog
# entries via ``pnpm_workspace.resolve_dependencies`` — because ``kolibri-build``
# is exportable and a frontend plugin need not live in the workspace. The pins
# are best-effort starter values matching the versions Kolibri currently ships;
# authors should adjust them to the versions their plugin targets.
FRONTEND_DEPENDENCIES = {
    CONTENT_VIEWER: {
        "kolibri": "^0.18.0",
        "kolibri-common": "^1.0.0",
        "kolibri-design-system": "^5.7.0",
        "kolibri-viewer": "^1.0.0",
        "vue": "^2.7.16",
    },
    SINGLE_PAGE_APP: {
        "kolibri": "^0.18.0",
        "kolibri-app": "^1.0.2",
        "kolibri-common": "^1.0.0",
        "kolibri-design-system": "^5.7.0",
        "vue": "^2.7.16",
        "vue-router": "^3.6.5",
    },
    GLOBAL_INJECTOR: {
        "kolibri": "^0.18.0",
        "kolibri-common": "^1.0.0",
        "vue": "^2.7.16",
    },
}
