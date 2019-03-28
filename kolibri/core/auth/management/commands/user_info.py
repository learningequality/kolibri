import json
import logging
import os

from django.core import serializers
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from django.db.models import Model

from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.serializers import FacilityUserSerializer
from kolibri.core.device.models import DevicePermissions

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "To allow administrators to comply with GDPR requests, this command dumps all associated data for a user to several files."

    def add_arguments(self, parser):
        parser.add_argument(
            "username", action="store", type=str, help="Username of user for data dump"
        )

    def handle(self, *args, **options):
        try:
            user = FacilityUser.objects.get(username=options["username"])
        except FacilityUser.DoesNotExist:
            raise CommandError(
                "User with username `{username}` does not exist.".format(
                    username=options["username"]
                )
            )

        # create username directory to hold associated files
        cwd = os.getcwd()
        directory_location = os.path.join(cwd, user.username)
        if not os.path.isdir(directory_location):
            os.makedirs(directory_location)

        # write basic user data to file
        file_name = "{user}.txt".format(user=user.username)
        file_location = os.path.join(directory_location, file_name)
        data = FacilityUserSerializer(user).data
        logger.info("Writing user data to {file}...".format(file=file_location))
        with open(file_location, "w") as outfile:
            json.dump(data, outfile, sort_keys=True, indent=4)

        # get related managers for user model
        managers = []
        for related_object in user._meta.related_objects:
            try:
                managers.append(getattr(user, related_object.get_accessor_name()))
            # regular users do not have device permissions
            except (DevicePermissions.DoesNotExist,):
                pass

        # write data for each model to a file
        for manager in managers:
            # currently accounts for one-to-one field on DevicePermissions
            if isinstance(manager, Model):
                file_name = "{model}.txt".format(
                    model=manager.__class__.__name__.lower()
                )
                models = [manager]
            else:
                file_name = "{model}.txt".format(model=manager.model.__name__.lower())
                models = manager.all()
            file_location = os.path.join(directory_location, file_name)
            # only create file if models exist
            if models:
                data = serializers.serialize("json", models, indent=4)
                logger.info("Writing data to {file}...".format(file=file_location))
                with open(file_location, "w") as outfile:
                    outfile.write(data)
