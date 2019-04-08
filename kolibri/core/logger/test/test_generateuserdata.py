from django.core.management import call_command
from django.test import TestCase

from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.lessons.models import Lesson
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog

n_users = 2
n_classes = 2
n_facilities = 2
n_lessons = 2


class GenerateUserDataTest(TestCase):

    fixtures = ["content_test.json"]

    @classmethod
    def setUpTestData(cls):
        # To save testing time, only run the management command once
        # Then make assertions in separate tests to isolate failures
        call_command(
            "generateuserdata",
            users=n_users,
            classes=n_classes,
            facilities=n_facilities,
            num_lessons=n_lessons,
        )

    def test_facilities_created(self):
        self.assertEqual(Facility.objects.count(), n_facilities)

    def test_classes_created(self):
        self.assertEqual(Classroom.objects.count(), n_facilities * n_classes)

    def test_users_created(self):
        self.assertEqual(
            FacilityUser.objects.count(), n_facilities * n_classes * n_users
        )

    def test_session_logs_for_each_user(self):
        for user in FacilityUser.objects.all():
            self.assertTrue(ContentSessionLog.objects.filter(user=user).exists())

    def test_summary_logs_for_each_user(self):
        for user in FacilityUser.objects.all():
            self.assertTrue(ContentSummaryLog.objects.filter(user=user).exists())

    def test_lessons_created(self):
        self.assertEqual(Lesson.objects.count(), n_lessons * n_classes * n_facilities)

    def test_no_spacey_names(self):
        for user in FacilityUser.objects.all():
            self.assertEqual(user.full_name.strip(), user.full_name)
