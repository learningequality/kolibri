import json
import logging
import os
import sys

from django.conf import settings
from django.core.exceptions import ValidationError
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


def _check_setting(name, available, msg):
    if name not in available:
        raise CommandError(msg.format(name))


def check_facility_setting(name):
    AVAILABLE_SETTINGS = [
        "learner_can_edit_username",
        "learner_can_edit_name",
        "learner_can_edit_password",
        "learner_can_sign_up",
        "learner_can_delete_account",
        "learner_can_login_with_no_password",
        "show_download_button_in_learn",
    ]
    _check_setting(
        name,
        AVAILABLE_SETTINGS,
        "'{}' is not a facility setting that can be changed by this command",
    )


def check_device_setting(name):
    AVAILABLE_SETTINGS = [
        "language_id",
        "landing_page",
        "allow_guest_access",
        "allow_peer_unlisted_channel_import",
        "allow_learner_unassigned_resource_access",
        "name",
        "allow_other_browsers_to_connect",
    ]
    _check_setting(
        name,
        AVAILABLE_SETTINGS,
        "'{}' is not a device setting that can be changed by this command",
    )


def get_user_response(prompt, valid_answers=None, to_lower_case=True):
    answer = None
    while not answer or (
        valid_answers is not None and answer.lower() not in valid_answers
    ):
        answer = six.moves.input(prompt)
    if to_lower_case:
        return answer.lower()
    else:
        return answer


languages = dict(settings.LANGUAGES)


def create_facility(facility_name=None, preset=None, interactive=False):
    if facility_name is None and interactive:
        answer = get_user_response(
            "Do you wish to create a facility? [y/n] ", ["y", "n"]
        )
        if answer == "y":
            facility_name = get_user_response(
                "What do you wish to name your facility? ", to_lower_case=False
            )
        else:
            sys.exit(1)

    if facility_name:
        facility_query = Facility.objects.filter(name__iexact=facility_name)

        if facility_query.exists():
            facility = facility_query.get()
            logger.warn(
                "Facility with name '{name}' already exists, not modifying preset.".format(
                    name=facility.name
                )
            )
            return facility
        else:
            facility = Facility.objects.create(name=facility_name)
            logger.info(
                "Facility with name '{name}' created.".format(name=facility.name)
            )

        if preset is None and interactive:
            preset = get_user_response(
                "Which preset do you wish to use? [{presets}]: ".format(
                    presets="/".join(presets.keys())
                ),
                valid_answers=presets,
            )

        # Only set preset data if we have created the facility, otherwise leave previous data intact
        if preset:
            dataset_data = mappings[preset]
            facility.dataset.preset = preset
            for key, value in dataset_data.items():
                check_facility_setting(key)
                setattr(facility.dataset, key, value)
            facility.dataset.save()
            logger.info("Facility preset changed to {preset}.".format(preset=preset))
    else:
        facility = Facility.get_default_facility() or Facility.objects.first()
        if not facility:
            raise CommandError("No facility exists")
    return facility


def update_facility_settings(facility, new_settings):
    # Override any settings passed in
    for key, value in new_settings.items():
        check_facility_setting(key)
        setattr(facility.dataset, key, value)
    facility.dataset.save()

    if new_settings:
        logger.info("Facility settings updated with {}".format(new_settings))


def create_superuser(username=None, password=None, interactive=False, facility=None):
    if username is None and interactive:
        username = get_user_response("Enter a username for the super user: ")

    if password is None and interactive:
        confirm = ""
        while password != confirm:
            password = get_user_response("Enter a password for the super user: ")
            confirm = get_user_response("Confirm password for the super user: ")

    if username and password:
        try:
            FacilityUser.objects.create_superuser(username, password, facility=facility)
            logger.info(
                "Superuser created with username '{username}' in facility '{facility}'.".format(
                    username=username, facility=facility
                )
            )
        except ValidationError:
            logger.warn(
                "An account with username '{username}' already exists in facility '{facility}', not creating user account.".format(
                    username=username, facility=facility
                )
            )


def create_device_settings(
    language_id=None, facility=None, interactive=False, new_settings={}
):
    if language_id is None and interactive:
        language_id = get_user_response(
            "Enter a default language code [{langs}]: ".format(
                langs=",".join(languages.keys())
            ),
            valid_answers=languages,
        )
    # Override any settings passed in
    for key in new_settings:
        check_device_setting(key)

    settings_to_set = dict(new_settings)
    settings_to_set["language_id"] = language_id
    settings_to_set["default_facility"] = facility

    provision_device(**settings_to_set)
    logger.info("Device settings updated with {}".format(settings_to_set))


def json_file_contents(parser, arg):
    if not os.path.exists(arg) or not os.path.isfile(arg):
        return parser.error("The file '{}' does not exist".format(arg))
    with open(arg, "r") as f:
        try:
            output = json.load(f)
        except json.decoder.JSONDecodeError as e:
            return parser.error("The file '{}' is not valid JSON:\n{}".format(arg, e))
    return output


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
        parser.add_argument(
            "--facility_settings",
            action="store",
            help="JSON file containing facility settings",
            type=lambda arg: json_file_contents(parser, arg),
            default={},
        )
        parser.add_argument(
            "--device_settings",
            action="store",
            help="JSON file containing device settings",
            type=lambda arg: json_file_contents(parser, arg),
            default={},
        )

    def handle(self, *args, **options):

        logger.warn(
            "The 'provisiondevice' command is experimental, and the API and behavior will change in a future release"
        )

        with transaction.atomic():
            facility = create_facility(
                facility_name=options["facility"],
                preset=options["preset"],
                interactive=options["interactive"],
            )

            update_facility_settings(facility, options["facility_settings"])

            create_device_settings(
                language_id=options["language_id"],
                facility=facility,
                interactive=options["interactive"],
                new_settings=options["device_settings"],
            )

            create_superuser(
                username=options["superusername"],
                password=options["superuserpassword"],
                interactive=options["interactive"],
                facility=facility,
            )
