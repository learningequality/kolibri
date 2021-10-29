from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import json

from django.core.urlresolvers import reverse
from django.utils.timezone import now
from le_utils.constants import content_kinds
from rest_framework.test import APITestCase

from . import helpers
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content.models import ContentNode
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import MasteryLog

DUMMY_PASSWORD = "password"


class ExerciseDifficultQuestionTestCase(APITestCase):
    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name="My Facility")
        self.classroom = Classroom.objects.create(
            name="My Classroom", parent=self.facility
        )
        self.group = LearnerGroup.objects.create(name="My Group", parent=self.classroom)

        self.facility_and_classroom_coach = helpers.create_coach(
            username="facility_and_classroom_coach",
            password=DUMMY_PASSWORD,
            facility=self.facility,
            classroom=self.classroom,
            is_facility_coach=True,
        )
        self.learner = helpers.create_learner(
            username="learner", password=DUMMY_PASSWORD, facility=self.facility
        )
        self.classroom_group_learner = helpers.create_learner(
            username="classroom_group_learner",
            password=DUMMY_PASSWORD,
            facility=self.facility,
            classroom=self.classroom,
            learner_group=self.group,
        )

        # Need ContentNodes
        self.channel_id = "15f32edcec565396a1840c5413c92450"
        self.lesson_id = "15f32edcec565396a1840c5413c92452"

        self.content_ids = [
            "15f32edcec565396a1840c5413c92451",
            "15f32edcec565396a1840c5413c92452",
            "15f32edcec565396a1840c5413c92453",
        ]
        self.contentnode_ids = [
            "25f32edcec565396a1840c5413c92451",
            "25f32edcec565396a1840c5413c92452",
            "25f32edcec565396a1840c5413c92453",
        ]
        self.node_1 = ContentNode.objects.create(
            title="Node 1",
            available=True,
            id=self.contentnode_ids[0],
            content_id=self.content_ids[0],
            channel_id=self.channel_id,
        )
        self.lesson = Lesson.objects.create(
            id=self.lesson_id,
            title="My Lesson",
            created_by=self.facility_and_classroom_coach,
            collection=self.classroom,
            resources=json.dumps(
                [
                    {
                        "contentnode_id": self.node_1.id,
                        "content_id": self.node_1.content_id,
                        "channel_id": self.channel_id,
                    }
                ]
            ),
        )
        self.assignment_1 = LessonAssignment.objects.create(
            lesson=self.lesson,
            assigned_by=self.facility_and_classroom_coach,
            collection=self.classroom,
        )
        self.exercise_difficulties_basename = (
            "kolibri:kolibri.plugins.coach:exercisedifficulties"
        )

    def test_learner_cannot_access_by_classroom_id(self):
        self.client.login(username=self.learner.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse(
                self.exercise_difficulties_basename + "-detail",
                kwargs={"pk": self.content_ids[0]},
            ),
            data={"classroom_id": self.classroom.id},
        )
        self.assertEqual(response.status_code, 403)

    def test_learner_cannot_access_by_lesson_id(self):
        self.client.login(username=self.learner.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse(
                self.exercise_difficulties_basename + "-detail",
                kwargs={"pk": self.content_ids[0]},
            ),
            data={"lesson_id": self.lesson.id, "classroom_id": self.classroom.id},
        )
        self.assertEqual(response.status_code, 403)

    def test_learner_cannot_access_by_group_id(self):
        self.client.login(username="learner", password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse(
                self.exercise_difficulties_basename + "-detail",
                kwargs={"pk": self.content_ids[0]},
            ),
            data={"group_id": self.group.id, "classroom_id": self.classroom.id},
        )
        self.assertEqual(response.status_code, 403)

    def test_coach_classroom_id_required(self):
        self.client.login(
            username=self.facility_and_classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(
                self.exercise_difficulties_basename + "-detail",
                kwargs={"pk": self.content_ids[0]},
            )
        )
        self.assertEqual(response.status_code, 412)

    def test_coach_no_progress_by_classroom_id(self):
        self.client.login(
            username=self.facility_and_classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(
                self.exercise_difficulties_basename + "-detail",
                kwargs={"pk": self.content_ids[0]},
            ),
            data={"classroom_id": self.classroom.id},
        )
        self.assertEqual(len(response.data), 0)

    def test_coach_no_progress_by_lesson_id(self):
        self.client.login(
            username=self.facility_and_classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(
                self.exercise_difficulties_basename + "-detail",
                kwargs={"pk": self.content_ids[0]},
            ),
            data={"lesson_id": self.lesson.id, "classroom_id": self.classroom.id},
        )
        self.assertEqual(len(response.data), 0)

    def test_coach_no_progress_by_group_id(self):
        self.client.login(
            username=self.facility_and_classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(
                self.exercise_difficulties_basename + "-detail",
                kwargs={"pk": self.content_ids[0]},
            ),
            data={"group_id": self.group.id, "classroom_id": self.classroom.id},
        )
        self.assertEqual(len(response.data), 0)

    def _set_one_difficult(self, user):
        self.sessionlog = ContentSessionLog.objects.create(
            user=user,
            content_id=self.content_ids[0],
            channel_id=self.node_1.channel_id,
            kind="exercise",
            progress=0.1,
            start_timestamp=now(),
        )

        self.summarylog = ContentSummaryLog.objects.create(
            user=user,
            content_id=self.content_ids[0],
            channel_id=self.node_1.channel_id,
            kind="exercise",
            progress=0.1,
            start_timestamp=now(),
        )

        self.masterylog = MasteryLog.objects.create(
            user=user,
            summarylog=self.summarylog,
            start_timestamp=now(),
            mastery_level=1,
        )

        AttemptLog.objects.create(
            masterylog=self.masterylog,
            sessionlog=self.sessionlog,
            start_timestamp=now(),
            end_timestamp=now(),
            complete=True,
            correct=0,
            user=user,
            item="test",
        )

    def test_coach_one_difficult_by_classroom_id(self):
        self._set_one_difficult(self.classroom_group_learner)
        self.client.login(
            username=self.facility_and_classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(
                self.exercise_difficulties_basename + "-detail",
                kwargs={"pk": self.content_ids[0]},
            ),
            data={"classroom_id": self.classroom.id},
        )
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["total"], 1)
        self.assertEqual(response.data[0]["correct"], 0)

    def test_coach_one_difficult_by_lesson_id(self):
        self._set_one_difficult(self.classroom_group_learner)
        self.client.login(
            username=self.facility_and_classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(
                self.exercise_difficulties_basename + "-detail",
                kwargs={"pk": self.content_ids[0]},
            ),
            data={"lesson_id": self.lesson.id, "classroom_id": self.classroom.id},
        )
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["total"], 1)
        self.assertEqual(response.data[0]["correct"], 0)

    def test_coach_one_difficult_by_lesson_id_repeated_assignment(self):
        LessonAssignment.objects.create(
            lesson=self.lesson,
            assigned_by=self.facility_and_classroom_coach,
            collection=self.group,
        )
        self._set_one_difficult(self.classroom_group_learner)
        self.client.login(
            username=self.facility_and_classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(
                self.exercise_difficulties_basename + "-detail",
                kwargs={"pk": self.content_ids[0]},
            ),
            data={"lesson_id": self.lesson.id, "classroom_id": self.classroom.id},
        )
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["total"], 1)
        self.assertEqual(response.data[0]["correct"], 0)

    def test_coach_one_difficult_by_group_id(self):
        self._set_one_difficult(self.classroom_group_learner)
        self.client.login(
            username=self.facility_and_classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(
                self.exercise_difficulties_basename + "-detail",
                kwargs={"pk": self.content_ids[0]},
            ),
            data={"group_id": self.group.id, "classroom_id": self.classroom.id},
        )
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["total"], 1)
        self.assertEqual(response.data[0]["correct"], 0)

    def test_coach_two_difficult_by_lesson_id(self):
        self._set_one_difficult(self.classroom_group_learner)
        AttemptLog.objects.create(
            masterylog=self.masterylog,
            sessionlog=self.sessionlog,
            start_timestamp=now(),
            end_timestamp=now(),
            complete=True,
            correct=0,
            user=self.classroom_group_learner,
            item="nottest",
        )
        self.client.login(
            username=self.facility_and_classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(
                self.exercise_difficulties_basename + "-detail",
                kwargs={"pk": self.content_ids[0]},
            ),
            data={"lesson_id": self.lesson.id, "classroom_id": self.classroom.id},
        )
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["total"], 1)
        self.assertEqual(response.data[0]["correct"], 0)
        self.assertEqual(response.data[1]["total"], 1)
        self.assertEqual(response.data[1]["correct"], 0)

    def test_coach_one_difficult_one_not_by_lesson_id(self):
        self._set_one_difficult(self.classroom_group_learner)
        AttemptLog.objects.create(
            masterylog=self.masterylog,
            sessionlog=self.sessionlog,
            start_timestamp=now(),
            end_timestamp=now(),
            complete=True,
            correct=1,
            user=self.classroom_group_learner,
            item="nottest",
        )
        self.client.login(
            username=self.facility_and_classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(
                self.exercise_difficulties_basename + "-detail",
                kwargs={"pk": self.content_ids[0]},
            ),
            data={"lesson_id": self.lesson.id, "classroom_id": self.classroom.id},
        )
        self.assertEqual(len(response.data), 2)
        self.assertTrue(
            any(map(lambda x: x["total"] == 1 and x["correct"] == 0, response.data))
        )
        self.assertTrue(
            any(map(lambda x: x["total"] == 1 and x["correct"] == 1, response.data))
        )

    def test_coach_difficult_no_assigned_by_lesson_id(self):
        self._set_one_difficult(self.classroom_group_learner)
        AttemptLog.objects.create(
            masterylog=self.masterylog,
            sessionlog=self.sessionlog,
            start_timestamp=now(),
            end_timestamp=now(),
            complete=True,
            correct=1,
            user=self.classroom_group_learner,
            item="nottest",
        )
        LessonAssignment.objects.all().delete()
        self.client.login(
            username=self.facility_and_classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(
                self.exercise_difficulties_basename + "-detail",
                kwargs={"pk": self.content_ids[0]},
            ),
            data={"lesson_id": self.lesson.id, "classroom_id": self.classroom.id},
        )
        self.assertEqual(len(response.data), 0)

    def test_coach_difficult_no_assigned_by_group_id(self):
        self._set_one_difficult(self.classroom_group_learner)
        AttemptLog.objects.create(
            masterylog=self.masterylog,
            sessionlog=self.sessionlog,
            start_timestamp=now(),
            end_timestamp=now(),
            complete=True,
            correct=1,
            user=self.classroom_group_learner,
            item="nottest",
        )
        LessonAssignment.objects.all().delete()
        self.client.login(
            username=self.facility_and_classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(
                self.exercise_difficulties_basename + "-detail",
                kwargs={"pk": self.content_ids[0]},
            ),
            data={"group_id": self.group.id, "classroom_id": self.classroom.id},
        )
        self.assertEqual(len(response.data), 2)
        self.assertTrue(
            any(map(lambda x: x["total"] == 1 and x["correct"] == 0, response.data))
        )
        self.assertTrue(
            any(map(lambda x: x["total"] == 1 and x["correct"] == 1, response.data))
        )

    def test_coach_difficult_both_assigned_by_lesson_id_group_id(self):
        self._set_one_difficult(self.classroom_group_learner)
        learner2 = FacilityUser.objects.create(
            username="learner2", facility=self.facility
        )
        self.classroom.add_member(learner2)
        self._set_one_difficult(learner2)
        self.client.login(
            username=self.facility_and_classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(
                self.exercise_difficulties_basename + "-detail",
                kwargs={"pk": self.content_ids[0]},
            ),
            data={
                "lesson_id": self.lesson.id,
                "group_id": self.group.id,
                "classroom_id": self.classroom.id,
            },
        )
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["total"], 1)
        self.assertEqual(response.data[0]["correct"], 0)

    def test_coach_difficult_group_id_not_in_lesson(self):
        self._set_one_difficult(self.classroom_group_learner)
        learner2 = FacilityUser.objects.create(
            username="learner2", facility=self.facility
        )
        self.classroom.add_member(learner2)
        self._set_one_difficult(learner2)
        self.group.remove_member(self.classroom_group_learner)
        self.assignment_1.delete()
        LessonAssignment.objects.create(
            lesson=self.lesson,
            assigned_by=self.facility_and_classroom_coach,
            collection=self.group,
        )
        self.client.login(
            username=self.facility_and_classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(
                self.exercise_difficulties_basename + "-detail",
                kwargs={"pk": self.content_ids[0]},
            ),
            data={
                "lesson_id": self.lesson.id,
                "group_id": self.group.id,
                "classroom_id": self.classroom.id,
            },
        )
        self.assertEqual(len(response.data), 0)


class QuizDifficultQuestionTestCase(APITestCase):
    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name="My Facility")
        self.classroom = Classroom.objects.create(
            name="My Classroom", parent=self.facility
        )
        self.group = LearnerGroup.objects.create(name="My Group", parent=self.classroom)

        self.facility_and_classroom_coach = helpers.create_coach(
            username="facility_and_classroom_coach",
            password=DUMMY_PASSWORD,
            facility=self.facility,
            classroom=self.classroom,
            is_facility_coach=True,
        )
        self.learner = helpers.create_learner(
            username="learner", password=DUMMY_PASSWORD, facility=self.facility
        )
        self.classroom_group_learner = helpers.create_learner(
            username="classroom_group_learner",
            password=DUMMY_PASSWORD,
            facility=self.facility,
            classroom=self.classroom,
            learner_group=self.group,
        )

        self.classroom_group_learner_2 = helpers.create_learner(
            username="classroom_group_learner_2",
            password=DUMMY_PASSWORD,
            facility=self.facility,
            classroom=self.classroom,
            learner_group=self.group,
        )

        self.quiz = Exam.objects.create(
            title="My Lesson",
            creator=self.facility_and_classroom_coach,
            collection=self.classroom,
            question_count=5,
            active=False,
        )
        self.assignment_1 = ExamAssignment.objects.create(
            exam=self.quiz,
            assigned_by=self.facility_and_classroom_coach,
            collection=self.classroom,
        )
        self.quiz_difficulties_basename = (
            "kolibri:kolibri.plugins.coach:quizdifficulties"
        )
        self.content_id = "25f32edcec565396a1840c5413c92451"

    def _get_quiz_difficulties(self, for_group=False):
        data = {"group_id": self.group.id} if for_group else {}
        return self.client.get(
            reverse(
                self.quiz_difficulties_basename + "-detail", kwargs={"pk": self.quiz.id}
            ),
            data=data,
        )

    def _login_as_coach(self):
        self.client.login(
            username=self.facility_and_classroom_coach.username, password=DUMMY_PASSWORD
        )

    def test_learner_cannot_access(self):
        self.client.login(username=self.learner.username, password=DUMMY_PASSWORD)
        response = self._get_quiz_difficulties()
        self.assertEqual(response.status_code, 403)

    def test_learner_cannot_access_by_group_id(self):
        self.client.login(username=self.learner.username, password=DUMMY_PASSWORD)
        response = self._get_quiz_difficulties(for_group=True)
        self.assertEqual(response.status_code, 403)

    def test_coach_no_progress(self):
        self._login_as_coach()
        response = self._get_quiz_difficulties()
        self.assertEqual(len(response.data), 0)

    def test_coach_no_progress_by_group_id(self):
        self._login_as_coach()
        response = self._get_quiz_difficulties(for_group=True)
        self.assertEqual(len(response.data), 0)

    def _set_one_difficult(self, user):
        self.sessionlog = ContentSessionLog.objects.create(
            user=user,
            start_timestamp=now(),
            end_timestamp=now(),
            content_id=self.quiz.id,
            channel_id=None,
            time_spent=60,  # 1 minute
            kind=content_kinds.QUIZ,
        )
        summarylog = ContentSummaryLog.objects.create(
            user=user,
            start_timestamp=now(),
            end_timestamp=now(),
            completion_timestamp=now(),
            content_id=self.quiz.id,
            channel_id=None,
            kind=content_kinds.QUIZ,
        )
        self.masterylog = MasteryLog.objects.create(
            mastery_criterion={"type": "quiz", "coach_assigned": True},
            summarylog=summarylog,
            start_timestamp=summarylog.start_timestamp,
            user=user,
            mastery_level=-1,
        )

        AttemptLog.objects.create(
            masterylog=self.masterylog,
            sessionlog=self.sessionlog,
            start_timestamp=now(),
            end_timestamp=now(),
            complete=True,
            correct=0,
            user=user,
            item="{}:test".format(self.content_id),
        )

    def test_coach_one_difficult(self):
        self._set_one_difficult(self.classroom_group_learner)
        self._login_as_coach()
        response = self._get_quiz_difficulties()
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["total"], 1)
        self.assertEqual(response.data[0]["correct"], 0)

    def test_active_and_unsubmitted_quizzes_are_not_returned(self):
        self._set_one_difficult(self.classroom_group_learner)

        # Reactivate exam, but flag learner as not having submitted it
        self.quiz.active = True
        self.quiz.save()
        self.masterylog.complete = False
        self.masterylog.save()

        self._login_as_coach()
        response = self._get_quiz_difficulties()
        self.assertEqual(len(response.data), 0)

    def test_active_and_submtted_quizzes_are_returned(self):
        self._set_one_difficult(self.classroom_group_learner)

        # Reactivate exam, and flag learner as having submitted it
        self.quiz.active = True
        self.quiz.save()
        self.masterylog.complete = True
        self.masterylog.save()

        self._login_as_coach()
        response = self._get_quiz_difficulties()
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["total"], 1)
        self.assertEqual(response.data[0]["correct"], 0)

    def test_submitted_quizzes_are_in_total(self):
        self._set_one_difficult(self.classroom_group_learner)

        self._login_as_coach()

        # Reactivate quiz and simulate 2 quiz submissions.
        self.quiz.active = True
        self.quiz.save()
        self.masterylog.complete = True
        self.masterylog.save()
        user = self.classroom_group_learner_2
        ContentSessionLog.objects.create(
            user=user,
            start_timestamp=now(),
            end_timestamp=now(),
            content_id=self.quiz.id,
            channel_id=None,
            time_spent=60,  # 1 minute
            kind=content_kinds.QUIZ,
        )
        summarylog = ContentSummaryLog.objects.create(
            user=user,
            start_timestamp=now(),
            end_timestamp=now(),
            completion_timestamp=now(),
            content_id=self.quiz.id,
            channel_id=None,
            kind=content_kinds.QUIZ,
        )
        self.masterylog = MasteryLog.objects.create(
            mastery_criterion={"type": "quiz", "coach_assigned": True},
            summarylog=summarylog,
            start_timestamp=summarylog.start_timestamp,
            user=user,
            mastery_level=-1,
            complete=True,
        )

        response = self._get_quiz_difficulties()
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["total"], 2)
        self.assertEqual(response.data[0]["correct"], 0)

    def test_coach_one_two_started_difficult(self):
        self._set_one_difficult(self.classroom_group_learner)
        self._login_as_coach()
        response = self._get_quiz_difficulties()
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["total"], 1)
        self.assertEqual(response.data[0]["correct"], 0)

    def test_coach_one_difficult_repeated_assignment(self):
        ExamAssignment.objects.create(
            exam=self.quiz,
            assigned_by=self.facility_and_classroom_coach,
            collection=self.group,
        )
        self._set_one_difficult(self.classroom_group_learner)
        self._login_as_coach()
        response = self._get_quiz_difficulties()
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["total"], 1)
        self.assertEqual(response.data[0]["correct"], 0)

    def test_coach_one_difficult_by_group_id(self):
        self._set_one_difficult(self.classroom_group_learner)
        self._login_as_coach()
        response = self._get_quiz_difficulties(for_group=True)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["total"], 1)
        self.assertEqual(response.data[0]["correct"], 0)

    def test_coach_two_difficult(self):
        self._set_one_difficult(self.classroom_group_learner)
        AttemptLog.objects.create(
            masterylog=self.masterylog,
            sessionlog=self.sessionlog,
            start_timestamp=now(),
            end_timestamp=now(),
            complete=True,
            correct=0,
            user=self.classroom_group_learner,
            item="{}:notatest".format(self.content_id),
        )
        self._login_as_coach()
        response = self._get_quiz_difficulties()
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["total"], 1)
        self.assertEqual(response.data[0]["correct"], 0)
        self.assertEqual(response.data[1]["total"], 1)
        self.assertEqual(response.data[1]["correct"], 0)

    def test_coach_one_difficult_one_not(self):
        self._set_one_difficult(self.classroom_group_learner)
        AttemptLog.objects.create(
            masterylog=self.masterylog,
            sessionlog=self.sessionlog,
            start_timestamp=now(),
            end_timestamp=now(),
            complete=True,
            correct=1,
            user=self.classroom_group_learner,
            item="{}:notatest".format(self.content_id),
        )
        self._login_as_coach()
        response = self._get_quiz_difficulties()
        self.assertEqual(len(response.data), 2)
        self.assertTrue(
            any(map(lambda x: x["total"] == 1 and x["correct"] == 0, response.data))
        )
        self.assertTrue(
            any(map(lambda x: x["total"] == 1 and x["correct"] == 1, response.data))
        )

    def test_coach_difficult_by_group_id(self):
        self._set_one_difficult(self.classroom_group_learner)
        AttemptLog.objects.create(
            masterylog=self.masterylog,
            sessionlog=self.sessionlog,
            start_timestamp=now(),
            end_timestamp=now(),
            complete=True,
            correct=1,
            user=self.classroom_group_learner,
            item="{}:notatest".format(self.content_id),
        )
        self._login_as_coach()
        response = self._get_quiz_difficulties(for_group=True)
        self.assertEqual(len(response.data), 2)
        self.assertTrue(
            any(map(lambda x: x["total"] == 1 and x["correct"] == 0, response.data))
        )
        self.assertTrue(
            any(map(lambda x: x["total"] == 1 and x["correct"] == 1, response.data))
        )

    def test_coach_difficult_both_assigned_by_group_id(self):
        self._set_one_difficult(self.classroom_group_learner)
        learner2 = FacilityUser.objects.create(
            username="learner2", facility=self.facility
        )
        self.classroom.add_member(learner2)
        self._set_one_difficult(learner2)
        self._login_as_coach()
        response = self._get_quiz_difficulties(for_group=True)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["total"], 1)
        self.assertEqual(response.data[0]["correct"], 0)
