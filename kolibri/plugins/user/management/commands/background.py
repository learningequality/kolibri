from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging
import os
import shutil
import hashlib

from django.conf import settings
from django.core.management.base import BaseCommand

from kolibri.core import theme_hook

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    def add_arguments(self, parser):
        subparser = parser.add_subparsers(
            dest="command", help="The following subcommands are available."
        )
        set_img_subparser = subparser.add_parser(
            name="set",
            cmd=self,
            help="EXPERIMENTAL: Sets the login screen background image",
        )
        set_img_subparser.add_argument("new-image", type=str, help="Image file")
        subparser.add_parser(name="unset", cmd=self, help="Return to default")

    def handle(self, *args, **options):
        bg_img = os.path.join(settings.MEDIA_ROOT, theme_hook.DEFAULT_BG_IMAGE_FILE)
        md5_file = os.path.join(settings.MEDIA_ROOT, theme_hook.DEFAULT_BG_MD5_FILE)

        if options["command"] == "set":
            self.stdout.write(
                self.style.WARNING(
                    "\nCAUTION:\n"
                    "Setting the background image is experimental functionality.\n"
                    "Your changes may be reverted in a future update or upgrade.\n"
                )
            )

            new_img = os.path.abspath(os.path.expanduser(options["new-image"]))
            if not os.path.exists(new_img):
                self.stderr.write(
                    self.style.ERROR("\n{} does not exist.").format(
                        options["new-image"]
                    )
                )
                raise SystemExit(1)

            if not os.path.exists(settings.MEDIA_ROOT):
                os.mkdir(settings.MEDIA_ROOT)

            shutil.copy(new_img, bg_img)
            with open(bg_img, "rb") as img:
                with open(md5_file, "w") as f:
                    f.write(hashlib.md5(img.read()).hexdigest())

        elif options["command"] == "unset":
            if os.path.exists(bg_img):
                os.remove(bg_img)
            if os.path.exists(md5_file):
                os.remove(md5_file)

        else:
            self.stderr.write(
                self.style.ERROR(
                    "Unrecognized command. Try running:\n  kolibri manage background --help"
                ).format(options["command"])
            )
