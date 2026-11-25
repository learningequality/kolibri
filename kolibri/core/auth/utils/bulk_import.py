import csv
import logging
import ntpath
import os
import re
from collections import defaultdict
from copy import copy
from itertools import islice
from uuid import UUID

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.contrib.auth.hashers import UNUSABLE_PASSWORD_PREFIX
from django.core.exceptions import ValidationError
from django.db import connection
from django.db import transaction
from django.db.models import Count
from django.db.models import Q
from django.utils import translation
from django.utils.functional import cached_property
from django.utils.translation import gettext_lazy as _
from django.utils.translation import pgettext_lazy

from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.constants.collection_kinds import CLASSROOM
from kolibri.core.auth.constants.demographics import choices
from kolibri.core.auth.constants.demographics import DEFERRED
from kolibri.core.auth.errors import BulkUserImportError
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Membership
from kolibri.core.auth.models import Role
from kolibri.core.tasks.utils import JobProgressMixin
from kolibri.core.utils.csv import open_csv_for_reading

logger = logging.getLogger(__name__)

LOOKUP_BATCH_SIZE = 500


def _lookup_batches(items):
    iterator = iter(items)
    return iter(lambda: list(islice(iterator, LOOKUP_BATCH_SIZE)), [])


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
DUPLICATED_UUID = 13

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
    DUPLICATED_UUID: _("Database ID is duplicated"),
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
        return None

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


def no_nul(value):
    if value and "\0" in value:
        raise ValueError(value)


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
        return None

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
        if value.lower() not in members:
            raise ValueError(value)
        return

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
        if username:
            no_nul(v)
        has_punc = r"[\s`~!@#$%^&*()\-+={}\[\]\|\\\/:;\"'<>,\.\?]"
        if not username:
            has_punc = r"[`~!@#$%^&*()\+={}\[\]\|\\\/:;\"'<>\.\?]"
        if re.search(has_punc, v):
            raise ValueError(v)
        return None

    return checker


def reverse_dict(original):
    """
    Returns a dictionary based on an original dictionary
    where previous keys are values and previous values pass
    to be the keys
    """
    final = {}
    for k, value in original.items():
        if isinstance(value, list):
            for v in value:
                final.setdefault(v, []).append(k)
        else:
            final.setdefault(value, []).append(k)
    return final


class Validator:
    def __init__(self, header_translation, facility=None):
        self._checks = []
        self.classes = {"ENROLLED_IN": {}, "ASSIGNED_TO": {}}
        self.users = {}
        self._username_keys = set()
        self._uuids = set()
        self.header_translation = header_translation
        self.facility = facility
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

    def pending_username_is_taken(self, username):
        return ("lowercase", username.lower()) in self._username_keys

    @staticmethod
    def _database_username_key(username):
        with connection.cursor() as cursor:
            cursor.execute("SELECT UPPER(%s)", (username,))
            return ("iexact", cursor.fetchone()[0])

    def check_pending_database_username(self, username):
        if connection.vendor != "postgresql" or not self._username_keys:
            return None, False
        key = self._database_username_key(username)
        return key, key in self._username_keys

    def new_username_holder_ids(self, requested_username, username):
        if not username or "\0" in username:
            return set()
        matches = Q()
        for spelling in dict.fromkeys(
            (requested_username, requested_username.lower(), username, username.lower())
        ):
            matches |= Q(username__iexact=spelling)
        holders = FacilityUser.all_objects.filter(matches, facility=self.facility)
        return set(holders.values_list("id", flat=True))

    def rename_spellings(self, user, requested_username, username):
        stored_lowercase = user.username.lower()
        spellings = {
            spelling: spelling.lower() == stored_lowercase
            for spelling in (requested_username, username)
        }
        matches = Q()
        aggregates = {}
        is_user = Q(pk=user.pk)
        is_live = Q(date_deleted__isnull=True)
        for index, (spelling, live_only) in enumerate(spellings.items()):
            match = Q(username__iexact=spelling)
            matches |= match
            aggregates[f"live_{index}"] = Count("pk", filter=match & ~is_user & is_live)
            if not live_only:
                aggregates[f"deleted_{index}"] = Count(
                    "pk", filter=match & ~is_user & ~is_live
                )
                if connection.vendor == "postgresql":
                    aggregates[f"self_{index}"] = Count("pk", filter=match & is_user)
        holders = FacilityUser.all_objects.filter(matches, facility=self.facility)
        counts = holders.aggregate(**aggregates)
        for index, spelling in enumerate(spellings):
            live_only = spellings[spelling] or bool(counts.get(f"self_{index}"))
            if counts[f"live_{index}"] or (
                not live_only and counts.get(f"deleted_{index}")
            ):
                return None
            spellings[spelling] = live_only
        return spellings

    def rename_conflicts_in_roster(self, user_id, spellings):
        for spelling, live_only in spellings.items():
            for deleted in (False,) if live_only else (False, True):
                ids = self._roster_ids.get((spelling.lower(), deleted))
                if ids and ids != {user_id}:
                    return True
        return False

    @cached_property
    def _roster_ids(self):
        roster = defaultdict(set)
        holders = FacilityUser.all_objects.filter(facility=self.facility).values_list(
            "id", "username", "date_deleted"
        )
        for user_id, username, date_deleted in holders.iterator():
            roster[username.lower(), date_deleted is not None].add(user_id)
        return roster

    def validate_uuid(self, row):
        uuid = row[self.header_translation["UUID"]]
        if not uuid:
            return "", None
        try:
            uuid = UUID(uuid).hex
        except ValueError:
            return None, INVALID_UUID
        if uuid in self._uuids:
            return uuid, DUPLICATED_UUID
        self._uuids.add(uuid)
        return uuid, None

    def row_class_names(self, row, column):
        cell = row[self.header_translation[column]] or ""
        return filter(None, map(str.strip, cell.split(",")))

    def row_role(self, row):
        return roles_map.get((row[self.header_translation["USER_TYPE"]] or "").upper())

    def referenced_classrooms(self, row):
        yield from (
            ("ENROLLED_IN", name) for name in self.row_class_names(row, "ENROLLED_IN")
        )
        if self.row_role(row) is not None:
            yield from (
                ("ASSIGNED_TO", name)
                for name in self.row_class_names(row, "ASSIGNED_TO")
            )

    @cached_property
    def _stored_classrooms(self):
        classrooms = defaultdict(lambda: defaultdict(list))
        for classroom in self.facility.get_classrooms():
            classrooms[classroom.name.lower()][classroom.name].append(classroom)
        return classrooms

    def resolve_classroom(self, name):
        matches = self._stored_classrooms.get(name.lower())
        if not matches:
            return name
        if name not in matches:
            if len(matches) != 1:
                return None
            name = next(iter(matches))
        return name if len(matches[name]) == 1 else None

    def stored_classroom(self, name):
        matches = self._stored_classrooms.get(name.lower())
        if matches:
            (classroom,) = matches[name]
            return classroom
        return None

    def add_user(self, row, username, database_key, classrooms):
        for column, name in classrooms:
            self.classes[column].setdefault(name, []).append(username)
        role = self.row_role(row)
        if role is not None:
            self.roles[role].append(username)
        self.users[username] = row
        self._username_keys.add(("lowercase", username.lower()))
        if connection.vendor == "postgresql":
            self._username_keys.add(
                database_key or self._database_username_key(username)
            )

    def row_errors(self, row, uuid_error=None, normalized_rename=None):
        position = row["position"]
        if uuid_error is not None:
            yield {
                "row": position,
                "message": MESSAGES[uuid_error],
                "field": "UUID",
                "value": row[self.header_translation["UUID"]],
            }
        for header_name, check, message in self._checks:
            value = row[self.header_translation[header_name]]
            try:
                check(value)
                if (
                    header_name == "USERNAME"
                    and normalized_rename is not None
                    and normalized_rename != value
                ):
                    check(normalized_rename)
            except ValueError:
                yield {
                    "row": position,
                    "message": message,
                    "field": header_name,
                    "value": value,
                }
            except Exception as e:
                yield {
                    "row": position,
                    "message": MESSAGES[UNEXPECTED_EXCEPTION].format(
                        (e.__class__.__name__, e)
                    ),
                    "field": header_name,
                    "value": value,
                }


def csv_validator(header_translation, facility):
    validator = Validator(header_translation, facility)
    for column in ("FULL_NAME", "IDENTIFIER", "ENROLLED_IN", "ASSIGNED_TO"):
        validator.add_check(column, no_nul, MESSAGES[INVALID].format(column))
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

    return validator


class BulkUserImportManager(JobProgressMixin):
    def __init__(
        self,
        filepath,
        facility_id=None,
        userid=None,
        locale=None,
        dryrun=False,
        delete=False,
        use_storage=False,
        errorlines=None,
    ):
        self.filepath = filepath
        self.facility_id = facility_id
        self.userid = userid
        self.locale = locale or settings.LANGUAGE_CODE
        self.dryrun = dryrun
        self.delete = delete
        self.use_storage = use_storage
        self.errorlines = errorlines
        super().__init__()

    def append_error(self, msg):
        # force translation to str type, to be serialized into json:
        translation.activate(self.locale)
        self.overall_error.append(str(msg))

    def csv_headers_validation(self, local_filepath=None, storage_filepath=None):
        with open_csv_for_reading(
            local_filepath=local_filepath, storage_filepath=storage_filepath
        ) as f:
            header = next(csv.reader(f, strict=True))
            has_header = False
            self.header_translation = {
                lbl if "(" not in lbl else lbl.partition("(")[2].partition(")")[0]: lbl
                for lbl in header
            }
            neutral_header = self.header_translation.keys()
            # If every item in the first row matches an item in the fieldnames, consider it a header row
            if all(col in fieldnames for col in neutral_header):
                has_header = True

                # If any col is missing from the header, it's an error
                for col in fieldnames:
                    if col not in neutral_header:
                        self.append_error(MESSAGES[REQUIRED_COLUMN].format(col))

            elif any(col in fieldnames for col in neutral_header):
                self.append_error(MESSAGES[INVALID_HEADER])

        return has_header

    def get_field_values(self, user_row, username):
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
            "username": username,
            "gender": gender,
            "birth_year": birth_year,
            "id_number": id_number,
            "full_name": full_name,
        }

    def _row_error(self, user_row, message, field, value):
        return {
            "row": user_row["position"],
            "username": user_row[self.header_translation["USERNAME"]],
            "message": message,
            "field": field,
            "value": value,
        }

    def _duplicate_username_error(self, row):
        return self._row_error(
            row,
            MESSAGES[DUPLICATED_USERNAME],
            "USERNAME",
            row[self.header_translation["USERNAME"]],
        )

    def _validate_rows(self, reader):
        validator = csv_validator(self.header_translation, self.default_facility)
        errors = []
        rejected_user_ids = set()
        rejected_class_names = set()
        for batch in _lookup_batches(enumerate(reader, 1)):
            validated_uuids = [validator.validate_uuid(row) for _, row in batch]
            existing_users = FacilityUser.all_objects.filter(
                facility=self.default_facility
            ).in_bulk({uuid for uuid, _ in validated_uuids if uuid})
            for (position, row), (uuid, uuid_error) in zip(batch, validated_uuids):
                row["position"] = position
                row_errors, matched_user_ids = self._validate_row(
                    validator, row, uuid, uuid_error, existing_users.get(uuid)
                )
                if row_errors:
                    errors.extend(row_errors)
                    rejected_user_ids.update(matched_user_ids)
                    if self.delete and matched_user_ids:
                        rejected_class_names.update(
                            name.lower()
                            for _, name in validator.referenced_classrooms(row)
                        )
        return errors, validator, rejected_user_ids, rejected_class_names

    def _validate_row(self, validator, row, uuid, uuid_error, existing_user):
        requested_username = row[self.header_translation["USERNAME"]]
        username = requested_username or ""
        if existing_user is None or existing_user.username != username:
            username = FacilityUser.normalize_username(username)
        errors = list(
            validator.row_errors(row, uuid_error, username if existing_user else None)
        )
        if uuid and existing_user is None:
            raw_uuid = row[self.header_translation["UUID"]]
            return errors or [
                self._row_error(
                    row, MESSAGES[NON_EXISTENT_UUID].format(raw_uuid), "UUID", raw_uuid
                )
            ], set()
        matched_user_ids = set()
        if uuid == "":
            matched_user_ids = validator.new_username_holder_ids(
                requested_username, username
            )
        elif existing_user is not None and uuid_error is None:
            matched_user_ids.add(existing_user.id)
        database_key, rename_spellings = self._validate_username(
            validator,
            row,
            existing_user,
            requested_username,
            username,
            uuid == "" and bool(matched_user_ids),
            errors,
        )
        if errors:
            return errors, matched_user_ids
        classrooms, errors = self._resolve_classrooms(validator, row)
        if errors:
            return errors, matched_user_ids
        errors = self._prepare_user(
            validator, row, existing_user, username, rename_spellings
        )
        if not errors:
            validator.add_user(row, username, database_key, classrooms)
        return errors, matched_user_ids

    def _validate_username(
        self,
        validator,
        row,
        existing_user,
        requested_username,
        username,
        stored_username_is_taken,
        errors,
    ):
        if stored_username_is_taken or validator.pending_username_is_taken(username):
            errors.insert(0, self._duplicate_username_error(row))
        if errors:
            return None, {}
        rename_spellings = {}
        if existing_user is not None and (
            existing_user.username != requested_username
            or existing_user.date_deleted is not None
        ):
            rename_spellings = validator.rename_spellings(
                existing_user, requested_username, username
            )
            if rename_spellings is None:
                errors.append(self._duplicate_username_error(row))
                return None, {}
        database_key, is_taken = validator.check_pending_database_username(username)
        if is_taken:
            errors.append(self._duplicate_username_error(row))
        return database_key, rename_spellings

    def _resolve_classrooms(self, validator, row):
        classrooms = []
        errors = []
        for column, name in validator.referenced_classrooms(row):
            resolved = validator.resolve_classroom(name)
            if resolved is None:
                errors.append(
                    self._row_error(row, _("Class name is ambiguous"), column, name)
                )
            else:
                classrooms.append((column, resolved))
        return classrooms, errors

    def _prepare_user(self, validator, user_row, user_obj, username, rename_spellings):
        password = user_row[self.header_translation["PASSWORD"]]
        self.progress_update(50 / self.number_lines)
        if "\0" in password:
            return [
                self._row_error(
                    user_row, MESSAGES[INVALID].format("PASSWORD"), "PASSWORD", None
                )
            ]
        values = self.get_field_values(user_row, username)
        replace_password = password != "*"
        if user_obj is None:
            if not replace_password:
                return [
                    self._row_error(
                        user_row, MESSAGES[REQUIRED_PASSWORD], "PASSWORD", "*"
                    )
                ]
            user_obj = FacilityUser(
                facility=self.default_facility,
                **{field: value for field, value in values.items() if value},
            )
            update_fields = None
        else:
            user_obj = copy(user_obj)
            update_fields = self._apply_user_fields(user_obj, values)
        if replace_password:
            user_obj.password = UNUSABLE_PASSWORD_PREFIX
            if update_fields is not None:
                update_fields.add("password")
        if update_fields is None or update_fields:
            self.progress_update(40 / self.number_lines)
            errors = self._model_errors(user_obj, user_row)
            user_obj.username = username
            if errors:
                return errors
        if rename_spellings and validator.rename_conflicts_in_roster(
            user_obj.id, rename_spellings
        ):
            return [self._duplicate_username_error(user_row)]
        user_row["user"] = user_obj
        user_row["update_fields"] = update_fields
        return []

    @staticmethod
    def _apply_user_fields(user, values):
        values = {**values, "date_deleted": None}
        update_fields = set()
        for field, value in values.items():
            if getattr(user, field) != value:
                setattr(user, field, value)
                update_fields.add(field)
        return update_fields

    def _hash_passwords(self, rows):
        password_column = self.header_translation["PASSWORD"]
        for row in rows:
            password = row[password_column]
            if password != "*":
                row["user"].password = make_password(password)

    def build_classes_objects(self, validator):
        new_classes = {}
        update_classes = {}
        for column in ("ENROLLED_IN", "ASSIGNED_TO"):
            memberships = {}
            for name, usernames in validator.classes[column].items():
                classroom = validator.stored_classroom(name)
                if classroom is None:
                    key = name.lower()
                    if key not in new_classes:
                        new_classes[key] = Classroom(
                            name=name, parent=self.default_facility
                        )
                    name = new_classes[key].name
                else:
                    update_classes[name] = classroom
                memberships.setdefault(name, []).extend(usernames)
            validator.classes[column] = memberships
        return list(new_classes.values()), list(update_classes.values())

    def _model_errors(self, obj, user_row=None):
        try:
            obj.full_clean()
        except ValidationError as error:
            return [
                self._row_error(user_row, messages[0], field, getattr(obj, field, None))
                if user_row is not None
                else {
                    "row": str(obj),
                    "message": messages[0],
                    "field": field,
                    "value": getattr(obj, field, None),
                }
                for field, messages in error.message_dict.items()
            ]
        return []

    def get_facility(self):
        if self.facility_id:
            default_facility = Facility.objects.get(pk=self.facility_id)
        else:
            default_facility = Facility.get_default_facility()
        if not default_facility:
            raise BulkUserImportError(str(MESSAGES[NO_FACILITY]))

        return default_facility

    def get_number_lines(self, local_filepath=None, storage_filepath=None):
        try:
            with open_csv_for_reading(
                local_filepath=local_filepath, storage_filepath=storage_filepath
            ) as f:
                number_lines = len(f.readlines())
        except (ValueError, FileNotFoundError, csv.Error) as e:
            number_lines = None
            self.append_error(MESSAGES[FILE_READ_ERROR].format(e))
        return number_lines

    def _get_users_to_delete(self, keeping_user_ids):
        if not self.delete:
            return []
        admins = self.default_facility.get_admins()
        candidates = FacilityUser.all_objects.filter(
            facility=self.default_facility
        ).exclude(id__in=admins.values("id"))
        if self.userid:
            candidates = candidates.exclude(id=self.userid)
        return [
            user for user in candidates.iterator() if user.id not in keeping_user_ids
        ]

    def _get_membership_changes(
        self,
        update_classes,
        rejected_class_names,
        protected_user_ids,
        affected_user_ids,
    ):
        if not self.delete and not affected_user_ids:
            return [], 0, 0
        covered_class_ids = {classroom.id for classroom in update_classes}
        classrooms = self.default_facility.get_classrooms().values_list("id", "name")
        uncovered_classes = {
            class_id: name
            for class_id, name in classrooms.iterator()
            if class_id not in covered_class_ids
        }
        clearable_class_ids = [
            class_id
            for class_id, name in uncovered_classes.items()
            if self.delete and name.lower() not in rejected_class_names
        ]
        changed_classes = set()
        protected_classes = set()
        memberships_to_clear = []
        for class_ids in _lookup_batches(clearable_class_ids):
            memberships = Membership.objects.filter(
                collection_id__in=class_ids
            ).values_list("id", "collection_id", "user_id")
            for membership_id, class_id, user_id in memberships.iterator():
                if user_id in protected_user_ids:
                    protected_classes.add(class_id)
                else:
                    changed_classes.add(class_id)
                    if not self.dryrun:
                        memberships_to_clear.append(membership_id)
        updated_classes = changed_classes & protected_classes
        unreported_class_ids = uncovered_classes.keys() - changed_classes
        if unreported_class_ids:
            for user_ids in _lookup_batches(affected_user_ids):
                for model in (Membership, Role):
                    class_ids = (
                        model.objects.filter(
                            user_id__in=user_ids,
                            collection__kind=CLASSROOM,
                        )
                        .values_list("collection_id", flat=True)
                        .distinct()
                    )
                    updated_classes.update(
                        unreported_class_ids.intersection(class_ids.iterator())
                    )
        return (
            memberships_to_clear,
            len(updated_classes),
            len(changed_classes - protected_classes),
        )

    def delete_users(self, users):
        for user in users:
            user.delete(hard_delete=True)

    def clear_class_memberships(self, membership_ids):
        for batch in _lookup_batches(membership_ids):
            Membership.objects.filter(id__in=batch).delete()

    def add_classes_memberships(self, classes, users, db_classes):
        enrolled, assigned = classes
        classes_by_name = {classroom.name: classroom for classroom in db_classes}

        for name, usernames in enrolled.items():
            classroom = classes_by_name[name]
            for username in usernames:
                user = users.get(username)
                if user is not None and not user.is_member_of(classroom):
                    classroom.add_member(user)
        for name, usernames in assigned.items():
            classroom = classes_by_name[name]
            for username in usernames:
                if username in users:
                    classroom.add_coach(users[username])

    def add_roles(self, users, roles):
        for role in roles:
            for username in roles[role]:
                if username in users:
                    self.default_facility.add_role(users[username], role)

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
            raise BulkUserImportError(f"File errors: {self.overall_error}")
        return

    def remove_memberships(self, users, enrolled, assigned):
        users_enrolled = reverse_dict(enrolled)
        users_assigned = reverse_dict(assigned)
        for user in users:
            # enrolled:
            to_remove = user.memberships.filter(collection__kind=CLASSROOM)
            username = user.username
            if username in users_enrolled:
                to_remove.exclude(
                    collection__name__in=users_enrolled[username]
                ).delete()
            else:
                to_remove.delete()

            # assigned:
            to_remove = user.roles.filter(collection__kind=CLASSROOM)
            if username in users_assigned:
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

        if self.job:
            self.job.extra_metadata["overall_error"] = self.overall_error
            self.job.extra_metadata["per_line_errors"] = per_line_errors
            self.job.extra_metadata["classes"] = classes_report
            self.job.extra_metadata["users"] = users_report
            self.job.extra_metadata["filename"] = ntpath.basename(filepath)
            self.job.save_meta()
        else:
            logger.info("File errors: %s", self.overall_error)
            logger.info("Data errors: %s", per_line_errors)
            logger.info("Classes report: %s", classes_report)
            logger.info("Users report: %s", users_report)
            if errorlines:
                for line in per_line_errors:
                    errorlines.write(str(line))
                    errorlines.write("\n")

    def run(self):
        # set language for the translation of the messages
        with translation.override(self.locale):
            self._run()

    def _run(self):
        self.default_facility = self.get_facility()

        storage_filepath = None
        local_filepath = None

        if self.use_storage:
            storage_filepath = self.filepath
        else:
            local_filepath = os.path.join(os.getcwd(), self.filepath)

        self.overall_error = []

        self.number_lines = self.get_number_lines(
            storage_filepath=storage_filepath, local_filepath=local_filepath
        )
        self.exit_if_error()

        with self.start_progress(total=100) as self.progress_update:
            # validate csv headers:
            has_header = self.csv_headers_validation(
                local_filepath=local_filepath, storage_filepath=storage_filepath
            )
            if not has_header:
                self.append_error(MESSAGES[INVALID_HEADER])
            self.exit_if_error()
            self.progress_update(1)  # state=csv_headers
            try:
                with open_csv_for_reading(
                    local_filepath=local_filepath, storage_filepath=storage_filepath
                ) as f:
                    reader = csv.DictReader(f, strict=True)
                    (
                        per_line_errors,
                        validator,
                        rejected_user_ids,
                        rejected_class_names,
                    ) = self._validate_rows(reader)
            except (ValueError, FileNotFoundError, csv.Error) as e:
                self.append_error(MESSAGES[FILE_READ_ERROR].format(e))
                self.exit_if_error()
            new_rows = []
            update_rows = []
            keeping_users = []
            for row in validator.users.values():
                if row["update_fields"] is None:
                    new_rows.append(row)
                else:
                    keeping_users.append(row["user"])
                    if row["update_fields"]:
                        update_rows.append(row)
            keeping_user_ids = {user.id for user in keeping_users}
            db_new_classes, db_update_classes = self.build_classes_objects(validator)
            db_classes = db_new_classes + db_update_classes
            self.progress_update(1)
            per_line_errors.extend(
                error
                for classroom in db_classes
                for error in self._model_errors(classroom)
            )

            protected_user_ids = rejected_user_ids - keeping_user_ids
            users_to_delete = self._get_users_to_delete(
                keeping_user_ids | rejected_user_ids
            )
            memberships_to_clear, membership_updates, cleared = (
                self._get_membership_changes(
                    db_update_classes,
                    rejected_class_names,
                    protected_user_ids,
                    keeping_user_ids | {user.id for user in users_to_delete},
                )
            )

            if not self.dryrun:
                rows_to_save = new_rows + update_rows
                self._hash_passwords(rows_to_save)
                with transaction.atomic():
                    # bulk_create and bulk_update are not possible with current Morango:
                    users_data = {}
                    for row in rows_to_save:
                        user = row["user"]
                        user.save(update_fields=row["update_fields"])
                        users_data[user.username] = user
                    self.add_roles(users_data, validator.roles)

                    for classroom in db_new_classes:
                        classroom.save(force_insert=True)

                    enrolled = validator.classes["ENROLLED_IN"]
                    assigned = validator.classes["ASSIGNED_TO"]
                    membership_users = {
                        username: row["user"]
                        for username, row in validator.users.items()
                        if username in users_data
                        or username != row[self.header_translation["USERNAME"]]
                    }
                    self.add_classes_memberships(
                        (enrolled, assigned), membership_users, db_classes
                    )
                    self.remove_memberships(keeping_users, enrolled, assigned)
                    self.clear_class_memberships(memberships_to_clear)
                    self.delete_users(users_to_delete)
            classes_report = {
                "created": len(db_new_classes),
                "updated": len(db_update_classes) + membership_updates,
                "cleared": cleared,
            }
            users_report = {
                "created": len(new_rows),
                "updated": len(update_rows),
                "deleted": len(users_to_delete),
            }

            self.output_messages(
                per_line_errors,
                classes_report,
                users_report,
                self.filepath,
                self.errorlines,
            )
