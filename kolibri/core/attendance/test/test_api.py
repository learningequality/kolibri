from datetime import datetime
from datetime import timedelta

import pytz
from django.utils.timezone import now
from rest_framework.test import APIClient
from rest_framework.test import APITestCase

from kolibri.core.attendance.models import AttendanceRecord
from kolibri.core.attendance.models import AttendanceSession
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Membership
from kolibri.core.auth.test.helpers import DUMMY_PASSWORD
from kolibri.core.auth.test.helpers import provision_device

ATTENDANCE_SESSION_URL = "/api/attendance/attendancesession/"


class AttendanceSessionAPITestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = Facility.objects.create(name="Test Facility")
        cls.classroom = Classroom.objects.create(
            name="Test Classroom", parent=cls.facility
        )
        cls.admin = FacilityUser.objects.create(username="admin", facility=cls.facility)
        cls.admin.set_password(DUMMY_PASSWORD)
        cls.admin.save()
        cls.facility.add_admin(cls.admin)

        cls.coach = FacilityUser.objects.create(username="coach", facility=cls.facility)
        cls.coach.set_password(DUMMY_PASSWORD)
        cls.coach.save()
        cls.classroom.add_coach(cls.coach)

        cls.learner = FacilityUser.objects.create(
            username="learner", facility=cls.facility
        )
        cls.learner.set_password(DUMMY_PASSWORD)
        cls.learner.save()
        Membership.objects.create(user=cls.learner, collection=cls.classroom)

    def setUp(self):
        self.client = APIClient()

    def _login(self, user):
        self.client.login(
            username=user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def _create_session(self, user=None, **kwargs):
        """Helper to create a session directly in DB for read/update/delete tests."""
        creator = user or self.coach
        return AttendanceSession.objects.create(
            collection=kwargs.get("collection", self.classroom),
            created_by=creator,
        )

    # ---- CREATE (POST) ----

    def test_coach_can_create_session(self):
        self._login(self.coach)
        data = {
            "collection": self.classroom.id,
            "attendance_records": [
                {"user": self.learner.id, "present": True},
            ],
        }
        response = self.client.post(ATTENDANCE_SESSION_URL, data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            AttendanceSession.objects.filter(created_by=self.coach).exists()
        )

    def test_create_session_with_iso_8601_datetime(self):
        """Frontend sends session_start_datetime as ISO 8601 string with T and Z.

        Regression test: submitting an ISO 8601 datetime caused a 500 because
        the auto-generated ModelField wrapper called DateTimeTzField.to_python()
        directly with the raw ISO string, which did not handle the T separator or
        Z UTC suffix. Fix: declare session_start_datetime explicitly in the
        serializer using the DRF DateTimeTzField, which handles ISO 8601 natively.
        """
        self._login(self.coach)
        data = {
            "collection": self.classroom.id,
            "session_start_datetime": "2026-03-12T22:07:09.048Z",
            "attendance_records": [],
        }
        response = self.client.post(ATTENDANCE_SESSION_URL, data, format="json")
        self.assertEqual(response.status_code, 201)
        session = AttendanceSession.objects.get(id=response.data["id"])
        expected = datetime(2026, 3, 12, 22, 7, 9, tzinfo=pytz.utc)
        self.assertEqual(
            session.session_start_datetime.astimezone(pytz.utc).replace(microsecond=0),
            expected,
        )

    def test_create_session_with_offset_datetime(self):
        """Frontend may send session_start_datetime with a UTC offset instead of Z."""
        self._login(self.coach)
        data = {
            "collection": self.classroom.id,
            # -05:00 offset → same UTC instant as the Z test above
            "session_start_datetime": "2026-03-12T17:07:09.048-05:00",
            "attendance_records": [],
        }
        response = self.client.post(ATTENDANCE_SESSION_URL, data, format="json")
        self.assertEqual(response.status_code, 201)
        session = AttendanceSession.objects.get(id=response.data["id"])
        expected = datetime(2026, 3, 12, 22, 7, 9, tzinfo=pytz.utc)
        self.assertEqual(
            session.session_start_datetime.astimezone(pytz.utc).replace(microsecond=0),
            expected,
        )

    def test_create_session_without_datetime_uses_default(self):
        """Omitting session_start_datetime should succeed; model default fires.

        Validates that required=False on the serializer field correctly defers
        to the model's default=local_now rather than producing a null.
        """
        self._login(self.coach)
        data = {
            "collection": self.classroom.id,
            "attendance_records": [],
        }
        response = self.client.post(ATTENDANCE_SESSION_URL, data, format="json")
        self.assertEqual(response.status_code, 201)
        session = AttendanceSession.objects.get(id=response.data["id"])
        self.assertIsNotNone(session.session_start_datetime)

    def test_admin_can_create_session(self):
        self._login(self.admin)
        data = {
            "collection": self.classroom.id,
            "attendance_records": [],
        }
        response = self.client.post(ATTENDANCE_SESSION_URL, data, format="json")
        self.assertEqual(response.status_code, 201)

    def test_learner_cannot_create_session(self):
        self._login(self.learner)
        data = {
            "collection": self.classroom.id,
            "attendance_records": [],
        }
        response = self.client.post(ATTENDANCE_SESSION_URL, data, format="json")
        self.assertEqual(response.status_code, 403)

    def test_anonymous_cannot_create_session(self):
        data = {
            "collection": self.classroom.id,
            "attendance_records": [],
        }
        response = self.client.post(ATTENDANCE_SESSION_URL, data, format="json")
        self.assertEqual(response.status_code, 403)

    def test_created_by_is_set_from_request_user(self):
        self._login(self.coach)
        data = {
            "collection": self.classroom.id,
            "created_by": self.admin.id,  # should be ignored
            "attendance_records": [],
        }
        response = self.client.post(ATTENDANCE_SESSION_URL, data, format="json")
        self.assertEqual(response.status_code, 201)
        session = AttendanceSession.objects.latest("date_created")
        self.assertEqual(session.created_by, self.coach)

    def test_create_session_creates_nested_records(self):
        self._login(self.coach)
        data = {
            "collection": self.classroom.id,
            "attendance_records": [
                {"user": self.learner.id, "present": True},
            ],
        }
        response = self.client.post(ATTENDANCE_SESSION_URL, data, format="json")
        self.assertEqual(response.status_code, 201)
        session = AttendanceSession.objects.latest("date_created")
        self.assertEqual(session.attendance_records.count(), 1)
        record = session.attendance_records.first()
        self.assertEqual(record.user, self.learner)
        self.assertTrue(record.present)

    # ---- READ (GET list) ----

    def test_coach_can_list_sessions(self):
        self._create_session()
        self._login(self.coach)
        response = self.client.get(ATTENDANCE_SESSION_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_admin_can_list_sessions(self):
        self._create_session()
        self._login(self.admin)
        response = self.client.get(ATTENDANCE_SESSION_URL)
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data), 1)

    def test_learner_gets_empty_list(self):
        self._create_session()
        self._login(self.learner)
        response = self.client.get(ATTENDANCE_SESSION_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_anonymous_gets_empty_list(self):
        self._create_session()
        response = self.client.get(ATTENDANCE_SESSION_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    # ---- READ (GET detail) ----

    def test_coach_can_retrieve_session(self):
        session = self._create_session()
        self._login(self.coach)
        response = self.client.get(f"{ATTENDANCE_SESSION_URL}{session.id}/")
        self.assertEqual(response.status_code, 200)

    def test_learner_cannot_retrieve_session(self):
        session = self._create_session()
        self._login(self.learner)
        response = self.client.get(f"{ATTENDANCE_SESSION_URL}{session.id}/")
        self.assertEqual(response.status_code, 404)

    # ---- UPDATE (PUT/PATCH) ----

    def test_coach_can_update_session_and_upsert_records(self):
        session = self._create_session()
        AttendanceRecord.objects.create(
            attendance_session=session, user=self.learner, present=False
        )
        self._login(self.coach)
        data = {
            "collection": self.classroom.id,
            "attendance_records": [
                {"user": self.learner.id, "present": True},
            ],
        }
        response = self.client.put(
            f"{ATTENDANCE_SESSION_URL}{session.id}/", data, format="json"
        )
        self.assertEqual(response.status_code, 200)
        record = AttendanceRecord.objects.get(
            attendance_session=session, user=self.learner
        )
        self.assertTrue(record.present)

    def test_upsert_does_not_duplicate_records(self):
        session = self._create_session()
        AttendanceRecord.objects.create(
            attendance_session=session, user=self.learner, present=False
        )
        self._login(self.coach)
        data = {
            "collection": self.classroom.id,
            "attendance_records": [
                {"user": self.learner.id, "present": True},
            ],
        }
        self.client.put(f"{ATTENDANCE_SESSION_URL}{session.id}/", data, format="json")
        self.assertEqual(
            AttendanceRecord.objects.filter(
                attendance_session=session, user=self.learner
            ).count(),
            1,
        )

    def test_learner_cannot_update_session(self):
        session = self._create_session()
        self._login(self.learner)
        data = {
            "collection": self.classroom.id,
            "attendance_records": [],
        }
        response = self.client.put(
            f"{ATTENDANCE_SESSION_URL}{session.id}/", data, format="json"
        )
        self.assertEqual(response.status_code, 403)

    # ---- DELETE ----

    def test_admin_can_delete_session(self):
        session = self._create_session()
        self._login(self.admin)
        response = self.client.delete(f"{ATTENDANCE_SESSION_URL}{session.id}/")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(AttendanceSession.objects.filter(id=session.id).exists())

    def test_coach_cannot_delete_session(self):
        session = self._create_session()
        self._login(self.coach)
        response = self.client.delete(f"{ATTENDANCE_SESSION_URL}{session.id}/")
        self.assertEqual(response.status_code, 403)

    def test_learner_cannot_delete_session(self):
        session = self._create_session()
        self._login(self.learner)
        response = self.client.delete(f"{ATTENDANCE_SESSION_URL}{session.id}/")
        self.assertEqual(response.status_code, 403)

    # ---- FILTERS ----

    def test_filter_by_collection(self):
        classroom2 = Classroom.objects.create(
            name="Other Classroom", parent=self.facility
        )
        self._create_session(collection=self.classroom)
        self._create_session(collection=classroom2, user=self.admin)
        self._login(self.admin)
        response = self.client.get(
            ATTENDANCE_SESSION_URL, {"collection": self.classroom.id}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_filter_by_start_date(self):
        session = self._create_session()
        session.session_start_datetime = now() - timedelta(days=10)
        session.save()

        self._login(self.admin)
        yesterday = (now() - timedelta(days=1)).date().isoformat()
        response = self.client.get(ATTENDANCE_SESSION_URL, {"start_date": yesterday})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_filter_by_end_date(self):
        session = self._create_session()
        session.session_start_datetime = now() + timedelta(days=10)
        session.save()

        self._login(self.admin)
        yesterday = (now() - timedelta(days=1)).date().isoformat()
        response = self.client.get(ATTENDANCE_SESSION_URL, {"end_date": yesterday})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    # ---- DEFAULT ORDERING ----

    def test_default_ordering_is_newest_first(self):
        session_old = self._create_session()
        session_old.session_start_datetime = now() - timedelta(days=5)
        session_old.save()
        session_new = self._create_session()
        session_new.session_start_datetime = now()
        session_new.save()

        self._login(self.admin)
        response = self.client.get(ATTENDANCE_SESSION_URL)
        self.assertEqual(response.status_code, 200)
        ids = [item["id"] for item in response.data]
        self.assertEqual(ids[0], session_new.id)
        self.assertEqual(ids[1], session_old.id)

    # ---- RECENT ENDPOINT ----

    def test_recent_returns_present_and_total_counts(self):
        session = self._create_session()
        AttendanceRecord.objects.create(
            attendance_session=session, user=self.learner, present=True
        )
        learner2 = FacilityUser.objects.create(
            username="learner2", facility=self.facility
        )
        AttendanceRecord.objects.create(
            attendance_session=session, user=learner2, present=False
        )

        self._login(self.coach)
        response = self.client.get(f"{ATTENDANCE_SESSION_URL}recent/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["present_count"], 1)
        self.assertEqual(response.data[0]["total_count"], 2)

    def test_recent_respects_limit_parameter(self):
        for _ in range(3):
            self._create_session()

        self._login(self.coach)
        response = self.client.get(f"{ATTENDANCE_SESSION_URL}recent/", {"limit": 2})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    # ---- PAGINATION ----

    def test_pagination_with_page_size(self):
        for _ in range(3):
            self._create_session()

        self._login(self.admin)
        response = self.client.get(ATTENDANCE_SESSION_URL, {"page_size": 2, "page": 1})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 2)
        self.assertEqual(response.data["count"], 3)
