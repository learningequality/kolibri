import abc
from collections import namedtuple

import click
from django.core.management.base import BaseCommand

from kolibri.core.tasks.exceptions import UserCancelledError
from kolibri.core.tasks.utils import get_current_job

Progress = namedtuple(
    "Progress", ["progress_fraction", "message", "extra_data", "level"]
)


class ProgressTracker:
    def __init__(self, total=100, level=0, update_callback=None):

        # set default values
        self.progress = 0
        self.message = ""
        self.extra_data = None

        # store provided arguments
        self.total = total
        self.level = level
        self.update_callback = update_callback

        try:
            # Check we are executing inside a click context
            # as we only want to display progress bars from the command line
            click.get_current_context()
            self.progressbar = click.progressbar(length=total, width=0)
        except RuntimeError:
            self.progressbar = None

    def update_progress(self, increment=1, message="", extra_data=None):
        if self.progressbar:
            self.progressbar.update(increment)
        self.progress += increment
        self.message = message
        self.extra_data = extra_data

        if callable(self.update_callback):
            p = self.get_progress()
            self.update_callback(p.progress_fraction, p)

    def get_progress(self):

        return Progress(
            progress_fraction=0
            if self.total == 0
            else self.progress / float(self.total),
            message=self.message,
            extra_data=self.extra_data,
            level=self.level,
        )

    def __enter__(self):
        return self.update_progress

    def __exit__(self, *exc_details):
        pass


class AsyncCommand(BaseCommand):
    """A management command with added convenience functions for displaying
    progress to the user.

    Rather than implementing handle() (as is for BaseCommand), subclasses, must
    implement handle_async(), which accepts the same arguments as handle().

    If ran from the command line, AsynCommand displays a progress bar to the
    user. If ran asynchronously through kolibri.core.tasks.schedule_command(),
    AsyncCommand sends results through the Progress class to the main Django
    process. Anyone who knows the task id for the command instance can check
    the intermediate progress by looking at the task's AsyncResult.result
    variable.

    """

    def __init__(self, *args, **kwargs):
        self.progresstrackers = []
        super(AsyncCommand, self).__init__(*args, **kwargs)

    def _update_all_progress(self, progress_fraction, progress):
        if callable(self.update_progress):
            progress_list = [p.get_progress() for p in self.progresstrackers]
            # HACK (aron): self.update_progress' signature has changed between django_q
            # and iceqube/bbq. It now expects the current progress,
            # the total progress, and then derives the
            # percentage progress manually.
            self.update_progress(progress_list[0].progress_fraction, 1.0)

    def handle(self, *args, **options):
        self.job = get_current_job()
        return self.handle_async(*args, **options)

    def update_progress(self, progress_fraction, total_progress):
        if self.job:
            self.job.update_progress(progress_fraction, total_progress)

    def check_for_cancel(self):
        if self.job:
            self.job.check_for_cancel()

    def start_progress(self, total=100):
        level = len(self.progresstrackers)
        tracker = ProgressTracker(
            total=total, level=level, update_callback=self._update_all_progress
        )
        self.progresstrackers.append(tracker)
        return tracker

    def is_cancelled(self):
        try:
            self.check_for_cancel()
            return False
        except (UserCancelledError, KeyError):
            return True

    def cancel(self):
        return self.check_for_cancel()

    @abc.abstractmethod
    def handle_async(self, *args, **options):
        """
        handle_async should be reimplemented by any Subclass of AsyncCommand.
        """
        pass
