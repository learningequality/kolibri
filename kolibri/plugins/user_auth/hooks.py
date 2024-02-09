from kolibri.core.webpack.hooks import WebpackInclusionSyncMixin
from kolibri.plugins.hooks import define_hook


@define_hook
class UserAuthSyncHook(WebpackInclusionSyncMixin):
    """
    Define a hook defining assets to be loaded synchronously in user_auth/user_auth.html
    """
