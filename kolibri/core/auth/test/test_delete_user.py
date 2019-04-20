import uuid

import mock
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from .. import utils
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Membership
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.test.factory_logger import ContentSessionLogFactory


class UserDeleteTestCase(TestCase):
    """
    Tests for deleteuser command.
    """

    def setUp(self):
        self.facility = Facility.objects.create()
        user = FacilityUser.objects.create(username="user", facility=self.facility)
        Membership.objects.create(collection=self.facility, user=user)
        ContentSessionLogFactory.create(
            user=user, content_id=uuid.uuid4().hex, channel_id=uuid.uuid4().hex
        )

    @mock.patch("django.utils.six.moves.input", new=lambda x: "yes")
    def test_user_delete(self):
        utils.input = mock.MagicMock(name="input", return_value="yes")
        call_command("deleteuser", "user")
        self.assertFalse(FacilityUser.objects.exists())
        # sanity checks to make sure cascade deletion still works
        self.assertFalse(Membership.objects.exists())
        self.assertFalse(ContentSessionLog.objects.exists())

    @mock.patch("django.utils.six.moves.input", new=lambda x: "yes")
    def test_user_delete_with_facility(self):
        utils.input = mock.MagicMock(name="input", return_value="yes")
        call_command("deleteuser", "user", facility=self.facility.id)
        self.assertFalse(FacilityUser.objects.exists())

    def test_user_delete_does_not_exist(self):
        with self.assertRaisesRegexp(CommandError, "User with username"):
            call_command("deleteuser", "kolibri")

    def test_user_delete_multiple_users(self):
        self.facility2 = Facility.objects.create()
        FacilityUser.objects.create(username="user", facility=self.facility2)
        with self.assertRaisesRegexp(CommandError, "There is more than one user"):
            call_command("deleteuser", "user")
