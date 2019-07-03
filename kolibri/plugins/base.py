"""The base of a Kolibri plugin is the inheritence from
:class:`.KolibriPluginBase`.
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging
import sys
import warnings
from importlib import import_module

from django.conf import settings
from django.utils.module_loading import module_has_submodule

from kolibri.utils.conf import config

logger = logging.getLogger(__name__)


class MandatoryPluginMethodNotImplemented(NotImplementedError):
    def __init__(self):
        super(MandatoryPluginMethodNotImplemented, self).__init__(
            "Plugin needs to define this method"
        )  # pragma: no cover


class MandatoryPluginAttributeNotImplemented(NotImplementedError):
    def __init__(self):
        super(MandatoryPluginAttributeNotImplemented, self).__init__(
            "Plugin needs to define this attribute"
        )  # pragma: no cover


class KolibriPluginBase(object):
    """
    This is the base class that all Kolibri plugins need to implement.
    """

    #: Comment
    # Name of a local module that contains url_patterns that define
    # URLs for views that do not contain any
    # translated content, and hence will not be prefixed
    # with a language prefix
    untranslated_view_urls = None

    #: Comment
    # Name of a local module that contains url_patterns that define
    # URLs for views that contain
    # translated content, and hence will be prefixed
    # with a language prefixs
    translated_view_urls = None

    #: Comment
    # Name of a local module that contains url_patterns that define
    # URLs for views that should be attached to the domain root.
    # Use with caution! The lack of namespacing is dangerous.
    root_view_urls = None

    #: Comment
    # Name of a local module that contains additional settings to augment
    # Django settings.
    # For settings that take a tuple or list, these will be appended to the value from
    # the base settings module set through conventional Django means.
    django_settings = None

    #: Comment
    # Name of a local module, containing a config spec as the 'option_spec' value.
    # These options should not override the core config spec, but may specify a new
    # default value for a core config spec option.
    kolibri_options = None

    # : Suggested property, not yet in use
    migrate_on_enable = False

    # : Suggested property, not yet in use
    collect_static_on_enable = False

    # : Suggested property, not yet in use
    collect_static_on_enable = False

    def __init__(self):
        if settings.configured:
            # Check to see if a plugin is being initialized after Django
            warnings.warn(
                "{module} exposes a KolibriPluginBase derived object but is initialized after Django - enable as a plugin to use this properly".format(
                    module=self._module_path()
                )
            )

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
        if module_path not in config.ACTIVE_PLUGINS:
            config.enable_plugin(module_path)
        else:
            logger.warning("{} already enabled".format(module_path))

    @classmethod
    def _installed_apps_remove(cls):
        """Call this from your enable() method to have the plugin automatically
        added to Kolibri configuration"""
        module_path = cls._module_path()
        if module_path in config.ACTIVE_PLUGINS:
            config.disable_plugin(module_path)
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

    def _return_module(self, module_name):
        if module_has_submodule(sys.modules[self._module_path()], module_name):
            models_module_name = "%s.%s" % (self._module_path(), module_name)
            return import_module(models_module_name)

        return None

    def url_module(self):
        """
        Return a url module, containing ``urlpatterns = [...]``, a conventional
        Django application url module.

        URLs are by default accessed through Django's reverse lookups like
        this::

            reverse('kolibri:mypluginclass:url_name')

        To customize "mypluginclass" (which is automatically derived from the
        plugin's class name), override ``url_namespace``.

        By default this will be discovered based on the translated_view_urls
        property.
        """
        if self.translated_view_urls:
            module = self._return_module(self.translated_view_urls)
            if module is None:
                logging.warn(
                    "{plugin} defined {urls} translated view urls but the module was not found".format(
                        plugin=self._module_path(), urls=self.translated_view_urls
                    )
                )
            return module

    def api_url_module(self):
        """
        Return a url module, containing ``urlpatterns = [...]``, a conventional
        Django application url module.

        Do this separately for API endpoints so that they do not need
        to be prefixed by the language code.

        URLs are by default accessed through Django's reverse lookups like
        this::

            reverse('kolibri:mypluginclass:url_name')

        To customize "mypluginclass" (which is automatically derived from the
        plugin's class name), override ``url_namespace``.

        By default this will be discovered based on the untranslated_view_urls
        property.
        """
        if self.untranslated_view_urls:
            module = self._return_module(self.untranslated_view_urls)
            if module is None:
                logging.warn(
                    "{plugin} defined {urls} untranslated view urls but the module was not found".format(
                        plugin=self._module_path(), urls=self.untranslated_view_urls
                    )
                )
            return module

    def root_url_module(self):
        """
        Return a url module, containing ``urlpatterns = [...]``, a conventional
        Django application url module.

        Do this separately for endpoints that need to be attached at the root.

        URLs are by default accessed through Django's reverse lookups like
        this::

            reverse('kolibri:url_name')

        By default this will be discovered based on the root_view_urls
        property.
        """
        if self.root_view_urls:
            module = self._return_module(self.root_view_urls)
            logger.warning(
                "Setting up root URLs which is not recommended!\n plugin module: {}".format(
                    self
                )
            )
            if module is None:
                logging.warn(
                    "{plugin} defined {urls} root view urls but the module was not found".format(
                        plugin=self._module_path(), urls=self.root_view_urls
                    )
                )
            return module

    def settings_module(self):
        """
        Return a settings module, containing Django settings that this
        module wants to apply.

        For settings that take a tuple or list, these will be appended to the value from
        the base settings module set through conventional Django means.

        By default this will be discovered based on the django_settings
        property.
        """
        if self.django_settings:
            module = self._return_module(self.django_settings)
            if module is None:
                logging.warn(
                    "{plugin} defined {module} django settings but the module was not found".format(
                        plugin=self._module_path(), module=self.django_settings
                    )
                )
            return module

    def options_module(self):
        """
        Return an options module, containing a config spec as the 'option_spec' value.

        These options should not override the core config spec, but may specify only a new
        default value for a core config spec option.

        By default this will be discovered based on the kolibri_options
        property.
        """
        if self.kolibri_options:
            module = self._return_module(self.kolibri_options)
            if module is None:
                logging.warn(
                    "{plugin} defined {module} kolibri options but the module was not found".format(
                        plugin=self._module_path(), module=self.kolibri_options
                    )
                )
            return module

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
