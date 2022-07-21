from django.test import TestCase

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.logger.tasks import ExportLogCSVValidator


class StartExportLogCSVTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="pytest_facility")
        cls.facility_user = FacilityUser.objects.create(
            username="pytest_user", facility=cls.facility
        )

    def test_validator_sets_right_metadata(self):
        validator = ExportLogCSVValidator(
            data={
                "type": "kolibri.core.logger.tasks.exportsummarylogcsv",
            },
            context={"user": self.facility_user},
        )
        validator.is_valid(raise_exception=True)
        self.assertEqual(
            validator.validated_data,
            {
                "facility_id": self.facility.id,
                "args": [self.facility.id],
                "extra_metadata": {
                    "started_by": self.facility_user.id,
                    "started_by_username": self.facility_user.username,
                },
            },
        )
