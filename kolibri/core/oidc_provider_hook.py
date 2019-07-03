from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.plugins import hooks


class OIDCProviderHook(hooks.KolibriHook):
    """
    A hook to enable the OIDC provider
    """

    class Meta:
        abstract = True

    @property
    def is_enabled(self):
        return len(list(self.registered_hooks)) == 1
