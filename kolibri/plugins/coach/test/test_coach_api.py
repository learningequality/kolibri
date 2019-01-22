"""
To run this test, type this in command line <kolibri manage test -- kolibri.core.content>
"""
import datetime

from django.core.urlresolvers import reverse
from rest_framework.test import APITestCase

from kolibri.core.auth.constants import collection_kinds
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Role
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content import models as content
from kolibri.core.logger.models import ContentSummaryLog


class ContentReportAPITestCase(APITestCase):
    """
    Testcase for content API methods
    """
    fixtures = ['content_test.json']
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    def setUp(self):
        provision_device()

    def test_contentreport_progress(self):

        # set up data for testing progress_fraction field on content node endpoint
        facility = Facility.objects.create(name="MyFac")
        user = FacilityUser.objects.create(username="learner", facility=facility)
        user.set_password("pass")
        user.save()

        admin = FacilityUser.objects.create(username="admin", facility=facility)
        admin.set_password("pass")
        admin.save()

        Role.objects.create(user=admin, collection=facility, kind=role_kinds.ADMIN)
        root = content.ContentNode.objects.get(title="root")
        c2 = content.ContentNode.objects.get(title="c2")
        c2c1 = content.ContentNode.objects.get(title="c2c1")
        c2c3 = content.ContentNode.objects.get(title="c2c3")
        for node, progress in [(c2c1, 0.7), (c2c3, 0.5)]:
            ContentSummaryLog.objects.create(
                user=user,
                content_id=node.content_id,
                progress=progress,
                kind=node.kind,
                channel_id=self.the_channel_id,
                start_timestamp=datetime.datetime.now()
            )

        def assert_progress(node, progress):
            response = self.client.get(reverse("kolibri:coach:contentreport-list"), {
                'content_node_id': node.id,
                'collection_kind': collection_kinds.FACILITY,
                'collection_id': facility.id,
                'channel_id': self.the_channel_id,
            })
            for i, prog in enumerate(progress):
                self.assertEqual(response.data[i]["progress"], prog)

        # check that progress is calculated appropriately when user is logged in
        self.client.login(username="admin", password="pass", facility=facility)
        # Topic so None
        assert_progress(root, [
            [{'log_count_total': 0, 'total_progress': 0.0, 'log_count_complete': 0}],
            [{'log_count_total': 0, 'total_progress': 0.0, 'log_count_complete': 0}],
            [
                {'kind': 'audio', 'node_count': 1, 'total_progress': 0.5},
                {'kind': 'document', 'node_count': 1, 'total_progress': 0.0},
                {'kind': 'exercise', 'node_count': 1, 'total_progress': 0.7},
            ]
        ])
        assert_progress(c2, [
            [{'log_count_complete': 0, 'log_count_total': 1, 'total_progress': 0.7}],
            [{'log_count_complete': 0, 'log_count_total': 0, 'total_progress': 0.0}],
            [{'log_count_complete': 0, 'log_count_total': 1, 'total_progress': 0.5}]
        ])
