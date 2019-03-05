from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import datetime
import json

from django.core.urlresolvers import reverse
from rest_framework.test import APITestCase

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
from kolibri.core.logger.models import ExamAttemptLog
from kolibri.core.logger.models import ExamLog
from kolibri.core.logger.models import MasteryLog


class ExerciseDifficultQuestionTestCase(APITestCase):

    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name='My Facility')
        self.classroom = Classroom.objects.create(name='My Classroom', parent=self.facility)
        self.group = LearnerGroup.objects.create(name='My Group', parent=self.classroom)

        self.coach_user = FacilityUser.objects.create(username='admin', facility=self.facility)
        self.coach_user.set_password('password')
        self.coach_user.save()

        self.learner_user = FacilityUser.objects.create(username='learner', facility=self.facility)
        self.learner_user.set_password('password')
        self.learner_user.save()

        self.facility.add_coach(self.coach_user)
        self.classroom.add_coach(self.coach_user)
        self.classroom.add_member(self.learner_user)
        self.group.add_member(self.learner_user)

        # Need ContentNodes
        self.channel_id = '15f32edcec565396a1840c5413c92450'
        self.lesson_id = '15f32edcec565396a1840c5413c92452'

        self.content_ids = [
            '15f32edcec565396a1840c5413c92451',
            '15f32edcec565396a1840c5413c92452',
            '15f32edcec565396a1840c5413c92453',
        ]
        self.contentnode_ids = [
            '25f32edcec565396a1840c5413c92451',
            '25f32edcec565396a1840c5413c92452',
            '25f32edcec565396a1840c5413c92453',
        ]
        self.node_1 = ContentNode.objects.create(
            title='Node 1',
            available=True,
            id=self.contentnode_ids[0],
            content_id=self.content_ids[0],
            channel_id=self.channel_id
        )
        self.lesson = Lesson.objects.create(
            id=self.lesson_id,
            title='My Lesson',
            created_by=self.coach_user,
            collection=self.classroom,
            resources=json.dumps([{
                'contentnode_id': self.node_1.id,
                'content_id': self.node_1.content_id,
                'channel_id': self.channel_id
            }])
        )
        self.assignment_1 = LessonAssignment.objects.create(
            lesson=self.lesson,
            assigned_by=self.coach_user,
            collection=self.classroom,
        )
        self.exercise_difficulties_basename = 'kolibri:coach:exercisedifficulties'

    def test_learner_cannot_access_by_classroom_id(self):
        learner_user = FacilityUser.objects.create(username='learner', facility=self.facility)
        learner_user.set_password('password')
        learner_user.save()
        self.client.login(username='learner', password='password')
        response = self.client.get(reverse(
            self.exercise_difficulties_basename + '-detail',
            kwargs={'pk': self.content_ids[0]}), data={'classroom_id': self.classroom.id})
        self.assertEqual(response.status_code, 403)

    def test_learner_cannot_access_by_lesson_id(self):
        learner_user = FacilityUser.objects.create(username='learner', facility=self.facility)
        learner_user.set_password('password')
        learner_user.save()
        self.client.login(username='learner', password='password')
        response = self.client.get(reverse(
            self.exercise_difficulties_basename + '-detail',
            kwargs={'pk': self.content_ids[0]}), data={'lesson_id': self.lesson.id, 'classroom_id': self.classroom.id})
        self.assertEqual(response.status_code, 403)

    def test_learner_cannot_access_by_group_id(self):
        self.client.login(username='learner', password='password')
        response = self.client.get(reverse(
            self.exercise_difficulties_basename + '-detail',
            kwargs={'pk': self.content_ids[0]}), data={'group_id': self.group.id, 'classroom_id': self.classroom.id})
        self.assertEqual(response.status_code, 403)

    def test_coach_classroom_id_required(self):
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.exercise_difficulties_basename + '-detail', kwargs={'pk': self.content_ids[0]}))
        self.assertEqual(response.status_code, 412)

    def test_coach_no_progress_by_classroom_id(self):
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.exercise_difficulties_basename + '-detail',
            kwargs={'pk': self.content_ids[0]}), data={'classroom_id': self.classroom.id})
        self.assertEqual(len(response.data), 0)

    def test_coach_no_progress_by_lesson_id(self):
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.exercise_difficulties_basename + '-detail',
            kwargs={'pk': self.content_ids[0]}), data={'lesson_id': self.lesson.id, 'classroom_id': self.classroom.id})
        self.assertEqual(len(response.data), 0)

    def test_coach_no_progress_by_group_id(self):
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.exercise_difficulties_basename + '-detail',
            kwargs={'pk': self.content_ids[0]}), data={'group_id': self.group.id, 'classroom_id': self.classroom.id})
        self.assertEqual(len(response.data), 0)

    def _set_one_difficult(self, user):
        self.sessionlog = ContentSessionLog.objects.create(
            user=user,
            content_id=self.content_ids[0],
            channel_id=self.node_1.channel_id,
            kind='exercise',
            progress=0.1,
            start_timestamp=datetime.datetime.now(),
        )

        self.summarylog = ContentSummaryLog.objects.create(
            user=user,
            content_id=self.content_ids[0],
            channel_id=self.node_1.channel_id,
            kind='exercise',
            progress=0.1,
            start_timestamp=datetime.datetime.now(),
        )

        self.masterylog = MasteryLog.objects.create(
            user=user,
            summarylog=self.summarylog,
            start_timestamp=datetime.datetime.now(),
            mastery_level=1,
        )

        AttemptLog.objects.create(
            masterylog=self.masterylog,
            sessionlog=self.sessionlog,
            start_timestamp=datetime.datetime.now(),
            end_timestamp=datetime.datetime.now(),
            complete=True,
            correct=0,
            user=user,
            item='test',
        )

    def test_coach_one_difficult_by_classroom_id(self):
        self._set_one_difficult(self.learner_user)
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.exercise_difficulties_basename + '-detail',
            kwargs={'pk': self.content_ids[0]}), data={'classroom_id': self.classroom.id})
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['total'], 1)
        self.assertEqual(response.data[0]['correct'], 0)

    def test_coach_one_difficult_by_lesson_id(self):
        self._set_one_difficult(self.learner_user)
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.exercise_difficulties_basename + '-detail',
            kwargs={'pk': self.content_ids[0]}), data={'lesson_id': self.lesson.id, 'classroom_id': self.classroom.id})
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['total'], 1)
        self.assertEqual(response.data[0]['correct'], 0)

    def test_coach_one_difficult_by_lesson_id_repeated_assignment(self):
        LessonAssignment.objects.create(
            lesson=self.lesson,
            assigned_by=self.coach_user,
            collection=self.group,
        )
        self._set_one_difficult(self.learner_user)
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.exercise_difficulties_basename + '-detail',
            kwargs={'pk': self.content_ids[0]}), data={'lesson_id': self.lesson.id, 'classroom_id': self.classroom.id})
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['total'], 1)
        self.assertEqual(response.data[0]['correct'], 0)

    def test_coach_one_difficult_by_group_id(self):
        self._set_one_difficult(self.learner_user)
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.exercise_difficulties_basename + '-detail',
            kwargs={'pk': self.content_ids[0]}), data={'group_id': self.group.id, 'classroom_id': self.classroom.id})
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['total'], 1)
        self.assertEqual(response.data[0]['correct'], 0)

    def test_coach_two_difficult_by_lesson_id(self):
        self._set_one_difficult(self.learner_user)
        AttemptLog.objects.create(
            masterylog=self.masterylog,
            sessionlog=self.sessionlog,
            start_timestamp=datetime.datetime.now(),
            end_timestamp=datetime.datetime.now(),
            complete=True,
            correct=0,
            user=self.learner_user,
            item='nottest',
        )
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.exercise_difficulties_basename + '-detail',
            kwargs={'pk': self.content_ids[0]}), data={'lesson_id': self.lesson.id, 'classroom_id': self.classroom.id})
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]['total'], 1)
        self.assertEqual(response.data[0]['correct'], 0)
        self.assertEqual(response.data[1]['total'], 1)
        self.assertEqual(response.data[1]['correct'], 0)

    def test_coach_one_difficult_one_not_by_lesson_id(self):
        self._set_one_difficult(self.learner_user)
        AttemptLog.objects.create(
            masterylog=self.masterylog,
            sessionlog=self.sessionlog,
            start_timestamp=datetime.datetime.now(),
            end_timestamp=datetime.datetime.now(),
            complete=True,
            correct=1,
            user=self.learner_user,
            item='nottest',
        )
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.exercise_difficulties_basename + '-detail',
            kwargs={'pk': self.content_ids[0]}), data={'lesson_id': self.lesson.id, 'classroom_id': self.classroom.id})
        self.assertEqual(len(response.data), 2)
        self.assertTrue(any(map(lambda x: x['total'] == 1 and x['correct'] == 0, response.data)))
        self.assertTrue(any(map(lambda x: x['total'] == 1 and x['correct'] == 1, response.data)))

    def test_coach_difficult_no_assigned_by_lesson_id(self):
        self._set_one_difficult(self.learner_user)
        AttemptLog.objects.create(
            masterylog=self.masterylog,
            sessionlog=self.sessionlog,
            start_timestamp=datetime.datetime.now(),
            end_timestamp=datetime.datetime.now(),
            complete=True,
            correct=1,
            user=self.learner_user,
            item='nottest',
        )
        LessonAssignment.objects.all().delete()
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.exercise_difficulties_basename + '-detail',
            kwargs={'pk': self.content_ids[0]}), data={'lesson_id': self.lesson.id, 'classroom_id': self.classroom.id})
        self.assertEqual(len(response.data), 0)

    def test_coach_difficult_no_assigned_by_group_id(self):
        self._set_one_difficult(self.learner_user)
        AttemptLog.objects.create(
            masterylog=self.masterylog,
            sessionlog=self.sessionlog,
            start_timestamp=datetime.datetime.now(),
            end_timestamp=datetime.datetime.now(),
            complete=True,
            correct=1,
            user=self.learner_user,
            item='nottest',
        )
        LessonAssignment.objects.all().delete()
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.exercise_difficulties_basename + '-detail',
            kwargs={'pk': self.content_ids[0]}), data={'group_id': self.group.id, 'classroom_id': self.classroom.id})
        self.assertEqual(len(response.data), 2)
        self.assertTrue(any(map(lambda x: x['total'] == 1 and x['correct'] == 0, response.data)))
        self.assertTrue(any(map(lambda x: x['total'] == 1 and x['correct'] == 1, response.data)))

    def test_coach_difficult_both_assigned_by_lesson_id_group_id(self):
        self._set_one_difficult(self.learner_user)
        learner2 = FacilityUser.objects.create(username='learner2', facility=self.facility)
        self.classroom.add_member(learner2)
        self._set_one_difficult(learner2)
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.exercise_difficulties_basename + '-detail',
            kwargs={'pk': self.content_ids[0]}),
            data={'lesson_id': self.lesson.id, 'group_id': self.group.id, 'classroom_id': self.classroom.id})
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['total'], 1)
        self.assertEqual(response.data[0]['correct'], 0)

    def test_coach_difficult_group_id_not_in_lesson(self):
        self._set_one_difficult(self.learner_user)
        learner2 = FacilityUser.objects.create(username='learner2', facility=self.facility)
        self.classroom.add_member(learner2)
        self._set_one_difficult(learner2)
        self.group.remove_member(self.learner_user)
        self.assignment_1.delete()
        LessonAssignment.objects.create(
            lesson=self.lesson,
            assigned_by=self.coach_user,
            collection=self.group,
        )
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.exercise_difficulties_basename + '-detail',
            kwargs={'pk': self.content_ids[0]}),
            data={'lesson_id': self.lesson.id, 'group_id': self.group.id, 'classroom_id': self.classroom.id})
        self.assertEqual(len(response.data), 0)


class QuizDifficultQuestionTestCase(APITestCase):

    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name='My Facility')
        self.classroom = Classroom.objects.create(name='My Classroom', parent=self.facility)
        self.group = LearnerGroup.objects.create(name='My Group', parent=self.classroom)

        self.coach_user = FacilityUser.objects.create(username='admin', facility=self.facility)
        self.coach_user.set_password('password')
        self.coach_user.save()

        self.learner_user = FacilityUser.objects.create(username='learner', facility=self.facility)
        self.learner_user.set_password('password')
        self.learner_user.save()

        self.facility.add_coach(self.coach_user)
        self.classroom.add_coach(self.coach_user)
        self.classroom.add_member(self.learner_user)
        self.group.add_member(self.learner_user)

        self.quiz = Exam.objects.create(
            title='My Lesson',
            creator=self.coach_user,
            collection=self.classroom,
            question_count=5,
        )
        self.assignment_1 = ExamAssignment.objects.create(
            exam=self.quiz,
            assigned_by=self.coach_user,
            collection=self.classroom,
        )
        self.quiz_difficulties_basename = 'kolibri:coach:quizdifficulties'
        self.content_id = '25f32edcec565396a1840c5413c92451'

    def test_learner_cannot_access(self):
        learner_user = FacilityUser.objects.create(username='learner', facility=self.facility)
        learner_user.set_password('password')
        learner_user.save()
        self.client.login(username='learner', password='password')
        response = self.client.get(reverse(
            self.quiz_difficulties_basename + '-detail', kwargs={'pk': self.quiz.id}))
        self.assertEqual(response.status_code, 403)

    def test_learner_cannot_access_by_group_id(self):
        self.client.login(username='learner', password='password')
        response = self.client.get(reverse(
            self.quiz_difficulties_basename + '-detail',
            kwargs={'pk': self.quiz.id}), data={'group_id': self.group.id})
        self.assertEqual(response.status_code, 403)

    def test_coach_no_progress(self):
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.quiz_difficulties_basename + '-detail', kwargs={'pk': self.quiz.id}))
        self.assertEqual(len(response.data), 0)

    def test_coach_no_progress_by_group_id(self):
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.quiz_difficulties_basename + '-detail',
            kwargs={'pk': self.quiz.id}), data={'group_id': self.group.id})
        self.assertEqual(len(response.data), 0)

    def _set_one_difficult(self, user):
        self.examlog = ExamLog.objects.create(
            user=user,
            exam=self.quiz,
        )

        ExamAttemptLog.objects.create(
            examlog=self.examlog,
            start_timestamp=datetime.datetime.now(),
            end_timestamp=datetime.datetime.now(),
            complete=True,
            correct=0,
            user=user,
            item='test',
            content_id=self.content_id,
        )

    def test_coach_one_difficult(self):
        self._set_one_difficult(self.learner_user)
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.quiz_difficulties_basename + '-detail', kwargs={'pk': self.quiz.id}))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['total'], 1)
        self.assertEqual(response.data[0]['correct'], 0)

    def test_coach_one_two_started_difficult(self):
        self._set_one_difficult(self.learner_user)
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.quiz_difficulties_basename + '-detail', kwargs={'pk': self.quiz.id}))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['total'], 1)
        self.assertEqual(response.data[0]['correct'], 0)

    def test_coach_one_difficult_repeated_assignment(self):
        ExamAssignment.objects.create(
            exam=self.quiz,
            assigned_by=self.coach_user,
            collection=self.group,
        )
        self._set_one_difficult(self.learner_user)
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.quiz_difficulties_basename + '-detail', kwargs={'pk': self.quiz.id}))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['total'], 1)
        self.assertEqual(response.data[0]['correct'], 0)

    def test_coach_one_difficult_by_group_id(self):
        self._set_one_difficult(self.learner_user)
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.quiz_difficulties_basename + '-detail',
            kwargs={'pk': self.quiz.id}), data={'group_id': self.group.id})
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['total'], 1)
        self.assertEqual(response.data[0]['correct'], 0)

    def test_coach_two_difficult(self):
        self._set_one_difficult(self.learner_user)
        ExamAttemptLog.objects.create(
            examlog=self.examlog,
            start_timestamp=datetime.datetime.now(),
            end_timestamp=datetime.datetime.now(),
            complete=True,
            correct=0,
            user=self.learner_user,
            item='notatest',
            content_id=self.content_id,
        )
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.quiz_difficulties_basename + '-detail', kwargs={'pk': self.quiz.id}))
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]['total'], 1)
        self.assertEqual(response.data[0]['correct'], 0)
        self.assertEqual(response.data[1]['total'], 1)
        self.assertEqual(response.data[1]['correct'], 0)

    def test_coach_one_difficult_one_not(self):
        self._set_one_difficult(self.learner_user)
        ExamAttemptLog.objects.create(
            examlog=self.examlog,
            start_timestamp=datetime.datetime.now(),
            end_timestamp=datetime.datetime.now(),
            complete=True,
            correct=1,
            user=self.learner_user,
            item='notatest',
            content_id=self.content_id,
        )
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.quiz_difficulties_basename + '-detail', kwargs={'pk': self.quiz.id}))
        self.assertEqual(len(response.data), 2)
        self.assertTrue(any(map(lambda x: x['total'] == 1 and x['correct'] == 0, response.data)))
        self.assertTrue(any(map(lambda x: x['total'] == 1 and x['correct'] == 1, response.data)))

    def test_coach_difficult_by_group_id(self):
        self._set_one_difficult(self.learner_user)
        ExamAttemptLog.objects.create(
            examlog=self.examlog,
            start_timestamp=datetime.datetime.now(),
            end_timestamp=datetime.datetime.now(),
            complete=True,
            correct=1,
            user=self.learner_user,
            item='notatest',
            content_id=self.content_id,
        )
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.quiz_difficulties_basename + '-detail',
            kwargs={'pk': self.quiz.id}), data={'group_id': self.group.id})
        self.assertEqual(len(response.data), 2)
        self.assertTrue(any(map(lambda x: x['total'] == 1 and x['correct'] == 0, response.data)))
        self.assertTrue(any(map(lambda x: x['total'] == 1 and x['correct'] == 1, response.data)))

    def test_coach_difficult_both_assigned_by_group_id(self):
        self._set_one_difficult(self.learner_user)
        learner2 = FacilityUser.objects.create(username='learner2', facility=self.facility)
        self.classroom.add_member(learner2)
        self._set_one_difficult(learner2)
        self.client.login(username=self.coach_user.username, password='password')
        response = self.client.get(reverse(
            self.quiz_difficulties_basename + '-detail',
            kwargs={'pk': self.quiz.id}), data={'group_id': self.group.id})
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['total'], 1)
        self.assertEqual(response.data[0]['correct'], 0)
