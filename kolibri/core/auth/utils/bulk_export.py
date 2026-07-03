import csv
import logging
import os
from collections import OrderedDict
from functools import partial

from django.conf import settings
from django.db.models import OuterRef
from django.db.models import Subquery
from django.utils import translation
from django.utils.translation import gettext_lazy as _
from django.utils.translation import pgettext_lazy

from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.constants.demographics import DEFERRED
from kolibri.core.auth.constants.demographics import NOT_SPECIFIED
from kolibri.core.auth.errors import BulkUserExportError
from kolibri.core.auth.management.commands.bulkimportusers import FILE_WRITE_ERROR
from kolibri.core.auth.management.commands.bulkimportusers import MESSAGES
from kolibri.core.auth.management.commands.bulkimportusers import NO_FACILITY
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Role
from kolibri.core.query import GroupConcatSubquery
from kolibri.core.tasks.utils import JobProgressMixin
from kolibri.core.utils.csv import open_csv_for_writing
from kolibri.core.utils.csv import output_mapper
from kolibri.core.utils.csv import validate_open_csv_params

logger = logging.getLogger(__name__)

CSV_EXPORT_FILENAMES = {"user": "log_export/{}_{}_users.csv"}


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
    return None if val in (NOT_SPECIFIED, DEFERRED) else val


def kind_of_roles(field, obj):
    val = obj[field]
    return "LEARNER" if val is None else roles_map[val.lower()]


output_mappings = {
    "kind": partial(kind_of_roles, "kind"),
    "gender": partial(not_specified, "gender"),
    "birth_year": partial(not_specified, "birth_year"),
}


def map_output(item):
    return partial(
        output_mapper, labels=translate_labels(), output_mappings=output_mappings
    )(item)


def translate_labels():
    return OrderedDict(
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


def csv_file_generator(
    facility, storage_filepath=None, local_filepath=None, overwrite=True
):
    validate_open_csv_params(storage_filepath, local_filepath)

    if local_filepath and not overwrite and os.path.exists(local_filepath):
        raise ValueError(f"{local_filepath} already exists")

    queryset = FacilityUser.objects.filter(facility=facility)

    header_labels = translate_labels().values()

    with open_csv_for_writing(
        storage_filepath=storage_filepath, local_filepath=local_filepath
    ) as f:
        writer = csv.DictWriter(f, header_labels)
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


class BulkUserExportManager(JobProgressMixin):
    def __init__(
        self,
        facility_id=None,
        locale=None,
        use_storage=False,
        output_file=None,
        overwrite=True,
    ):
        self.facility_id = facility_id
        self.locale = locale
        self.use_storage = use_storage
        self.output_file = output_file
        self.overwrite = overwrite
        super().__init__()

    def run(self):
        storage_filepath = None
        local_filepath = None

        # set language for the translation of the messages
        translation.activate(self.locale or settings.LANGUAGE_CODE)

        if self.facility_id:
            facility = Facility.objects.get(pk=self.facility_id)
        else:
            facility = Facility.get_default_facility()
        if not facility:
            raise BulkUserExportError(MESSAGES[NO_FACILITY])

        filename = CSV_EXPORT_FILENAMES["user"].format(facility.name, facility.id[:4])

        if self.use_storage:
            storage_filepath = filename
        else:
            local_filepath = (
                self.output_file
                if self.output_file
                else filename.replace("log_export/", "")
            )
            local_filepath = os.path.join(os.getcwd(), local_filepath)

        total_rows = FacilityUser.objects.filter(facility=facility).count()

        with self.start_progress(total=total_rows) as progress_update:
            try:
                for _row in csv_file_generator(
                    facility,
                    storage_filepath=storage_filepath,
                    local_filepath=local_filepath,
                    overwrite=self.overwrite,
                ):
                    progress_update(1)
            except (OSError, ValueError) as e:
                raise BulkUserExportError(MESSAGES[FILE_WRITE_ERROR].format(e)) from e

        if self.job:
            self.job.extra_metadata["overall_error"] = []
            self.job.extra_metadata["users"] = total_rows
            self.job.extra_metadata["filename"] = filename
            self.job.save_meta()
        else:
            logger.info("Created csv file %s with %s lines", filename, total_rows)

        translation.deactivate()
