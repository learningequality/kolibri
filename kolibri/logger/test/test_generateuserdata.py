import tempfile

from django.core.management import call_command
from django.test import TestCase
from django.test.utils import override_settings

from kolibri.auth.models import Classroom, Facility, FacilityUser
from kolibri.logger.models import ContentSessionLog, ContentSummaryLog

n_users = 2
n_classes = 2
n_facilities = 2

CONTENT_STORAGE_DIR_TEMP = tempfile.mkdtemp()
CONTENT_DATABASE_DIR_TEMP = tempfile.mkdtemp()

@override_settings(
    CONTENT_STORAGE_DIR=CONTENT_STORAGE_DIR_TEMP,
    CONTENT_DATABASE_DIR=CONTENT_DATABASE_DIR_TEMP,
)
class GenerateUserDataTest(TestCase):

    fixtures = ['content_test.json']

    @classmethod
    def setUpTestData(cls):
        # To save testing time, only run the management command once
        # Then make assertions in separate tests to isolate failures
        call_command('generateuserdata', users=n_users, classes=n_classes, facilities=n_facilities)

    def test_facilities_created(self):
        self.assertEqual(Facility.objects.count(), n_facilities)

    def test_classes_created(self):
        self.assertEqual(Classroom.objects.count(), n_facilities * n_classes)

    def test_users_created(self):
        self.assertEqual(FacilityUser.objects.count(), n_facilities * n_classes * n_users)

    def test_session_logs_for_each_user(self):
        for user in FacilityUser.objects.all():
            self.assertTrue(ContentSessionLog.objects.filter(user=user).exists())

    def test_summary_logs_for_each_user(self):
        for user in FacilityUser.objects.all():
            self.assertTrue(ContentSummaryLog.objects.filter(user=user).exists())
