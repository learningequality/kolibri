"""
Tests related specifically to integration with Morango.
"""
import os
import unittest

from django.test import TestCase
from morango.controller import MorangoProfileController
from morango.models import InstanceIDModel, Store

from ..models import Facility, FacilityDataset, FacilityUser


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
        for partition in scope.read_filter + scope.write_filter:
            self.assertTrue(partition.startswith(dataset_id))


class DateTimeTZFieldTestCase(TestCase):

    def setUp(self):
        self.controller = MorangoProfileController('facilitydata')
        InstanceIDModel.get_or_create_current_instance()

    @unittest.skipIf(os.environ.get('TOX_ENV') == 'postgres', "Skipping testing on postgres because sql is not compatible.")
    def test_deserializing_field(self):
        facility = Facility.objects.create(name="hallo")
        FacilityUser.objects.create(username='jamie', facility=facility)
        self.controller.serialize_into_store()
        Store.objects.update(dirty_bit=True)
        try:
            self.controller.deserialize_from_store()
        except AttributeError as e:
            self.fail(e.message)
