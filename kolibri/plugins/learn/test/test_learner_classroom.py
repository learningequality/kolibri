from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals
from django.core.urlresolvers import reverse
from kolibri.auth.models import Classroom
from kolibri.auth.models import Facility
from kolibri.auth.models import FacilityUser
from kolibri.auth.models import LearnerGroup
from kolibri.auth.test.helpers import provision_device
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from rest_framework.test import APITestCase


class LearnerClassroomTestCase(APITestCase):

    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name='My Facility')
        self.coach_user = FacilityUser.objects.create(username='admin', facility=self.facility)
        self.coach_user.set_password('password')
        self.coach_user.save()
        self.learner_user = FacilityUser.objects.create(username='learner', facility=self.facility)
        self.learner_user.set_password('password')
        self.learner_user.save()
        self.basename = 'kolibri:learnplugin:learnerclassroom'
        self.own_classroom = Classroom.objects.create(name="Own Classroom", parent=self.facility)
        self.own_classroom.add_member(self.learner_user)

    def test_must_be_authenticated(self):
        get_response = self.client.get(reverse(self.basename + '-list'))
        self.assertEqual(get_response.status_code, 403)

    def test_learner_only_sees_own_classrooms(self):
        self.client.login(username='learner', password='password')
        Classroom.objects.create(name="Other Classroom", parent=self.facility)
        get_response = self.client.get(reverse(self.basename + '-list'))
        self.assertEqual(len(get_response.data), 1)
        self.assertEqual(get_response.data[0]['id'], self.own_classroom.id)

    def test_no_assignments_param(self):
        self.client.login(username='learner', password='password')
        get_response = self.client.get(
            reverse(self.basename + '-detail', kwargs={'pk': self.own_classroom.id}),
            {'no_assignments': True}
        )
        self.assertNotIn('assignments', get_response.data)

    def test_correct_number_of_exams(self):
        # One active and inactive exam
        exam_1 = Exam.objects.create(
            title='Exam',
            channel_id='abc',
            collection=self.own_classroom,
            question_count=10,
            creator=self.coach_user,
            active=True,
        )
        exam_2 = Exam.objects.create(
            title='Inactive Exam',
            channel_id='abc',
            collection=self.own_classroom,
            question_count=10,
            creator=self.coach_user,
            active=False,
        )
        lgroup = LearnerGroup.objects.create(
            name='Learner Group',
            parent=self.own_classroom,
        )
        lgroup.add_learner(self.learner_user)
        ExamAssignment.objects.create(
            exam=exam_1,
            collection=lgroup,
            assigned_by=self.coach_user,
        )
        ExamAssignment.objects.create(
            exam=exam_2,
            collection=lgroup,
            assigned_by=self.coach_user,
        )
        self.client.login(username='learner', password='password')
        get_response = self.client.get(reverse(self.basename + '-detail', kwargs={'pk': self.own_classroom.id}))
        self.assertEqual(len(get_response.data['assignments']['exams']), 1)

    def test_correct_number_of_lessons(self):
        # One active and inactive lesson
        lesson_1 = Lesson.objects.create(
            title='Lesson',
            collection=self.own_classroom,
            created_by=self.coach_user,
            is_active=True,
        )
        lesson_2 = Lesson.objects.create(
            title='Inactive Lesson',
            collection=self.own_classroom,
            created_by=self.coach_user,
            is_active=False,
        )
        lgroup = LearnerGroup.objects.create(
            name='Learner Group',
            parent=self.own_classroom,
        )
        lgroup.add_learner(self.learner_user)
        LessonAssignment.objects.create(
            lesson=lesson_1,
            collection=lgroup,
            assigned_by=self.coach_user,
        )
        LessonAssignment.objects.create(
            lesson=lesson_2,
            collection=lgroup,
            assigned_by=self.coach_user,
        )
        self.client.login(username='learner', password='password')
        get_response = self.client.get(reverse(self.basename + '-detail', kwargs={'pk': self.own_classroom.id}))
        self.assertEqual(len(get_response.data['assignments']['lessons']), 1)
