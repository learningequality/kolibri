from __future__ import unicode_literals

import csv
import logging
import os
from collections import OrderedDict
from functools import partial

from django.db.models import OuterRef
from django.db.models import Q

from kolibri.core.auth.constants.collection_kinds import CLASSROOM
from kolibri.core.auth.constants.demographics import choices
from kolibri.core.auth.constants.demographics import DEMO_FIELDS
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.query import SQCount
from kolibri.core.utils.csv import open_csv_for_writing


logger = logging.getLogger(__name__)


def infer_facility(facility_id, facility=None):
    if facility_id:
        try:
            # Try lookup by id first, then name
            facility = Facility.objects.get(pk=facility_id)
        except (Facility.DoesNotExist, ValueError):
            try:
                facility = Facility.objects.get(name=facility_id)
            except Facility.DoesNotExist:
                raise ValueError(
                    "Facility matching identifier {facility} was not found".format(
                        facility=facility_id
                    )
                )
    elif facility is not None:
        return facility
    else:
        facility = Facility.get_default_facility()
        if facility:
            logger.info(
                "No facility specified, using the default facility {}".format(
                    facility.name
                )
            )
        else:
            raise ValueError(
                "No default facility exists, please make sure to provision this device before running this command"
            )
    return facility


choices_dict = dict(choices)


def transform_choices(field, obj):
    return choices_dict.get(obj[field], obj[field])


MULTIPLE_CLASSROOMS_TEXT = "User is enrolled in multiple classrooms"


def replace_multiple_classrooms(field, obj):
    if "classroom_count" in obj and obj["classroom_count"] > 1:
        return MULTIPLE_CLASSROOMS_TEXT
    return obj[field]


output_mappings = {
    "gender": partial(transform_choices, "gender"),
    "birth_year": partial(transform_choices, "birth_year"),
    "memberships__collection__id": partial(
        replace_multiple_classrooms, "memberships__collection__id"
    ),
    "memberships__collection__name": partial(
        replace_multiple_classrooms, "memberships__collection__name"
    ),
}

labels = OrderedDict(
    (
        ("facility__name", "Facility name"),
        ("facility__id", "Facility id"),
        ("memberships__collection__name", "Class name"),
        ("memberships__collection__id", "Class id"),
        ("full_name", "Full name"),
        ("username", "Username"),
        ("password", "Password"),
        ("gender", "Gender"),
        ("birth_year", "Birth year"),
        ("id_number", "ID number"),
    )
)


def map_output(obj):
    mapped_obj = {}
    for header, label in labels.items():
        if header in output_mappings and header in obj:
            mapped_obj[label] = output_mappings[header](obj)
        elif header in obj:
            mapped_obj[label] = obj[header]
    return mapped_obj


input_fields = (
    "full_name",
    "username",
    "password",
    "facility",
    "class",
    "gender",
    "birth_year",
    "id_number",
)


def get_field(fields, obj):
    for label in fields:
        if label in obj:
            return obj[label]


input_choices = {val: key for key, val in choices}


def transform_inputs(field, obj):
    return input_choices.get(obj[field], obj[field])


def map_class(obj):
    value = get_field(["class", "Class id", "Class name"], obj)
    if value != MULTIPLE_CLASSROOMS_TEXT:
        return value


input_mappings = {
    "class": map_class,
    "facility": partial(get_field, ["facility", "Facility id", "Facility name"]),
}


def map_input(obj):
    mapped_obj = {}
    for label in input_fields:
        header = labels.get(label, None)
        if label in input_mappings:
            mapped_obj[label] = input_mappings[label](obj)
        elif label in obj:
            mapped_obj[label] = obj[label]
        elif header and header in obj:
            mapped_obj[label] = obj[header]
    return mapped_obj


db_columns = (
    "facility__name",
    "facility__id",
    "memberships__collection__name",
    "memberships__collection__id",
    "classroom_count",
    "full_name",
    "username",
    "gender",
    "birth_year",
    "id_number",
)


def csv_file_generator(facility, filepath, overwrite=True, demographic=False):
    if not overwrite and os.path.exists(filepath):
        raise ValueError("{} already exists".format(filepath))
    queryset = FacilityUser.objects.filter(facility=facility)

    header_labels = tuple(
        label
        for field, label in labels.items()
        if demographic or field not in DEMO_FIELDS
    )

    columns = tuple(
        column for column in db_columns if demographic or column not in DEMO_FIELDS
    )

    csv_file = open_csv_for_writing(filepath)

    with csv_file as f:
        writer = csv.DictWriter(f, header_labels)
        logger.info("Creating csv file {filename}".format(filename=filepath))
        writer.writeheader()
        usernames = set()
        for item in (
            queryset.select_related("facility")
            .annotate(
                classroom_count=SQCount(
                    Classroom.objects.filter(membership__user=OuterRef("id")),
                    field="id",
                )
            )
            .prefetch_related("memberships__collection")
            .filter(
                Q(memberships__collection__kind=CLASSROOM)
                | Q(memberships__collection__isnull=True)
            )
            .values(*columns)
        ):
            if item["username"] not in usernames:
                writer.writerow(map_output(item))
                usernames.add(item["username"])
                yield
