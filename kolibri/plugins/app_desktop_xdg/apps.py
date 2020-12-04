from django.apps import AppConfig
from django.db.models.signals import post_save


class AppDesktopXDGConfig(AppConfig):
    """
    Provides desktop integration for most Linux desktop environments. This
    plugin manages an XDG data directory in '$KOLIBRI_HOME/content/xdg/share'.
    It contains launcher files and icons for Kolibri channels.
    """

    name = "kolibri.plugins.app_desktop_xdg"
    label = "app_desktop_xdg"
    verbose_name = "Integration for Linux desktop environments"

    def ready(self):
        post_save.connect(
            self.__on_content_cache_key_save, sender="device.ContentCacheKey"
        )

    def __on_content_cache_key_save(self, sender, instance=None, *args, **kwargs):
        from .utils import update_channel_launchers

        update_channel_launchers()
