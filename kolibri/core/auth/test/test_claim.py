import uuid

import mock
import requests
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from morango.certificates import Certificate

from kolibri.core.auth.test.test_api import FacilityFactory


def mock_response(*args, **kwargs):
    response = mock.Mock()
    response.json = lambda: {'id': uuid.uuid4().hex}
    return response


@mock.patch.object(requests, 'post', mock_response)
class ClaimFacilityTestCase(TestCase):
    """
    Tests for management command of claiming a facility on a data portal server.
    """

    def setUp(self):
        self.token = 'token'

    def test_no_facility(self):
        with self.assertRaisesRegexp(CommandError, 'does not exist'):
            call_command('claim', 'token', facility=uuid.uuid4().hex)

    def test_multiple_facility(self):
        FacilityFactory()
        FacilityFactory()
        with self.assertRaisesRegexp(CommandError, 'multiple facilities'):
            call_command('claim', 'token')

    def test_no_owned_certificates(self):
        FacilityFactory()
        cert = Certificate.objects.first()
        cert.private_key = None
        cert.save()
        with self.assertRaisesRegexp(CommandError, 'not own a certificate'):
            call_command('claim', 'token')
