from django.db.utils import IntegrityError
from django.test import TestCase

from kolibri.core.attendance.models import AttendanceRecord
from kolibri.core.attendance.models import AttendanceSession
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.helpers import create_superuser
from kolibri.core.auth.test.helpers import provision_device


class AttendanceSessionTestCase(TestCase):
    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name="TestFacility")
        self.classroom = Classroom.objects.create(
            name="TestClass", parent=self.facility
        )
        self.coach = FacilityUser.objects.create(
            username="coach", facility=self.facility
        )
        self.classroom.add_coach(self.coach)

    def test_create_session(self):
        session = AttendanceSession.objects.create(
            collection=self.classroom,
            created_by=self.coach,
        )
        self.assertIsNotNone(session.id)
        self.assertEqual(session.collection, self.classroom)
        self.assertEqual(session.created_by, self.coach)

    def test_session_has_timestamps(self):
        session = AttendanceSession.objects.create(
            collection=self.classroom,
            created_by=self.coach,
        )
        self.assertIsNotNone(session.session_start_datetime)
        self.assertIsNotNone(session.date_created)
        self.assertIsNotNone(session.date_modified)

    def test_morango_model_name(self):
        self.assertEqual(AttendanceSession.morango_model_name, "attendancesession")

    def test_infer_dataset(self):
        session = AttendanceSession.objects.create(
            collection=self.classroom,
            created_by=self.coach,
        )
        self.assertEqual(session.dataset_id, self.facility.dataset_id)

    def test_calculate_partition(self):
        session = AttendanceSession.objects.create(
            collection=self.classroom,
            created_by=self.coach,
        )
        self.assertEqual(session.calculate_partition(), session.dataset_id)

    def test_pre_save_requires_creator(self):
        with self.assertRaises(IntegrityError):
            AttendanceSession.objects.create(
                collection=self.classroom,
                created_by=None,
            )

    def test_pre_save_creator_must_be_same_dataset(self):
        other_facility = Facility.objects.create(name="OtherFacility")
        other_user = FacilityUser.objects.create(
            username="other", facility=other_facility
        )
        with self.assertRaises(IntegrityError):
            AttendanceSession.objects.create(
                collection=self.classroom,
                created_by=other_user,
            )

    def test_pre_save_superuser_cross_dataset_creator_set_to_none(self):
        other_facility = Facility.objects.create(name="OtherFacility")
        superuser = create_superuser(other_facility)
        session = AttendanceSession.objects.create(
            collection=self.classroom,
            created_by=superuser,
        )
        # Superuser from different dataset should have creator set to None
        self.assertIsNone(session.created_by)

    def test_session_related_name(self):
        AttendanceSession.objects.create(
            collection=self.classroom,
            created_by=self.coach,
        )
        self.assertEqual(self.classroom.attendance_sessions.count(), 1)

    def test_cascade_delete_collection(self):
        AttendanceSession.objects.create(
            collection=self.classroom,
            created_by=self.coach,
        )
        self.classroom.delete()
        self.assertEqual(AttendanceSession.objects.count(), 0)


class AttendanceRecordTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name="TestFacility")
        self.classroom = Classroom.objects.create(
            name="TestClass", parent=self.facility
        )
        self.coach = FacilityUser.objects.create(
            username="coach", facility=self.facility
        )
        self.classroom.add_coach(self.coach)
        self.learner = FacilityUser.objects.create(
            username="learner", facility=self.facility
        )
        self.classroom.add_member(self.learner)
        self.session = AttendanceSession.objects.create(
            collection=self.classroom,
            created_by=self.coach,
        )

    def test_create_record(self):
        record = AttendanceRecord.objects.create(
            attendance_session=self.session,
            user=self.learner,
            present=True,
        )
        self.assertIsNotNone(record.id)
        self.assertEqual(record.attendance_session, self.session)
        self.assertEqual(record.user, self.learner)
        self.assertTrue(record.present)

    def test_default_present_is_false(self):
        record = AttendanceRecord.objects.create(
            attendance_session=self.session,
            user=self.learner,
        )
        self.assertFalse(record.present)

    def test_morango_model_name(self):
        self.assertEqual(AttendanceRecord.morango_model_name, "attendancerecord")

    def test_infer_dataset(self):
        record = AttendanceRecord.objects.create(
            attendance_session=self.session,
            user=self.learner,
            present=True,
        )
        self.assertEqual(record.dataset_id, self.facility.dataset_id)

    def test_calculate_partition(self):
        record = AttendanceRecord.objects.create(
            attendance_session=self.session,
            user=self.learner,
            present=True,
        )
        self.assertEqual(record.calculate_partition(), record.dataset_id)

    def test_calculate_source_id(self):
        record = AttendanceRecord.objects.create(
            attendance_session=self.session,
            user=self.learner,
            present=True,
        )
        expected = "{}:{}".format(self.session.id, self.learner.id)
        self.assertEqual(record.calculate_source_id(), expected)

    def test_record_related_name_on_session(self):
        AttendanceRecord.objects.create(
            attendance_session=self.session,
            user=self.learner,
            present=True,
        )
        self.assertEqual(self.session.attendance_records.count(), 1)

    def test_record_related_name_on_user(self):
        AttendanceRecord.objects.create(
            attendance_session=self.session,
            user=self.learner,
            present=True,
        )
        self.assertEqual(self.learner.attendance_records.count(), 1)

    def test_cascade_delete_session(self):
        AttendanceRecord.objects.create(
            attendance_session=self.session,
            user=self.learner,
            present=True,
        )
        self.session.delete()
        self.assertEqual(AttendanceRecord.objects.count(), 0)

    def test_cascade_delete_user(self):
        AttendanceRecord.objects.create(
            attendance_session=self.session,
            user=self.learner,
            present=True,
        )
        self.learner.delete()
        self.assertEqual(AttendanceRecord.objects.count(), 0)
