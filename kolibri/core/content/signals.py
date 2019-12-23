from django.db.models import F
from django.db.models.signals import pre_delete
from django.dispatch import receiver

from .models import ChannelMetadata
from .models import ContentNode
from kolibri.core.lessons.models import Lesson
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


@receiver(pre_delete, sender=ChannelMetadata)
def update_lesson_resources_before_delete(sender, instance=None, *args, **kwargs):
    # Update the resources array of all lessons to ensure they don't have
    # any deleted content
    lessons = Lesson.objects.filter(resources__contains=instance.id)
    for lesson in lessons:
        updated_resources = [
            r for r in lesson.resources if r["channel_id"] != instance.id
        ]
        if len(updated_resources) < len(lesson.resources):
            lesson.resources = updated_resources
            lesson.save()
