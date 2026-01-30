import uuid

from django.db.utils import IntegrityError
from django.test import TestCase
from le_utils.constants import modalities

from .. import models
from ..models import TestStatus
from ..models import TestType
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content.models import ContentNode

DUMMY_PASSWORD = "password"


class UnitTestAssignmentModelTestCase(TestCase):
    """Test suite for UnitTestAssignment model"""

    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()

        # Create facility and users
        cls.facility = Facility.objects.create(name="TestFacility")
        cls.admin = FacilityUser.objects.create(username="admin", facility=cls.facility)
        cls.admin.set_password(DUMMY_PASSWORD)
        cls.admin.save()
        cls.facility.add_admin(cls.admin)

        # Create classroom and coach
        cls.classroom = Classroom.objects.create(
            name="TestClassroom", parent=cls.facility
        )
        cls.coach = FacilityUser.objects.create(username="coach", facility=cls.facility)
        cls.coach.set_password(DUMMY_PASSWORD)
        cls.coach.save()
        cls.classroom.add_coach(cls.coach)

        # Create learner group
        cls.learner_group = LearnerGroup.objects.create(
            name="TestLearnerGroup", parent=cls.classroom
        )

        # Create a course ContentNode
        channel_id = uuid.uuid4().hex
        cls.course = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            available=True,
            modality=modalities.COURSE,
            title="Test Course",
            description="A test course",
        )

        # Create a unit ContentNode (child of course)
        cls.unit_id = uuid.uuid4().hex
        cls.unit = ContentNode.objects.create(
            id=cls.unit_id,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent_id=cls.course.id,
            available=True,
            title="Test Unit",
            description="A test unit",
        )

        # Create a CourseSession
        cls.course_session = models.CourseSession.objects.create(
            course=cls.course.id,
            title="Test Course Session",
            description="Test course session",
            is_active=True,
            collection=cls.classroom,
            created_by=cls.coach,
        )

    def test_create_unit_test_assignment_pre_test(self):
        """Test creating a pre-test assignment"""
        assignment = models.UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_id,
            collection=self.classroom,
            test_type="pre",
            is_active=False,
            status="not_started",
            activated_by=self.coach,
        )

        self.assertIsNotNone(assignment.id)
        self.assertEqual(assignment.test_type, "pre")
        self.assertEqual(assignment.status, "not_started")
        self.assertFalse(assignment.is_active)
        self.assertEqual(assignment.activated_by, self.coach)

    def test_create_unit_test_assignment_post_test(self):
        """Test creating a post-test assignment"""
        assignment = models.UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_id,
            collection=self.classroom,
            test_type="post",
            is_active=False,
            status="not_started",
        )

        self.assertIsNotNone(assignment.id)
        self.assertEqual(assignment.test_type, "post")
        self.assertIsNone(assignment.activated_by)

    def test_unique_together_constraint(self):
        """Test that unique_together constraint works"""
        # Create first assignment
        models.UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_id,
            collection=self.classroom,
            test_type="pre",
            is_active=False,
            status="not_started",
        )

        # Try to create duplicate - should fail
        with self.assertRaises(IntegrityError):
            models.UnitTestAssignment.objects.create(
                course_session=self.course_session,
                unit_contentnode_id=self.unit_id,
                collection=self.classroom,
                test_type="pre",  # Same combination
                is_active=False,
                status="not_started",
            )

    def test_unique_together_allows_different_test_types(self):
        """Test that same unit can have both pre and post tests"""
        # Create pre-test
        pre_test = models.UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_id,
            collection=self.classroom,
            test_type="pre",
            is_active=False,
            status="not_started",
        )

        # Create post-test - should succeed
        post_test = models.UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_id,
            collection=self.classroom,
            test_type="post",  # Different test type
            is_active=False,
            status="not_started",
        )

        self.assertIsNotNone(pre_test.id)
        self.assertIsNotNone(post_test.id)
        self.assertNotEqual(pre_test.id, post_test.id)

    def test_one_active_test_per_session_constraint(self):
        """Test that only one test can be active per session"""
        # Create first active test
        models.UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_id,
            collection=self.classroom,
            test_type="pre",
            is_active=True,  # Active
            status="active",
        )

        # Try to create another active test in same session - should fail
        unit_id_2 = uuid.uuid4().hex
        with self.assertRaises(IntegrityError):
            models.UnitTestAssignment.objects.create(
                course_session=self.course_session,
                unit_contentnode_id=unit_id_2,  # Different unit
                collection=self.classroom,
                test_type="post",  # Different type
                is_active=True,  # Also active - should fail
                status="active",
            )

    def test_multiple_inactive_tests_allowed(self):
        """Test that multiple inactive tests can exist in same session"""
        unit_id_2 = uuid.uuid4().hex

        # Create first inactive test
        test1 = models.UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_id,
            collection=self.classroom,
            test_type="pre",
            is_active=False,
            status="not_started",
        )

        # Create second inactive test - should succeed
        test2 = models.UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=unit_id_2,
            collection=self.classroom,
            test_type="post",
            is_active=False,
            status="ended",
        )

        self.assertIsNotNone(test1.id)
        self.assertIsNotNone(test2.id)
        self.assertNotEqual(test1.id, test2.id)

    def test_dataset_integrity_course_session_collection_mismatch(self):
        """Test that course_session and collection must be in same dataset"""
        # Create a different facility with different dataset
        other_facility = Facility.objects.create(name="OtherFacility")
        other_classroom = Classroom.objects.create(
            name="OtherClassroom", parent=other_facility
        )

        # Try to create assignment with mismatched datasets
        with self.assertRaises(IntegrityError) as context:
            models.UnitTestAssignment.objects.create(
                course_session=self.course_session,  # From facility 1
                unit_contentnode_id=self.unit_id,
                collection=other_classroom,  # From facility 2 - different dataset
                test_type="pre",
                is_active=False,
                status="not_started",
            )

        self.assertIn("same dataset", str(context.exception))

    def test_dataset_integrity_activated_by_different_dataset(self):
        """Test that activated_by user from different dataset raises error (unless superuser)"""
        # Create a user in a different facility
        other_facility = Facility.objects.create(name="OtherFacility")
        other_user = FacilityUser.objects.create(
            username="other_coach", facility=other_facility
        )

        # Try to create assignment with activated_by from different dataset - should fail
        with self.assertRaises(IntegrityError) as context:
            models.UnitTestAssignment.objects.create(
                course_session=self.course_session,
                unit_contentnode_id=self.unit_id,
                collection=self.classroom,
                test_type="pre",
                is_active=False,
                status="not_started",
                activated_by=other_user,  # Different dataset
            )

        self.assertIn("same dataset", str(context.exception))

    def test_dataset_integrity_activated_by_superuser_different_dataset(self):
        """Test that superuser activated_by from different dataset gets nullified"""
        from kolibri.core.device.models import DevicePermissions

        # Create a superuser in a different facility
        other_facility = Facility.objects.create(name="OtherFacility")
        superuser = FacilityUser.objects.create(
            username="superuser", facility=other_facility
        )
        # Make the user a superuser by creating DevicePermissions
        DevicePermissions.objects.create(
            user=superuser, is_superuser=True, can_manage_content=True
        )

        # Create assignment with superuser activated_by from different dataset
        assignment = models.UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_id,
            collection=self.classroom,
            test_type="pre",
            is_active=False,
            status="not_started",
            activated_by=superuser,  # Different dataset but is superuser
        )

        # activated_by should be nullified for superusers from different datasets
        self.assertIsNone(assignment.activated_by)

    def test_calculate_source_id(self):
        """Test that source_id is correctly calculated"""
        assignment = models.UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_id,
            collection=self.classroom,
            test_type="pre",
            is_active=False,
            status="not_started",
        )

        expected_source_id = "{}:{}:{}:{}".format(
            self.course_session.id, self.unit_id, self.classroom.id, "pre"
        )

        self.assertEqual(assignment.calculate_source_id(), expected_source_id)

    def test_infer_dataset(self):
        """Test that dataset is correctly inferred from course_session"""
        assignment = models.UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_id,
            collection=self.classroom,
            test_type="pre",
            is_active=False,
            status="not_started",
        )

        self.assertEqual(assignment.dataset_id, self.course_session.dataset_id)

    def test_test_type_choices(self):
        """Test that test_type only accepts valid choices"""
        # Valid choices should work (tested in other tests)
        # Invalid choice should fail at validation
        assignment = models.UnitTestAssignment(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_id,
            collection=self.classroom,
            test_type="invalid",  # Invalid choice
            is_active=False,
            status="not_started",
        )

        # Should raise validation error when full_clean is called
        from django.core.exceptions import ValidationError

        with self.assertRaises(ValidationError):
            assignment.full_clean()

    def test_status_choices(self):
        """Test that status only accepts valid choices"""
        assignment = models.UnitTestAssignment(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_id,
            collection=self.classroom,
            test_type="pre",
            is_active=False,
            status="invalid_status",  # Invalid choice
        )

        # Should raise validation error when full_clean is called
        from django.core.exceptions import ValidationError

        with self.assertRaises(ValidationError):
            assignment.full_clean()

    def test_str_method(self):
        """Test the string representation of UnitTestAssignment"""
        assignment = models.UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_id,
            collection=self.classroom,
            test_type="pre",
            is_active=False,
            status="not_started",
        )

        expected_str = (
            "UnitTestAssignment {} ({}) for CourseSession {} in Collection {}".format(
                self.unit_id,
                "pre",
                self.course_session.title,
                self.classroom.name,
            )
        )

        self.assertEqual(str(assignment), expected_str)

    def test_learner_group_assignment(self):
        """Test that assignments can be made to LearnerGroups"""
        assignment = models.UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_id,
            collection=self.learner_group,  # Assign to learner group instead of classroom
            test_type="pre",
            is_active=False,
            status="not_started",
        )

        self.assertIsNotNone(assignment.id)
        self.assertEqual(assignment.collection, self.learner_group)

    def test_activate_deactivate_workflow(self):
        """Test the workflow of activating and deactivating tests"""
        # Create an inactive test
        assignment = models.UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_id,
            collection=self.classroom,
            test_type="pre",
            is_active=False,
            status="not_started",
            activated_by=None,
        )

        # Activate it
        assignment.is_active = True
        assignment.status = "active"
        assignment.activated_by = self.coach
        assignment.save()

        # Refresh from DB
        assignment.refresh_from_db()
        self.assertTrue(assignment.is_active)
        self.assertEqual(assignment.status, "active")
        self.assertEqual(assignment.activated_by, self.coach)

        # Deactivate it
        assignment.is_active = False
        assignment.status = "ended"
        assignment.save()

        # Refresh from DB
        assignment.refresh_from_db()
        self.assertFalse(assignment.is_active)
        self.assertEqual(assignment.status, "ended")

    def test_collection_hierarchy_same_collection(self):
        """Test that assignment to the same collection as course_session works"""
        # Course session is for the classroom, assignment is to the same classroom
        assignment = models.UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_id,
            collection=self.classroom,  # Same as course_session.collection
            test_type="pre",
            is_active=False,
            status="not_started",
        )

        self.assertIsNotNone(assignment.id)
        self.assertEqual(assignment.collection, self.classroom)

    def test_collection_hierarchy_child_collection(self):
        """Test that assignment to a child collection (LearnerGroup) works"""
        # Course session is for the classroom, assignment is to a learner group within that classroom
        assignment = models.UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_id,
            collection=self.learner_group,  # Child of course_session.collection
            test_type="pre",
            is_active=False,
            status="not_started",
        )

        self.assertIsNotNone(assignment.id)
        self.assertEqual(assignment.collection, self.learner_group)
        self.assertEqual(assignment.collection.parent, self.classroom)

    def test_collection_hierarchy_unrelated_classroom_fails(self):
        """Test that assignment to an unrelated classroom fails"""
        # Create a different classroom in the same facility
        other_classroom = Classroom.objects.create(
            name="OtherClassroom", parent=self.facility
        )

        # Try to create assignment with course_session for one classroom
        # but collection pointing to a different classroom - should fail
        with self.assertRaises(IntegrityError) as context:
            models.UnitTestAssignment.objects.create(
                course_session=self.course_session,  # For self.classroom
                unit_contentnode_id=self.unit_id,
                collection=other_classroom,  # Different classroom, not a child
                test_type="pre",
                is_active=False,
                status="not_started",
            )

        self.assertIn(
            "collection must be the same as or a child of", str(context.exception)
        )

    def test_collection_hierarchy_unrelated_learner_group_fails(self):
        """Test that assignment to a learner group from a different classroom fails"""
        # Create a different classroom and learner group
        other_classroom = Classroom.objects.create(
            name="OtherClassroom", parent=self.facility
        )
        other_learner_group = LearnerGroup.objects.create(
            name="OtherLearnerGroup", parent=other_classroom
        )

        # Try to create assignment with course_session for one classroom
        # but collection pointing to a learner group from a different classroom - should fail
        with self.assertRaises(IntegrityError) as context:
            models.UnitTestAssignment.objects.create(
                course_session=self.course_session,  # For self.classroom
                unit_contentnode_id=self.unit_id,
                collection=other_learner_group,  # Child of other_classroom, not self.classroom
                test_type="pre",
                is_active=False,
                status="not_started",
            )

        self.assertIn(
            "collection must be the same as or a child of", str(context.exception)
        )

    def test_collection_hierarchy_facility_fails(self):
        """Test that assignment directly to a facility fails"""
        # Try to create assignment with collection pointing to the facility itself
        with self.assertRaises(IntegrityError) as context:
            models.UnitTestAssignment.objects.create(
                course_session=self.course_session,  # For self.classroom
                unit_contentnode_id=self.unit_id,
                collection=self.facility,  # Parent of classroom, not same or child
                test_type="pre",
                is_active=False,
                status="not_started",
            )

        self.assertIn(
            "collection must be the same as or a child of", str(context.exception)
        )


class TestTypeEnumTestCase(TestCase):
    """Test suite for TestType enum"""

    def test_test_type_enum_values(self):
        """Test that TestType enum has correct values"""
        self.assertEqual(TestType.Pre, "pre")
        self.assertEqual(TestType.Post, "post")

    def test_test_type_enum_choices(self):
        """Test that TestType.choices() returns correct format"""
        choices = TestType.choices()
        self.assertIsInstance(choices, tuple)
        # Should contain tuples of (value, label)
        self.assertIn(("post", "Post"), choices)
        self.assertIn(("pre", "Pre"), choices)

    def test_test_type_enum_max_length(self):
        """Test that TestType.max_length() returns correct value"""
        max_len = TestType.max_length()
        self.assertGreaterEqual(max_len, 4)  # "post" has 4 characters


class TestStatusEnumTestCase(TestCase):
    """Test suite for TestStatus enum"""

    def test_test_status_enum_values(self):
        """Test that TestStatus enum has correct values"""
        self.assertEqual(TestStatus.NotStarted, "not_started")
        self.assertEqual(TestStatus.Active, "active")
        self.assertEqual(TestStatus.Ended, "ended")

    def test_test_status_enum_choices(self):
        """Test that TestStatus.choices() returns correct format"""
        choices = TestStatus.choices()
        self.assertIsInstance(choices, tuple)
        # Should contain tuples of (value, label)
        self.assertIn(("active", "Active"), choices)
        self.assertIn(("ended", "Ended"), choices)
        self.assertIn(("not_started", "NotStarted"), choices)

    def test_test_status_enum_max_length(self):
        """Test that TestStatus.max_length() returns correct value"""
        max_len = TestStatus.max_length()
        self.assertGreaterEqual(max_len, 11)  # "not_started" has 11 characters
