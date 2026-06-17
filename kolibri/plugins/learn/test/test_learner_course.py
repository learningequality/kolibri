import uuid

from django.urls import reverse
from django.utils.timezone import now
from le_utils.constants import content_kinds
from le_utils.constants import modalities

from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.test.helpers import clear_process_cache
from kolibri.core.auth.test.helpers import KolibriAPITestCase as APITestCase
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content.models import ContentNode
from kolibri.core.courses.models import CourseSession
from kolibri.core.courses.models import CourseSessionAssignment
from kolibri.core.courses.models import TestType
from kolibri.core.courses.models import UnitTestAssignment
from kolibri.core.logger.models import ContentSummaryLog

DUMMY_PASSWORD = "password"


class LearnerCourseTestCase(APITestCase):
    databases = "__all__"

    def _create_lesson(self, unit, title, resources):
        lesson = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=unit.channel_id,
            content_id=uuid.uuid4().hex,
            parent=unit,
            available=True,
            kind=content_kinds.TOPIC,
            modality=modalities.LESSON,
            title=title,
            description="",
        )
        new_resources = []
        for i in range(resources):
            content_id = uuid.uuid4().hex
            resource = ContentNode.objects.create(
                id=uuid.uuid4().hex,
                channel_id=unit.channel_id,
                content_id=content_id,
                parent=lesson,
                available=True,
                kind=content_kinds.VIDEO,
                title=f"Resource {i + 1}",
                description="",
            )
            ContentSummaryLog.objects.create(
                user=self.learner,
                content_id=content_id,
                kind=content_kinds.VIDEO,
                progress=0.0,
                start_timestamp=now(),
            )
            new_resources.append(resource)
        return lesson, new_resources

    def _create_unit(self, course_session, course, title, lessons, resources):
        unit = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=course.channel_id,
            content_id=uuid.uuid4().hex,
            parent=course,
            available=True,
            kind=content_kinds.TOPIC,
            modality=modalities.UNIT,
            title=title,
            description="",
        )
        new_lessons = []
        for i in range(lessons):
            lesson = self._create_lesson(unit, f"Lesson {i + 1}", resources)
            new_lessons.append(lesson)

        return unit, new_lessons

    def _create_course(self, units, lessons, resources):
        channel_id = uuid.uuid4().hex
        course = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            available=True,
            modality=modalities.COURSE,
            title="Course With Units",
            description="",
        )
        course_session = CourseSession.objects.create(
            collection=self.classroom,
            is_active=True,
            created_by=self.coach,
            course=course.id,
            title=course.title,
            description=course.description,
        )
        CourseSessionAssignment.objects.create(
            course_session=course_session,
            assigned_by=self.coach,
            collection=self.classroom,
        )

        new_units = []
        for i in range(units):
            unit = self._create_unit(
                course_session=course_session,
                course=course,
                title=f"Unit {i + 1}",
                lessons=lessons,
                resources=resources,
            )
            new_units.append(unit)
        return course, course_session, new_units

    def setUp(self):
        clear_process_cache()
        provision_device()
        self.facility = Facility.objects.create(name="My Facility")
        self.classroom = Classroom.objects.create(
            name="Classroom", parent=self.facility
        )
        self.coach = FacilityUser.objects.create(
            username="coach", facility=self.facility
        )
        self.coach.set_password(DUMMY_PASSWORD)
        self.coach.save()
        self.classroom.add_coach(self.coach)

        self.learner = FacilityUser.objects.create(
            username="learner", facility=self.facility
        )
        self.learner.set_password(DUMMY_PASSWORD)
        self.learner.save()
        self.classroom.add_member(self.learner)
        self.basename = "kolibri:kolibri.plugins.learn:learnercourse"

        channel_id = uuid.uuid4().hex
        self.course_1 = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            available=True,
            modality=modalities.COURSE,
            title="Course Title 1",
            description="Course description 1",
        )

        channel_id_2 = uuid.uuid4().hex
        self.course_2 = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id_2,
            content_id=uuid.uuid4().hex,
            available=True,
            modality=modalities.COURSE,
            title="Course Title 2",
            description="Course description 2",
        )

        channel_id_3 = uuid.uuid4().hex
        self.course_3 = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id_3,
            content_id=uuid.uuid4().hex,
            available=True,
            modality=modalities.COURSE,
            title="Course Title 3",
            description="Course description 3",
        )

    def test_must_be_authenticated(self):
        get_request = self.client.get(reverse(self.basename + "-list"))
        self.assertEqual(get_request.status_code, 403)

    def test_learner_can_access_assigned_courses(self):
        active_own_course = CourseSession.objects.create(
            is_active=True,
            collection=self.classroom,
            created_by=self.coach,
            course=self.course_1.id,
            title=self.course_1.title,
            description=self.course_1.description,
        )
        CourseSessionAssignment.objects.create(
            course_session=active_own_course,
            assigned_by=self.coach,
            collection=self.classroom,
        )
        self.client.login(username="learner", password=DUMMY_PASSWORD)
        get_request = self.client.get(
            reverse(self.basename + "-detail", kwargs={"pk": active_own_course.id})
        )
        self.assertEqual(get_request.data["id"], active_own_course.id)

    def _create_assigned_course_session(self):
        course_session = CourseSession.objects.create(
            is_active=True,
            collection=self.classroom,
            created_by=self.coach,
            course=self.course_1.id,
            title=self.course_1.title,
            description=self.course_1.description,
        )
        CourseSessionAssignment.objects.create(
            course_session=course_session,
            assigned_by=self.coach,
            collection=self.classroom,
        )
        return course_session

    def test_learner_course_classroom_field_shape(self):
        active_own_course = self._create_assigned_course_session()
        self.client.login(username="learner", password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse(self.basename + "-detail", kwargs={"pk": active_own_course.id})
        )
        self.assertEqual(response.status_code, 200)
        classroom = response.data.get("classroom")
        self.assertIsNotNone(classroom)
        self.assertEqual(classroom["id"], self.classroom.id)
        self.assertEqual(classroom["name"], self.classroom.name)
        self.assertEqual(classroom["parent"], self.facility.id)

    def test_learner_course_list_classroom_field_shape(self):
        self._create_assigned_course_session()
        self.client.login(username="learner", password=DUMMY_PASSWORD)
        response = self.client.get(reverse(self.basename + "-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        classroom = response.data[0].get("classroom")
        self.assertIsNotNone(classroom)
        self.assertEqual(classroom["id"], self.classroom.id)
        self.assertEqual(classroom["name"], self.classroom.name)
        self.assertEqual(classroom["parent"], self.facility.id)

    def test_learner_cannot_access_not_own_courses(self):
        # Course created in Classroom, but not assigned
        other_classroom = Classroom.objects.create(
            name="Other Classroom", parent=self.facility
        )
        other_classroom.add_coach(self.coach)
        other_course = CourseSession.objects.create(
            is_active=True,
            collection=other_classroom,
            created_by=self.coach,
            course=self.course_2.id,
            title=self.course_2.title,
            description=self.course_2.description,
        )
        self.client.login(username="learner", password=DUMMY_PASSWORD)
        get_request = self.client.get(
            reverse(self.basename + "-detail", kwargs={"pk": other_course.id})
        )
        self.assertEqual(get_request.status_code, 404)

        # Course assigned to different LearnerGroup that does not include learner
        different_group = LearnerGroup.objects.create(
            name="Different Group", parent=self.classroom
        )
        different_course = CourseSession.objects.create(
            title=self.course_3.title,
            description=self.course_3.description,
            course=self.course_3.id,
            is_active=True,
            collection=self.classroom,
            created_by=self.coach,
        )
        CourseSessionAssignment.objects.create(
            course_session=different_course,
            assigned_by=self.coach,
            collection=different_group,
        )
        get_request = self.client.get(
            reverse(self.basename + "-detail", kwargs={"pk": different_course.id})
        )
        self.assertEqual(get_request.status_code, 404)

    def test_learner_cannot_access_own_inactive_courses(self):
        inactive_own_course = CourseSession.objects.create(
            collection=self.classroom,
            is_active=False,
            created_by=self.coach,
            course=self.course_1.id,
            title=self.course_1.title,
            description=self.course_1.description,
        )
        CourseSessionAssignment.objects.create(
            course_session=inactive_own_course,
            assigned_by=self.coach,
            collection=self.classroom,
        )
        self.client.login(username="learner", password=DUMMY_PASSWORD)
        get_request = self.client.get(
            reverse(self.basename + "-detail", kwargs={"pk": inactive_own_course.id})
        )
        self.assertEqual(get_request.status_code, 404)

    def test_learner_assigned_same_course_multiple_times_only_return_one(self):
        active_own_course = CourseSession.objects.create(
            collection=self.classroom,
            is_active=True,
            created_by=self.coach,
            course=self.course_1.id,
            title=self.course_1.title,
            description=self.course_1.description,
        )
        CourseSessionAssignment.objects.create(
            course_session=active_own_course,
            assigned_by=self.coach,
            collection=self.classroom,
        )
        group = LearnerGroup.objects.create(name="Own Group", parent=self.classroom)
        group.add_member(self.learner)
        CourseSessionAssignment.objects.create(
            course_session=active_own_course,
            assigned_by=self.coach,
            collection=group,
        )
        self.client.login(username="learner", password=DUMMY_PASSWORD)
        get_request = self.client.get(
            reverse(self.basename + "-detail", kwargs={"pk": active_own_course.id})
        )
        self.assertEqual(get_request.data["id"], active_own_course.id)
        self.assertEqual(get_request.status_code, 200)
        list_request = self.client.get(reverse(self.basename + "-list"))
        self.assertEqual(len(list_request.data), 1)

    def test_learner_course_progress_calculated_correctly(self):
        channel_id = uuid.uuid4().hex
        # Create a course with 1 unit, 2 lessons, and 2 exercises
        course = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            available=True,
            modality=modalities.COURSE,
            title="Course With Units",
            description="",
        )

        unit1 = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=course,
            available=True,
            kind=content_kinds.TOPIC,
            modality=modalities.UNIT,
            title="Unit 1",
            description="",
        )

        lesson1 = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=unit1,
            available=True,
            kind=content_kinds.TOPIC,
            modality=modalities.LESSON,
            title="Lesson 1",
            description="",
        )

        ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=lesson1,
            available=True,
            kind=content_kinds.EXERCISE,
            title="Exercise 1",
            description="",
        )

        lesson2 = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=unit1,
            available=True,
            kind=content_kinds.TOPIC,
            modality=modalities.LESSON,
            title="Lesson 2",
            description="",
        )

        ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=lesson2,
            available=True,
            kind=content_kinds.EXERCISE,
            title="Exercise 2",
            description="",
        )

        # Create and assign the course session
        active_own_course = CourseSession.objects.create(
            collection=self.classroom,
            is_active=True,
            created_by=self.coach,
            course=course.id,
            title=course.title,
            description=course.description,
        )
        CourseSessionAssignment.objects.create(
            course_session=active_own_course,
            assigned_by=self.coach,
            collection=self.classroom,
        )

        # Ensure the course has two non-topic descendants (the exercises)
        content_qs = list(
            course.get_descendants()
            .exclude(kind=content_kinds.TOPIC)
            .values_list("content_id", flat=True)
        )
        self.assertEqual(len(content_qs), 2)

        # Mark 1 resource as completed (progress == 1.0) and one as in-progress
        ContentSummaryLog.objects.create(
            user=self.learner,
            content_id=content_qs[0],
            kind=content_kinds.EXERCISE,
            progress=1.0,
            start_timestamp=now(),
            completion_timestamp=now(),
        )
        ContentSummaryLog.objects.create(
            user=self.learner,
            content_id=content_qs[1],
            kind=content_kinds.EXERCISE,
            progress=0.5,
            start_timestamp=now(),
            completion_timestamp=now(),
        )

        self.client.login(username="learner", password=DUMMY_PASSWORD)
        get_request = self.client.get(
            reverse(self.basename + "-detail", kwargs={"pk": active_own_course.id})
        )
        self.assertEqual(get_request.data["id"], active_own_course.id)
        self.assertEqual(get_request.status_code, 200)
        # progress should be completed(1) / total(2) == 0.5
        self.assertEqual(get_request.data["progress"], 0.5)
        # Ensure unit and lesson counts are annotated correctly
        self.assertEqual(get_request.data.get("unit_count"), 1)
        self.assertEqual(get_request.data.get("lesson_count"), 2)

    def test_learner_course_resume__course_not_started(self):
        course, course_session, units = self._create_course(
            units=3, lessons=3, resources=3
        )
        # no unit tests started

        self.client.login(username="learner", password=DUMMY_PASSWORD)

        get_request = self.client.get(
            reverse(self.basename + "-resume", kwargs={"pk": course_session.id})
        )

        self.assertEqual(get_request.status_code, 200)
        response = get_request.data
        self.assertEqual(response["started"], False)
        self.assertEqual(response["active_test"], None)
        self.assertEqual(response["resume_position"], None)

    def test_learner_course_resume__pre_test_active(self):
        course, course_session, units = self._create_course(
            units=5, lessons=5, resources=5
        )
        # unit 3 pre test active
        for i in range(2):
            unit, lessons = units[i]
            UnitTestAssignment.objects.create(
                course_session=course_session,
                unit_contentnode_id=unit.id,
                collection=self.classroom,
                test_type=TestType.Pre,
                closed=True,
                activated_by=self.coach,
            )

            UnitTestAssignment.objects.create(
                course_session=course_session,
                unit_contentnode_id=unit.id,
                collection=self.classroom,
                test_type=TestType.Post,
                closed=True,
                activated_by=self.coach,
            )

        unit, lessons = units[2]
        UnitTestAssignment.objects.create(
            course_session=course_session,
            unit_contentnode_id=unit.id,
            collection=self.classroom,
            test_type=TestType.Pre,
            closed=False,
            activated_by=self.coach,
        )

        self.client.login(username="learner", password=DUMMY_PASSWORD)

        get_request = self.client.get(
            reverse(self.basename + "-resume", kwargs={"pk": course_session.id})
        )

        self.assertEqual(get_request.status_code, 200)
        response = get_request.data
        self.assertEqual(response["started"], True)
        self.assertEqual(response["active_test"]["unit_id"], unit.id)
        self.assertEqual(response["active_test"]["test_type"], TestType.Pre)
        self.assertEqual(response["resume_position"], None)

    def test_learner_course_resume__post_test_active(self):
        course, course_session, units = self._create_course(
            units=5, lessons=5, resources=5
        )
        # unit 4 post test active
        for i in range(3):
            unit, lessons = units[i]
            UnitTestAssignment.objects.create(
                course_session=course_session,
                unit_contentnode_id=unit.id,
                collection=self.classroom,
                test_type=TestType.Pre,
                closed=True,
                activated_by=self.coach,
            )

            UnitTestAssignment.objects.create(
                course_session=course_session,
                unit_contentnode_id=unit.id,
                collection=self.classroom,
                test_type=TestType.Post,
                closed=True,
                activated_by=self.coach,
            )

        unit, lessons = units[3]
        UnitTestAssignment.objects.create(
            course_session=course_session,
            unit_contentnode_id=unit.id,
            collection=self.classroom,
            test_type=TestType.Pre,
            closed=True,
            activated_by=self.coach,
        )

        UnitTestAssignment.objects.create(
            course_session=course_session,
            unit_contentnode_id=unit.id,
            collection=self.classroom,
            test_type=TestType.Post,
            closed=False,
            activated_by=self.coach,
        )

        self.client.login(username="learner", password=DUMMY_PASSWORD)

        get_request = self.client.get(
            reverse(self.basename + "-resume", kwargs={"pk": course_session.id})
        )

        self.assertEqual(get_request.status_code, 200)
        response = get_request.data
        self.assertEqual(response["started"], True)
        self.assertEqual(response["active_test"]["unit_id"], unit.id)
        self.assertEqual(response["active_test"]["test_type"], TestType.Post)
        self.assertEqual(response["resume_position"], None)

    def test_learner_course_resume__resume_position_first_resource(self):
        course, course_session, units = self._create_course(
            units=2, lessons=5, resources=5
        )
        unit, lessons = units[0]
        # Just first unit pre test ended, no progress on any resource, so
        # resume position should be first resource of first lesson of first unit
        UnitTestAssignment.objects.create(
            course_session=course_session,
            unit_contentnode_id=unit.id,
            collection=self.classroom,
            test_type=TestType.Pre,
            closed=True,
            activated_by=self.coach,
        )

        resume_lesson, lesson_resources = lessons[0]

        resume_resource = lesson_resources[0]

        self.client.login(username="learner", password=DUMMY_PASSWORD)

        get_request = self.client.get(
            reverse(self.basename + "-resume", kwargs={"pk": course_session.id})
        )

        self.assertEqual(get_request.status_code, 200)
        response = get_request.data
        self.assertEqual(response["started"], True)
        self.assertEqual(response["active_test"], None)
        self.assertEqual(response["resume_position"]["unit_id"], unit.id)
        self.assertEqual(response["resume_position"]["lesson_id"], resume_lesson.id)
        self.assertEqual(response["resume_position"]["resource_id"], resume_resource.id)

    def test_learner_course_resume__resume_position(self):
        course, course_session, units = self._create_course(
            units=5, lessons=5, resources=5
        )
        # 3 units completed
        for i in range(3):
            unit, lessons = units[i]

            UnitTestAssignment.objects.create(
                course_session=course_session,
                unit_contentnode_id=unit.id,
                collection=self.classroom,
                test_type=TestType.Pre,
                closed=True,
                activated_by=self.coach,
            )
            UnitTestAssignment.objects.create(
                course_session=course_session,
                unit_contentnode_id=unit.id,
                collection=self.classroom,
                test_type=TestType.Post,
                closed=True,
                activated_by=self.coach,
            )

            for lesson, lesson_resources in lessons:
                for resource in lesson_resources:
                    log = ContentSummaryLog.objects.get(
                        user=self.learner, content_id=resource.content_id
                    )
                    log.progress = 1.0
                    log.completion_timestamp = now()
                    log.save()

        # Unit 4, lesson 1, resource 2 in progress
        resume_unit, lessons = units[3]

        UnitTestAssignment.objects.create(
            course_session=course_session,
            unit_contentnode_id=resume_unit.id,
            collection=self.classroom,
            test_type=TestType.Pre,
            closed=True,
            activated_by=self.coach,
        )
        resume_lesson, lesson_resources = lessons[0]
        resource_1 = lesson_resources[0]

        log = ContentSummaryLog.objects.get(
            user=self.learner, content_id=resource_1.content_id
        )
        log.progress = 1.0
        log.completion_timestamp = now()
        log.save()

        resume_resource = lesson_resources[1]
        log = ContentSummaryLog.objects.get(
            user=self.learner, content_id=resume_resource.content_id
        )
        log.progress = 0.5
        log.save()

        self.client.login(username="learner", password=DUMMY_PASSWORD)

        get_request = self.client.get(
            reverse(self.basename + "-resume", kwargs={"pk": course_session.id})
        )

        self.assertEqual(get_request.status_code, 200)
        response = get_request.data
        self.assertEqual(response["started"], True)
        self.assertEqual(response["active_test"], None)
        self.assertEqual(response["resume_position"]["unit_id"], resume_unit.id)
        self.assertEqual(response["resume_position"]["lesson_id"], resume_lesson.id)
        self.assertEqual(response["resume_position"]["resource_id"], resume_resource.id)

    def test_learner_course_resume__course_complete(self):
        course, course_session, units = self._create_course(
            units=5, lessons=5, resources=5
        )
        # All units completed
        for i in range(5):
            unit, lessons = units[i]

            UnitTestAssignment.objects.create(
                course_session=course_session,
                unit_contentnode_id=unit.id,
                collection=self.classroom,
                test_type=TestType.Pre,
                closed=True,
                activated_by=self.coach,
            )
            UnitTestAssignment.objects.create(
                course_session=course_session,
                unit_contentnode_id=unit.id,
                collection=self.classroom,
                test_type=TestType.Post,
                closed=True,
                activated_by=self.coach,
            )

            for lesson, lesson_resources in lessons:
                for resource in lesson_resources:
                    log = ContentSummaryLog.objects.get(
                        user=self.learner, content_id=resource.content_id
                    )
                    log.progress = 1.0
                    log.completion_timestamp = now()
                    log.save()

        self.client.login(username="learner", password=DUMMY_PASSWORD)

        get_request = self.client.get(
            reverse(self.basename + "-resume", kwargs={"pk": course_session.id})
        )

        self.assertEqual(get_request.status_code, 200)
        response = get_request.data
        self.assertEqual(response["started"], True)
        self.assertEqual(response["active_test"], None)
        # Should redirect to the last unit, without pointing to any specific lesson or resource
        self.assertEqual(
            response["resume_position"],
            {
                "unit_id": units[-1][0].id,
                "lesson_id": None,
                "resource_id": None,
            },
        )
