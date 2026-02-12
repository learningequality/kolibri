import datetime

from django.test import TestCase

from kolibri.core.attendance.models import AttendanceRecord
from kolibri.core.attendance.models import AttendanceSession
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.helpers import provision_device


class AttendanceSessionTestCase(TestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = Facility.objects.create(name="Test Facility")
        cls.classroom = Classroom.objects.create(name="Test Class", parent=cls.facility)
        cls.coach = FacilityUser.objects.create(username="coach", facility=cls.facility)
        cls.coach.set_password("password")
        cls.coach.save()

    def test_create_attendance_session(self):
        session = AttendanceSession.objects.create(
            collection=self.classroom,
            date=datetime.date.today(),
            created_by=self.coach,
        )
        self.assertEqual(session.session_number, 1)
        self.assertEqual(session.collection, self.classroom)

    def test_auto_increment_session_number(self):
        AttendanceSession.objects.create(
            collection=self.classroom,
            date=datetime.date.today(),
            created_by=self.coach,
        )
        session2 = AttendanceSession.objects.create(
            collection=self.classroom,
            date=datetime.date.today(),
            created_by=self.coach,
        )
        self.assertEqual(session2.session_number, 2)

    def test_session_number_resets_per_date(self):
        AttendanceSession.objects.create(
            collection=self.classroom,
            date=datetime.date(2026, 1, 1),
            created_by=self.coach,
        )
        session = AttendanceSession.objects.create(
            collection=self.classroom,
            date=datetime.date(2026, 1, 2),
            created_by=self.coach,
        )
        self.assertEqual(session.session_number, 1)


class AttendanceRecordTestCase(TestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = Facility.objects.create(name="Test Facility")
        cls.classroom = Classroom.objects.create(name="Test Class", parent=cls.facility)
        cls.coach = FacilityUser.objects.create(username="coach", facility=cls.facility)
        cls.coach.set_password("password")
        cls.coach.save()
        cls.learner = FacilityUser.objects.create(
            username="learner", facility=cls.facility
        )
        cls.learner.set_password("password")
        cls.learner.save()
        cls.classroom.add_member(cls.learner)

    def test_create_attendance_record(self):
        session = AttendanceSession.objects.create(
            collection=self.classroom,
            date=datetime.date.today(),
            created_by=self.coach,
        )
        record = AttendanceRecord.objects.create(
            session=session,
            user=self.learner,
            present=True,
        )
        self.assertTrue(record.present)
        self.assertEqual(record.user, self.learner)
        self.assertEqual(record.session, session)
