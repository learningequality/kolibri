from django.db.utils import IntegrityError
from django.test import TestCase

from kolibri.core.attendance.models import AttendanceRecord
from kolibri.core.attendance.models import AttendanceSession
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.models import DevicePermissions


class AttendanceSessionTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="Test Facility")
        cls.classroom = Classroom.objects.create(
            name="Test Classroom", parent=cls.facility
        )
        cls.coach = FacilityUser.objects.create(username="coach", facility=cls.facility)
        cls.coach.set_password("password")
        cls.coach.save()

    def test_create_attendance_session(self):
        session = AttendanceSession.objects.create(
            collection=self.classroom,
            created_by=self.coach,
        )
        self.assertIsNotNone(session.id)
        self.assertEqual(session.collection, self.classroom)
        self.assertEqual(session.created_by, self.coach)

    def test_default_timestamps(self):
        session = AttendanceSession.objects.create(
            collection=self.classroom,
            created_by=self.coach,
        )
        self.assertIsNotNone(session.session_start_datetime)
        self.assertIsNotNone(session.date_created)
        self.assertIsNotNone(session.date_modified)

    def test_morango_model_name(self):
        self.assertEqual(AttendanceSession.morango_model_name, "attendancesession")

    def test_calculate_partition(self):
        session = AttendanceSession.objects.create(
            collection=self.classroom,
            created_by=self.coach,
        )
        self.assertEqual(session.calculate_partition(), str(session.dataset_id))

    def test_infer_dataset(self):
        session = AttendanceSession(
            collection=self.classroom,
            created_by=self.coach,
        )
        self.assertEqual(session.infer_dataset(), self.classroom.dataset_id)

    def test_pre_save_requires_creator_on_creation(self):
        with self.assertRaises(IntegrityError):
            AttendanceSession.objects.create(
                collection=self.classroom,
                created_by=None,
            )

    def test_pre_save_cross_dataset_non_superuser_raises(self):
        other_facility = Facility.objects.create(name="Other Facility")
        other_user = FacilityUser.objects.create(
            username="other", facility=other_facility
        )
        other_user.set_password("password")
        other_user.save()
        with self.assertRaises(IntegrityError):
            AttendanceSession.objects.create(
                collection=self.classroom,
                created_by=other_user,
            )

    def test_pre_save_superuser_cross_dataset_sets_created_by_none(self):
        other_facility = Facility.objects.create(name="Other Facility 2")
        superuser = FacilityUser.objects.create(
            username="superadmin", facility=other_facility
        )
        superuser.set_password("password")
        superuser.save()
        DevicePermissions.objects.create(user=superuser, is_superuser=True)
        session = AttendanceSession.objects.create(
            collection=self.classroom,
            created_by=superuser,
        )
        self.assertIsNone(session.created_by)

    def test_cascade_delete_on_collection(self):
        classroom2 = Classroom.objects.create(
            name="Classroom to delete", parent=self.facility
        )
        session = AttendanceSession.objects.create(
            collection=classroom2,
            created_by=self.coach,
        )
        session_id = session.id
        classroom2.delete()
        self.assertFalse(AttendanceSession.objects.filter(id=session_id).exists())


class AttendanceRecordTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="Test Facility AR")
        cls.classroom = Classroom.objects.create(
            name="Test Classroom AR", parent=cls.facility
        )
        cls.coach = FacilityUser.objects.create(
            username="coach_ar", facility=cls.facility
        )
        cls.coach.set_password("password")
        cls.coach.save()
        cls.learner = FacilityUser.objects.create(
            username="learner_ar", facility=cls.facility
        )
        cls.learner.set_password("password")
        cls.learner.save()
        cls.session = AttendanceSession.objects.create(
            collection=cls.classroom,
            created_by=cls.coach,
        )

    def test_create_attendance_record(self):
        record = AttendanceRecord.objects.create(
            attendance_session=self.session,
            user=self.learner,
        )
        self.assertIsNotNone(record.id)
        self.assertFalse(record.present)

    def test_present_default_false(self):
        record = AttendanceRecord.objects.create(
            attendance_session=self.session,
            user=self.learner,
        )
        self.assertFalse(record.present)

    def test_present_true(self):
        record = AttendanceRecord.objects.create(
            attendance_session=self.session,
            user=self.learner,
            present=True,
        )
        self.assertTrue(record.present)

    def test_morango_model_name(self):
        self.assertEqual(AttendanceRecord.morango_model_name, "attendancerecord")

    def test_calculate_source_id(self):
        record = AttendanceRecord.objects.create(
            attendance_session=self.session,
            user=self.learner,
        )
        expected = "{}:{}".format(self.session.id, self.learner.id)
        self.assertEqual(record.calculate_source_id(), expected)

    def test_calculate_partition(self):
        record = AttendanceRecord.objects.create(
            attendance_session=self.session,
            user=self.learner,
        )
        self.assertEqual(record.calculate_partition(), str(record.dataset_id))

    def test_infer_dataset(self):
        record = AttendanceRecord(
            attendance_session=self.session,
            user=self.learner,
        )
        self.assertEqual(record.infer_dataset(), self.session.dataset_id)

    def test_collection_property(self):
        record = AttendanceRecord.objects.create(
            attendance_session=self.session,
            user=self.learner,
        )
        self.assertEqual(record.collection, self.classroom)

    def test_unique_together(self):
        AttendanceRecord.objects.create(
            attendance_session=self.session,
            user=self.learner,
        )
        with self.assertRaises(IntegrityError):
            AttendanceRecord.objects.create(
                attendance_session=self.session,
                user=self.learner,
            )

    def test_cascade_delete_on_session(self):
        new_session = AttendanceSession.objects.create(
            collection=self.classroom,
            created_by=self.coach,
        )
        new_record = AttendanceRecord.objects.create(
            attendance_session=new_session,
            user=self.learner,
        )
        new_record_id = new_record.id
        new_session.delete()
        self.assertFalse(AttendanceRecord.objects.filter(id=new_record_id).exists())
