from abc import abstractmethod

from kolibri.core.webpack.hooks import WebpackInclusionSyncMixin
from kolibri.plugins.hooks import define_hook
from kolibri.plugins.hooks import KolibriHook


@define_hook
class UserAuthSyncHook(WebpackInclusionSyncMixin):
    """
    Define a hook defining assets to be loaded synchronously in user_auth/user_auth.html
    """


@define_hook
class LoginItemHook(KolibriHook):
    """
    A hook to add an external login option (e.g. SSO) as a link/button on the
    sign-in page. Login options are pure data - no client-side behavior is
    contributed, since CSP forbids injecting scripts into user_auth.html.
    """

    #: Passed straight through to KExternalLink's `appearance` prop.
    appearance = "raised-button"

    # Translated label text shown on the login option.
    @property
    @abstractmethod
    def label(self):
        pass

    # The URL that starts this login option's authentication flow.
    # If computing this calls into Django (e.g. `reverse()`), implement it as
    # a real property rather than a class-body attribute: hooks are imported
    # in isolation during `kolibri plugin enable`, before the app registry is
    # ready, so eager evaluation raises AppRegistryNotReady.
    @property
    @abstractmethod
    def url(self):
        pass

    # A static-asset URL for the icon shown on the login option.
    # Same caveat as `url` above if computed via `static()`.
    @property
    @abstractmethod
    def icon_url(self):
        pass

    @property
    def data(self):
        return {
            "label": self.label,
            "url": self.url,
            "icon": self.icon_url,
            "appearance": self.appearance,
        }
