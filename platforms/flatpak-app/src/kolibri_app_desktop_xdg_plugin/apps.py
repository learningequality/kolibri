#!/usr/bin/env python
#
# Copyright 2021-2024 Endless OS Foundation, LLC
# SPDX-License-Identifier: MIT
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.apps import AppConfig
from django.db.models.signals import post_save


class AppDesktopXDGConfig(AppConfig):
    """
    Provides desktop integration for most Linux desktop environments. This
    plugin manages an XDG data directory in '$KOLIBRI_HOME/content/xdg/share'.
    It contains launcher files and icons for Kolibri channels.
    """

    name = "kolibri_app_desktop_xdg_plugin"
    label = "kolibri_app_desktop_xdg_plugin"
    verbose_name = "Integration for Linux desktop environments"

    def ready(self):
        # TODO: Migrate to a more robust trigger. This runs a full
        # ChannelMetadata scan, per-channel Pillow rendering + disk writes, and
        # a gtk-update-icon-cache subprocess synchronously in the signal
        # handler. It is tolerable only because ContentCacheKey is saved when a
        # content import finishes, so it runs in the import task worker rather
        # than a web request. Now that this plugin is first-class, a dedicated
        # task or the app_desktop_xdg_update_launchers command would decouple
        # launcher regeneration from this side effect.
        post_save.connect(
            self.__on_content_cache_key_save, sender="device.ContentCacheKey"
        )

    def __on_content_cache_key_save(self, sender, instance=None, *args, **kwargs):
        from .channel_launchers import update_channel_launchers

        update_channel_launchers()
