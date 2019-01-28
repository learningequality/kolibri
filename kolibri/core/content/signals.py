from django.db.models import F
from django.db.models.signals import pre_delete
from django.dispatch import receiver

from .models import ChannelMetadata


@receiver(pre_delete, sender=ChannelMetadata)
def reorder_channels_upon_deletion(sender, instance=None, *args, **kwargs):
    """
    For a given channel, decrement the order of all channels that come after this channel.
    """
    ChannelMetadata.objects.filter(order__gt=instance.order).update(order=F('order') - 1)
