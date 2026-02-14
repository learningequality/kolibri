import datetime

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from kolibri.core.attendance.models import AttendanceRecord
from kolibri.core.attendance.models import AttendanceSession
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.helpers import provision_device

DUMMY_PASSWORD = "password"


class AttendanceSessionAPITestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = Facility.objects.create(name="TestFacility")
        cls.classroom = Classroom.objects.create(name="TestClass", parent=cls.facility)
        cls.coach = FacilityUser.objects.create(username="coach", facility=cls.facility)
        cls.coach.set_password(DUMMY_PASSWORD)
        cls.coach.save()
        cls.classroom.add_coach(cls.coach)

        cls.learner1 = FacilityUser.objects.create(
            username="learner1", facility=cls.facility
        )
        cls.learner1.set_password(DUMMY_PASSWORD)
        cls.learner1.save()
        cls.classroom.add_member(cls.learner1)

        cls.learner2 = FacilityUser.objects.create(
            username="learner2", facility=cls.facility
        )
        cls.learner2.set_password(DUMMY_PASSWORD)
        cls.learner2.save()
        cls.classroom.add_member(cls.learner2)

        cls.admin = FacilityUser.objects.create(username="admin", facility=cls.facility)
        cls.admin.set_password(DUMMY_PASSWORD)
        cls.admin.save()
        cls.facility.add_admin(cls.admin)

    def setUp(self):
        self.client.login(username="coach", password=DUMMY_PASSWORD)

    def test_create_session_with_records(self):
        response = self.client.post(
            reverse("kolibri:core:attendancesession-list"),
            {
                "collection": self.classroom.id,
                "attendance_records": [
                    {"user": self.learner1.id, "present": True},
                    {"user": self.learner2.id, "present": False},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AttendanceSession.objects.count(), 1)
        self.assertEqual(AttendanceRecord.objects.count(), 2)

    def test_create_session_sets_created_by(self):
        response = self.client.post(
            reverse("kolibri:core:attendancesession-list"),
            {
                "collection": self.classroom.id,
                "attendance_records": [
                    {"user": self.learner1.id, "present": True},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        session = AttendanceSession.objects.first()
        self.assertEqual(session.created_by, self.coach)

    def test_list_sessions_by_collection(self):
        session = AttendanceSession.objects.create(
            collection=self.classroom, created_by=self.coach
        )
        AttendanceRecord.objects.create(
            attendance_session=session, user=self.learner1, present=True
        )

        response = self.client.get(
            reverse("kolibri:core:attendancesession-list"),
            {"collection": self.classroom.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(len(response.data[0]["attendance_records"]), 1)

    def test_retrieve_session(self):
        session = AttendanceSession.objects.create(
            collection=self.classroom, created_by=self.coach
        )
        AttendanceRecord.objects.create(
            attendance_session=session, user=self.learner1, present=True
        )

        response = self.client.get(
            reverse(
                "kolibri:core:attendancesession-detail",
                kwargs={"pk": session.id},
            )
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["attendance_records"]), 1)

    def test_update_session_records(self):
        session = AttendanceSession.objects.create(
            collection=self.classroom, created_by=self.coach
        )
        AttendanceRecord.objects.create(
            attendance_session=session, user=self.learner1, present=False
        )

        response = self.client.put(
            reverse(
                "kolibri:core:attendancesession-detail",
                kwargs={"pk": session.id},
            ),
            {
                "collection": self.classroom.id,
                "attendance_records": [
                    {"user": self.learner1.id, "present": True},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        record = AttendanceRecord.objects.get(
            attendance_session=session, user=self.learner1
        )
        self.assertTrue(record.present)

    def test_recent_endpoint(self):
        for i in range(3):
            session = AttendanceSession.objects.create(
                collection=self.classroom, created_by=self.coach
            )
            AttendanceRecord.objects.create(
                attendance_session=session, user=self.learner1, present=True
            )
            AttendanceRecord.objects.create(
                attendance_session=session, user=self.learner2, present=(i % 2 == 0)
            )

        response = self.client.get(
            reverse("kolibri:core:attendancesession-recent"),
            {"collection": self.classroom.id, "limit": 5},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)
        for item in response.data:
            self.assertIn("present_count", item)
            self.assertIn("total_count", item)
            self.assertEqual(item["total_count"], 2)

    def test_unauthenticated_get_returns_empty(self):
        AttendanceSession.objects.create(
            collection=self.classroom, created_by=self.coach
        )
        self.client.logout()
        response = self.client.get(
            reverse("kolibri:core:attendancesession-list"),
        )
        # Anonymous users get empty results (permission filter returns nothing)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_learner_cannot_create_session(self):
        self.client.logout()
        self.client.login(username="learner1", password=DUMMY_PASSWORD)
        response = self.client.post(
            reverse("kolibri:core:attendancesession-list"),
            {
                "collection": self.classroom.id,
                "attendance_records": [
                    {"user": self.learner1.id, "present": True},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_session(self):
        self.client.logout()
        self.client.login(username="admin", password=DUMMY_PASSWORD)
        response = self.client.post(
            reverse("kolibri:core:attendancesession-list"),
            {
                "collection": self.classroom.id,
                "attendance_records": [
                    {"user": self.learner1.id, "present": True},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_date_range_filter(self):
        AttendanceSession.objects.create(
            collection=self.classroom, created_by=self.coach
        )
        now = timezone.now()
        start = (now - datetime.timedelta(days=1)).isoformat()
        end = (now + datetime.timedelta(days=1)).isoformat()
        response = self.client.get(
            reverse("kolibri:core:attendancesession-list"),
            {
                "collection": self.classroom.id,
                "start_date": start,
                "end_date": end,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_coach_cannot_see_other_classroom_sessions(self):
        other_classroom = Classroom.objects.create(
            name="OtherClass", parent=self.facility
        )
        other_coach = FacilityUser.objects.create(
            username="other_coach", facility=self.facility
        )
        other_coach.set_password(DUMMY_PASSWORD)
        other_coach.save()
        other_classroom.add_coach(other_coach)

        AttendanceSession.objects.create(
            collection=other_classroom, created_by=other_coach
        )

        response = self.client.get(
            reverse("kolibri:core:attendancesession-list"),
            {"collection": other_classroom.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_admin_can_delete_session(self):
        session = AttendanceSession.objects.create(
            collection=self.classroom, created_by=self.coach
        )
        self.client.logout()
        self.client.login(username="admin", password=DUMMY_PASSWORD)
        response = self.client.delete(
            reverse(
                "kolibri:core:attendancesession-detail",
                kwargs={"pk": session.id},
            )
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(AttendanceSession.objects.count(), 0)

    def test_coach_cannot_delete_session(self):
        session = AttendanceSession.objects.create(
            collection=self.classroom, created_by=self.coach
        )
        response = self.client.delete(
            reverse(
                "kolibri:core:attendancesession-detail",
                kwargs={"pk": session.id},
            )
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(AttendanceSession.objects.count(), 1)

    def test_anonymous_cannot_create_session(self):
        self.client.logout()
        response = self.client.post(
            reverse("kolibri:core:attendancesession-list"),
            {
                "collection": self.classroom.id,
                "attendance_records": [
                    {"user": self.learner1.id, "present": True},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_session_with_empty_records(self):
        response = self.client.post(
            reverse("kolibri:core:attendancesession-list"),
            {
                "collection": self.classroom.id,
                "attendance_records": [],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AttendanceSession.objects.count(), 1)
        self.assertEqual(AttendanceRecord.objects.count(), 0)
