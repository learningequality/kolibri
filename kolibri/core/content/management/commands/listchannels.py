from django.core.management.base import BaseCommand

from kolibri.core.content.models import ChannelMetadata


def format_line(pos, ident, name):
    pos = "{:10}".format(f"{pos}")
    ident = "{:40}".format(f"{ident}")
    name = "{}".format(f"{name}")
    return f"{pos}{ident}{name}"


class Command(BaseCommand):
    """
    Prints out channel order.
    """

    def handle(self, *args, **options):
        self.stdout.write(format_line("Pos", "ID", "Name"))
        self.stdout.write(format_line("---", "--", "----"))
        for channel in ChannelMetadata.objects.all():
            self.stdout.write(format_line(channel.order, channel.id, channel.name))
