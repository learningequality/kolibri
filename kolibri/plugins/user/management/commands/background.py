from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging
import os
import shutil

from django.conf import settings
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):

    def add_arguments(self, parser):
        subparser = parser.add_subparsers(dest='command', help="The following subcommands are available.")
        set_img_subparser = subparser.add_parser(
            name='set',
            cmd=self,
            help="EXPERIMENTAL: Sets the login screen background image"
        )
        set_img_subparser.add_argument(
            'destination',
            type=str,
            help='Image file'
        )
        subparser.add_parser(
            name='none',
            cmd=self,
            help="Set default"
        )
        subparser.add_parser(
            name='default',
            cmd=self,
            help="Set default"
        )

    def backup(self, img_path, backup_img_path):
        # Only save a backup if it didn't exist before.
        # This should only back up the default Kolibri image.
        if not os.path.exists(backup_img_path) and os.path.exists(img_path):
            shutil.copy(img_path, backup_img_path)

    def handle(self, *args, **options):
        user_static_directory = os.path.join(settings.STATIC_ROOT, 'user_module')

        if not os.path.exists(user_static_directory):
            self.stderr.write(self.style.ERROR(
                '\nStatic directory does not exist yet. Try running the server first.'
            ))
            raise SystemExit(1)

        img_path = os.path.join(user_static_directory, 'background.jpg')
        backup_img_path = os.path.join(user_static_directory, 'background-backup')

        if options['command'] == 'set':

            self.stdout.write(self.style.WARNING(
                '\nCAUTION:\n'
                'Setting the background image is experimental functionality.\n'
                'Your changes may be reverted in a future update or upgrade.\n'
            ))

            new_img_path = os.path.abspath(os.path.expanduser(options['destination']))
            if not os.path.exists(new_img_path):
                self.stderr.write(
                    self.style.ERROR('\n{} does not exist.').format(options['destination'])
                )
                raise SystemExit(1)

            self.backup(img_path, backup_img_path)
            shutil.copy(new_img_path, img_path)

        elif options['command'] == 'none':
            self.backup(img_path, backup_img_path)
            # write an empty file
            open(img_path, 'w').close()

        elif options['command'] == 'default':
            if os.path.exists(backup_img_path):
                shutil.copy(backup_img_path, img_path)
