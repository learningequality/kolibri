from django.test import TestCase
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.exams.models import Exam
from kolibri.core.auth.test.helpers import provision_device


class ExamTestCase(TestCase):
    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name="MyFac")
        self.admin = FacilityUser.objects.create(
            username="admin", facility=self.facility
        )
        self.admin.set_password("password")
        self.admin.save()
        self.facility.add_admin(self.admin)
        self.exam = Exam.objects.create(
            title="title",
            question_count=1,
            active=True,
            collection=self.facility,
            creator=self.admin,
        )

    def test_date_archived_on_archive_save(self):
        self.assertFalse(self.exam.archive)
        self.assertIsNone(self.exam.date_archived)
        self.exam.archive = True
        self.exam.save()
        self.exam = Exam.objects.get(title="title")
        self.assertTrue(self.exam.archive)
        self.assertIsNotNone(self.exam.date_archived)
