import logging

from django.conf import settings
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from django.db import transaction
from django.utils import six

from kolibri.core.auth.constants.facility_presets import mappings
from kolibri.core.auth.constants.facility_presets import presets
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.utils import provision_device

logger = logging.getLogger(__name__)


def get_user_response(prompt, valid_answers=None):
    answer = None
    while not answer or (
        valid_answers is not None and answer.lower() not in valid_answers
    ):
        answer = six.moves.input(prompt)
    return answer.lower()


languages = dict(settings.LANGUAGES)


def create_facility(facility_name=None, preset=None, interactive=False):
    if facility_name is None and interactive:
        answer = get_user_response(
            "Do you wish to create a facility? [yn] ", ["y", "n"]
        )
        if answer == "y":
            facility_name = get_user_response(
                "What do you wish to name your facility? "
            )

    if facility_name:
        facility, created = Facility.objects.get_or_create(name=facility_name)

        if not created:
            logger.warn(
                "Facility with name {name} already exists, not modifying preset.".format(
                    name=facility_name
                )
            )
            return facility

        logger.info("Facility with name {name} created.".format(name=facility_name))

        if preset is None and interactive:
            preset = get_user_response(
                "Which preset do you wish to use? [{presets}]: ".format(
                    presets=",".join(presets.keys())
                ),
                valid_answers=presets,
            )

        # Only set preset data if we have created the facility, otherwise leave previous data intact
        if preset:
            dataset_data = mappings[preset]
            for key, value in dataset_data.items():
                setattr(facility.dataset, key, value)
            facility.dataset.save()
            logger.info("Facility preset changed to {preset}.".format(preset=preset))
    else:
        facility = Facility.get_default_facility() or Facility.objects.first()
        if not facility:
            raise CommandError("No facility exists")
    return facility


def create_superuser(username=None, password=None, interactive=False):
    if username is None and interactive:
        username = get_user_response("Enter a username for the super user: ")

    if password is None and interactive:
        confirm = ""
        while password != confirm:
            password = get_user_response("Enter a password for the super user: ")
            confirm = get_user_response("Confirm password for the super user: ")

    if username and password:
        if not FacilityUser.objects.filter(username__icontains=username).exists():
            FacilityUser.objects.create_superuser(username, password)
            logger.info(
                "Superuser created with username {username}.".format(username=username)
            )
        else:
            logger.warn(
                "An account with username {username} already exists, not creating user account.".format(
                    username=username
                )
            )


def create_device_settings(language_id=None, facility=None, interactive=False):
    if language_id is None and interactive:
        language_id = get_user_response(
            "Enter a default language code [{langs}]: ".format(
                langs=",".join(languages.keys())
            ),
            valid_answers=languages,
        )
    provision_device(language_id=language_id, default_facility=facility)


class Command(BaseCommand):
    help = "Provision a device for use"

    def add_arguments(self, parser):
        parser.add_argument(
            "--facility", action="store", type=str, help="Facility name to create"
        )
        parser.add_argument(
            "--superusername",
            action="store",
            type=str,
            help="Superuser username to create",
        )
        parser.add_argument(
            "--superuserpassword",
            action="store",
            type=str,
            help="Superuser password to create",
        )
        parser.add_argument(
            "--preset",
            action="store",
            type=str,
            help="Facility preset to use",
            choices=presets,
        )
        parser.add_argument(
            "--language_id",
            action="store",
            type=str,
            help="Language id for default language",
            choices=languages,
        )
        parser.add_argument(
            "--noinput",
            "--no-input",
            action="store_false",
            dest="interactive",
            default=True,
            help="Tells Django to NOT prompt the user for input of any kind.",
        )

    def handle(self, *args, **options):
        with transaction.atomic():
            facility = create_facility(
                facility_name=options["facility"],
                preset=options["preset"],
                interactive=options["interactive"],
            )

            create_device_settings(
                language_id=options["language_id"],
                facility=facility,
                interactive=options["interactive"],
            )

            create_superuser(
                username=options["superusername"],
                password=options["superuserpassword"],
                interactive=options["interactive"],
            )
