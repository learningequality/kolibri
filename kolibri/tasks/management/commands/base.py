from collections import namedtuple
from django.core.management.base import BaseCommand


Progress = namedtuple('Progress', ['progress', 'overall'])


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

    def _identity(*args, **kwargs):
        # heh, are we all just NoneTypes after all?
        pass

    def handle(self, *args, **options):
        self.update_state = options.pop("update_state", self._identity)

        self.handle_async(*args, **options)

    def set_progress(self, progress, overall=None, message=None):
        overall = overall or self.get_overall()
        progress = Progress(progress, overall)
        self.update_state(state=self.CELERY_PROGRESS_STATE_NAME,
                          meta=progress)

    def get_overall():
        pass

    def set_overall():
        pass
