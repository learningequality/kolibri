from django.db.models import F
from django.db.models.signals import pre_delete
from django.dispatch import receiver

from .models import ChannelMetadata
from .models import ContentNode
from kolibri.core.auth.models import Facility
from kolibri.core.content.utils.content_request import create_content_download_requests
from kolibri.core.content.utils.content_request import create_content_removal_requests
from kolibri.core.device.utils import get_device_setting
from kolibri.core.notifications.models import LearnerProgressNotification


@receiver(pre_delete, sender=ContentNode)
def cascade_delete_node(sender, instance=None, *args, **kwargs):
    """
    For a given node, we delete all notifications
    objects whose contentnode is the instance's node..
    """
    LearnerProgressNotification.objects.filter(contentnode_id=instance.id).delete()


@receiver(pre_delete, sender=ChannelMetadata)
def reorder_channels_upon_deletion(sender, instance=None, *args, **kwargs):
    """
    For a given channel, decrement the order of all channels that come after this channel.
    """
    if instance.order:
        ChannelMetadata.objects.filter(order__gt=instance.order).update(
            order=F("order") - 1
        )


def add_download_requests(dataset_id, assignments):
    """
    Handles the creation of download requests for the provided list of assignments.
    :param dataset_id: The dataset_id for which download requests are being added.
    :type dataset_id: str
    :param assignments: A list of assignments representing the content to be downloaded.
    :type assignments: list
    """
    if get_device_setting("enable_automatic_download"):
        facility = Facility.objects.get(dataset_id=dataset_id)
        create_content_download_requests(facility, assignments)


def add_removal_requests(dataset_id, assignments):
    """
    Handles the creation of removal requests for the provided assignments.

    :param dataset_id: The dataset_id for which removal requests are bieng generated.
    :type dataset_id: str
    :param assignments: A list of assignments representing the content to be removed.
    :type assignments: list
    """
    if get_device_setting("enable_automatic_download"):
        facility = Facility.objects.get(dataset_id=dataset_id)
        create_content_removal_requests(facility, assignments)
