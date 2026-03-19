from datetime import datetime
from datetime import timedelta

import pytz
from django.urls import reverse
from django.utils.timezone import now
from rest_framework.test import APITestCase

from kolibri.core.attendance.models import AttendanceRecord
from kolibri.core.attendance.models import AttendanceSession
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Membership
from kolibri.core.auth.test.helpers import DUMMY_PASSWORD
from kolibri.core.auth.test.helpers import provision_device


def _session_list_url():
    return reverse("kolibri:core:attendancesession-list")


def _session_detail_url(pk):
    return reverse("kolibri:core:attendancesession-detail", kwargs={"pk": pk})


def _session_recent_url():
    return reverse("kolibri:core:attendancesession-recent")


def _record_list_url():
    return reverse("kolibri:core:attendancerecord-list")


def _record_bulk_update_url():
    return reverse("kolibri:core:attendancerecord-bulk-update")


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
        response = self.client.post(_session_list_url(), data, format="json")
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
        response = self.client.post(_session_list_url(), data, format="json")
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
        response = self.client.post(_session_list_url(), data, format="json")
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
        response = self.client.post(_session_list_url(), data, format="json")
        self.assertEqual(response.status_code, 201)
        session = AttendanceSession.objects.get(id=response.data["id"])
        self.assertIsNotNone(session.session_start_datetime)

    def test_admin_can_create_session(self):
        self._login(self.admin)
        data = {
            "collection": self.classroom.id,
            "attendance_records": [],
        }
        response = self.client.post(_session_list_url(), data, format="json")
        self.assertEqual(response.status_code, 201)

    def test_learner_cannot_create_session(self):
        self._login(self.learner)
        data = {
            "collection": self.classroom.id,
            "attendance_records": [],
        }
        response = self.client.post(_session_list_url(), data, format="json")
        self.assertEqual(response.status_code, 403)

    def test_anonymous_cannot_create_session(self):
        data = {
            "collection": self.classroom.id,
            "attendance_records": [],
        }
        response = self.client.post(_session_list_url(), data, format="json")
        self.assertEqual(response.status_code, 403)

    def test_created_by_is_set_from_request_user(self):
        self._login(self.coach)
        data = {
            "collection": self.classroom.id,
            "created_by": self.admin.id,  # should be ignored
            "attendance_records": [],
        }
        response = self.client.post(_session_list_url(), data, format="json")
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
        response = self.client.post(_session_list_url(), data, format="json")
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
        response = self.client.get(_session_list_url())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_admin_can_list_sessions(self):
        self._create_session()
        self._login(self.admin)
        response = self.client.get(_session_list_url())
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data), 1)

    def test_learner_gets_empty_list(self):
        self._create_session()
        self._login(self.learner)
        response = self.client.get(_session_list_url())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_anonymous_gets_empty_list(self):
        self._create_session()
        response = self.client.get(_session_list_url())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    # ---- READ (GET detail) ----

    def test_coach_can_retrieve_session(self):
        session = self._create_session()
        self._login(self.coach)
        response = self.client.get(_session_detail_url(session.id))
        self.assertEqual(response.status_code, 200)

    def test_retrieve_returns_session_fields_and_counts(self):
        session = self._create_session()
        AttendanceRecord.objects.create(
            attendance_session=session, user=self.learner, present=True
        )
        self._login(self.coach)
        response = self.client.get(_session_detail_url(session.id))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["present_count"], 1)
        self.assertEqual(response.data["total_count"], 1)
        self.assertNotIn("attendance_records", response.data)

    def test_learner_cannot_retrieve_session(self):
        session = self._create_session()
        self._login(self.learner)
        response = self.client.get(_session_detail_url(session.id))
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
        response = self.client.put(_session_detail_url(session.id), data, format="json")
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
        self.client.put(_session_detail_url(session.id), data, format="json")
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
        response = self.client.put(_session_detail_url(session.id), data, format="json")
        self.assertEqual(response.status_code, 403)

    # ---- DELETE ----

    def test_admin_can_delete_session(self):
        session = self._create_session()
        self._login(self.admin)
        response = self.client.delete(_session_detail_url(session.id))
        self.assertEqual(response.status_code, 204)
        self.assertFalse(AttendanceSession.objects.filter(id=session.id).exists())

    def test_coach_cannot_delete_session(self):
        session = self._create_session()
        self._login(self.coach)
        response = self.client.delete(_session_detail_url(session.id))
        self.assertEqual(response.status_code, 403)

    def test_learner_cannot_delete_session(self):
        session = self._create_session()
        self._login(self.learner)
        response = self.client.delete(_session_detail_url(session.id))
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
            _session_list_url(), {"collection": self.classroom.id}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_filter_by_start_date(self):
        session = self._create_session()
        session.session_start_datetime = now() - timedelta(days=10)
        session.save()

        self._login(self.admin)
        yesterday = (now() - timedelta(days=1)).isoformat()
        response = self.client.get(_session_list_url(), {"start_date": yesterday})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_filter_by_end_date(self):
        session = self._create_session()
        session.session_start_datetime = now() + timedelta(days=10)
        session.save()

        self._login(self.admin)
        yesterday = (now() - timedelta(days=1)).isoformat()
        response = self.client.get(_session_list_url(), {"end_date": yesterday})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_filter_by_end_date_includes_sessions_on_end_date(self):
        """Sessions on the end date are included when end_date is next day midnight.

        Regression test for #14424: the frontend must send midnight of the day
        AFTER the user-selected end date so the exclusive lt filter includes all
        sessions on the selected date.
        """
        session = self._create_session()
        session.session_start_datetime = now().replace(
            hour=14, minute=30, second=0, microsecond=0
        )
        session.save()

        self._login(self.admin)
        # Simulate what the frontend should send: midnight of the next day
        next_day_midnight = now().replace(
            hour=0, minute=0, second=0, microsecond=0
        ) + timedelta(days=1)
        response = self.client.get(
            _session_list_url(), {"end_date": next_day_midnight.isoformat()}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    # ---- DEFAULT ORDERING ----

    def test_default_ordering_is_newest_first(self):
        session_old = self._create_session()
        session_old.session_start_datetime = now() - timedelta(days=5)
        session_old.save()
        session_new = self._create_session()
        session_new.session_start_datetime = now()
        session_new.save()

        self._login(self.admin)
        response = self.client.get(_session_list_url())
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
        response = self.client.get(_session_recent_url())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["present_count"], 1)
        self.assertEqual(response.data[0]["total_count"], 2)

    def test_recent_respects_limit_parameter(self):
        for _ in range(3):
            self._create_session()

        self._login(self.coach)
        response = self.client.get(_session_recent_url(), {"limit": 2})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    # ---- PAGINATION ----

    def test_list_includes_present_and_total_counts(self):
        """List endpoint should include present_count and total_count annotations."""
        session = self._create_session()
        AttendanceRecord.objects.create(
            attendance_session=session, user=self.learner, present=True
        )
        learner2 = FacilityUser.objects.create(
            username="learner_count", facility=self.facility
        )
        AttendanceRecord.objects.create(
            attendance_session=session, user=learner2, present=False
        )
        self._login(self.coach)
        response = self.client.get(
            _session_list_url(), {"collection": self.classroom.id}
        )
        self.assertEqual(response.status_code, 200)
        results = response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["present_count"], 1)
        self.assertEqual(results[0]["total_count"], 2)

    def test_pagination_with_page_size(self):
        for _ in range(3):
            self._create_session()

        self._login(self.admin)
        response = self.client.get(_session_list_url(), {"page_size": 2, "page": 1})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 2)
        self.assertEqual(response.data["count"], 3)


class AttendanceRecordAPITestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = Facility.objects.create(name="Record Test Facility")
        cls.classroom = Classroom.objects.create(
            name="Record Test Classroom", parent=cls.facility
        )
        cls.coach = FacilityUser.objects.create(
            username="rec_coach", facility=cls.facility
        )
        cls.coach.set_password(DUMMY_PASSWORD)
        cls.coach.save()
        cls.classroom.add_coach(cls.coach)

        cls.learner1 = FacilityUser.objects.create(
            username="rec_learner1", facility=cls.facility
        )
        cls.learner1.set_password(DUMMY_PASSWORD)
        cls.learner1.save()
        Membership.objects.create(user=cls.learner1, collection=cls.classroom)

        cls.learner2 = FacilityUser.objects.create(
            username="rec_learner2", facility=cls.facility
        )
        cls.learner2.set_password(DUMMY_PASSWORD)
        cls.learner2.save()
        Membership.objects.create(user=cls.learner2, collection=cls.classroom)

    def _login(self, user):
        self.client.login(
            username=user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def _create_session(self):
        return AttendanceSession.objects.create(
            collection=self.classroom,
            created_by=self.coach,
        )

    def test_list_records_filtered_by_session(self):
        session = self._create_session()
        AttendanceRecord.objects.create(
            attendance_session=session, user=self.learner1, present=True
        )
        AttendanceRecord.objects.create(
            attendance_session=session, user=self.learner2, present=False
        )
        self._login(self.coach)
        response = self.client.get(
            _record_list_url(), {"attendance_session": session.id}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        users = {r["user"] for r in response.data}
        self.assertEqual(users, {self.learner1.id, self.learner2.id})

    def test_learner_cannot_list_records(self):
        session = self._create_session()
        AttendanceRecord.objects.create(
            attendance_session=session, user=self.learner1, present=True
        )
        self._login(self.learner1)
        response = self.client.get(
            _record_list_url(), {"attendance_session": session.id}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_bulk_update_creates_and_updates_records(self):
        session = self._create_session()
        AttendanceRecord.objects.create(
            attendance_session=session, user=self.learner1, present=False
        )
        self._login(self.coach)
        data = {
            "attendance_session": session.id,
            "records": [
                {"user": self.learner1.id, "present": True},
                {"user": self.learner2.id, "present": True},
            ],
        }
        response = self.client.post(_record_bulk_update_url(), data, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            AttendanceRecord.objects.get(
                attendance_session=session, user=self.learner1
            ).present
        )
        self.assertTrue(
            AttendanceRecord.objects.get(
                attendance_session=session, user=self.learner2
            ).present
        )

    def test_bulk_update_does_not_touch_unsent_records(self):
        session = self._create_session()
        AttendanceRecord.objects.create(
            attendance_session=session, user=self.learner1, present=False
        )
        AttendanceRecord.objects.create(
            attendance_session=session, user=self.learner2, present=False
        )
        self._login(self.coach)
        data = {
            "attendance_session": session.id,
            "records": [
                {"user": self.learner1.id, "present": True},
            ],
        }
        response = self.client.post(_record_bulk_update_url(), data, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            AttendanceRecord.objects.get(
                attendance_session=session, user=self.learner1
            ).present
        )
        self.assertFalse(
            AttendanceRecord.objects.get(
                attendance_session=session, user=self.learner2
            ).present
        )

    def test_bulk_update_response_includes_record_fields(self):
        session = self._create_session()
        AttendanceRecord.objects.create(
            attendance_session=session, user=self.learner1, present=False
        )
        self._login(self.coach)
        data = {
            "attendance_session": session.id,
            "records": [
                {"user": self.learner1.id, "present": True},
            ],
        }
        response = self.client.post(_record_bulk_update_url(), data, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        record = response.data[0]
        self.assertIn("id", record)
        self.assertEqual(record["user"], self.learner1.id)
        self.assertTrue(record["present"])
        self.assertEqual(record["attendance_session"], session.id)

    def test_list_records_includes_user_name_and_username(self):
        self.learner1.full_name = "Alice Smith"
        self.learner1.save()
        session = self._create_session()
        AttendanceRecord.objects.create(
            attendance_session=session, user=self.learner1, present=True
        )
        self._login(self.coach)
        response = self.client.get(
            _record_list_url(), {"attendance_session": session.id}
        )
        self.assertEqual(response.status_code, 200)
        record = response.data[0]
        self.assertEqual(record["user_name"], "Alice Smith")
        self.assertEqual(record["user_username"], self.learner1.username)

    def test_list_records_preserves_user_name_after_learner_removed_from_class(self):
        self.learner1.full_name = "Bob Jones"
        self.learner1.save()
        session = self._create_session()
        AttendanceRecord.objects.create(
            attendance_session=session, user=self.learner1, present=True
        )
        # Remove learner1 from the class — their record and name must still be accessible.
        Membership.objects.filter(
            user=self.learner1, collection=self.classroom
        ).delete()
        self._login(self.coach)
        response = self.client.get(
            _record_list_url(), {"attendance_session": session.id}
        )
        self.assertEqual(response.status_code, 200)
        record = response.data[0]
        self.assertEqual(record["user_name"], "Bob Jones")
        self.assertEqual(record["user"], self.learner1.id)

    def test_bulk_update_response_includes_user_name_and_username(self):
        self.learner1.full_name = "Charlie Brown"
        self.learner1.save()
        session = self._create_session()
        self._login(self.coach)
        data = {
            "attendance_session": session.id,
            "records": [{"user": self.learner1.id, "present": True}],
        }
        response = self.client.post(_record_bulk_update_url(), data, format="json")
        self.assertEqual(response.status_code, 200)
        record = response.data[0]
        self.assertEqual(record["user_name"], "Charlie Brown")
        self.assertEqual(record["user_username"], self.learner1.username)

    def test_learner_cannot_bulk_update(self):
        session = self._create_session()
        self._login(self.learner1)
        data = {
            "attendance_session": session.id,
            "records": [{"user": self.learner1.id, "present": True}],
        }
        response = self.client.post(_record_bulk_update_url(), data, format="json")
        self.assertEqual(response.status_code, 403)
