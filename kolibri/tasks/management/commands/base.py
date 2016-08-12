from tqdm import tqdm
from collections import namedtuple
from django.core.management.base import BaseCommand


Progress = namedtuple('Progress', ['progress', 'total', 'message'])


class ProgressTracker():

    def __init__(self, total=100, update_func=None):
        self.progressbar = tqdm(total=total)
        self.total = total

        self.progress = 0

        # custom progress bar provided by programmer
        self.custom_update_progress_func = update_func or _nullop

    def update_progress(self, increment=1, message=""):
        self.progressbar.update(increment)

        p = Progress(progress=self.progress, total=self.total, message=message)
        self.custom_update_progress_func(increment, p)

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

        return self.handle_async(*args, **options)

    start_progress = ProgressTracker


def _nullop(*args, **kwargs):
    # heh, are all our actions just for naught?
    pass
