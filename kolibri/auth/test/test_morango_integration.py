"""
Tests related specifically to integration with Morango.
"""

from django.test import TestCase

from ..models import Facility, FacilityDataset

class FacilityDatasetCertificateTestCase(TestCase):

    def test_creating_facility_creates_dataset(self):
        facility = Facility.objects.create(name="hallo")
        self.assertIsNotNone(facility.dataset)

    def test_creating_facilitydataset_creates_certificate(self):
        dataset = FacilityDataset.objects.create()
        self.assertIsNotNone(dataset.get_root_certificate())

    def test_partition_and_id_values(self):
        facility = Facility.objects.create(name="hallo")
        dataset_id = facility.dataset.id
        self.assertEqual(dataset_id, facility.dataset.get_root_certificate().id)
        self.assertEqual(dataset_id, facility.dataset._morango_source_id)
        self.assertTrue(facility.dataset._morango_partition.startswith(dataset_id))
        scope = facility.dataset.get_root_certificate().get_scope()
        for partition in scope.read_scope + scope.write_scope:
            self.assertTrue(partition.startswith(dataset_id))
