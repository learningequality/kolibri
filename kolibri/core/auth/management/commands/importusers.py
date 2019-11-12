import csv
import logging

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from django.db import transaction

from kolibri.core.auth.constants.demographics import DEMO_FIELDS
from kolibri.core.auth.csv_utils import infer_facility
from kolibri.core.auth.csv_utils import input_fields
from kolibri.core.auth.csv_utils import labels
from kolibri.core.auth.csv_utils import map_input
from kolibri.core.auth.csv_utils import transform_inputs
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser

logger = logging.getLogger(__name__)


DEFAULT_PASSWORD = "kolibri"


def validate_username(user):
    # Check if username is specified, if not, throw an error
    if "username" not in user or user["username"] is None:
        raise CommandError("No usernames specified, this is required for user creation")


def infer_and_create_class(class_id, facility):
    if class_id:
        try:
            # Try lookup by id first, then name
            classroom = Classroom.objects.get(pk=class_id, parent=facility)
        except (Classroom.DoesNotExist, ValueError):
            try:
                classroom = Classroom.objects.get(name=class_id, parent=facility)
            except Classroom.DoesNotExist:
                classroom = Classroom.objects.create(name=class_id, parent=facility)
        return classroom


def update_user_demographics(user_dict, user_model):
    username = user_dict["username"]
    user_updated = any(user_dict.get(key, None) is not None for key in DEMO_FIELDS)

    if not user_updated:
        return

    user_updated = False

    if user_dict.get("gender", None) is not None:
        value = transform_inputs("gender", user_dict)
        user_updated = user_updated or value != user_model.gender
        user_model.gender = value

    if user_dict.get("birth_year", None) is not None:
        value = transform_inputs("birth_year", user_dict)
        user_updated = user_updated or value != user_model.birth_year
        user_model.birth_year = value

    if user_dict.get("id_number", None) is not None:
        value = user_dict["id_number"]
        user_updated = user_updated or value != user_model.id_number
        user_model.id_number = value

    try:
        if user_updated:
            user_model.full_clean()
            user_model.save()
            logger.info(
                'User "{username}" was updated with demographic info'.format(
                    username=username
                )
            )

    except ValidationError as e:
        logger.error(
            'Tried to update demographic info for "{username}", but invalid values were given for fields: {keys}'.format(
                username=username, keys=list(e.error_dict.keys())
            )
        )


def get_facility(user, default_facility):
    try:
        return infer_facility(user.get("facility", None), facility=default_facility)
    except ValueError:
        raise CommandError(
            "Facility name/id not found. Please make sure that the facility name/id {} in the CSV file exists on the device.".format(
                user.get("facility", None)
            )
        )


def create_user(user, default_facility=None):
    validate_username(user)
    facility = get_facility(user, default_facility)
    classroom = infer_and_create_class(user.get("class", None), facility)
    username = user["username"]
    password = user.get("password", "")
    try:
        user_obj = FacilityUser.objects.get(username=username, facility=facility)
        if password:
            user_obj.set_password(password)
            user_obj.save()
        update_user_demographics(user, user_obj)

        if classroom and not user_obj.is_member_of(classroom):
            classroom.add_member(user_obj)
            logger.info(
                'Existing user "{username}" was added to a classroom "{classroom}"'.format(
                    username=username, classroom=classroom.name
                )
            )

        return False

    except FacilityUser.DoesNotExist:
        password = user.get("password", DEFAULT_PASSWORD) or DEFAULT_PASSWORD
        full_name = user.get("full_name", "") or username
        try:
            new_user = FacilityUser.objects.create_user(
                full_name=full_name,
                username=username,
                facility=facility,
                password=password,
            )

            update_user_demographics(user, new_user)

            if classroom:
                classroom.add_member(new_user)
            logger.info(
                "User created with username {username} in facility {facility} with password {password}".format(
                    username=username, facility=facility, password=password
                )
            )
            return True
        except ValidationError as e:
            logger.error(
                "User not created with username {username} in facility {facility} with password {password}".format(
                    username=username, facility=facility, password=password
                )
            )
            for key, error in e.message_dict.items():
                logger.error("{key}: {error}".format(key=key, error=error[0]))
            return False


class Command(BaseCommand):
    help = """
    Imports a user list from CSV file and creates
    them on a specified or the default facility.

    Requires CSV file data in this form:
    <full_name>,<username>,<password>,<facility>,<class>

    Less information can be passed if the headers are specified:
    full_name,username,password,class
    <full_name>,<username>,<password>,<class>

    Or in a different order:
    username,full_name
    <username>,<full_name>

    At minimum the username is required.
    The password will be set to '{DEFAULT_PASSWORD}' if none is set.
    The facility can be either the facility id or the facility name.
    If no facility is given, either the default facility,
    or the facility specified with the --facility commandline argument will be used.
    """.format(
        DEFAULT_PASSWORD=DEFAULT_PASSWORD
    )

    def add_arguments(self, parser):
        parser.add_argument("filepath", action="store", help="Path to CSV file.")
        parser.add_argument(
            "--facility",
            action="store",
            type=str,
            help="Facility id to import the users into",
        )

    def handle(self, *args, **options):
        if options["facility"]:
            default_facility = Facility.objects.get(pk=options["facility"])
        else:
            default_facility = Facility.get_default_facility()

        if not default_facility:
            raise CommandError(
                "No default facility exists, please make sure to provision this device before running this command"
            )

        fieldnames = input_fields + tuple(val for val in labels.values())

        # open using default OS encoding
        with open(options["filepath"]) as f:
            header = next(csv.reader(f, strict=True))
            has_header = False
            if all(col in fieldnames for col in header):
                # Every item in the first row matches an item in the fieldnames, it is a header row
                if "username" not in header and str(labels["username"]) not in header:
                    raise CommandError(
                        "No usernames specified, this is required for user creation"
                    )
                has_header = True
            elif any(col in fieldnames for col in header):
                raise CommandError(
                    "Mix of valid and invalid header labels found in first row"
                )

        # open using default OS encoding
        with open(options["filepath"]) as f:
            if has_header:
                reader = csv.DictReader(f, strict=True)
            else:
                reader = csv.DictReader(f, fieldnames=input_fields, strict=True)
            with transaction.atomic():
                total = 0
                for row in reader:
                    total += int(
                        create_user(map_input(row), default_facility=default_facility)
                    )
                logger.info("{total} users created".format(total=total))
