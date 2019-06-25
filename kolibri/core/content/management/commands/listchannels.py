from django.core.management.base import BaseCommand

from kolibri.core.content.models import ChannelMetadata


def format_line(pos, ident, name):
    pos = "{:10}".format("{}".format(pos))
    ident = "{:40}".format("{}".format(ident))
    name = "{}".format("{}".format(name))
    return "{pos}{ident}{name}".format(pos=pos, ident=ident, name=name)


class Command(BaseCommand):
    """
    Prints out channel order.
    """

    def handle(self, *args, **options):
        self.stdout.write(format_line("Pos", "ID", "Name"))
        self.stdout.write(format_line("---", "--", "----"))
        for channel in ChannelMetadata.objects.all():
            self.stdout.write(format_line(channel.order, channel.id, channel.name))
