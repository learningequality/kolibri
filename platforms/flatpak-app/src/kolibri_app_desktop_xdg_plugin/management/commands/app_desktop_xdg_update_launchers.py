#!/usr/bin/env python
#
# Copyright 2021-2024 Endless OS Foundation, LLC
# SPDX-License-Identifier: MIT
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.core.management.base import BaseCommand
from kolibri_app_desktop_xdg_plugin.channel_launchers import update_channel_launchers


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Update all launchers, even if unchanged",
        )

    def handle(self, *args, **options):
        force = options.get("force", False)
        update_channel_launchers(force=force)
