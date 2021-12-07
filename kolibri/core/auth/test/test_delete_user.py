import uuid

import mock
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from kolibri.core.auth.management import utils
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Membership
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.test.factory_logger import ContentSessionLogFactory


class UserDeleteTestCase(TestCase):
    """
    Tests for deleteuser command.
    """

    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create()
        cls.facility_2 = Facility.objects.create()
        cls.user = FacilityUser.objects.create(username="user", facility=cls.facility)
        cls.classroom = Classroom.objects.create(parent=cls.facility)
        Membership.objects.create(collection=cls.classroom, user=cls.user)
        ContentSessionLogFactory.create(
            user=cls.user, content_id=uuid.uuid4().hex, channel_id=uuid.uuid4().hex
        )

    def test_user_delete(self):
        utils.input = mock.MagicMock(name="input", return_value="yes")
        call_command("deleteuser", "user")
        self.assertFalse(FacilityUser.objects.exists())
        # sanity checks to make sure cascade deletion still works
        # TODO add more objects that should be deleted in cascade like Roles
        self.assertFalse(Membership.objects.exists())
        self.assertFalse(ContentSessionLog.objects.exists())

    def test_user_delete_with_facility(self):
        utils.input = mock.MagicMock(name="input", return_value="yes")
        call_command("deleteuser", "user", facility=self.facility.id)
        self.assertFalse(FacilityUser.objects.exists())

    def test_user_delete_does_not_exist(self):
        with self.assertRaisesRegexp(CommandError, "User with username"):
            call_command("deleteuser", "kolibri")

    def test_user_delete_multiple_users(self):
        with self.assertRaisesRegexp(CommandError, "There is more than one user"):
            FacilityUser.objects.create(username="user", facility=self.facility_2)
            call_command("deleteuser", "user")
