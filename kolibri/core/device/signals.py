from django.db import transaction
from django.db.models.signals import post_delete
from django.db.models.signals import post_save
from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import DeviceSettings
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


@receiver(pre_save, sender=DeviceSettings)
def stash_previous_device_language(sender, instance=None, *args, **kwargs):
    """
    Record the persisted display language before the save so the post_save
    handler can tell whether this save changed it.
    """
    instance._previous_language_id = (
        DeviceSettings.objects.filter(pk=instance.pk)
        .values_list("language_id", flat=True)
        .first()
    )


@receiver(post_save, sender=DeviceSettings)
def warm_cached_views_on_language_change(sender, instance=None, *args, **kwargs):
    """
    The display language is baked into every cached SPA shell, so re-warm them
    when it is reconfigured. Only on a genuine change to a non-empty language:
    the initial provisioning set (no previous language) is warmed at startup.
    """
    previous_language_id = getattr(instance, "_previous_language_id", None)
    if (
        previous_language_id
        and instance.language_id
        and instance.language_id != previous_language_id
    ):
        # Inline import: kolibri.core.device.tasks imports from this app.
        from kolibri.core.device.tasks import warm_cached_views

        transaction.on_commit(warm_cached_views.enqueue_if_not)
