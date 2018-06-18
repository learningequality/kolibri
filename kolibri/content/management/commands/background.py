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
        subparsers = parser.add_subparsers(dest='command', help="The following subcommands are available.")
        movedir_subparser = subparsers.add_parser(
            name='set',
            cmd=self,
            help="EXPERIMENTAL: Sets the login screen background image"
        )
        movedir_subparser.add_argument(
            'destination',
            type=str,
            help='Image file'
        )
        subparsers.add_parser(
            name='reset',
            cmd=self,
            help="Set default"
        )
        subparsers.add_parser(
            name='none',
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
            self.stderr.write(self.style.ERROR('\nStatic directory does not exist.'))
            raise SystemExit(1)

        img_path = os.path.join(user_static_directory, 'background.jpg')
        backup_img_path = os.path.join(user_static_directory, 'background-backup')

        if options['command'] == 'set':
            new_img_path = os.path.abspath(os.path.expanduser(options['destination']))
            if not os.path.exists(new_img_path):
                self.stderr.write(
                    self.style.ERROR('\n{} does not exist.').format(options['destination'])
                )
                raise SystemExit(1)

            self.backup(img_path, backup_img_path)
            shutil.copy(new_img_path, img_path)

        elif options['command'] == 'clear':
            self.backup(img_path, backup_img_path)
            os.unlink(img_path)

        elif options['command'] == 'reset':
            if os.path.exists(backup_img_path):
                shutil.copy(backup_img_path, img_path)
