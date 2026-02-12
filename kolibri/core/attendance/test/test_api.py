import datetime

from django.urls import reverse
from rest_framework.test import APITestCase

from kolibri.core.attendance.models import AttendanceRecord
from kolibri.core.attendance.models import AttendanceSession
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Membership
from kolibri.core.auth.models import Role
from kolibri.core.auth.test.helpers import provision_device

DUMMY_PASSWORD = "password"


class AttendanceSessionAPITestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = Facility.objects.create(name="Test Facility")
        cls.classroom = Classroom.objects.create(name="Test Class", parent=cls.facility)
        cls.coach = FacilityUser.objects.create(username="coach", facility=cls.facility)
        cls.coach.set_password(DUMMY_PASSWORD)
        cls.coach.save()
        Role.objects.create(
            user=cls.coach, collection=cls.classroom, kind=role_kinds.COACH
        )
        cls.learner = FacilityUser.objects.create(
            username="learner", facility=cls.facility
        )
        cls.learner.set_password(DUMMY_PASSWORD)
        cls.learner.save()
        Membership.objects.create(user=cls.learner, collection=cls.classroom)

        cls.facility_admin = FacilityUser.objects.create(
            username="admin", facility=cls.facility
        )
        cls.facility_admin.set_password(DUMMY_PASSWORD)
        cls.facility_admin.save()
        Role.objects.create(
            user=cls.facility_admin,
            collection=cls.facility,
            kind=role_kinds.ADMIN,
        )

    def test_coach_can_create_session(self):
        self.client.login(username="coach", password=DUMMY_PASSWORD)
        response = self.client.post(
            reverse("kolibri:core:attendancesession-list"),
            {
                "collection": self.classroom.id,
                "date": str(datetime.date.today()),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["session_number"], 1)

    def test_learner_cannot_create_session(self):
        self.client.login(username="learner", password=DUMMY_PASSWORD)
        response = self.client.post(
            reverse("kolibri:core:attendancesession-list"),
            {
                "collection": self.classroom.id,
                "date": str(datetime.date.today()),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_coach_can_list_sessions(self):
        self.client.login(username="coach", password=DUMMY_PASSWORD)
        AttendanceSession.objects.create(
            collection=self.classroom,
            date=datetime.date.today(),
            created_by=self.coach,
        )
        response = self.client.get(
            reverse("kolibri:core:attendancesession-list"),
            {"collection": self.classroom.id},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_filter_by_date_range(self):
        self.client.login(username="coach", password=DUMMY_PASSWORD)
        AttendanceSession.objects.create(
            collection=self.classroom,
            date=datetime.date(2026, 1, 1),
            created_by=self.coach,
        )
        AttendanceSession.objects.create(
            collection=self.classroom,
            date=datetime.date(2026, 1, 15),
            created_by=self.coach,
        )
        response = self.client.get(
            reverse("kolibri:core:attendancesession-list"),
            {
                "collection": self.classroom.id,
                "start_date": "2026-01-10",
                "end_date": "2026-01-20",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_admin_can_create_session(self):
        self.client.login(username="admin", password=DUMMY_PASSWORD)
        response = self.client.post(
            reverse("kolibri:core:attendancesession-list"),
            {
                "collection": self.classroom.id,
                "date": str(datetime.date.today()),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)


class AttendanceRecordAPITestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = Facility.objects.create(name="Test Facility")
        cls.classroom = Classroom.objects.create(name="Test Class", parent=cls.facility)
        cls.coach = FacilityUser.objects.create(username="coach", facility=cls.facility)
        cls.coach.set_password(DUMMY_PASSWORD)
        cls.coach.save()
        Role.objects.create(
            user=cls.coach, collection=cls.classroom, kind=role_kinds.COACH
        )
        cls.learner1 = FacilityUser.objects.create(
            username="learner1", facility=cls.facility
        )
        cls.learner1.set_password(DUMMY_PASSWORD)
        cls.learner1.save()
        Membership.objects.create(user=cls.learner1, collection=cls.classroom)
        cls.learner2 = FacilityUser.objects.create(
            username="learner2", facility=cls.facility
        )
        cls.learner2.set_password(DUMMY_PASSWORD)
        cls.learner2.save()
        Membership.objects.create(user=cls.learner2, collection=cls.classroom)

        cls.session = AttendanceSession.objects.create(
            collection=cls.classroom,
            date=datetime.date.today(),
            created_by=cls.coach,
        )

    def test_coach_can_create_records(self):
        self.client.login(username="coach", password=DUMMY_PASSWORD)
        response = self.client.post(
            reverse("kolibri:core:attendancerecord-list"),
            {
                "session": self.session.id,
                "user": self.learner1.id,
                "present": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)

    def test_can_update_record(self):
        self.client.login(username="coach", password=DUMMY_PASSWORD)
        record = AttendanceRecord.objects.create(
            session=self.session,
            user=self.learner1,
            present=False,
        )
        response = self.client.patch(
            reverse(
                "kolibri:core:attendancerecord-detail",
                kwargs={"pk": record.id},
            ),
            {"present": True},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        record.refresh_from_db()
        self.assertTrue(record.present)

    def test_list_records_for_session(self):
        self.client.login(username="coach", password=DUMMY_PASSWORD)
        AttendanceRecord.objects.create(
            session=self.session, user=self.learner1, present=True
        )
        AttendanceRecord.objects.create(
            session=self.session, user=self.learner2, present=False
        )
        response = self.client.get(
            reverse("kolibri:core:attendancerecord-list"),
            {"session": self.session.id},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    def test_bulk_submit_attendance(self):
        self.client.login(username="coach", password=DUMMY_PASSWORD)
        response = self.client.post(
            reverse(
                "kolibri:core:attendancesession-submit-attendance",
                kwargs={"pk": self.session.id},
            ),
            {
                "records": [
                    {"user": self.learner1.id, "present": True},
                    {"user": self.learner2.id, "present": False},
                ]
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            AttendanceRecord.objects.filter(session=self.session).count(), 2
        )

    def test_bulk_update_attendance(self):
        """Submitting again updates existing records."""
        self.client.login(username="coach", password=DUMMY_PASSWORD)
        AttendanceRecord.objects.create(
            session=self.session, user=self.learner1, present=False
        )
        response = self.client.post(
            reverse(
                "kolibri:core:attendancesession-submit-attendance",
                kwargs={"pk": self.session.id},
            ),
            {
                "records": [
                    {"user": self.learner1.id, "present": True},
                    {"user": self.learner2.id, "present": True},
                ]
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        record = AttendanceRecord.objects.get(session=self.session, user=self.learner1)
        self.assertTrue(record.present)
