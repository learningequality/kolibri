"""
To run this test, type this in command line <kolibri manage test -- kolibri.content>
"""
import datetime
import os
import shutil
import tempfile
from django.test import TestCase
from django.core.urlresolvers import reverse
from django.test.utils import override_settings
from kolibri.content import models as content
from django.conf import settings
from le_utils.constants import content_kinds
from rest_framework.test import APITestCase
from kolibri.auth.models import Facility, FacilityUser
from kolibri.auth.test.helpers import provision_device
from kolibri.logger.models import ContentSummaryLog

CONTENT_STORAGE_DIR_TEMP = tempfile.mkdtemp()
CONTENT_DATABASE_DIR_TEMP = tempfile.mkdtemp()

@override_settings(
    CONTENT_STORAGE_DIR=CONTENT_STORAGE_DIR_TEMP,
    CONTENT_DATABASE_DIR=CONTENT_DATABASE_DIR_TEMP,
)
class ContentNodeTestCase(TestCase):
    """
    Testcase for content metadata methods
    """
    fixtures = ['content_test.json']
    the_channel_id = '6199dde695db4ee4ab392222d5af1e5c'

    def setUp(self):

        provision_device()

        # Create a temporary directory
        self.test_dir = tempfile.mkdtemp()
        # Create files in the temporary directory
        self.temp_f_1 = open(os.path.join(self.test_dir, 'test_1.pdf'), 'wb')
        self.temp_f_2 = open(os.path.join(self.test_dir, 'test_2.mp4'), 'wb')
        # Write something to it
        self.temp_f_1.write(('The owls are not what they seem').encode('utf-8'))
        self.temp_f_2.write(('The owl are not what they seem').encode('utf-8'))

        # Reopen the file and check if what we read back is the same
        self.temp_f_1 = open(os.path.join(self.test_dir, 'test_1.pdf'))
        self.temp_f_2 = open(os.path.join(self.test_dir, 'test_2.mp4'))
        self.assertEqual(self.temp_f_1.read(), 'The owls are not what they seem')
        self.assertEqual(self.temp_f_2.read(), 'The owl are not what they seem')

    """Tests for content API methods"""

    def test_get_prerequisites_for(self):
        """
        test the directional characteristic of prerequisite relationship
        """

        c1 = content.ContentNode.objects.get(title="c1")
        root = content.ContentNode.objects.get(title="root")
        # if root is the prerequisite of c1
        expected_output = content.ContentNode.objects.filter(title__in=["root"])
        actual_output = content.ContentNode.objects.filter(prerequisite_for=c1)
        self.assertEqual(set(expected_output), set(actual_output))
        # then c1 should not be the prerequisite of root
        unexpected_output = content.ContentNode.objects.filter(title__in=["c1"])
        actual_output = content.ContentNode.objects.filter(prerequisite_for=root)
        self.assertNotEqual(set(actual_output), set(unexpected_output))

    def test_get_has_prerequisites(self):
        """
        test the directional characteristic of prerequisite relationship
        """

        c1 = content.ContentNode.objects.get(title="c1")
        root = content.ContentNode.objects.get(title="root")
        # if root is the prerequisite of c1
        expected_output = content.ContentNode.objects.filter(title__in=["c1"])
        actual_output = content.ContentNode.objects.filter(has_prerequisite=root)
        self.assertEqual(set(expected_output), set(actual_output))
        # then c1 should not be the prerequisite of root
        unexpected_output = content.ContentNode.objects.filter(title__in=["root"])
        actual_output = content.ContentNode.objects.filter(has_prerequisite=c1)
        self.assertNotEqual(set(actual_output), set(unexpected_output))

    def test_get_all_related(self):
        """
        test the nondirectional characteristic of related relationship
        """

        c1 = content.ContentNode.objects.get(title="c1")
        c2 = content.ContentNode.objects.get(title="c2")
        # if c1 is related to c2
        expected_output = content.ContentNode.objects.filter(title__in=["c2"])
        actual_output = content.ContentNode.objects.filter(related=c1)
        self.assertEqual(set(expected_output), set(actual_output))
        # then c2 should be related to c1
        expected_output = content.ContentNode.objects.filter(title__in=["c1"])
        actual_output = content.ContentNode.objects.filter(related=c2)
        self.assertEqual(set(expected_output), set(actual_output))

    def test_descendants_of_kind(self):

        p = content.ContentNode.objects.get(title="root")
        expected_output = content.ContentNode.objects.filter(title__in=["c2"])
        actual_output = p.get_descendants(include_self=False).filter(kind=content_kinds.TOPIC)
        self.assertEqual(set(expected_output), set(actual_output))

    def test_get_top_level_topics(self):

        p = content.ContentNode.objects.get(title="root")
        expected_output = content.ContentNode.objects.filter(parent=p, kind=content_kinds.TOPIC)
        actual_output = content.ContentNode.objects.get(parent__isnull=True).get_children().filter(kind=content_kinds.TOPIC)
        self.assertEqual(set(expected_output), set(actual_output))

    def test_all_str(self):

        # test for ContentTag __str__
        p = content.ContentTag.objects.get(tag_name="tag_2")
        self.assertEqual(str(p), 'tag_2')
        # test for Language __str__
        p = content.Language.objects.get(lang_code="en")
        self.assertEqual(str(p), 'English-Test')
        # test for ChannelMetadata __str__
        p = content.ChannelMetadata.objects.get(name="testing")
        self.assertEqual(str(p), 'testing')

    def tearDown(self):
        """
        clean up files/folders created during the test
        """
        try:
            shutil.rmtree(settings.CONTENT_COPY_DIR)
            shutil.rmtree(self.test_dir)
        except:
            pass
        super(ContentNodeTestCase, self).tearDown()


@override_settings(
    CONTENT_STORAGE_DIR=CONTENT_STORAGE_DIR_TEMP,
    CONTENT_DATABASE_DIR=CONTENT_DATABASE_DIR_TEMP,
)
class ContentNodeAPITestCase(APITestCase):
    """
    Testcase for content API methods
    """
    fixtures = ['content_test.json']
    the_channel_id = '6199dde695db4ee4ab392222d5af1e5c'

    def setUp(self):
        provision_device()

    def _reverse_channel_url(self, pattern_name, kwargs={}):
        """Helper method to reverse a URL using the current channel ID"""
        return reverse(pattern_name, kwargs=kwargs)

    def test_prerequisite_for_filter(self):
        c1_id = content.ContentNode.objects.get(title="c1").id
        response = self.client.get(self._reverse_channel_url("contentnode-list"), data={"prerequisite_for": c1_id})
        self.assertEqual(response.data[0]['title'], 'root')

    def test_has_prerequisite_filter(self):
        root_id = content.ContentNode.objects.get(title="root").id
        response = self.client.get(self._reverse_channel_url("contentnode-list"), data={"has_prerequisite": root_id})
        self.assertEqual(response.data[0]['title'], 'c1')

    def test_related_filter(self):
        c1_id = content.ContentNode.objects.get(title="c1").id
        response = self.client.get(self._reverse_channel_url("contentnode-list"), data={"related": c1_id})
        self.assertEqual(response.data[0]['title'], 'c2')

    def test_contentnode_list(self):
        response = self.client.get(self._reverse_channel_url("contentnode-list"))
        self.assertEqual(len(response.data), 6)

    def test_contentnode_retrieve(self):
        c1_id = content.ContentNode.objects.get(title="c1").id
        response = self.client.get(self._reverse_channel_url("contentnode-detail", {'pk': c1_id}))
        self.assertEqual(response.data['pk'], c1_id.__str__())

    def test_contentnode_field_filtering(self):
        c1_id = content.ContentNode.objects.get(title="c1").id
        response = self.client.get(self._reverse_channel_url("contentnode-detail", {'pk': c1_id}), data={"fields": "title,description"})
        self.assertEqual(response.data['title'], "c1")
        self.assertEqual(response.data['description'], "balbla2")
        self.assertTrue("pk" not in response.data)

    def test_contentnode_recommendations(self):
        id = content.ContentNode.objects.get(title="c2c2").id
        response = self.client.get(self._reverse_channel_url("contentnode-list"), data={"recommendations_for": id})
        self.assertEqual(len(response.data), 2)

    def test_channelmetadata_list(self):
        response = self.client.get(reverse("channel-list", kwargs={}))
        self.assertEqual(response.data[0]['name'], 'testing')

    def test_channelmetadata_retrieve(self):
        data = content.ChannelMetadata.objects.values()[0]
        response = self.client.get(reverse("channel-detail", kwargs={'pk': data["id"]}))
        self.assertEqual(response.data['name'], 'testing')

    def test_file_list(self):
        response = self.client.get(self._reverse_channel_url("file-list"))
        self.assertEqual(len(response.data), 5)

    def test_file_retrieve(self):
        response = self.client.get(self._reverse_channel_url("file-detail", {'pk': "9f9438fe6b0d42dd8e913d7d04cfb2b1"}))
        self.assertEqual(response.data['preset'], 'High Resolution')

    def _setup_contentnode_progress(self):
        # set up data for testing progress_fraction field on content node endpoint
        facility = Facility.objects.create(name="MyFac")
        user = FacilityUser.objects.create(username="learner", facility=facility)
        user.set_password("pass")
        user.save()
        root = content.ContentNode.objects.get(title="root")
        c1 = content.ContentNode.objects.get(title="c1")
        c2 = content.ContentNode.objects.get(title="c2")
        c2c1 = content.ContentNode.objects.get(title="c2c1")
        c2c3 = content.ContentNode.objects.get(title="c2c3")
        for node, progress in [(c2c1, 0.7), (c2c3, 0.5)]:
            ContentSummaryLog.objects.create(
                user=user,
                content_id=node.content_id,
                progress=progress,
                channel_id=self.the_channel_id,
                start_timestamp=datetime.datetime.now()
            )

        return facility, root, c1, c2, c2c1, c2c3

    def test_contentnode_progress(self):

        facility, root, c1, c2, c2c1, c2c3 = self._setup_contentnode_progress()

        def assert_progress(node, progress):
            response = self.client.get(self._reverse_channel_url("contentnode-detail", {'pk': node.id}))
            self.assertEqual(response.data["progress_fraction"], progress)

        # check that there is no progress when not logged in
        assert_progress(root, 0)
        assert_progress(c1, 0)
        assert_progress(c2, 0)
        assert_progress(c2c1, 0)

        # check that progress is calculated appropriately when user is logged in
        self.client.login(username="learner", password="pass", facility=facility)
        # Topic so None
        assert_progress(root, None)
        assert_progress(c1, None)
        # Topic so None
        assert_progress(c2, None)
        assert_progress(c2c1, 0.7)

    def test_contentnode_progress_detail_endpoint(self):

        facility, root, c1, c2, c2c1, c2c3 = self._setup_contentnode_progress()

        def assert_progress(node, progress):
            response = self.client.get(self._reverse_channel_url("contentnodeprogress-detail", {'pk': node.id}))
            self.assertEqual(response.data["progress_fraction"], progress)

        # check that there is no progress when not logged in
        assert_progress(root, 0)
        assert_progress(c1, 0)
        assert_progress(c2, 0)
        assert_progress(c2c1, 0)

        # check that progress is calculated appropriately when user is logged in
        self.client.login(username="learner", password="pass", facility=facility)

        # The progress endpoint is used, so should report progress for topics
        assert_progress(root, 0.3)
        assert_progress(c1, 0)
        assert_progress(c2, 0.4)
        assert_progress(c2c1, 0.7)

    def test_contentnode_progress_list_endpoint(self):

        facility, root, c1, c2, c2c1, c2c3 = self._setup_contentnode_progress()

        response = self.client.get(self._reverse_channel_url("contentnodeprogress-list"))

        def get_progress_fraction(node):
            return list(filter(lambda x: x['pk'] == node.pk, response.data))[0]['progress_fraction']

        # check that there is no progress when not logged in
        self.assertEqual(get_progress_fraction(root), 0)
        self.assertEqual(get_progress_fraction(c1), 0)
        self.assertEqual(get_progress_fraction(c2), 0)
        self.assertEqual(get_progress_fraction(c2c1), 0)

        # check that progress is calculated appropriately when user is logged in
        self.client.login(username="learner", password="pass", facility=facility)

        response = self.client.get(self._reverse_channel_url("contentnodeprogress-list"))

        # The progress endpoint is used, so should report progress for topics
        self.assertEqual(get_progress_fraction(root), 0.3)
        self.assertEqual(get_progress_fraction(c1), 0)
        self.assertEqual(get_progress_fraction(c2), 0.4)
        self.assertEqual(get_progress_fraction(c2c1), 0.7)
