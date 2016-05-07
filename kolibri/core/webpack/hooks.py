"""
Kolibri Core hooks
------------------

WIP! Many applications are supposed to live inside the core namespace to make
it explicit that they are part of the core.

Do we put all their hooks in one module or should each app have its own hooks
module?

Anyways, for now to get hooks started, we have some defined here...
"""

from __future__ import absolute_import, print_function, unicode_literals

import logging
import os

from kolibri.plugins.hooks import KolibriHook


logger = logging.getLogger(__name__)


class WebpackBundleHook(KolibriHook):
    """
    This is the abstract hook class that all plugins that wish to load any
    assets into the front end must implement, in order for them to be part of
    the webpack asset loading pipeline.

    Minimally these must implement the following properties and methods:

    unique_slug

    The path to the Javascript file that defines the plugin/acts as the entry point.
    entry_file = "assets/js/example_module.js"

    This hook will register the frontend plugin to be available for rendering its built files into Django templates.
    def hooks(self):
        return {
            FRONTEND_PLUGINS: self._register_front_end_plugins
        }
    """

    # : You should set a unique human readable name
    unique_slug = ""

    # : File for webpack to use as entry point
    entry_file = "assets/src/kolibri_core_app.js"

    # TODO: What's this!?
    # ??? -> an optional flag currently used only by the core plugin.
    external = True

    # TODO: What's this!?
    # ??? -> an optional flag *only* ever used by the core plugin.
    core = True

    def __init__(self, *args, **kwargs):
        super(WebpackBundleHook, self).__init__(*args, **kwargs)

        # Verify the uniqueness of the slug
        # It can be '0' in the parent class constructor
        assert \
            len([x.unique_slug == self.unique_slug for x in self.registered_hooks]) <= 1, \
            "Non-unique slug found: '{}'".format(self.unique_slug)

    class Meta:
        abstract = True

    @property
    def webpack_bundle_data(self):
        """
        Returns information needed by the webpack parsing process.
        :return: dict
        "name" - is the module path that the frontend plugin has.
        "entry_file" - is the Javascript file that defines the plugin.
        "external" - an optional flag currently used only by the core plugin.
        "core" - an optional flag *only* ever used by the core plugin.
        "events" - the hash of event names and method callbacks that the KolibriModule defined here registers to.
        "once" - the hash of event names and method callbacks that the KolibriModule defined here registers to for a
        one time callback.
        """
        output = self.async_events
        output.update({
            "name": self.unique_slug,
            "entry_file": self.entry_file,
            "external": getattr(self, "external", None),
            "core": getattr(self, "core", None),
            "stats_file": self.stats_file,
            "module_path": self._module_file_path,
        })
        return output

    @property
    def build_path(self):
        return os.path.join(os.path.abspath(os.path.dirname(__name__)), self._module_file_path, "build")

    @property
    def stats_file(self):
        return os.path.join(self.build_path, "{plugin}_stats.json".format(plugin=self.unique_slug))

    @property
    def async_events(self):
        return {
            "events": getattr(self, "events", {}),
            "once": getattr(self, "once", {}),
        }

    @property
    def _module_file_path(self):
        """
        Returns the path of the class inheriting this classmethod.
        There is no such thing as Class properties, that's why it's implemented
        as such.

        Used in KolibriFrontEndPluginBase._register_front_end_plugins
        """
        return os.path.join(*self.__module__.split(".")[:-1])


class FrontEndSyncHook(WebpackBundleHook):
    """
    Define something that should be included for sync'ed purposes. Assets will
    always be loaded.

    @rtibbles - please elaborate this :)
    """

    class Meta:
        abstract = True


class FrontEndASyncHook(WebpackBundleHook):
    """
    Define something that should be included for sync'ed purposes. Assets will
    always be loaded.

    @rtibbles - please elaborate this :)
    """

    class Meta:
        abstract = True
