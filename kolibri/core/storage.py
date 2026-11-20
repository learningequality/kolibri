from django.conf import settings
from django.core.files.storage import get_storage_class
from django.core.signals import setting_changed
from django.dispatch import receiver
from django.utils.functional import empty
from django.utils.functional import LazyObject


class PrivateStorage(LazyObject):
    def _setup(self):
        storage_class = get_storage_class(settings.PRIVATE_FILE_STORAGE["BACKEND"])
        self._wrapped = storage_class(**settings.PRIVATE_FILE_STORAGE["OPTIONS"])


private_storage = PrivateStorage()


@receiver(setting_changed)
def reset_private_storage(setting, **kwargs):
    if setting == "PRIVATE_FILE_STORAGE":
        private_storage._wrapped = empty
