import csv
import tempfile

import pytest
from django.core.management import call_command
from django.test import TestCase

from ..management.commands import bulkimportusers as b
from .helpers import create_dummy_facility_data
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import FacilityUser


CLASSROOMS = 2

# validators


def test_number_range_validator():
    check = b.number_range(1900, 2050, allow_null=False)
    with pytest.raises(ValueError):
        check(3)
    with pytest.raises(ValueError):
        check(None)
    with pytest.raises(ValueError):
        check(2051)

    check = b.number_range(1900, 2050, allow_null=True)
    assert check("1969") is None
    assert check("2050") is None
    assert check(None) is None


def test_value_length_validator():
    check = b.value_length(4, allow_null=False)
    with pytest.raises(ValueError):
        assert check(None)

    check = b.value_length(4, allow_null=True)
    with pytest.raises(ValueError):
        check("Learning")
    assert check(None) is None
    assert check("ok") is None
    assert check("") is None


def test_enumeration_validator():
    check = b.enumeration("LEARNER", "ADMIN", "COACH")
    assert check("aDMin") is None
    with pytest.raises(ValueError):
        check("other")
    check = b.enumeration("kolibri")
    assert check("b") is None


def test_valid_name_validator():
    check = b.valid_name()
    # pytest.set_trace()
    assert check("bob123") is None
    with pytest.raises(ValueError):
        check("bob 123")

    check = b.valid_name(username=False)
    check("bob 123") is None
    with pytest.raises(ValueError):
        check("bob123-..")
    with pytest.raises(ValueError):
        check(None)

    check = b.valid_name(allow_null=True)
    check(None) is None


class ImportTestCase(TestCase):
    def setUp(self):
        self.data = create_dummy_facility_data(
            classroom_count=CLASSROOMS, learnergroup_count=1
        )
        self.facility = self.data["facility"]

        _, self.filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "bulkexportusers",
            output_file=self.filepath,
            overwrite=True,
            facility=self.facility.id,
        )

        FacilityUser.objects.all().delete()
        Classroom.objects.all().delete()

        with open(self.filepath, "r") as source:
            self.header = next(csv.reader(source, strict=True))

    def test_import_from_export_csv(self):
        header_translation = {
            l.partition("(")[2].partition(")")[0]: l for l in self.header
        }
        cmd = b.Command()

        with open(self.filepath) as source:
            reader = csv.DictReader(source, strict=True)
            per_line_errors, classes, users, roles = cmd.csv_values_validation(
                reader, header_translation
            )

        assert len(users) == 13
        assert per_line_errors == []
        assert roles[role_kinds.ADMIN] == ["facadmin"]
        assert roles[role_kinds.COACH] == ["faccoach"]
        assert "classcoach0" in roles[role_kinds.ASSIGNABLE_COACH]
        assert "classcoach1" in roles[role_kinds.ASSIGNABLE_COACH]
