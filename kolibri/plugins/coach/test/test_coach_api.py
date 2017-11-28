"""
To run this test, type this in command line <kolibri manage test -- kolibri.content>
"""
import datetime
import tempfile
from django.core.urlresolvers import reverse
from django.db import connections
from django.test.utils import override_settings
from django.utils import timezone
from kolibri.auth.constants import collection_kinds, role_kinds
from kolibri.content import models as content
from kolibri.content.content_db_router import set_active_content_database
from rest_framework.test import APITestCase
from kolibri.auth.models import DeviceOwner, Facility, FacilityUser, Role
from kolibri.logger.models import ContentSummaryLog

CONTENT_STORAGE_DIR_TEMP = tempfile.mkdtemp()
CONTENT_DATABASE_DIR_TEMP = tempfile.mkdtemp()


@override_settings(
    CONTENT_STORAGE_DIR=CONTENT_STORAGE_DIR_TEMP,
    CONTENT_DATABASE_DIR=CONTENT_DATABASE_DIR_TEMP,
)
class ContentReportAPITestCase(APITestCase):
    """
    Testcase for content API methods
    """
    fixtures = ['content_test.json']
    multi_db = True
    the_channel_id = '15137d33c49f489ebe08893bfa6b5414'
    connections.databases[the_channel_id] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }

    def setUp(self):
        # create DeviceOwner to pass the setup_wizard middleware check
        DeviceOwner.objects.create(username='test-device-owner', password=123)
        # set the active content database for the duration of the test
        set_active_content_database(self.the_channel_id)

    def _reverse_channel_url(self, pattern_name, extra_kwargs={}):
        """Helper method to reverse a URL using the current channel ID"""
        kwargs = {"channel_id": self.the_channel_id}
        kwargs.update(extra_kwargs)
        return reverse(pattern_name, kwargs=kwargs)

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
            response = self.client.get(self._reverse_channel_url("kolibri:coach:contentreport-list", {
                'content_node_id': node.id,
                'collection_kind': collection_kinds.FACILITY,
                'collection_id': facility.id,
            }))
            for i, prog in enumerate(progress):
                self.assertEqual(response.data[i]["progress"], prog)

        # check that progress is calculated appropriately when user is logged in
        self.client.login(username="admin", password="pass", facility=facility)
        # Topic so None
        assert_progress(root, [
            [{'log_count_total': 0, 'total_progress': 0.0, 'log_count_complete': 0}],
            [
                {'kind': 'audio', 'node_count': 1, 'total_progress': 0.5},
                {'kind': 'document', 'node_count': 1, 'total_progress': 0.0},
                {'kind': 'exercise', 'node_count': 1, 'total_progress': 0.7}
            ]
        ])
        assert_progress(c2, [
            [{'log_count_complete': 0, 'log_count_total': 1, 'total_progress': 0.7}],
            [{'log_count_complete': 0, 'log_count_total': 0, 'total_progress': 0.0}],
            [{'log_count_complete': 0, 'log_count_total': 1, 'total_progress': 0.5}]
        ])

    def test_contentreport_time_filtering(self):

        # set up data for testing time filtering on content node endpoint
        facility = Facility.objects.create(name="MyFac")
        user = FacilityUser.objects.create(username="learner", facility=facility)
        user.set_password("pass")
        user.save()

        admin = FacilityUser.objects.create(username="admin", facility=facility)
        admin.set_password("pass")
        admin.save()

        Role.objects.create(user=admin, collection=facility, kind=role_kinds.ADMIN)
        root = content.ContentNode.objects.get(title="root")
        c2c1 = content.ContentNode.objects.get(title="c2c1")
        c2c3 = content.ContentNode.objects.get(title="c2c3")

        start_date = datetime.datetime(2000, 1, 1)

        date_1 = timezone.now() - datetime.timedelta(8)

        date_2 = timezone.now() - datetime.timedelta(6)

        for date, node in ((date_1, c2c1), (date_2, c2c3)):
            ContentSummaryLog.objects.create(
                user=user,
                content_id=node.content_id,
                progress=1.0,
                kind=node.kind,
                channel_id=self.the_channel_id,
                start_timestamp=start_date,
                end_timestamp=date,
            )

        # check that only the log less than 7 days ago returns from recent report
        self.client.login(username="admin", password="pass", facility=facility)
        response = self.client.get(self._reverse_channel_url("kolibri:coach:recentreport-list", {
            'content_node_id': root.id,
            'collection_kind': collection_kinds.FACILITY,
            'collection_id': facility.id,
        }))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['pk'], c2c3.pk)

    def tearDown(self):
        """
        clean up files/folders created during the test
        """
        # set the active content database to None now that the test is over
        set_active_content_database(None)
        super(ContentReportAPITestCase, self).tearDown()
