import datetime

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
        cls.start_date = datetime.datetime(2020, 1, 21).isoformat()
        cls.end_date = datetime.datetime(2021, 1, 21).isoformat()

    def test_validator_sets_right_metadata(self):
        validator = ExportLogCSVValidator(
            data={
                "type": "kolibri.core.logger.tasks.exportsummarylogcsv",
                "start_date": "2020-01-21T00:00:00",
                "end_date": "2021-01-21T00:00:00",
            },
            context={"user": self.facility_user},
        )
        validator.is_valid(raise_exception=True)
        self.assertEqual(
            validator.validated_data,
            {
                "facility_id": self.facility.id,
                "enqueue_args": {},
                "kwargs": {
                    "facility": self.facility.id,
                    "start_date": self.start_date,
                    "end_date": self.end_date,
                    "locale": None,
                },
                "args": [self.facility.id],
                "extra_metadata": {
                    "started_by": self.facility_user.id,
                    "started_by_username": self.facility_user.username,
                },
            },
        )
