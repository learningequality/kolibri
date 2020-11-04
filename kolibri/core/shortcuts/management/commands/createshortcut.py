import sys

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db.models import F

from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.models import ContentNode
from kolibri.core.shortcuts.models import Shortcut


class Command(BaseCommand):
    """
    Order the way channels appear.
    """

    def add_arguments(self, parser):
        parser.add_argument("--username", dest="username", type=str)
        parser.add_argument("contentnode_id", type=str)

    def handle(self, *args, **options):
        username = options["username"]
        contentnode_id = options["contentnode_id"]

        if username:
            try:
                user = FacilityUser.objects.get(username=username)
            except FacilityUser.DoesNotExist:
                raise CommandError(
                    "User with username `{username}` does not exist.".format(
                        username=username
                    )
                )
        else:
            user = None

        # TODO: Get by channel_id + content_id?
        contentnode = ContentNode.objects.get(id=contentnode_id)

        shortcut, created = Shortcut.objects.get_or_create(
            user=user, contentnode=contentnode
        )

        if created:
            self.stderr.write("Created shortcut")
        else:
            self.stderr.write("Shortcut already exists")
