from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import atexit
import logging
import os
import subprocess
import sys
from threading import Thread

from django.contrib.staticfiles.management.commands.runserver import Command as RunserverCommand
from django.core.management.base import CommandError

from kolibri.content.utils.annotation import update_channel_metadata

logger = logging.getLogger(__name__)


class Command(RunserverCommand):
    """
    Subclass the RunserverCommand from Staticfiles to optionally run webpack.
    """

    def __init__(self, *args, **kwargs):
        self.webpack_cleanup_closing = False
        self.webpack_process = None

        self.karma_cleanup_closing = False
        self.karma_process = None

        super(Command, self).__init__(*args, **kwargs)

    def add_arguments(self, parser):
        parser.add_argument(
            '--webpack',
            action='store_true',
            dest='webpack',
            default=False,
            help='Tells Django runserver to spawn a webpack watch subprocess.',
        )
        parser.add_argument(
            '--karma',
            action='store_true',
            dest='karma',
            default=False,
            help='Tells Django runserver to spawn a karma test watch subprocess.', )
        super(Command, self).add_arguments(parser)

    def handle(self, *args, **options):

        if options["webpack"]:
            self.spawn_webpack()
        if options["karma"]:
            self.spawn_karma()

        update_channel_metadata()

        return super(Command, self).handle(*args, **options)

    def spawn_webpack(self):
        self.spawn_subprocess(
            "webpack_process",
            self.start_webpack,
            self.kill_webpack_process)

    def spawn_karma(self):
        self.spawn_subprocess("karma_process", self.start_karma,
                              self.kill_karma_process)

    def spawn_subprocess(self, process_name, process_start, process_kill,
                         **kwargs):
        # We're subclassing runserver, which spawns threads for its
        # autoreloader with RUN_MAIN set to true, we have to check for
        # this to avoid running browserify twice.
        if not os.getenv('RUN_MAIN', False) and not getattr(
                self, process_name):
            subprocess_thread = Thread(target=process_start, kwargs=kwargs)
            subprocess_thread.daemon = True
            subprocess_thread.start()
            atexit.register(process_kill)

    def kill_webpack_process(self):

        if self.webpack_process and self.webpack_process.returncode is not None:
            return

        logger.info('Closing webpack process')

        self.webpack_cleanup_closing = True

        self.webpack_process.terminate()

    def start_webpack(self, lint=False):

        cli_command = 'yarn run watch'
        logger.info(
            'Starting webpack process from Django runserver command')

        self.webpack_process = subprocess.Popen(
            cli_command,
            shell=True,
            stdin=subprocess.PIPE,
            stdout=sys.stdout,
            stderr=sys.stderr)

        if self.webpack_process.poll() is not None:
            raise CommandError(
                'Webpack process failed to start from Django runserver command'
            )

        logger.info(
            'Django Runserver command has spawned a Webpack watcher process on pid {0}'.
            format(self.webpack_process.pid))

        self.webpack_process.wait()

        if self.webpack_process.returncode != 0 and not self.webpack_cleanup_closing:
            logger.error("Webpack process exited unexpectedly.")

    def kill_karma_process(self):

        if self.karma_process and self.karma_process.returncode is not None:
            return

        logger.info('Closing karma process')

        self.karma_cleanup_closing = True

        self.karma_process.terminate()

    def start_karma(self):

        logger.info(
            'Starting karma test watcher process from Django runserver command'
        )

        self.karma_process = subprocess.Popen(
            'yarn run test-karma:watch',
            shell=True,
            stdin=subprocess.PIPE,
            stdout=sys.stdout,
            stderr=sys.stderr)

        if self.karma_process.poll() is not None:
            raise CommandError(
                'Karma process failed to start from Django runserver command')

        logger.info(
            'Django Runserver command has spawned a Karma test watcher process on pid {0}'.
            format(self.karma_process.pid))

        self.karma_process.wait()

        if self.karma_process.returncode != 0 and not self.karma_cleanup_closing:
            logger.error("Karma process exited unexpectedly.")
