from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.plugins import hooks


@hooks.define_hook
class OIDCProviderHook(hooks.KolibriHook):
    """
    A hook to enable the OIDC provider
    """

    @classmethod
    def is_enabled(cls):
        return len(list(cls.registered_hooks)) == 1
