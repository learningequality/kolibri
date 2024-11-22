"""
Kolibri Core hooks
------------------

WIP! Many applications are supposed to live inside the core namespace to make
it explicit that they are part of the core.

Do we put all their hooks in one module or should each app have its own hooks
module?

Anyways, for now to get hooks started, we have some defined here...
"""
from abc import abstractproperty

from django.utils.safestring import mark_safe

from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.core.webpack.hooks import WebpackInclusionSyncMixin
from kolibri.plugins.hooks import define_hook
from kolibri.plugins.hooks import KolibriHook
from kolibri.plugins.utils import plugin_url


@define_hook
class NavigationHook(WebpackBundleHook):
    pass


@define_hook
class RoleBasedRedirectHook(KolibriHook):
    # If True, will only be used to redirect if the user is part
    # of a full facility import
    require_full_facility = False

    # If True, will only be used to redirect if the user is not
    # in an 'on my own' facility
    require_no_on_my_own_facility = False

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
class FrontEndBaseHeadHook(KolibriHook):
    """
    Inherit a hook defining markup to be injected in the head of
    kolibri/base.html, that means ALL pages. Use with care.
    """

    @abstractproperty
    def head_html(self):
        pass

    @classmethod
    def html(cls):
        tags = []
        for hook in cls.registered_hooks:
            tags.append(hook.head_html)
        return mark_safe("\n".join(tags))


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
