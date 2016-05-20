"""The base of a Kolibri plugin is the inheritence from
:class:`.KolibriPluginBase`.
"""
from __future__ import absolute_import, print_function, unicode_literals

import logging

from kolibri.utils.conf import config

logger = logging.getLogger(__name__)


class MandatoryPluginMethodNotImplemented(NotImplementedError):
    def __init__(self):
        super(MandatoryPluginMethodNotImplemented,
              self).__init__("Plugin needs to define this method")  # pragma: no cover


class MandatoryPluginAttributeNotImplemented(NotImplementedError):
    def __init__(self):
        super(MandatoryPluginAttributeNotImplemented,
              self).__init__("Plugin needs to define this attribute")  # pragma: no cover


class KolibriPluginBase(object):
    """
    This is the base class that all Kolibri plugins need to implement.
    """

    # : Suggested property, not yet in use
    migrate_on_enable = False

    # : Suggested property, not yet in use
    collect_static_on_enable = False

    # : Suggested property, not yet in use
    collect_static_on_enable = False

    @classmethod
    def _module_path(cls):
        """
        Returns the path of the class inheriting this classmethod.
        There is no such thing as Class properties, that's why it's implemented
        as such.

        Used in KolibriPluginBase._installed_apps_add
        """
        return ".".join(cls.__module__.split(".")[:-1])

    @classmethod
    def _installed_apps_add(cls):
        """Call this from your enable() method to have the plugin automatically
        added to Kolibri configuration"""
        module_path = cls._module_path()
        if module_path not in config['INSTALLED_APPS']:
            config['INSTALLED_APPS'].append(module_path)
        else:
            logger.warning("{} already enabled".format(module_path))

    @classmethod
    def _installed_apps_remove(cls):
        """Call this from your enable() method to have the plugin automatically
        added to Kolibri configuration"""
        module_path = cls._module_path()
        if module_path in config['INSTALLED_APPS']:
            config['INSTALLED_APPS'].remove(module_path)
        else:
            logger.warning("{} already disabled".format(module_path))

    @classmethod
    def enable(cls):
        """Modify the kolibri config dict to your plugin's needs"""
        cls._installed_apps_add()

    @classmethod
    def disable(cls):
        """Modify the kolibri config dict to your plugin's needs"""
        cls._installed_apps_remove()

    def url_module(self):
        """
        Return a url module, containing ``urlpatterns = [...]``, a conventional
        Django application url module.

        If your application has a urls.py, you should do this::

            def url_module(self):
                from myplugin import urls
                return urls

        URLs are by default accessed through Django's reverse lookups like
        this::

            reverse('kolibri:mypluginclass:url_name')

        To customize "mypluginclass" (which is automatically derived from the
        plugin's class name), override ``url_namespace``.

        .. note:: We *could* make urls.py auto-detected.
        """
        return None

    def url_namespace(self):
        """
        Used for the ``namespace`` argument when including the plugin's
        urlpatterns. By default, returns a lowercase of the class name.
        """
        return self.__class__.__name__.lower()

    def url_slug(self):
        """
        Where should urls be included? By default, this is a lower-case version
        of the class name.

        Example::

            return r"my-plugin/"

        .. warning:: Avoid the empty string, as you might get conflicts.
        """
        return self.__class__.__name__.lower() + "/"
