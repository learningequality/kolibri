from __future__ import unicode_literals

import csv
import io
import logging
import os
import sys
from collections import OrderedDict
from functools import partial

from kolibri.core.auth.constants.demographics import choices
from kolibri.core.auth.constants.demographics import DEMO_FIELDS
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser


logger = logging.getLogger(__name__)


def infer_facility(facility_id):
    if facility_id is not None:
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


mappings = {
    "gender": partial(transform_choices, "gender"),
    "birth_year": partial(transform_choices, "birth_year"),
}

labels = OrderedDict(
    (
        ("facility__name", "Facility name"),
        ("facility__id", "Facility id"),
        ("memberships__collection__name", "Class name"),
        ("memberships__collection__id", "Class id"),
        ("full_name", "Full name"),
        ("gender", "Gender"),
        ("birth_year", "Birth year"),
        ("id_number", "ID number"),
        ("username", "Username"),
    )
)


def map_object(obj):
    mapped_obj = {}
    for header, label in labels.items():
        if header in mappings and header in obj:
            mapped_obj[label] = mappings[header](obj)
        elif header in obj:
            mapped_obj[label] = obj[header]
    return mapped_obj


db_columns = (
    "facility__name",
    "facility__id",
    "memberships__collection__name",
    "memberships__collection__id",
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

    if sys.version_info[0] < 3:
        csv_file = io.open(filepath, "wb")
    else:
        csv_file = io.open(filepath, "w", newline="")

    with csv_file as f:
        writer = csv.DictWriter(f, header_labels)
        logger.info("Creating csv file {filename}".format(filename=filepath))
        writer.writeheader()
        for item in queryset.select_related(
            "facility", "memberships__collection"
        ).values(*columns):
            writer.writerow(map_object(item))
            yield
