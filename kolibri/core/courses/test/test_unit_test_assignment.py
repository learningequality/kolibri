import hashlib
import uuid

from django.db.utils import IntegrityError
from django.test import TestCase

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

    def test_calculate_source_id(self):
        """Test that source_id is correctly calculated with hash"""
        assignment = models.UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_id,
            collection=self.classroom,
            test_type="pre",
            is_active=False,
            status="not_started",
        )

        key = "{}:{}:{}:{}".format(
            assignment.morango_model_name,
            self.unit_id,
            self.classroom.id,
            "pre",
        )
        hash_digest = hashlib.md5(key.encode("utf-8")).hexdigest()
        expected_source_id = "{}:{}".format(self.course_session.id, hash_digest)

        calculated_source_id = assignment.calculate_source_id()
        self.assertEqual(calculated_source_id, expected_source_id)

        # Verify the source_id length is within the 96-character limit
        self.assertLessEqual(len(calculated_source_id), 96)

    def test_calculate_source_id_uniqueness(self):
        """Test that different assignments generate different source_ids"""
        assignment1 = models.UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_id,
            collection=self.classroom,
            test_type="pre",
            is_active=False,
            status="not_started",
        )

        unit_id_2 = uuid.uuid4().hex
        assignment2 = models.UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=unit_id_2,  # Different unit
            collection=self.classroom,
            test_type="pre",
            is_active=False,
            status="not_started",
        )

        self.assertNotEqual(
            assignment1.calculate_source_id(), assignment2.calculate_source_id()
        )
        assignment3 = models.UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_id,
            collection=self.classroom,
            test_type="post",  # Different test type
            is_active=False,
            status="not_started",
        )

        # Different test types should generate different source_ids
        self.assertNotEqual(
            assignment1.calculate_source_id(), assignment3.calculate_source_id()
        )

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
