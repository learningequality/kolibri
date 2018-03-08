from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals
import datetime
import json
from django.core.urlresolvers import reverse
from rest_framework.test import APITestCase
from kolibri.auth.models import Classroom
from kolibri.auth.models import Facility
from kolibri.auth.models import FacilityUser
from kolibri.auth.test.helpers import provision_device
from kolibri.logger.models import ContentSummaryLog
from kolibri.content.models import ContentNode
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment

class LessonReportTestCase(APITestCase):

    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name='My Facility')
        self.classroom = Classroom.objects.create(name='My Classroom', parent=self.facility)

        self.coach_user = FacilityUser.objects.create(username='admin', facility=self.facility)
        self.coach_user.set_password('password')
        self.coach_user.save()

        self.learner_user = FacilityUser.objects.create(username='learner', facility=self.facility)
        self.learner_user.set_password('password')
        self.learner_user.save()

        self.facility.add_coach(self.coach_user)
        self.classroom.add_coach(self.coach_user)
        self.classroom.add_member(self.learner_user)

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
        self.lessonreport_basename = 'kolibri:coach:lessonreport'
        # Need ContentSummaryLog

    def test_learner_cannot_access(self):
        learner_user = FacilityUser.objects.create(username='learner', facility=self.facility)
        learner_user.set_password('password')
        learner_user.save()
        self.client.login(username='learner', password='password')
        get_response = self.client.get(reverse(self.lessonreport_basename+'-detail', kwargs={'pk': self.lesson.id}))
        self.assertEqual(get_response.status_code, 403)

    def test_no_progress_logged(self):
        self.client.login(username='admin', password='password')
        get_response = self.client.get(reverse(self.lessonreport_basename+'-detail', kwargs={'pk': self.lesson.id}))
        progress = get_response.data['progress']
        self.assertEqual(len(progress), 1)
        self.assertEqual(progress[0], {
            'num_learners_completed': 0,
            'contentnode_id': self.node_1.id,
        })

    def test_some_partial_progress_logged(self):
        ContentSummaryLog.objects.create(
            user=self.learner_user,
            content_id=self.node_1.content_id,
            channel_id=self.node_1.channel_id,
            kind='video',
            progress=0.5,
            start_timestamp=datetime.datetime.now(),
        )
        self.client.login(username='admin', password='password')
        get_response = self.client.get(reverse(self.lessonreport_basename+'-detail', kwargs={'pk': self.lesson.id}))
        progress = get_response.data['progress']
        self.assertEqual(progress[0], {
            'num_learners_completed': 0,
            'contentnode_id': self.node_1.id,
        })

    def test_some_complete_progress_logged(self):
        ContentSummaryLog.objects.create(
            user=self.learner_user,
            content_id=self.node_1.content_id,
            channel_id=self.node_1.channel_id,
            kind='video',
            progress=1.0,
            start_timestamp=datetime.datetime.now(),
        )
        self.client.login(username='admin', password='password')
        get_response = self.client.get(reverse(self.lessonreport_basename+'-detail', kwargs={'pk': self.lesson.id}))
        progress = get_response.data['progress']
        self.assertEqual(progress[0], {
            'num_learners_completed': 1,
            'contentnode_id': self.node_1.id,
        })

    def test_total_learners_value(self):
        self.client.login(username='admin', password='password')
        get_response = self.client.get(reverse(self.lessonreport_basename+'-detail', kwargs={'pk': self.lesson.id}))
        self.assertEqual(get_response.data['total_learners'], 1)
