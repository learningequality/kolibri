from tqdm import tqdm
from collections import namedtuple
from django.core.management.base import BaseCommand


Progress = namedtuple(
    'Progress',
    [
        'progress_fraction',
        'message',
        'extra_data',
    ]
)


class ProgressTracker():

    def __init__(self, total=100, update_func=None):
        self.progressbar = tqdm(total=total)
        self.total = total

        self.progress = 0

        # custom progress bar provided by programmer
        if callable(update_func):
            self.custom_update_progress_func = update_func
        else:
            self.custom_update_progress_func = _nullop

    def update_progress(self, increment=1, message="", extra_data=None):
        self.progressbar.update(increment)

        self.progress += increment

        progress_fraction = self.progress / float(self.total)
        p = Progress(
            progress_fraction=progress_fraction,
            message=message,
            extra_data=extra_data,
        )

        self.custom_update_progress_func(progress_fraction, p)

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

    def handle(self, *args, **options):
        self.update_progress = options.pop("update_state", None)

        return self.handle_async(*args, **options)

    def start_progress(self, total=100):
        return ProgressTracker(total=total, update_func=self.update_progress)


def _nullop(*args, **kwargs):
    # heh, are all our actions just for naught?
    pass
