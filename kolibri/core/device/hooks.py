from abc import abstractmethod

from kolibri.plugins.hooks import define_hook
from kolibri.plugins.hooks import KolibriHook
from kolibri.plugins.utils import plugin_url


@define_hook
class SetupHook(KolibriHook):
    # A hook for a plugin to use to define a url to redirect to
    # when Kolibri has not yet been provisioned

    @property
    @abstractmethod
    def url(self):
        pass

    def plugin_url(self, plugin_class, url_name):
        return plugin_url(plugin_class, url_name)

    @classmethod
    def provision_url(cls):
        return next(hook.url for hook in cls.registered_hooks)


@define_hook(only_one_registered=True)
class GetOSUserHook(KolibriHook):
    @abstractmethod
    def get_os_user(self, auth_token):
        pass

    @classmethod
    def retrieve_os_user(cls, auth_token):
        try:
            hook = next(cls.registered_hooks)
        except StopIteration:
            raise NotImplementedError(
                "Getting the OS user is not supported on this platform"
            )
        return hook.get_os_user(auth_token)


@define_hook(only_one_registered=True)
class CheckIsMeteredHook(KolibriHook):
    @abstractmethod
    def check_is_metered(self):
        pass

    @classmethod
    def execute_is_metered_check(cls):
        try:
            hook = next(cls.registered_hooks)
        except StopIteration:
            raise NotImplementedError(
                "Checking if the connection is metered is not supported on this platform"
            )
        return hook.check_is_metered()
