import csv
import logging
import ntpath
import os
from collections import OrderedDict
from functools import partial
from tempfile import mkstemp

from django.conf import settings
from django.core.management.base import CommandError
from django.db.models import OuterRef
from django.db.models import Subquery
from django.utils import translation
from django.utils.translation import gettext_lazy as _
from django.utils.translation import pgettext_lazy

from .bulkimportusers import FILE_WRITE_ERROR
from .bulkimportusers import MESSAGES
from .bulkimportusers import NO_FACILITY
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.constants.demographics import DEFERRED
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Role
from kolibri.core.query import GroupConcatSubquery
from kolibri.core.tasks.management.commands.base import AsyncCommand
from kolibri.core.tasks.utils import get_current_job
from kolibri.core.utils.csv import open_csv_for_writing
from kolibri.utils import conf

try:
    FileNotFoundError
except NameError:
    FileNotFoundError = IOError

logger = logging.getLogger(__name__)

# TODO: decide whether these should be internationalized
labels = OrderedDict(
    (
        ("id", _("Database ID ({})").format("UUID")),
        ("username", _("Username ({})").format("USERNAME")),
        ("password", _("Password ({})").format("PASSWORD")),
        ("full_name", _("Full name ({})").format("FULL_NAME")),
        (
            "kind",
            pgettext_lazy(
                "CSV column header for the type of user: ADMIN, LEARNER, COACH...",
                "User type ({})",
            ).format("USER_TYPE"),
        ),
        ("id_number", _("Identifier ({})").format("IDENTIFIER")),
        ("birth_year", _("Birth year ({})").format("BIRTH_YEAR")),
        ("gender", _("Gender ({})").format("GENDER")),
        (
            "enrolled",
            pgettext_lazy(
                "CSV column header for the list of classrooms names where the learner is going to be enrolled",
                "Learner enrollment ({})",
            ).format("ENROLLED_IN"),
        ),
        (
            "assigned",
            pgettext_lazy(
                "CSV column header for the list of classrooms names where the tutor is going to be a coach",
                "Coach assignment ({})",
            ).format("ASSIGNED_TO"),
        ),
    )
)

db_columns = (
    "username",
    "id",
    # "password",
    "full_name",
    "birth_year",
    "gender",
    "id_number",
    "kind",
    "assigned",
    "enrolled",
)
# These constants must be entered vertbatim in the CSV
roles_map = {
    role_kinds.ADMIN: "ADMIN",
    role_kinds.COACH: "FACILITY_COACH",
    role_kinds.ASSIGNABLE_COACH: "CLASS_COACH",
}


def not_specified(field, obj):
    val = obj[field]
    return None if (val == "NOT_SPECIFIED" or val == DEFERRED) else val


def kind_of_roles(field, obj):
    val = obj[field]
    return "LEARNER" if val is None else roles_map[val.lower()]


output_mappings = {
    "kind": partial(kind_of_roles, "kind"),
    "gender": partial(not_specified, "gender"),
    "birth_year": partial(not_specified, "birth_year"),
}


def map_output(obj):
    mapped_obj = {}
    for header, label in labels.items():
        if header in output_mappings and header in obj:
            mapped_obj[label] = output_mappings[header](obj)
        elif header in obj:
            mapped_obj[label] = obj[header]
    return mapped_obj


def translate_labels():
    global labels
    labels = OrderedDict(
        (
            ("id", _("Database ID ({})").format("UUID")),
            ("username", _("Username ({})").format("USERNAME")),
            ("password", _("Password ({})").format("PASSWORD")),
            ("full_name", _("Full name ({})").format("FULL_NAME")),
            (
                "kind",
                pgettext_lazy(
                    "CSV header for the type of user: ADMIN, LEARNER, COACH...",
                    "User type ({})",
                ).format("USER_TYPE"),
            ),
            ("id_number", _("Identifier ({})").format("IDENTIFIER")),
            ("birth_year", _("Birth year ({})").format("BIRTH_YEAR")),
            ("gender", _("Gender ({})").format("GENDER")),
            (
                "enrolled",
                pgettext_lazy(
                    "CSV file header for the list of classrooms names where the learner is going to be enrolled",
                    "Learner enrollment ({})",
                ).format("ENROLLED_IN"),
            ),
            (
                "assigned",
                pgettext_lazy(
                    "CSV file header for the list of classrooms names where the tutor is going to be a coach",
                    "Coach assignment ({})",
                ).format("ASSIGNED_TO"),
            ),
        )
    )


def csv_file_generator(facility, filepath, overwrite=True):
    if not overwrite and os.path.exists(filepath):
        raise ValueError("{} already exists".format(filepath))
    queryset = FacilityUser.objects.filter(facility=facility)

    header_labels = labels.values()

    csv_file = open_csv_for_writing(filepath)

    with csv_file as f:
        writer = csv.DictWriter(f, header_labels)
        logger.info("Creating csv file {filename}".format(filename=filepath))
        writer.writeheader()
        usernames = set()

        query = (
            queryset.values("pk")
            .annotate(
                kind=Subquery(
                    Role.objects.filter(collection_id=facility.id)
                    .values("kind")
                    .filter(user_id=OuterRef("id"))
                )
            )
            .annotate(
                enrolled=GroupConcatSubquery(
                    Classroom.objects.filter(membership__user_id=OuterRef("id")).values(
                        "name"
                    ),
                    field="name",
                )
            )
            .annotate(
                assigned=GroupConcatSubquery(
                    Classroom.objects.filter(
                        role__kind="coach", role__user=OuterRef("id")
                    ).values("name"),
                    field="name",
                )
            )
        )

        for item in query.values(*db_columns):
            if item["kind"] == role_kinds.ADMIN:
                continue
            if item["username"] not in usernames:
                item["password"] = "*"
                writer.writerow(map_output(item))
                usernames.add(item["username"])
            yield item


class Command(AsyncCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            "-O",
            "--output-file",
            action="store",
            dest="output_file",
            default=None,
            type=str,
            help="The generated file will be saved with this name",
        )
        parser.add_argument(
            "--facility",
            action="store",
            type=str,
            help="Facility id to import the users into",
        )
        parser.add_argument(
            "-w",
            "--overwrite",
            action="store_true",
            dest="overwrite",
            default=True,
            help="Allows overwritten of the exported file in case it exists",
        )
        parser.add_argument(
            "--locale",
            action="store",
            type=str,
            default=None,
            help="Code of the language for the headers to be translated",
        )

    def get_facility(self, options):
        if options["facility"]:
            default_facility = Facility.objects.get(pk=options["facility"])
        else:
            default_facility = Facility.get_default_facility()
        if not default_facility:
            self.overall_error.append(MESSAGES[NO_FACILITY])
            raise CommandError(self.overall_error[-1])

        return default_facility

    def get_filepath(self, options):
        if options["output_file"] is None:
            temp_dir = os.path.join(conf.KOLIBRI_HOME, "temp")
            if not os.path.isdir(temp_dir):
                os.mkdir(temp_dir)
            filepath = mkstemp(suffix=".download", dir=temp_dir)[1]
        else:
            filepath = os.path.join(os.getcwd(), options["output_file"])
        return filepath

    def handle_async(self, *args, **options):
        # set language for the translation of the messages
        locale = settings.LANGUAGE_CODE if not options["locale"] else options["locale"]
        translation.activate(locale)
        translate_labels()

        self.overall_error = []
        filepath = self.get_filepath(options)
        facility = self.get_facility(options)
        job = get_current_job()
        total_rows = FacilityUser.objects.filter(facility=facility).count()

        with self.start_progress(total=total_rows) as progress_update:
            try:
                for row in csv_file_generator(
                    facility, filepath, overwrite=options["overwrite"]
                ):
                    progress_update(1)
            except (ValueError, IOError) as e:
                self.overall_error.append(MESSAGES[FILE_WRITE_ERROR].format(e))
                raise CommandError(self.overall_error[-1])

            # freeze error messages translations:
            self.overall_error = [str(msg) for msg in self.overall_error]

            if job:
                job.extra_metadata["overall_error"] = self.overall_error
                job.extra_metadata["users"] = total_rows
                job.extra_metadata["filename"] = ntpath.basename(filepath)
                job.save_meta()
            else:
                logger.info(
                    "Created csv file {} with {} lines".format(filepath, total_rows)
                )

        translation.deactivate()
