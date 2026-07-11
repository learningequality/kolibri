"""
``kolibri plugin create`` scaffolder.

Pure, independently-testable pieces (name derivation, template
rendering, entry-point registration) orchestrated by
``scaffold_plugin()``. See ``kolibri/utils/plugin_scaffold`` docs and the
implementation plan for details.
"""

from kolibri.utils.plugin_scaffold.manifest import BACKEND_ONLY
from kolibri.utils.plugin_scaffold.manifest import CONTENT_VIEWER
from kolibri.utils.plugin_scaffold.manifest import GLOBAL_INJECTOR
from kolibri.utils.plugin_scaffold.manifest import MODE_CHOICES
from kolibri.utils.plugin_scaffold.manifest import MODE_MODULE
from kolibri.utils.plugin_scaffold.manifest import MODE_PACKAGE
from kolibri.utils.plugin_scaffold.manifest import SINGLE_PAGE_APP
from kolibri.utils.plugin_scaffold.manifest import SURFACE_CHOICES
from kolibri.utils.plugin_scaffold.scaffold import scaffold_plugin

__all__ = [
    "scaffold_plugin",
    "BACKEND_ONLY",
    "CONTENT_VIEWER",
    "SINGLE_PAGE_APP",
    "GLOBAL_INJECTOR",
    "SURFACE_CHOICES",
    "MODE_PACKAGE",
    "MODE_MODULE",
    "MODE_CHOICES",
]
