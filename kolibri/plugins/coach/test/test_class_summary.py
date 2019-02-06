from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import uuid

from django.core.urlresolvers import reverse
from le_utils.constants import content_kinds
from rest_framework.test import APITestCase

from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content.models import ContentNode
from kolibri.core.lessons import models

DUMMY_PASSWORD = "password"


class ClassSummaryTestCase(APITestCase):

    fixtures = ['content_test.json']
    the_channel_id = '6199dde695db4ee4ab392222d5af1e5c'

    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name="MyFac")
        self.classroom = Classroom.objects.create(name='classrom', parent=self.facility)
        self.admin = FacilityUser.objects.create(username="admin", facility=self.facility)
        self.admin.set_password(DUMMY_PASSWORD)
        self.admin.save()
        self.facility.add_admin(self.admin)
        self.lesson = models.Lesson.objects.create(
            title="title",
            is_active=True,
            collection=self.classroom,
            created_by=self.admin
        )

    def test_non_existent_nodes_dont_show_up_in_lessons(self):
        node = ContentNode.objects.exclude(kind=content_kinds.TOPIC).first()
        last_node = ContentNode.objects.exclude(kind=content_kinds.TOPIC).last()
        real_data = {'contentnode_id': node.id, 'content_id': node.content_id, 'channel_id': node.channel_id}
        switched_data = {'contentnode_id': uuid.uuid4().hex, 'content_id': last_node.content_id, 'channel_id': node.channel_id}
        fake_data = {'contentnode_id': uuid.uuid4().hex, 'content_id': uuid.uuid4().hex, 'channel_id': node.channel_id}
        self.lesson.resources = [real_data, switched_data, fake_data]
        self.lesson.save()

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.get(reverse("kolibri:coach:classsummary-detail", kwargs={'pk': self.classroom.id}))
        node_ids = response.data['lessons'][0]['node_ids']
        self.assertIn(real_data['contentnode_id'], node_ids)
        # swapped data
        self.assertIn(last_node.id, node_ids)
        self.assertNotIn(fake_data['contentnode_id'], node_ids)
