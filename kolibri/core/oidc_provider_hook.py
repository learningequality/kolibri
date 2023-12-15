from kolibri.plugins import hooks


@hooks.define_hook
class OIDCProviderHook(hooks.KolibriHook):
    """
    A hook to enable the OIDC provider
    """

    @classmethod
    def is_enabled(cls):
        return len(list(cls.registered_hooks)) == 1
