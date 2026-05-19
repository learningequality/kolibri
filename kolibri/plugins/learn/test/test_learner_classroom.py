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
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import MasteryLog


class LearnerClassroomTestCase(APITestCase):
    databases = "__all__"

    def setUp(self):
        clear_process_cache()
        provision_device()
        self.facility = Facility.objects.create(name="My Facility")
        self.coach_user = FacilityUser.objects.create(
            username="admin", facility=self.facility
        )
        self.coach_user.set_password("password")
        self.coach_user.save()
        self.learner_user = FacilityUser.objects.create(
            username="learner", facility=self.facility
        )
        self.learner_user.set_password("password")
        self.learner_user.save()
        self.basename = "kolibri:kolibri.plugins.learn:learnerclassroom"
        self.own_classroom = Classroom.objects.create(
            name="Own Classroom", parent=self.facility
        )
        self.own_classroom.add_member(self.learner_user)

    def test_must_be_authenticated(self):
        get_response = self.client.get(reverse(self.basename + "-list"))
        self.assertEqual(get_response.status_code, 403)

    def test_learner_only_sees_own_classrooms(self):
        self.client.login(username="learner", password="password")
        Classroom.objects.create(name="Other Classroom", parent=self.facility)
        get_response = self.client.get(reverse(self.basename + "-list"))
        self.assertEqual(len(get_response.data), 1)
        self.assertEqual(get_response.data[0]["id"], self.own_classroom.id)

    def test_correct_number_of_exams(self):
        # One active and inactive exam
        exam_1 = Exam.objects.create(
            title="Exam",
            collection=self.own_classroom,
            question_count=10,
            creator=self.coach_user,
            active=True,
        )
        exam_2 = Exam.objects.create(
            title="Inactive Exam",
            collection=self.own_classroom,
            question_count=10,
            creator=self.coach_user,
            active=False,
        )
        lgroup = LearnerGroup.objects.create(
            name="Learner Group", parent=self.own_classroom
        )
        lgroup.add_learner(self.learner_user)
        ExamAssignment.objects.create(
            exam=exam_1, collection=lgroup, assigned_by=self.coach_user
        )
        ExamAssignment.objects.create(
            exam=exam_2, collection=lgroup, assigned_by=self.coach_user
        )
        self.client.login(username="learner", password="password")
        get_response = self.client.get(
            reverse(self.basename + "-detail", kwargs={"pk": self.own_classroom.id})
        )
        self.assertEqual(len(get_response.data["exams"]), 1)

    def test_correct_number_of_attempted_exams(self):
        # One active exam and two inactive exams, but one attempted
        exam_1 = Exam.objects.create(
            title="Exam",
            collection=self.own_classroom,
            question_count=10,
            creator=self.coach_user,
            active=True,
        )
        exam_2 = Exam.objects.create(
            title="Inactive Exam",
            collection=self.own_classroom,
            question_count=10,
            creator=self.coach_user,
            active=False,
        )
        exam_3 = Exam.objects.create(
            title="Inactive Attempted Exam",
            collection=self.own_classroom,
            question_count=10,
            creator=self.coach_user,
            active=False,
        )
        lgroup = LearnerGroup.objects.create(
            name="Learner Group", parent=self.own_classroom
        )
        lgroup.add_learner(self.learner_user)
        ExamAssignment.objects.create(
            exam=exam_1, collection=lgroup, assigned_by=self.coach_user
        )
        ExamAssignment.objects.create(
            exam=exam_2, collection=lgroup, assigned_by=self.coach_user
        )
        ExamAssignment.objects.create(
            exam=exam_3, collection=lgroup, assigned_by=self.coach_user
        )
        summarylog = ContentSummaryLog.objects.create(
            user=self.learner_user,
            content_id=exam_3.id,
            kind=content_kinds.QUIZ,
            progress=0.0,
            start_timestamp=now(),
        )

        MasteryLog.objects.create(
            user=self.learner_user,
            summarylog=summarylog,
            start_timestamp=now(),
            mastery_level=1,
        )
        self.client.login(username="learner", password="password")
        get_response = self.client.get(
            reverse(self.basename + "-detail", kwargs={"pk": self.own_classroom.id})
        )
        self.assertEqual(len(get_response.data["exams"]), 2)

    def test_correct_number_of_lessons(self):
        # One active and inactive lesson
        lesson_1 = Lesson.objects.create(
            title="Lesson",
            collection=self.own_classroom,
            created_by=self.coach_user,
            is_active=True,
        )
        lesson_2 = Lesson.objects.create(
            title="Inactive Lesson",
            collection=self.own_classroom,
            created_by=self.coach_user,
            is_active=False,
        )
        lgroup = LearnerGroup.objects.create(
            name="Learner Group", parent=self.own_classroom
        )
        lgroup.add_learner(self.learner_user)
        LessonAssignment.objects.create(
            lesson=lesson_1, collection=lgroup, assigned_by=self.coach_user
        )
        LessonAssignment.objects.create(
            lesson=lesson_2, collection=lgroup, assigned_by=self.coach_user
        )
        self.client.login(username="learner", password="password")
        get_response = self.client.get(
            reverse(self.basename + "-detail", kwargs={"pk": self.own_classroom.id})
        )
        self.assertEqual(len(get_response.data["lessons"]), 1)

    def test_learner_only_sees_lessons_for_enrolled_classroom(self):
        classroom = Classroom.objects.create(
            name="Other Classroom", parent=self.facility
        )
        lesson = Lesson.objects.create(
            title="Lesson",
            collection=classroom,
            created_by=self.coach_user,
            is_active=True,
        )
        LessonAssignment.objects.create(
            lesson=lesson, collection=classroom, assigned_by=self.coach_user
        )
        self.client.login(username="learner", password="password")
        get_response = self.client.get(reverse(self.basename + "-list"))
        self.assertEqual(len(get_response.data[0]["lessons"]), 0)

    def test_learner_only_sees_lessons_for_single_classroom_when_enrolled_in_multiple(
        self,
    ):
        classroom = Classroom.objects.create(
            name="Other Classroom", parent=self.facility
        )
        classroom.add_member(self.learner_user)
        lesson = Lesson.objects.create(
            title="Lesson",
            collection=self.own_classroom,
            created_by=self.coach_user,
            is_active=True,
        )
        LessonAssignment.objects.create(
            lesson=lesson, collection=self.own_classroom, assigned_by=self.coach_user
        )
        self.client.login(username="learner", password="password")
        get_response = self.client.get(reverse(self.basename + "-list"))
        total_lessons = len(get_response.data[0]["lessons"]) + len(
            get_response.data[1]["lessons"]
        )
        self.assertEqual(total_lessons, Lesson.objects.count())

    def test_learner_only_sees_courses_for_enrolled_classroom(self):
        channel_id = uuid.uuid4().hex
        course = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            available=True,
            modality=modalities.COURSE,
            title="Course Title 1",
            description="Course description 1",
        )
        active_own_course = CourseSession.objects.create(
            collection=self.own_classroom,
            is_active=True,
            created_by=self.coach_user,
            course=course.id,
            title=course.title,
            description=course.description,
        )
        CourseSessionAssignment.objects.create(
            course_session=active_own_course,
            assigned_by=self.coach_user,
            collection=self.own_classroom,
        )
        self.client.login(username="learner", password="password")
        get_request = self.client.get(
            reverse(self.basename + "-detail", kwargs={"pk": self.own_classroom.id})
        )
        self.assertEqual(len(get_request.data["courses"]), 1)

    def test_learner_assigned_same_course_multiple_times_only_sees_single_course(self):
        channel_id = uuid.uuid4().hex
        course = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            available=True,
            modality=modalities.COURSE,
            title="Course Title 1",
            description="Course description 1",
        )
        active_own_course = CourseSession.objects.create(
            collection=self.own_classroom,
            is_active=True,
            created_by=self.coach_user,
            course=course.id,
            title=course.title,
            description=course.description,
        )
        CourseSessionAssignment.objects.create(
            course_session=active_own_course,
            assigned_by=self.coach_user,
            collection=self.own_classroom,
        )
        group = LearnerGroup.objects.create(name="Own Group", parent=self.own_classroom)
        group.add_member(self.learner_user)
        CourseSessionAssignment.objects.create(
            course_session=active_own_course,
            assigned_by=self.coach_user,
            collection=group,
        )
        self.client.login(username="learner", password="password")
        list_request = self.client.get(reverse(self.basename + "-list"))
        self.assertEqual(len(list_request.data), 1)
        self.assertEqual(len(list_request.data[0]["courses"]), 1)
