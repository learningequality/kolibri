"""
Kolibri Core hooks
------------------

WIP! Many applications are supposed to live inside the core namespace to make
it explicit that they are part of the core.

Do we put all their hooks in one module or should each app have its own hooks
module?

Anyways, for now to get hooks started, we have some defined here...
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from abc import abstractproperty

from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.core.webpack.hooks import WebpackInclusionASyncMixin
from kolibri.core.webpack.hooks import WebpackInclusionSyncMixin
from kolibri.plugins.hooks import define_hook
from kolibri.plugins.hooks import KolibriHook
from kolibri.plugins.utils import plugin_url


@define_hook
class NavigationHook(WebpackBundleHook):

    # Set this to True so that the resulting frontend code will be rendered inline.
    inline = True


@define_hook
class RoleBasedRedirectHook(KolibriHook):
    # User role to redirect for
    @abstractproperty
    def roles(self):
        pass

    # URL to redirect to
    @abstractproperty
    def url(self):
        pass

    def plugin_url(self, plugin_class, url_name):
        return plugin_url(plugin_class, url_name)


@define_hook
class FrontEndBaseSyncHook(WebpackInclusionSyncMixin):
    """
    Inherit a hook defining assets to be loaded in kolibri/base.html, that means
    ALL pages. Use with care.
    """


@define_hook
class FrontEndBaseASyncHook(WebpackInclusionASyncMixin):
    """
    Inherit a hook defining assets to be loaded in kolibri/base.html, that means
    ALL pages. Use with care.
    """


@define_hook(only_one_registered=True)
class LogoutRedirectHook(KolibriHook):
    """
    A hook to enable the OIDC client
    """

    @classmethod
    def is_enabled(cls):
        return len(list(cls.registered_hooks)) == 1

    @abstractproperty
    def url(self):
        """
        A property to be overriden by the class using this hook to provide the needed url to redirect
        """
        pass
