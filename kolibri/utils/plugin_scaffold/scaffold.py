"""
Orchestrator for the plugin scaffolder.

``scaffold_plugin()`` ties the pure pieces together: derive names, render the
surface's file tree into the plugin root, and register the plugin's
``kolibri.plugins`` entry point (written into the generated ``pyproject.toml``
in package mode, inserted into the enclosing one in module mode).
"""

import json
import os
from collections import namedtuple

from kolibri.utils.plugin_scaffold.entrypoint import find_enclosing_pyproject
from kolibri.utils.plugin_scaffold.entrypoint import insert_entry_point
from kolibri.utils.plugin_scaffold.entrypoint import module_import_path
from kolibri.utils.plugin_scaffold.manifest import FRONTEND_DEPENDENCIES
from kolibri.utils.plugin_scaffold.manifest import MODE_PACKAGE
from kolibri.utils.plugin_scaffold.manifest import SURFACES
from kolibri.utils.plugin_scaffold.names import derive_names
from kolibri.utils.plugin_scaffold.pnpm_workspace import resolve_dependencies
from kolibri.utils.plugin_scaffold.render import FileSpec
from kolibri.utils.plugin_scaffold.render import render_tree

ScaffoldResult = namedtuple(
    "ScaffoldResult",
    ["plugin_root", "files_written", "entry_point_name", "registration_note"],
)

# Rendered into every plugin root, regardless of surface.
COMMON_FILES = [FileSpec("common/init.py.tmpl", "__init__.py")]

# Rendered into the outer package dir (package mode only).
PACKAGE_PYPROJECT = FileSpec("package/pyproject.toml.tmpl", "pyproject.toml")

# Shared by every frontend surface; the per-surface dependencies are injected
# via the ``dependencies_json`` context value.
PACKAGE_JSON = FileSpec("common/package.json.tmpl", "package.json")


def _format_dependencies(dependencies):
    """Render a deps mapping as a JSON object nested under ``"dependencies"``."""
    body = json.dumps(dependencies, indent=2, sort_keys=True)
    # Indent every line after the first by two spaces so the block sits
    # correctly under the ``"dependencies": `` key in package.json.
    return body.replace("\n", "\n  ")


def scaffold_plugin(
    readable_name,
    target_dir,
    mode,
    surface,
    description,
    author,
    email,
    url_slug=None,
):
    """
    Generate a working, discoverable Kolibri plugin.

    :param readable_name: the human-readable plugin name, e.g. "My Thing".
    :param target_dir: the parent directory to create the plugin in.
    :param mode: ``MODE_PACKAGE`` or ``MODE_MODULE``.
    :param surface: one of the keys of ``SURFACES``.
    :param description, author, email: plugin metadata.
    :param url_slug: single-page-app URL slug; defaults to the snake name.
    :returns: a :class:`ScaffoldResult`.
    :raises ValueError: on an unknown surface or an unusable name.
    """
    if surface not in SURFACES:
        raise ValueError("Unknown surface: {}".format(surface))

    names = derive_names(readable_name)
    target_dir = str(target_dir)
    if url_slug is None:
        url_slug = names.snake

    # Locate the enclosing pyproject up front (module mode uses it both to
    # derive the entry-point name and to register into).
    enclosing_pyproject = None
    outer_dir = None
    if mode == MODE_PACKAGE:
        outer_dir = os.path.join(target_dir, names.package_dir)
        plugin_root = os.path.join(outer_dir, names.package_module)
        entry_point_name = names.package_module
    else:
        plugin_root = os.path.join(target_dir, names.module_dir)
        enclosing_pyproject = find_enclosing_pyproject(target_dir)
        if enclosing_pyproject:
            entry_point_name = module_import_path(
                plugin_root, os.path.dirname(enclosing_pyproject)
            )
        else:
            entry_point_name = names.module_dir

    context = dict(names._asdict())
    context.update(
        description=description,
        author=author,
        email=email,
        url_slug=url_slug,
        mode=mode,
        surface=surface,
        entry_point_name=entry_point_name,
        webpack_asset_tag="{{% webpack_asset '{}.app' %}}".format(entry_point_name),
    )

    files_written = render_tree(COMMON_FILES + SURFACES[surface], context, plugin_root)

    # ``package.json`` lives at the root of a package-mode plugin (alongside
    # pyproject.toml, mirroring kolibri-sentry-plugin) and inside the module
    # dir in module mode (mirroring the in-repo plugins).
    if surface in FRONTEND_DEPENDENCIES:
        context["dependencies_json"] = _format_dependencies(
            resolve_dependencies(FRONTEND_DEPENDENCIES[surface], target_dir)
        )
        package_json_dir = outer_dir or plugin_root
        files_written += render_tree([PACKAGE_JSON], context, package_json_dir)

    registration_note = None
    if mode == MODE_PACKAGE:
        files_written += render_tree([PACKAGE_PYPROJECT], context, outer_dir)
    elif enclosing_pyproject:
        insert_entry_point(enclosing_pyproject, entry_point_name)
    else:
        registration_note = (
            "No enclosing pyproject.toml was found for module mode. Add this "
            'line to the [project.entry-points."kolibri.plugins"] table of the '
            "pyproject.toml that ships this module:\n"
            '    "{name}" = "{name}"'.format(name=entry_point_name)
        )

    return ScaffoldResult(
        plugin_root=plugin_root,
        files_written=files_written,
        entry_point_name=entry_point_name,
        registration_note=registration_note,
    )
