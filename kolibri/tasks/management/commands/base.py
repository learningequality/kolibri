from collections import namedtuple
from django.core.management.base import BaseCommand


Progress = namedtuple('Progress', ['progress', 'overall'])


class AsyncCommand(BaseCommand):

    CELERY_PROGRESS_STATE_NAME = "PROGRESS"

    def handle(self, *args, **options):
        self.update_state = options.pop("update_state", id)

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
