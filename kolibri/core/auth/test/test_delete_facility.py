import uuid

from django.core.management import call_command
from django.test import TestCase
from morango.models import DatabaseMaxCounter

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser


class DeleteFacilityCommandTestCase(TestCase):
    """
    Tests for the deletefacility command.
    """

    databases = "__all__"

    def setUp(self):
        self.facility = Facility.objects.create(name="To delete")
        self.remaining_facility = Facility.objects.create(name="To keep")
        FacilityUser.objects.create(username="user", facility=self.facility)
        self.legacy_instance_id = uuid.uuid4().hex
        DatabaseMaxCounter.objects.create(
            instance_id=self.legacy_instance_id, partition="", counter=10
        )

    def _delete_facility(self, **options):
        call_command(
            "deletefacility", facility=self.facility.id, noninteractive=True, **options
        )

    def test_deletes_facility(self):
        self._delete_facility()
        self.assertFalse(Facility.objects.filter(id=self.facility.id).exists())
        self.assertFalse(FacilityUser.objects.filter(username="user").exists())
        self.assertTrue(Facility.objects.filter(id=self.remaining_facility.id).exists())

    def test_cleans_up_legacy_counters(self):
        self._delete_facility()
        self.assertFalse(DatabaseMaxCounter.objects.filter(partition="").exists())
        counter = DatabaseMaxCounter.objects.get(
            instance_id=self.legacy_instance_id,
            partition=self.remaining_facility.dataset_id,
        )
        self.assertEqual(counter.counter, 10)
        self.assertFalse(
            DatabaseMaxCounter.objects.filter(
                partition=self.facility.dataset_id
            ).exists()
        )

    def test_skip_legacy_counter_cleanup__preserves_legacy_counters(self):
        call_command(
            "deletefacility",
            "--facility",
            self.facility.id,
            "--noninteractive",
            "--skip-legacy-counter-cleanup",
        )
        self.assertFalse(Facility.objects.filter(id=self.facility.id).exists())
        counter = DatabaseMaxCounter.objects.get(
            instance_id=self.legacy_instance_id, partition=""
        )
        self.assertEqual(counter.counter, 10)
        self.assertFalse(
            DatabaseMaxCounter.objects.filter(
                partition=self.remaining_facility.dataset_id
            ).exists()
        )
