import csv
import logging
import ntpath
import re
import sys
from uuid import UUID

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.exceptions import ValidationError
from django.core.management.base import CommandError
from django.utils import translation
from django.utils.translation import gettext_lazy as _
from django.utils.translation import pgettext_lazy

from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.constants.collection_kinds import CLASSROOM
from kolibri.core.auth.constants.demographics import choices
from kolibri.core.auth.constants.demographics import DEFERRED
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Membership
from kolibri.core.tasks.management.commands.base import AsyncCommand
from kolibri.core.tasks.utils import get_current_job
from kolibri.core.utils.csv import open_csv_for_reading

try:
    FileNotFoundError
except NameError:
    FileNotFoundError = IOError

logger = logging.getLogger(__name__)

# TODO: decide whether these should be internationalized
fieldnames = (
    "UUID",
    "USERNAME",
    "PASSWORD",
    "FULL_NAME",
    "USER_TYPE",
    "IDENTIFIER",
    "BIRTH_YEAR",
    "GENDER",
    "ENROLLED_IN",
    "ASSIGNED_TO",
)


# These constants must be entered vertbatim in the CSV
roles_map = {
    "LEARNER": None,
    "ADMIN": role_kinds.ADMIN,
    "FACILITY_COACH": role_kinds.COACH,
    "CLASS_COACH": role_kinds.ASSIGNABLE_COACH,
}

# Error messages ###
UNEXPECTED_EXCEPTION = 0
TOO_LONG = 1
INVALID = 2
DUPLICATED_USERNAME = 3
INVALID_USERNAME = 4
REQUIRED_COLUMN = 5
INVALID_HEADER = 6
NO_FACILITY = 7
FILE_READ_ERROR = 8
FILE_WRITE_ERROR = 9
REQUIRED_PASSWORD = 10
NON_EXISTENT_UUID = 11
INVALID_UUID = 12

MESSAGES = {
    UNEXPECTED_EXCEPTION: pgettext_lazy(
        "Error message that might appear when there's a programming error importing a CSV file",
        "Unexpected error [{}]: {}",
    ),
    TOO_LONG: pgettext_lazy(
        "Error when the command is executed in the Terminal (command prompt)",
        "Value in column '{}' has too many characters",
    ),
    INVALID: _("Value in column '{}' not valid"),
    DUPLICATED_USERNAME: _("Username is duplicated"),
    INVALID_USERNAME: _(
        "Username only can contain characters, numbers and underscores"
    ),
    REQUIRED_COLUMN: pgettext_lazy(
        "Error message indicating that the CSV file selected for import is missing a required column",
        "The column '{}' is required",
    ),
    INVALID_HEADER: pgettext_lazy(
        "Error message indicating that one column header in the CSV file selected for import is missing or incorrect",
        "Incorrect header label found in the first row",
    ),
    NO_FACILITY: pgettext_lazy(
        "Error when the command is executed in the Terminal (command prompt)",
        "No default facility exists. Make sure to set up a facility on the  device before importing users and classes",
    ),
    FILE_READ_ERROR: _("Error trying to read csv file: {}"),
    FILE_WRITE_ERROR: _("Error trying to write csv file: {}"),
    REQUIRED_PASSWORD: _(
        "The password field is required. To leave the password unchanged in existing users, insert an asterisk (*)"
    ),
    NON_EXISTENT_UUID: _(
        "Cannot update user with ID: '{}' because no user with that database ID exists in this facility"
    ),
    INVALID_UUID: _("Database ID is not valid"),
}

# Validators ###


def number_range(min, max, allow_null=False):
    """
    Return a value check function which raises a ValueError if the supplied
    value is less than `min` or greater than `max`.
    """

    def checker(v):
        if v == DEFERRED:
            return checker
        if allow_null and not v:
            return None

        if v is None or (int(v) < min or int(v) > max):
            raise ValueError(v)

    return checker


def not_empty():
    """
    Return a value check function which raises a ValueError if the supplied
    value is None or an empty string
    """

    def checker(v):
        if v is None:
            raise ValueError(v)
        if len(v) == 0:
            raise ValueError(v)

    return checker


def value_length(length, allow_null=False, multiple=False):
    """
    Return a value check function which raises a ValueError if the supplied
    value has a length greater than 'length'
    If null is not True raises a ValueError if the supplied value is None.
    If multiple is True it checks the length of each of the separated by commas value
    """

    def checker(v):
        def check_single_value(v):
            if v is None or len(v) > length:
                raise ValueError(v)

        if v == DEFERRED:
            return checker
        if allow_null and v is None:
            return None
        if multiple:
            values = v.split(",")
            for value in values:
                check_single_value(value)
        else:
            check_single_value(v)

    return checker


def valid_uuid(allow_null=True):
    """
    Return a value check function which raises a ValueError if the supplied
    value is ot a valid uuid
    """

    def checker(v):
        if allow_null and (v is None or v == ""):
            return None
        try:
            UUID(v).version
        except (ValueError, TypeError):
            raise ValueError(v)

    return checker


def enumeration(*args):
    """
    Return a value check function which raises a ValueError if the value (case
    insensitive) is not in the enumeration of values provided by args.
    """
    if len(args) == 1:
        # assume the first argument defines the membership
        members = args[0].lower()
    else:
        members = tuple(map(str.lower, args))

    def checker(value):
        if value == DEFERRED:
            return checker
        if value.lower() not in members:
            raise ValueError(value)

    return checker


def valid_name(username=True, allow_null=False):
    """
    Return a value check function which raises a ValueError if the value has
    some of the punctuaction chars that are not allowed.
    If username is False it allows spaces, slashes and hyphens.
    If null is not True raises a ValueError if the supplied value is None.
    """

    def checker(v):
        if allow_null and v is None:
            return checker
        if v is None:
            raise ValueError(v)
        has_punc = "[\s`~!@#$%^&*()\-+={}\[\]\|\\\/:;\"'<>,\.\?]"  # noqa
        if not username:
            has_punc = "[`~!@#$%^&*()\+={}\[\]\|\\\/:;\"'<>\.\?]"  # noqa
        if re.search(has_punc, v):
            raise ValueError(v)

    return checker


def reverse_dict(original):
    """
    Returns a dictionary based on an original dictionary
    where previous keys are values and previous values pass
    to be the keys
    """
    final = {}
    for k, value in original.items():
        if type(value) == list:
            for v in value:
                final.setdefault(v, []).append(k)
        else:
            final.setdefault(value, []).append(k)
    return final


class Validator(object):
    """
    Class to apply different validation checks on a CSV data reader.
    """

    def __init__(self, header_translation):
        self._checks = []
        self.classrooms = {}
        self.coach_classrooms = {}
        self.users = {}
        self.header_translation = header_translation
        self.roles = {r: [] for r in roles_map.values() if r is not None}

    def add_check(self, header_name, check, message):
        """
        Add a header check, i.e., check whether the header record is consistent
        with the expected field names.
        `header_name` - name of the header for the column to be checked
        `check`- function to be used as validator of the values in the column
        `message` - problem message to report if a value is not valid
        """
        self._checks.append((header_name, check, message))

    def get_username(self, row):
        username = row.get(self.header_translation["USERNAME"])
        if username in self.users.keys():
            return None

        return username

    def check_classroom(self, row, username):
        def append_users(class_list, key):
            class_list_normalized = {c.lower(): c for c in class_list.keys()}
            try:
                classes_list = [c.strip() for c in row.get(key, None).split(",")]
                for classroom in classes_list:
                    if not classroom:
                        continue
                    if classroom.lower() in class_list_normalized:
                        classroom_real_name = class_list_normalized[classroom.lower()]
                        class_list[classroom_real_name].append(username)
                    else:
                        class_list[classroom] = [username]
                        class_list_normalized[classroom.lower()] = classroom
            except AttributeError:
                # there are not members of 'key'
                pass

        # enrolled learners:
        append_users(self.classrooms, self.header_translation["ENROLLED_IN"])

        # assigned coaches
        user_role = row.get(self.header_translation["USER_TYPE"], "LEARNER").upper()
        if user_role != "LEARNER":
            # a student can't be assigned to coach a classroom
            append_users(self.coach_classrooms, self.header_translation["ASSIGNED_TO"])
            self.roles[roles_map[user_role]].append(username)

    def validate(self, data):
        """
        Validate `data` and return an iterator over errors found.
        """
        for index, row in enumerate(data):
            error_flag = False
            username = self.get_username(row)
            if not username:
                error = {
                    "row": index + 1,
                    "message": MESSAGES[DUPLICATED_USERNAME],
                    "field": "USERNAME",
                    "value": row.get(self.header_translation["USERNAME"]),
                }
                error_flag = True
                yield error

            for header_name, check, message in self._checks:
                value = row[self.header_translation[header_name]]
                try:
                    check(value)
                except ValueError:
                    error = {
                        "row": index + 1,
                        "message": message,
                        "field": header_name,
                        "value": value,
                    }
                    error_flag = True
                    yield error
                except Exception as e:
                    error = {
                        "row": index + 1,
                        "message": MESSAGES[UNEXPECTED_EXCEPTION].format(
                            (e.__class__.__name__, e)
                        ),
                        "field": header_name,
                        "value": value,
                    }
                    error_flag = True
                    yield error
            # if there aren't any errors, let's add the user and classes
            if not error_flag:
                self.check_classroom(row, username)
                row["position"] = index + 1
                self.users[username] = row


class Command(AsyncCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            "filepath", action="store", type=str, help="Path to CSV file."
        )
        parser.add_argument(
            "--facility",
            action="store",
            type=str,
            help="Facility id to import the users into",
        )
        parser.add_argument(
            "--dryrun",
            action="store_true",
            help="Validate data without doing actual database updates",
        )
        parser.add_argument(
            "--delete",
            action="store_true",
            help="Delete all users in the facility not included in this import (excepting actual user)",
        )

        parser.add_argument(
            "--userid",
            action="store",
            type=str,
            default=None,
            help="Id of the user executing the command, it will not be deleted in case deleted is set",
        )

        parser.add_argument(
            "--locale",
            action="store",
            type=str,
            default=None,
            help="Code of the language for the messages to be translated",
        )
        parser.add_argument(
            "--errorlines",
            action="store",
            type=str,
            default=None,
            help="File to store errors output (to be used in internal tests only)",
        )

    def csv_values_validation(self, reader, header_translation):
        per_line_errors = []
        validator = Validator(header_translation)
        validator.add_check("UUID", valid_uuid(), MESSAGES[INVALID_UUID])
        validator.add_check(
            "FULL_NAME", value_length(125), MESSAGES[TOO_LONG].format("FULL_NAME")
        )
        validator.add_check(
            "BIRTH_YEAR",
            number_range(1900, 99999, allow_null=True),
            MESSAGES[INVALID].format("BIRTH_YEAR"),
        )
        validator.add_check(
            "USERNAME", value_length(125), MESSAGES[TOO_LONG].format("USERNAME")
        )
        validator.add_check("USERNAME", valid_name(), MESSAGES[INVALID_USERNAME])
        validator.add_check(
            "USERNAME", not_empty(), MESSAGES[REQUIRED_COLUMN].format("USERNAME")
        )
        validator.add_check(
            "PASSWORD", value_length(128), MESSAGES[TOO_LONG].format("PASSWORD")
        )
        validator.add_check("PASSWORD", not_empty(), MESSAGES[REQUIRED_PASSWORD])
        validator.add_check(
            "USER_TYPE",
            enumeration(*roles_map.keys()),
            MESSAGES[INVALID].format("USER_TYPE"),
        )

        validator.add_check(
            "GENDER",
            enumeration("", *tuple(str(val[0]) for val in choices)),
            MESSAGES[INVALID].format("GENDER"),
        )
        validator.add_check(
            "IDENTIFIER", value_length(64), MESSAGES[TOO_LONG].format("IDENTIFIER")
        )
        validator.add_check(
            "ENROLLED_IN",
            value_length(50, allow_null=True, multiple=True),
            MESSAGES[TOO_LONG].format("Class name"),
        )
        validator.add_check(
            "ASSIGNED_TO",
            value_length(50, allow_null=True, multiple=True),
            MESSAGES[TOO_LONG].format("Class name"),
        )

        row_errors = validator.validate(reader)
        for err in row_errors:
            per_line_errors.append(err)
        # cleaning classes names:
        normalized_learner_classroooms = {c.lower(): c for c in validator.classrooms}
        coach_classrooms = [cl for cl in validator.coach_classrooms]
        for classroom in coach_classrooms:
            normalized_name = classroom.lower()
            if normalized_name in normalized_learner_classroooms:
                real_name = normalized_learner_classroooms[normalized_name]
                if classroom != real_name:
                    validator.coach_classrooms[
                        real_name
                    ] = validator.coach_classrooms.pop(classroom)
        return (
            per_line_errors,
            (validator.classrooms, validator.coach_classrooms),
            validator.users,
            validator.roles,
        )

    def csv_headers_validation(self, filepath):
        csv_file = open_csv_for_reading(filepath)
        with csv_file as f:
            header = next(csv.reader(f, strict=True))
            has_header = False
            self.header_translation = {
                lbl.partition("(")[2].partition(")")[0]: lbl for lbl in header
            }
            neutral_header = self.header_translation.keys()
            # If every item in the first row matches an item in the fieldnames, consider it a header row
            if all(col in fieldnames for col in neutral_header):
                has_header = True

                # If any col is missing from the header, it's an error
                for col in fieldnames:
                    if col not in neutral_header:
                        self.overall_error.append(MESSAGES[REQUIRED_COLUMN].format(col))

            elif any(col in fieldnames for col in neutral_header):
                self.overall_error.append(MESSAGES[INVALID_HEADER])

        return has_header

    def get_field_values(self, user_row):
        password = user_row.get(self.header_translation["PASSWORD"], None)
        if password != "*":
            password = make_password(password)
        else:
            password = None

        gender = user_row.get(self.header_translation["GENDER"], "").strip().upper()
        gender = "" if gender == DEFERRED else gender
        birth_year = (
            user_row.get(self.header_translation["BIRTH_YEAR"], "").strip().upper()
        )
        birth_year = "" if birth_year == DEFERRED else birth_year
        id_number = (
            user_row.get(self.header_translation["IDENTIFIER"], "").strip().upper()
        )
        id_number = "" if id_number == DEFERRED else id_number
        full_name = user_row.get(self.header_translation["FULL_NAME"], None)

        return {
            "uuid": user_row.get(self.header_translation["UUID"], ""),
            "username": user_row.get(self.header_translation["USERNAME"], ""),
            "password": password,
            "gender": gender,
            "birth_year": birth_year,
            "id_number": id_number,
            "full_name": full_name,
        }

    def compare_fields(self, user_obj, values):
        changed = False
        for field in values:
            if field == "uuid":
                continue  # uuid can't be updated
            if field != "password" or values["password"] is not None:
                if getattr(user_obj, field) != values[field]:
                    changed = True
                    setattr(user_obj, field, values[field])
        return changed

    def build_users_objects(self, users):
        new_users = []
        update_users = []
        keeping_users = []
        per_line_errors = []
        users_uuid = [
            u[self.header_translation["UUID"]]
            for u in users.values()
            if u[self.header_translation["UUID"]] != ""
        ]
        existing_users = (
            FacilityUser.objects.filter(facility=self.default_facility)
            .filter(id__in=users_uuid)
            .values_list("id", flat=True)
        )

        # creating the users takes half of the time
        progress = (100 / self.number_lines) * 0.5
        for user in users:
            self.progress_update(progress)
            user_row = users[user]
            values = self.get_field_values(user_row)
            if values["uuid"] in existing_users:
                user_obj = FacilityUser.objects.get(
                    id=values["uuid"], facility=self.default_facility
                )
                keeping_users.append(user_obj)
                if user_obj.username != user:
                    # check for duplicated username in the facility
                    existing_user = FacilityUser.objects.get(
                        username=user, facility=self.default_facility
                    )
                    if existing_user:
                        error = {
                            "row": users[user]["position"],
                            "username": user,
                            "message": MESSAGES[DUPLICATED_USERNAME],
                            "field": "USERNAME",
                            "value": user,
                        }
                        per_line_errors.append(error)
                        continue
                if self.compare_fields(user_obj, values):
                    update_users.append(user_obj)
            else:
                if values["uuid"] != "":
                    error = {
                        "row": users[user]["position"],
                        "username": user,
                        "message": MESSAGES[NON_EXISTENT_UUID].format(user),
                        "field": "PASSWORD",
                        "value": "*",
                    }
                    per_line_errors.append(error)
                elif not values["password"]:
                    error = {
                        "row": users[user]["position"],
                        "username": user,
                        "message": MESSAGES[REQUIRED_PASSWORD],
                        "field": "PASSWORD",
                        "value": "*",
                    }
                    per_line_errors.append(error)
                else:
                    user_obj = FacilityUser(
                        username=user, facility=self.default_facility
                    )
                    # user_obj.id = user_obj.calculate_uuid()  # Morango does not work properly with this
                    for field in values:
                        if values[field]:
                            setattr(user_obj, field, values[field])
                    new_users.append(user_obj)

        return (new_users, update_users, keeping_users, per_line_errors)

    def db_validate_list(self, db_list, users=False):
        errors = []
        # validating the users takes aprox 40% of the time
        if users:
            progress = (
                (100 / self.number_lines) * 0.4 * (len(db_list) / self.number_lines)
            )
        for obj in db_list:
            if users:
                self.progress_update(progress)
            try:
                obj.full_clean()
            except ValidationError as e:
                for message in e.message_dict:
                    error = {
                        "row": str(obj),
                        "message": e.message_dict[message][0],
                        "field": message,
                        "value": vars(obj)[message],
                    }
                    errors.append(error)

        return errors

    def build_classes_objects(self, classes):
        """
        Using current database info, builds the list of classes to be
        updated or created.
        It also returns an updated classes list, using the case insensitive
        names of the classes that were already in the database
        `classes` - Tuple containing two dictionaries: enrolled classes + assigned classes
        Returns:
        new_classes - List of database objects of classes to be created
        update_classes - List of database objects of classes to be updated
        fixed_classes - Same original classes tuple, but with the names normalized

        """
        new_classes = []
        update_classes = []
        total_classes = set([k for k in classes[0]] + [v for v in classes[1]])
        existing_classes = (
            Classroom.objects.filter(parent=self.default_facility)
            # .filter(name__in=total_classes)  # can't be done if classes names are case insensitive
            .values_list("name", flat=True)
        )

        normalized_name_existing = {c.lower(): c for c in existing_classes}
        for classroom in total_classes:
            if classroom.lower() in normalized_name_existing:
                real_name = normalized_name_existing[classroom.lower()]
                class_obj = Classroom.objects.get(
                    name=real_name, parent=self.default_facility
                )
                update_classes.append(class_obj)
                if real_name != classroom:
                    if classroom in classes[0]:
                        classes[0][real_name] = classes[0].pop(classroom)
                    if classroom in classes[1]:
                        classes[1][real_name] = classes[1].pop(classroom)
            else:
                class_obj = Classroom(name=classroom, parent=self.default_facility)
                class_obj.id = class_obj.calculate_uuid()
                new_classes.append(class_obj)
        self.progress_update(1)
        return (new_classes, update_classes, classes)

    def get_facility(self, options):
        if options["facility"]:
            default_facility = Facility.objects.get(pk=options["facility"])
        else:
            default_facility = Facility.get_default_facility()
        if not default_facility:
            self.overall_error.append(MESSAGES[NO_FACILITY])
            raise CommandError(self.overall_error[-1])

        return default_facility

    def get_number_lines(self, filepath):
        try:
            with open(filepath) as f:
                number_lines = len(f.readlines())
        except (ValueError, FileNotFoundError, csv.Error) as e:
            number_lines = None
            self.overall_error.append(MESSAGES[FILE_READ_ERROR].format(e))
        return number_lines

    def get_delete(self, options, keeping_users, update_classes):
        if not options["delete"]:
            return ([], [])
        users_not_to_delete = [u.id for u in keeping_users]
        admins = self.default_facility.get_admins()
        users_not_to_delete += admins.values_list("id", flat=True)
        if options["userid"]:
            users_not_to_delete.append(options["userid"])
        users_to_delete = FacilityUser.objects.filter(
            facility=self.default_facility
        ).exclude(id__in=users_not_to_delete)
        # Classes not included in the csv will be cleared of users,
        # but not deleted to keep possible lessons and quizzes created for them:
        classes_not_to_clear = [c.id for c in update_classes]
        classes_to_clear = (
            Classroom.objects.filter(parent=self.default_facility)
            .exclude(id__in=classes_not_to_clear)
            .values_list("id", flat=True)
        )

        return (users_to_delete, classes_to_clear)

    def delete_users(self, users):
        for user in users:
            user.delete(hard_delete=True)

    def clear_classes(self, classes):
        for classroom in classes:
            Membership.objects.filter(collection=classroom).delete()

    def get_user(self, username, users):
        user = users.get(username, None)
        if not user:  # the user has not been created nor updated:
            user = FacilityUser.objects.get(
                username=username, facility=self.default_facility
            )
        return user

    def add_classes_memberships(self, classes, users, db_classes):
        enrolled = classes[0]
        assigned = classes[1]
        classes = {k.name: k for k in db_classes}

        for classroom in enrolled:
            db_class = classes[classroom]
            for username in enrolled[classroom]:
                # db validation might have rejected a csv validated user:
                if username in users:
                    user = self.get_user(username, users)
                    if not user.is_member_of(db_class):
                        db_class.add_member(user)
        for classroom in assigned:
            db_class = classes[classroom]
            for username in assigned[classroom]:
                # db validation might have rejected a csv validated user:
                if username in users:
                    user = self.get_user(username, users)
                    db_class.add_coach(user)

    def add_roles(self, users, roles):
        for role in roles.keys():
            for username in roles[role]:
                # db validation might have rejected a csv validated user:
                if username in users:
                    user = self.get_user(username, users)
                    self.default_facility.add_role(user, role)

    def exit_if_error(self):
        if self.overall_error:
            classes_report = {"created": 0, "updated": 0, "cleared": 0}
            users_report = {"created": 0, "updated": 0, "deleted": 0}
            if self.job:
                self.job.extra_metadata["overall_error"] = self.overall_error
                self.job.extra_metadata["per_line_errors"] = 0
                self.job.extra_metadata["classes"] = classes_report
                self.job.extra_metadata["users"] = users_report
                self.job.extra_metadata["filename"] = ""
                self.job.save_meta()
            raise CommandError("File errors: {}".format(str(self.overall_error)))
        return

    def remove_memberships(self, users, enrolled, assigned):
        users_enrolled = reverse_dict(enrolled)
        users_assigned = reverse_dict(assigned)
        for user in users:
            # enrolled:
            to_remove = user.memberships.filter(collection__kind=CLASSROOM)
            username = (
                user.username
                if sys.version_info[0] >= 3
                else user.username.encode("utf-8")
            )
            if username in users_enrolled.keys():
                to_remove.exclude(
                    collection__name__in=users_enrolled[username]
                ).delete()
            else:
                to_remove.delete()

            # assigned:
            to_remove = user.roles.filter(collection__kind=CLASSROOM)
            if username in users_assigned.keys():
                to_remove.exclude(
                    collection__name__in=users_assigned[username]
                ).delete()
            else:
                to_remove.delete()

    def output_messages(
        self, per_line_errors, classes_report, users_report, filepath, errorlines
    ):
        # Show output error messages on loggers, job metadata or io errorlines for testing
        # freeze message translations:
        for line in per_line_errors:
            line["message"] = str(line["message"])
        self.overall_error = [str(msg) for msg in self.overall_error]

        if self.job:
            self.job.extra_metadata["overall_error"] = self.overall_error
            self.job.extra_metadata["per_line_errors"] = per_line_errors
            self.job.extra_metadata["classes"] = classes_report
            self.job.extra_metadata["users"] = users_report
            self.job.extra_metadata["filename"] = ntpath.basename(filepath)
            self.job.save_meta()
        else:
            logger.info("File errors: {}".format(str(self.overall_error)))
            logger.info("Data errors: {}".format(str(per_line_errors)))
            logger.info("Classes report: {}".format(str(classes_report)))
            logger.info("Users report: {}".format(str(users_report)))
            if errorlines:
                for line in per_line_errors:
                    errorlines.write(str(line))
                    errorlines.write("\n")

    def handle_async(self, *args, **options):
        # initialize stats data structures:
        self.overall_error = []
        db_new_classes = []
        db_update_classes = []
        classes_to_clear = []
        db_new_users = []
        db_update_users = []
        users_to_delete = []
        per_line_errors = []

        # set language for the translation of the messages
        locale = settings.LANGUAGE_CODE if not options["locale"] else options["locale"]
        translation.activate(locale)

        self.job = get_current_job()
        filepath = options["filepath"]
        self.default_facility = self.get_facility(options)
        self.number_lines = self.get_number_lines(filepath)
        self.exit_if_error()

        with self.start_progress(total=100) as self.progress_update:
            # validate csv headers:
            has_header = self.csv_headers_validation(filepath)
            if not has_header:
                self.overall_error.append(MESSAGES[INVALID_HEADER])
            self.exit_if_error()
            self.progress_update(1)  # state=csv_headers
            try:
                csv_file = open_csv_for_reading(filepath)
                with csv_file as f:
                    reader = csv.DictReader(f, strict=True)
                    per_line_errors, classes, users, roles = self.csv_values_validation(
                        reader, self.header_translation
                    )
            except (ValueError, FileNotFoundError, csv.Error) as e:
                self.overall_error.append(MESSAGES[FILE_READ_ERROR].format(e))
                self.exit_if_error()
            (
                db_new_users,
                db_update_users,
                keeping_users,
                more_line_errors,
            ) = self.build_users_objects(users)
            per_line_errors += more_line_errors
            (
                db_new_classes,
                db_update_classes,
                fixed_classes,
            ) = self.build_classes_objects(classes)
            classes = fixed_classes
            users_to_delete, classes_to_clear = self.get_delete(
                options, keeping_users, db_update_classes
            )
            per_line_errors += self.db_validate_list(db_new_users, users=True)
            per_line_errors += self.db_validate_list(db_update_users, users=True)
            # progress = 91%
            per_line_errors += self.db_validate_list(db_new_classes)
            per_line_errors += self.db_validate_list(db_update_classes)

            if not options["dryrun"]:
                self.delete_users(users_to_delete)
                # clear users from classes not included in the csv:
                Membership.objects.filter(collection__in=classes_to_clear).delete()

                # bulk_create and bulk_update are not possible with current Morango:
                db_users = db_new_users + db_update_users
                for user in db_users:
                    user.save()
                # assign roles to users:
                users_data = {u.username: u for u in db_users}
                self.add_roles(users_data, roles)

                db_created_classes = []
                for classroom in db_new_classes:
                    created_class = Classroom.objects.create(
                        name=classroom.name, parent=classroom.parent
                    )

                    db_created_classes.append(created_class)
                # hack to get ids created by Morango:
                db_new_classes = db_created_classes

                self.add_classes_memberships(
                    classes, users_data, db_new_classes + db_update_classes
                )
                self.remove_memberships(keeping_users, classes[0], classes[1])
            classes_report = {
                "created": len(db_new_classes),
                "updated": len(db_update_classes),
                "cleared": len(classes_to_clear),
            }
            users_report = {
                "created": len(db_new_users),
                "updated": len(db_update_users),
                "deleted": len(users_to_delete),
            }

            self.output_messages(
                per_line_errors,
                classes_report,
                users_report,
                filepath,
                options["errorlines"],
            )

        translation.deactivate()
