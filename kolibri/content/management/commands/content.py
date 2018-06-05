from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging
import os
import shutil

from builtins import input
from django.core.management.base import BaseCommand

from kolibri.utils import server
from kolibri.utils.conf import KOLIBRI_HOME
from kolibri.utils.conf import OPTIONS
from kolibri.utils.options import update_options_file

logger = logging.getLogger(__name__)


class Command(BaseCommand):

    def add_arguments(self, parser):
        subparsers = parser.add_subparsers(dest='command', help="The following subcommands are available.")
        movedir_subparser = subparsers.add_parser(
            name='movedirectory',
            cmd=self,
            help="Migrates the content to a specific folder defined by users."
        )
        movedir_subparser.add_argument(
            'destination',
            type=str,
            help='Destination of the new content directory.'
        )

    def handle(self, *args, **options):
        if options['command'] == 'movedirectory':
            self.move_content_directory(options['destination'])

    def move_content_directory(self, dst):
        # Check exsitence of current directory before running the commands.
        content_directory = OPTIONS['Paths']['CONTENT_DIR']
        destination = os.path.abspath(os.path.expanduser(dst))

        if not os.path.exists(content_directory):
            self.stderr.write(
                self.style.ERROR(
                    '\nCurrent content directory {} does not exist.'
                ).format(content_directory))
            raise SystemExit()

        # If the current directory is the same as the destination
        if content_directory == destination:
            self.stderr.write(
                self.style.ERROR(
                    '\nDestination {} is the current content directory.'
                ).format(destination))
            raise SystemExit()

        # Check if Kolibri is running
        try:
            server.get_status()
            self.stderr.write(self.style.ERROR(
                "Cannot migrate content while Kolibri is running, please run:\n"
                "\n"
                "    kolibri stop\n"
            ))
            raise SystemExit()
        except server.NotRunning:
            pass

        self.migrate(content_directory, destination)

    def migrate(self, src, dst):
        """
        Migrate the content from current content directory to the destination.
        """
        logger.info('Current content directory is {}'.format(src))
        logger.info('Migrating the content into {}'.format(dst))

        databases_src = os.path.join(src, 'databases')
        databases_dst = os.path.join(dst, 'databases')
        storage_src = os.path.join(src, 'storage')
        storage_dst = os.path.join(dst, 'storage')

        # Check if destination has content by checking if databases folder is not empty
        dst_content_exists = os.path.exists(databases_dst) and \
            os.listdir(databases_dst)

        # If destination has content inside, ask users if they want to keep the content
        if dst_content_exists:
            self.handle_user_input(src, dst)

        # copy the databases folder
        self.copy_content(databases_src, databases_dst)
        shutil.rmtree(databases_src)

        # copy the storage folder only when the source folder contains it
        if os.path.exists(storage_src):
            self.copy_content(storage_src, storage_dst)
            shutil.rmtree(storage_src)

        self.update_config_content_directory(dst)

    def handle_user_input(self, src, dst):
        """
        If destination has content inside, ask users if they want to keep the
        content in the destination. We will copy the content to destination
        depending on the user response.
        """
        user_answer = input(
            self.style.WARNING(
                'The destination {} has content inside.\n'
                'Do you want to keep the content? (Yes/No)'.format(dst)))

        # If the user does not want to keep the content in the destination,
        # remove the databases folder and storage folder in the destination
        # directory
        if user_answer == 'no' or user_answer == 'No':
            shutil.rmtree(os.path.join(dst, 'databases'))
            shutil.rmtree(os.path.join(dst, 'storage'))

        elif user_answer != 'yes' and user_answer != 'Yes':
            self.stderr.write(
                self.style.ERROR(
                    '{} cannot be an answer to the question. '
                    'Please answer \'Yes\' or \'No\'.'
                    .format(user_answer)))
            raise SystemExit()

    def update_config_content_directory(self, dst):
        """
        Update kolibri_settings.json in KOLIBRI_HOME so that the variable
        CONTENT_DIRECTORY points to the destination content directory.
        """
        update_options_file('Paths', 'CONTENT_DIR', dst, KOLIBRI_HOME)

        self.stdout.write(
            self.style.SUCCESS(
                '\nCurrent content directory is {}'.format(dst)))

    def copy_content(self, src, dst):
        """
        Copy the content from current directory to destination directory.
        """
        if not os.path.exists(dst):
            os.makedirs(dst)
            shutil.copystat(src, dst)
        files = os.listdir(src)
        for file in files:
            src_name = os.path.join(src, file)
            dst_name = os.path.join(dst, file)

            if os.path.isdir(src_name):
                self.copy_content(src_name, dst_name)
            else:
                shutil.copy2(src_name, dst_name)
