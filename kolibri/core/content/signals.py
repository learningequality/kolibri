from django.db.models.signals import pre_delete
from django.dispatch import receiver

from .models import ContentNode
from kolibri.core.notifications.models import LearnerProgressNotification


@receiver(pre_delete, sender=ContentNode)
def cascade_delete_node(sender, instance=None, *args, **kwargs):
    """
    For a given node, we delete all notifications
    objects whose contentnode is the instance's node..
    """
    LearnerProgressNotification.objects.filter(contentnode_id=instance.id).delete()
