import csv
import io
import sys
import tempfile

import pytest
from django.core.management import call_command
from django.test import TestCase

from ..management.commands import bulkimportusers as b
from ..management.commands.bulkexportusers import labels
from .helpers import create_dummy_facility_data
from kolibri.core.auth.constants import demographics
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

    def create_csv(self, filepath, rows):
        header_labels = list(labels.values())

        if sys.version_info[0] < 3:
            csv_file = io.open(filepath, "wb")
        else:
            csv_file = io.open(filepath, "w", newline="")

        with csv_file as f:
            writer = csv.writer(f)
            writer.writerow(header_labels)
            for item in rows:
                writer.writerow(item)

    def import_exported_csv(self):
        # import exported csv
        call_command(
            "bulkimportusers", self.filepath, facility=self.facility.id,
        )
        current_classes = Classroom.objects.filter(parent_id=self.facility).all()
        for classroom in current_classes:
            assert len(classroom.get_members()) == CLASSROOMS
            assert len(classroom.get_coaches()) == 1

    def test_dryrun_from_export_csv(self):
        with open(self.filepath, "r") as source:
            header = next(csv.reader(source, strict=True))
        header_translation = {l.partition("(")[2].partition(")")[0]: l for l in header}
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
        enrolled_classes = classes[0]
        assert "learnerag" in enrolled_classes["classroom0"]
        assert "learnerclass0group0" in enrolled_classes["classroom0"]
        assert "learnerag" in enrolled_classes["classroom1"]
        assert "learnerclass1group0" in enrolled_classes["classroom1"]
        assigned_classes = classes[1]
        assert assigned_classes["classroom0"] == ["classcoach0"]
        assert assigned_classes["classroom1"] == ["classcoach1"]

    def test_delete_users_and_classes(self):
        self.import_exported_csv()

        # new csv to import and clear classes and delete non-admin users:
        _, new_filepath = tempfile.mkstemp(suffix=".csv")
        rows = []
        rows.append(
            [
                "new_learner",
                None,
                None,
                "LEARNER",
                None,
                "2001",
                "FEMALE",
                "new_class",
                None,
            ]
        )
        rows.append(
            ["new_coach", None, None, "COACH", None, "1969", "MALE", None, "new_class"]
        )
        self.create_csv(new_filepath, rows)
        call_command(
            "bulkimportusers", new_filepath, "--delete", facility=self.facility.id,
        )

        # Previous users have been deleted, excepting the existing admin:
        learners = FacilityUser.objects.filter(
            facility=self.facility, roles__kind=None
        ).all()
        assert len(learners) == 1
        coaches = FacilityUser.objects.filter(
            facility=self.facility,
            roles__collection_id=self.facility,
            roles__kind=role_kinds.COACH,
        ).all()
        assert len(coaches) == 1
        admins = FacilityUser.objects.filter(
            facility=self.facility,
            roles__collection_id=self.facility,
            roles__kind=role_kinds.ADMIN,
        ).all()
        assert len(admins) == 1

        new_current_classes = Classroom.objects.filter(parent_id=self.facility).all()
        for classroom in new_current_classes:
            if classroom.name != "new_class":
                # classes have been cleared:
                assert len(classroom.get_members()) == 0
                assert len(classroom.get_coaches()) == 0
            else:
                # new class has been created with one coach and learner
                assert len(classroom.get_members()) == 1
                assert len(classroom.get_coaches()) == 1

    def test_add_users_and_classes(self):
        self.import_exported_csv()
        old_users = FacilityUser.objects.count()
        # new csv to import and update classes, adding users and keeping previous not been in the csv:
        _, new_filepath = tempfile.mkstemp(suffix=".csv")
        rows = []
        rows.append(
            [
                "new_learner",
                None,
                None,
                "LEARNER",
                "kalite",
                "2001",
                "FEMALE",
                "classroom1,classroom0",
            ]
        )
        rows.append(
            ["new_coach", None, None, "COACH", None, "1969", "MALE", None, "classroom0"]
        )
        self.create_csv(new_filepath, rows)
        call_command(
            "bulkimportusers", new_filepath, facility=self.facility.id,
        )
        assert FacilityUser.objects.count() == old_users + 2
        current_classes = Classroom.objects.filter(parent_id=self.facility).all()
        for classroom in current_classes:
            if classroom.name == "classroom0":
                assert len(classroom.get_coaches()) == 2
            else:
                assert len(classroom.get_coaches()) == 1
            assert (
                len(classroom.get_members()) == 3
            )  # ['learnerag', 'learnerclassXgroup0', 'new_learner']

        # check demographics import:
        new_learner = FacilityUser.objects.get(username="new_learner")
        assert new_learner.gender == demographics.FEMALE
        assert new_learner.birth_year == "2001"
        assert new_learner.id_number == "kalite"
        new_coach = FacilityUser.objects.get(username="new_coach")
        assert new_coach.gender == demographics.MALE
