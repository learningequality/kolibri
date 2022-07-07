import abc
import logging

from django.core.management.base import BaseCommand

from kolibri.core.tasks.utils import JobProgressMixin

logger = logging.getLogger(__name__)


class AsyncCommand(JobProgressMixin, BaseCommand):
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

    def handle(self, *args, **options):
        return self.handle_async(*args, **options)

    @abc.abstractmethod
    def handle_async(self, *args, **options):
        """
        handle_async should be reimplemented by any Subclass of AsyncCommand.
        """
        pass
