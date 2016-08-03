from tqdm import tqdm
from collections import namedtuple
from django.core.management.base import BaseCommand


Progress = namedtuple('Progress', ['progress', 'total'])


class ProgressTracker():

    def __init__(self, total=100, update_func=None):
        if update_func:     # custom progress bar provided by programmer
            self.update_progress = update_func
            self.progressbar = None
        else:                   # standard progress bar progress tracking
            self.progressbar = tqdm(total=total)
            self.update_progress = self.progressbar.update

    def __enter__(self):
        return self.update_progress

    def __exit__(self, *exc_details):
        if self.progressbar:
            self.progressbar.close()


class AsyncCommand(BaseCommand):
    """A management command with added convenience functions for displaying
    progress to the user.

    Rather than implementing handle() (as is for BaseCommand), subclasses, must
    implement handle_async(), which accepts the same arguments as handle().

    If ran from the command line, AsynCommand displays a progress bar to the
    user. If ran asynchronously through kolibri.tasks.schedule_command(),
    AsyncCommand sends results through the Progress class to the main Django
    process. Anyone who knows the task id for the command instance can check
    the intermediate progress by looking at the task's AsyncResult.result
    variable.

    """

    CELERY_PROGRESS_STATE_NAME = "PROGRESS"

    def handle(self, *args, **options):
        self.update_progress = options.pop("update_state", None)

        self.handle_async(*args, **options)

    start_progress = ProgressTracker


def _identity(*args, **kwargs):
    # heh, are we all just NoneTypes after all?
    pass
