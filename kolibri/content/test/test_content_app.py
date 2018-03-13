"""
To run this test, type this in command line <kolibri manage test -- kolibri.content>
"""
import datetime
from collections import namedtuple

import mock
import requests
from django.core.cache import cache
from django.core.urlresolvers import reverse
from django.db.models import Q
from django.test import TestCase
from le_utils.constants import content_kinds
from rest_framework import status
from rest_framework.test import APITestCase

import kolibri.content.serializers
from kolibri.auth.models import Facility
from kolibri.auth.models import FacilityUser
from kolibri.auth.test.helpers import provision_device
from kolibri.content import models as content
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.logger.models import ContentSummaryLog

DUMMY_PASSWORD = "password"


class ContentNodeTestBase(object):
    """
    Basecase for content metadata methods
    """
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
        expected_output = content.ContentNode.objects.filter(title__in=["c1"])
        actual_output = p.get_descendants(include_self=False).filter(kind=content_kinds.VIDEO)
        self.assertEqual(set(expected_output), set(actual_output))

    def test_get_top_level_topics(self):

        p = content.ContentNode.objects.get(title="root")
        expected_output = content.ContentNode.objects.filter(parent=p, kind=content_kinds.TOPIC)
        actual_output = content.ContentNode.objects.get(title="root").get_children().filter(kind=content_kinds.TOPIC)
        self.assertEqual(set(expected_output), set(actual_output))

    def test_tag_str(self):

        # test for ContentTag __str__
        p = content.ContentTag.objects.get(tag_name="tag_2")
        self.assertEqual(str(p), 'tag_2')

    def test_lang_str(self):
        # test for Language __str__
        p = content.Language.objects.get(lang_code="en")
        self.assertEqual(str(p), 'English-Test')

    def test_channelmetadata_str(self):
        # test for ChannelMetadata __str__
        p = content.ChannelMetadata.objects.get(name="testing")
        self.assertEqual(str(p), 'testing')

    def test_tags(self):
        root_tag_count = content.ContentNode.objects.get(title='root').tags.count()
        self.assertEqual(root_tag_count, 3)

        c1_tag_count = content.ContentNode.objects.get(title='c1').tags.count()
        self.assertEqual(c1_tag_count, 1)

        c2_tag_count = content.ContentNode.objects.get(title='c2').tags.count()
        self.assertEqual(c2_tag_count, 1)

        c2c1_tag_count = content.ContentNode.objects.get(title='c2c1').tags.count()
        self.assertEqual(c2c1_tag_count, 0)

    def test_local_files(self):
        self.assertTrue(content.LocalFile.objects.filter(id='9f9438fe6b0d42dd8e913d7d04cfb2b2').exists())
        self.assertTrue(content.LocalFile.objects.filter(id='725257a0570044acbd59f8cf6a68b2be').exists())
        self.assertTrue(content.LocalFile.objects.filter(id='e00699f859624e0f875ac6fe1e13d648').exists())
        self.assertTrue(content.LocalFile.objects.filter(id='4c30dc7619f74f97ae2ccd4fffd09bf2').exists())
        self.assertTrue(content.LocalFile.objects.filter(id='8ad3fffedf144cba9492e16daec1e39a').exists())

    def test_delete_tree(self):
        channel = content.ChannelMetadata.objects.first()
        channel_id = channel.id
        channel.delete_content_tree_and_files()
        self.assertFalse(content.ContentNode.objects.filter(channel_id=channel_id).exists())
        self.assertFalse(content.File.objects.all().exists())


class ContentNodeTestCase(ContentNodeTestBase, TestCase):
    fixtures = ['content_test.json']


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
        root = content.ContentNode.objects.get(title="root")
        expected_output = root.get_descendants(include_self=True).filter(available=True).count()
        response = self.client.get(self._reverse_channel_url("contentnode-list"))
        self.assertEqual(len(response.data), expected_output)

    def test_contentnode_granular_network_import(self):
        c1_id = content.ContentNode.objects.get(title="root").id
        c2_id = content.ContentNode.objects.get(title="c1").id
        c3_id = content.ContentNode.objects.get(title="c2").id
        content.ContentNode.objects.all().update(available=False)
        response = self.client.get(reverse("contentnode_granular-detail", kwargs={"pk": c1_id}))
        self.assertEqual(
            response.data, {
                "pk": c1_id, "title": "root", "kind": "topic", "available": False,
                "total_resources": 1, "on_device_resources": 0, "importable": True, "children": [
                    {
                        "pk": c2_id, "title": "c1", "kind": "video", "available": False,
                        "total_resources": 1, "on_device_resources": 0, "importable": True
                    },
                    {
                        "pk": c3_id, "title": "c2", "kind": "topic", "available": False,
                        "total_resources": 0, "on_device_resources": 0, "importable": True}]})

    @mock.patch('kolibri.content.serializers.get_mounted_drives_with_channel_info')
    def test_contentnode_granular_local_import(self, drive_mock):
        DriveData = namedtuple("DriveData", ["id", "datafolder"])
        drive_mock.return_value = {"123": DriveData(id="123", datafolder="test/")}

        content.LocalFile.objects.update(available=False)
        content.ContentNode.objects.update(available=False)

        c1_id = content.ContentNode.objects.get(title="root").id
        c2_id = content.ContentNode.objects.get(title="c1").id
        c3_id = content.ContentNode.objects.get(title="c2").id

        response = self.client.get(
            reverse("contentnode_granular-detail", kwargs={"pk": c1_id}), {"importing_from_drive_id": "123"})
        self.assertEqual(
            response.data, {
                "pk": c1_id, "title": "root", "kind": "topic", "available": False,
                "total_resources": 1, "on_device_resources": 0, "importable": True,
                "children": [
                    {
                        "pk": c2_id, "title": "c1", "kind": "video", "available": False,
                        "total_resources": 1, "on_device_resources": 0, "importable": False
                    },
                    {
                        "pk": c3_id, "title": "c2", "kind": "topic", "available": False,
                        "total_resources": 0, "on_device_resources": 0, "importable": True
                    }]
            })

    def test_contentnode_granular_export_available(self):
        c1_id = content.ContentNode.objects.get(title="c1").id
        response = self.client.get(reverse("contentnode_granular-detail", kwargs={"pk": c1_id}))
        self.assertEqual(
            response.data, {
                "pk": c1_id, "title": "c1", "kind": "video", "available": True,
                "total_resources": 1, "on_device_resources": 1, "importable": True,
                "children": []})

    def test_contentnode_granular_export_unavailable(self):
        c1_id = content.ContentNode.objects.get(title="c1").id
        content.ContentNode.objects.filter(title="c1").update(available=False)
        response = self.client.get(reverse("contentnode_granular-detail", kwargs={"pk": c1_id}))
        self.assertEqual(
            response.data, {
                "pk": c1_id, "title": "c1", "kind": "video", "available": False,
                "total_resources": 1, "on_device_resources": 0, "importable": True,
                "children": []})

    def test_contentnodefilesize_resourcenode(self):
        c1_id = content.ContentNode.objects.get(title="c1").id
        content.LocalFile.objects.filter(pk="9f9438fe6b0d42dd8e913d7d04cfb2b2").update(file_size=2)
        content.LocalFile.objects.filter(pk="725257a0570044acbd59f8cf6a68b2be").update(file_size=1, available=False)
        response = self.client.get(reverse("contentnodefilesize-detail", kwargs={"pk": c1_id}))
        self.assertEqual(response.data, {"total_file_size": 3, "on_device_file_size": 2})

    def test_contentnodefilesize_topicnode(self):
        root_id = content.ContentNode.objects.get(title="root").id
        content.LocalFile.objects.filter(pk="9f9438fe6b0d42dd8e913d7d04cfb2b2").update(file_size=2)
        content.LocalFile.objects.filter(pk="725257a0570044acbd59f8cf6a68b2be").update(file_size=1, available=False)
        content.LocalFile.objects.filter(pk="e00699f859624e0f875ac6fe1e13d648").update(file_size=3)
        response = self.client.get(reverse("contentnodefilesize-detail", kwargs={"pk": root_id}))
        self.assertEqual(response.data, {"total_file_size": 6, "on_device_file_size": 5})

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

    def test_contentnode_allcontent(self):
        nodes = content.ContentNode.objects.exclude(kind=content_kinds.TOPIC).count()
        response = self.client.get(self._reverse_channel_url("contentnode-all-content"))
        self.assertEqual(len(response.data), nodes)

    def test_channelmetadata_list(self):
        response = self.client.get(reverse("channel-list", kwargs={}))
        self.assertEqual(response.data[0]['name'], 'testing')

    def test_channelmetadata_retrieve(self):
        data = content.ChannelMetadata.objects.values()[0]
        response = self.client.get(reverse("channel-detail", kwargs={'pk': data["id"]}))
        self.assertEqual(response.data['name'], 'testing')

    def test_channelmetadata_resource_info(self):
        data = content.ChannelMetadata.objects.values()[0]
        c1_id = content.ContentNode.objects.get(title="c1").id
        content.ContentNode.objects.filter(pk=c1_id).update(available=False)
        response = self.client.get(reverse("channel-detail", kwargs={'pk': data["id"]}), {'file_sizes': True})
        self.assertEqual(response.data['total_resources'], 1)
        self.assertEqual(response.data['total_file_size'], 0)
        self.assertEqual(response.data['on_device_resources'], 0)
        self.assertEqual(response.data['on_device_file_size'], 0)

    def test_channelmetadata_langfield(self):
        data = content.ChannelMetadata.objects.first()
        root_lang = content.Language.objects.get(pk=1)
        data.root.lang = root_lang
        data.root.save()

        response = self.client.get(self._reverse_channel_url("channel-detail", {'pk': data.id}))
        self.assertEqual(response.data['lang_code'], root_lang.lang_code)
        self.assertEqual(response.data['lang_name'], root_lang.lang_name)

    def test_channelmetadata_langfield_none(self):
        data = content.ChannelMetadata.objects.first()

        response = self.client.get(self._reverse_channel_url("channel-detail", {'pk': data.id}))
        self.assertEqual(response.data['lang_code'], None)
        self.assertEqual(response.data['lang_name'], None)

    def test_channelmetadata_content_available_param_filter_lowercase_true(self):
        response = self.client.get(reverse("channel-list"), {"available": "true"})
        self.assertEqual(response.data[0]["id"], "6199dde695db4ee4ab392222d5af1e5c")

    def test_channelmetadata_content_available_param_filter_uppercase_true(self):
        response = self.client.get(reverse("channel-list"), {"available": True})
        self.assertEqual(response.data[0]["id"], "6199dde695db4ee4ab392222d5af1e5c")

    def test_channelmetadata_content_unavailable_param_filter_false(self):
        content.ContentNode.objects.filter(title="root").update(available=False)
        response = self.client.get(reverse("channel-list"), {"available": False})
        self.assertEqual(response.data[0]["id"], "6199dde695db4ee4ab392222d5af1e5c")

    def test_channelmetadata_content_available_field_true(self):
        response = self.client.get(reverse("channel-list"))
        self.assertEqual(response.data[0]["available"], True)

    def test_channelmetadata_content_available_field_false(self):
        content.ContentNode.objects.filter(title="root").update(available=False)
        response = self.client.get(reverse("channel-list"))
        self.assertEqual(response.data[0]["available"], False)

    def test_channelmetadata_file_sizes_filter_has_total_resources(self):
        response = self.client.get(reverse("channel-list"), {"file_sizes": True})
        self.assertEqual(response.data[0]["total_resources"], 1)

    def test_channelmetadata_file_sizes_filter_has_total_file_size(self):
        content.LocalFile.objects.filter(files__contentnode__channel_id=self.the_channel_id).update(file_size=1)
        response = self.client.get(reverse("channel-list"), {"file_sizes": True})
        self.assertEqual(response.data[0]["total_file_size"], 2)

    def test_channelmetadata_file_sizes_filter_has_on_device_resources(self):
        response = self.client.get(reverse("channel-list"), {"file_sizes": True})
        self.assertEqual(response.data[0]["on_device_resources"], 1)

    def test_channelmetadata_file_sizes_filter_has_on_device_file_size(self):
        content.LocalFile.objects.filter(files__contentnode__channel_id=self.the_channel_id).update(file_size=1)
        response = self.client.get(reverse("channel-list"), {"file_sizes": True})
        self.assertEqual(response.data[0]["on_device_file_size"], 2)

    def test_channelmetadata_file_sizes_filter_has_no_on_device_file_size(self):
        content.LocalFile.objects.filter(files__contentnode__channel_id=self.the_channel_id).update(available=True)
        response = self.client.get(reverse("channel-list"), {"file_sizes": True})
        self.assertEqual(response.data[0]["on_device_file_size"], 0)

    @mock.patch.object(kolibri.content.serializers, 'renderable_contentnodes_q_filter', Q(kind=content_kinds.TOPIC))
    def test_channelmetadata_file_sizes_filter_has_no_renderable_on_device_file_size(self):
        content.LocalFile.objects.filter(files__contentnode__channel_id=self.the_channel_id).update(file_size=1)
        response = self.client.get(reverse("channel-list"), {"file_sizes": True})
        self.assertEqual(response.data[0]["on_device_file_size"], 0)

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

    @mock.patch.object(cache, 'set')
    def test_parent_query_cache_is_set(self, mock_cache_set):
        id = content.ContentNode.objects.get(title="c3").id
        self.client.get(self._reverse_channel_url("contentnode-list"), data={"parent": id})
        self.assertTrue(mock_cache_set.called)

    @mock.patch.object(cache, 'set')
    def test_parent_query_cache_not_set(self, mock_cache_set):
        id = content.ContentNode.objects.get(title="c2c3").id
        self.client.get(self._reverse_channel_url("contentnode-list"), data={"parent": id, 'kind': content_kinds.EXERCISE})
        self.assertFalse(mock_cache_set.called)

    def test_parent_query_cache_hit(self):
        id = content.ContentNode.objects.get(title="c2c3").id
        self.client.get(self._reverse_channel_url("contentnode-list"), data={"parent": id})
        with mock.patch.object(cache, 'set') as mock_cache_set:
            self.client.get(self._reverse_channel_url("contentnode-list"), data={"parent": id})
            self.assertFalse(mock_cache_set.called)

    def tearDown(self):
        """
        clean up files/folders created during the test
        """
        cache.clear()
        super(ContentNodeAPITestCase, self).tearDown()


def mock_patch_decorator(func):

    def wrapper(*args, **kwargs):
        mock_object = mock.Mock()
        mock_object.json.return_value = [{'id': 1, 'name': 'studio'}]
        with mock.patch.object(requests, 'get', return_value=mock_object):
            return func(*args, **kwargs)

    return wrapper


class KolibriStudioAPITestCase(APITestCase):

    def setUp(self):
        DeviceSettings.objects.create(is_provisioned=True)
        self.facility = Facility.objects.create(name='facility')
        superuser = FacilityUser.objects.create(username='superuser', facility=self.facility)
        superuser.set_password(DUMMY_PASSWORD)
        superuser.save()
        DevicePermissions.objects.create(user=superuser, is_superuser=True)
        self.client.login(username=superuser.username, password=DUMMY_PASSWORD)

    @mock_patch_decorator
    def test_channel_list(self):
        response = self.client.get(reverse('remotechannel-list'), format='json')
        self.assertEqual(response.data[0]['id'], 1)

    @mock_patch_decorator
    def test_no_permission_non_superuser_channel_list(self):
        user = FacilityUser.objects.create(username='user', facility=self.facility)
        user.set_password(DUMMY_PASSWORD)
        user.save()
        self.client.logout()
        self.client.login(username=user.username, password=DUMMY_PASSWORD)
        response = self.client.get(reverse('remotechannel-list'), format='json')
        self.assertEqual(response.status_code, 403)

    @mock_patch_decorator
    def test_channel_retrieve(self):
        response = self.client.get(reverse('remotechannel-detail', kwargs={'pk': 'abc'}), format='json')
        self.assertEqual(response.data[0]['name'], 'studio')

    @mock_patch_decorator
    def test_channel_info_cache(self):
        self.client.get(reverse('remotechannel-detail', kwargs={'pk': 'abc'}), format='json')
        with mock.patch.object(cache, 'set') as mock_cache_set:
            self.client.get(reverse('remotechannel-detail', kwargs={'pk': 'abc'}), format='json')
            self.assertFalse(mock_cache_set.called)

    @mock_patch_decorator
    def test_channel_info_404(self):
        mock_object = mock.Mock()
        mock_object.status_code = 404
        requests.get.return_value = mock_object
        response = self.client.get(reverse('remotechannel-detail', kwargs={'pk': 'abc'}), format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def tearDown(self):
        cache.clear()
