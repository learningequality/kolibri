import json
import logging
import os
import sys

from django.conf import settings
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from django.utils import six

from kolibri.core.auth.constants.facility_presets import presets
from kolibri.core.device.utils import get_facility_by_name
from kolibri.core.device.utils import setup_device_and_facility
from kolibri.core.device.utils import validate_device_settings
from kolibri.core.device.utils import validate_facility_settings

logger = logging.getLogger(__name__)


def get_user_response(prompt, valid_answers=None, to_lower_case=True):
    answer = None
    while not answer or (
        valid_answers is not None and answer.lower() not in valid_answers
    ):
        answer = six.moves.input(prompt)
    if to_lower_case:
        return answer.lower()
    return answer


languages = dict(settings.LANGUAGES)


def json_file_contents(parser, arg):
    if not os.path.exists(arg) or not os.path.isfile(arg):
        return parser.error("The file '{}' does not exist".format(arg))
    with open(arg, "r") as f:
        try:
            return json.load(f)
        except ValueError as e:  # Use ValueError rather than JSONDecodeError for Py2 compatibility
            return parser.error("The file '{}' is not valid JSON:\n{}".format(arg, e))


def get_all_user_input(facility_name, preset, language_id, username, password):
    if facility_name is None:
        answer = get_user_response(
            "Do you wish to create a facility? [y/n] ", ["y", "n"]
        )
        if answer == "y":
            facility_name = get_user_response(
                "What do you wish to name your facility? ", to_lower_case=False
            )
        else:
            sys.exit(1)

    if facility_name is not None and preset is None:
        preset = get_user_response(
            "Which preset do you wish to use? [{presets}]: ".format(
                presets="/".join(presets.keys())
            ),
            valid_answers=presets,
        )

    if language_id is None:
        language_id = get_user_response(
            "Enter a default language code [{langs}]: ".format(
                langs=",".join(languages.keys())
            ),
            valid_answers=languages,
        )

    if username is None:
        username = get_user_response("Enter a username for the super user: ")

    if password is None:
        confirm = ""
        while password != confirm:
            password = get_user_response("Enter a password for the super user: ")
            confirm = get_user_response("Confirm password for the super user: ")

    return facility_name, preset, language_id, username, password


def validate_options(options):
    interactive = options["interactive"]
    facility_name = options["facility"]
    preset = options["preset"]
    language_id = options["language_id"]
    username = options["superusername"]
    password = options["superuserpassword"]

    if interactive:
        facility_name, preset, language_id, username, password = get_all_user_input(
            facility_name, preset, language_id, username, password
        )

    facility = get_facility_by_name(facility_name)

    if not facility and not facility_name:
        raise CommandError("No facility exists")

    try:
        device_settings = validate_device_settings(
            language_id=language_id, facility=facility, **options["device_settings"]
        )
    except ValueError as e:
        raise CommandError(str(e))

    try:
        facility_settings = validate_facility_settings(options["facility_settings"])
    except ValueError as e:
        raise CommandError(str(e))

    return (
        facility,
        facility_name,
        preset,
        facility_settings,
        device_settings,
        username,
        password,
    )


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

        (
            facility,
            facility_name,
            preset,
            facility_settings,
            device_settings,
            username,
            password,
        ) = validate_options(options)

        setup_device_and_facility(
            facility,
            facility_name,
            preset,
            facility_settings,
            device_settings,
            username,
            password,
        )
