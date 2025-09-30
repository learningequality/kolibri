from django.db import transaction
from django.db.models.signals import post_delete
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import SyncQueue
from .models import UserSyncStatus


@receiver(post_delete, sender=SyncQueue)
def sync_queue_delete_update_user_sync_status(sender, instance=None, *args, **kwargs):
    """
    When a sync queue object is deleted, we update the user sync status, since it's an aggregate
    of all the sync queue objects for a given user.
    """

    def update_status_after_commit():
        UserSyncStatus.update_status(instance.user_id)

    transaction.on_commit(update_status_after_commit)


@receiver(post_save, sender=SyncQueue)
def sync_queue_save_update_user_sync_status(sender, instance=None, *args, **kwargs):
    """
    When a sync queue object is saved, we update the user sync status, since it's an aggregate
    of all the sync queue objects for a given user.
    """

    def update_status_after_commit():
        UserSyncStatus.update_status(instance.user_id)

    transaction.on_commit(update_status_after_commit)
