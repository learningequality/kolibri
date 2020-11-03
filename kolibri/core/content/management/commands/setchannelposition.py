import sys

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db.models import F

from kolibri.core.content.models import ChannelMetadata


class Command(BaseCommand):
    """
    Order the way channels appear.
    """

    def add_arguments(self, parser):
        parser.add_argument("channel_id", type=str)
        parser.add_argument("pos", type=int)

    def handle(self, *args, **options):
        channel_id = options["channel_id"]
        position = options["pos"]
        count = ChannelMetadata.objects.count()

        try:
            target_channel = ChannelMetadata.objects.get(id=channel_id)
        except (ChannelMetadata.DoesNotExist, ValueError):
            self.stderr.write("Channel with ID {} does not exist".format(channel_id))
            sys.exit(1)

        if position < 1 or position > count:
            self.stderr.write(
                "Invalid position {}. Please choose a value between [1-{}].".format(
                    position, count
                )
            )
            sys.exit(1)

        ChannelMetadata.objects.filter(
            order__lt=(target_channel.order or 0), order__gte=position
        ).update(order=F("order") + 1)
        ChannelMetadata.objects.filter(
            order__gt=(target_channel.order or 0), order__lte=position
        ).update(order=F("order") - 1)
        target_channel.order = position
        target_channel.save()
        call_command("listchannels")
