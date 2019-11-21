"""
To run this test, type this in command line <kolibri manage test -- kolibri.core.content>
"""
import datetime
import uuid

import mock
import requests
from django.core.cache import cache
from django.core.urlresolvers import reverse

from django.test import TestCase
from django.utils import timezone
from le_utils.constants import content_kinds
from rest_framework import status
from rest_framework.test import APITestCase

from kolibri.core.auth.constants import user_kinds
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content import models as content
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog

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
        actual_output = p.get_descendants(include_self=False).filter(
            kind=content_kinds.VIDEO
        )
        self.assertEqual(set(expected_output), set(actual_output))

    def test_get_top_level_topics(self):

        p = content.ContentNode.objects.get(title="root")
        expected_output = content.ContentNode.objects.filter(
            parent=p, kind=content_kinds.TOPIC
        )
        actual_output = (
            content.ContentNode.objects.get(title="root")
            .get_children()
            .filter(kind=content_kinds.TOPIC)
        )
        self.assertEqual(set(expected_output), set(actual_output))

    def test_tag_str(self):

        # test for ContentTag __str__
        p = content.ContentTag.objects.get(tag_name="tag_2")
        self.assertEqual(str(p), "tag_2")

    def test_lang_str(self):
        # test for Language __str__
        p = content.Language.objects.get(lang_code="en")
        self.assertEqual(str(p), "English-Test")

    def test_channelmetadata_str(self):
        # test for ChannelMetadata __str__
        p = content.ChannelMetadata.objects.get(name="testing")
        self.assertEqual(str(p), "testing")

    def test_tags(self):
        root_tag_count = content.ContentNode.objects.get(title="root").tags.count()
        self.assertEqual(root_tag_count, 3)

        c1_tag_count = content.ContentNode.objects.get(title="c1").tags.count()
        self.assertEqual(c1_tag_count, 1)

        c2_tag_count = content.ContentNode.objects.get(title="c2").tags.count()
        self.assertEqual(c2_tag_count, 1)

        c2c1_tag_count = content.ContentNode.objects.get(title="c2c1").tags.count()
        self.assertEqual(c2c1_tag_count, 0)

    def test_local_files(self):
        self.assertTrue(
            content.LocalFile.objects.filter(
                id="9f9438fe6b0d42dd8e913d7d04cfb2b2"
            ).exists()
        )
        self.assertTrue(
            content.LocalFile.objects.filter(
                id="725257a0570044acbd59f8cf6a68b2be"
            ).exists()
        )
        self.assertTrue(
            content.LocalFile.objects.filter(
                id="e00699f859624e0f875ac6fe1e13d648"
            ).exists()
        )
        self.assertTrue(
            content.LocalFile.objects.filter(
                id="4c30dc7619f74f97ae2ccd4fffd09bf2"
            ).exists()
        )
        self.assertTrue(
            content.LocalFile.objects.filter(
                id="8ad3fffedf144cba9492e16daec1e39a"
            ).exists()
        )

    def test_delete_tree(self):
        channel = content.ChannelMetadata.objects.first()
        channel_id = channel.id
        channel.delete_content_tree_and_files()
        self.assertFalse(
            content.ContentNode.objects.filter(channel_id=channel_id).exists()
        )
        self.assertFalse(content.File.objects.all().exists())


class ContentNodeQuerysetTestCase(TestCase):
    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name="facility")
        self.admin = FacilityUser.objects.create(
            username="admin", facility=self.facility
        )
        self.admin.set_password(DUMMY_PASSWORD)
        self.admin.save()
        self.facility.add_admin(self.admin)

    def test_filter_uuid(self):
        content_ids = content.ContentNode.objects.values_list("id", flat=True)
        self.assertEqual(
            content.ContentNode.objects.filter_by_uuids(content_ids).count(),
            len(content_ids),
        )

    def test_filter_uuid_bad_uuid(self):
        content_ids = list(content.ContentNode.objects.values_list("id", flat=True))
        content_ids[0] = '7d1bOR"1"="1"d08e29c36115f1af3da99'
        self.assertEqual(
            content.ContentNode.objects.filter_by_uuids(content_ids).count(), 0
        )


class ContentNodeAPITestCase(APITestCase):
    """
    Testcase for content API methods
    """

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name="facility")
        self.admin = FacilityUser.objects.create(
            username="admin", facility=self.facility
        )
        self.admin.set_password(DUMMY_PASSWORD)
        self.admin.save()
        self.facility.add_admin(self.admin)

    def test_prerequisite_for_filter(self):
        c1_id = content.ContentNode.objects.get(title="c1").id
        response = self.client.get(
            reverse("kolibri:core:contentnode-list"), data={"prerequisite_for": c1_id}
        )
        self.assertEqual(response.data[0]["title"], "root")

    def test_has_prerequisite_filter(self):
        root_id = content.ContentNode.objects.get(title="root").id
        response = self.client.get(
            reverse("kolibri:core:contentnode-list"), data={"has_prerequisite": root_id}
        )
        self.assertEqual(response.data[0]["title"], "c1")

    def test_related_filter(self):
        c1_id = content.ContentNode.objects.get(title="c1").id
        response = self.client.get(
            reverse("kolibri:core:contentnode-list"), data={"related": c1_id}
        )
        self.assertEqual(response.data[0]["title"], "c2")

    def test_contentnode_list(self):
        root = content.ContentNode.objects.get(title="root")
        expected_output = (
            root.get_descendants(include_self=True).filter(available=True).count()
        )
        response = self.client.get(reverse("kolibri:core:contentnode-list"))
        self.assertEqual(len(response.data), expected_output)

    @mock.patch("kolibri.core.content.api.get_channel_stats_from_studio")
    def test_contentnode_granular_network_import(self, stats_mock):
        c1_id = content.ContentNode.objects.get(title="root").id
        c2_id = content.ContentNode.objects.get(title="c1").id
        c3_id = content.ContentNode.objects.get(title="c2").id
        content.ContentNode.objects.all().update(available=False)
        stats = {
            c1_id: {
                "total_resources": 2,
                "coach_content": False,
                "num_coach_contents": 0,
            },
            c2_id: {
                "total_resources": 1,
                "coach_content": False,
                "num_coach_contents": 0,
            },
            c3_id: {
                "total_resources": 1,
                "coach_content": False,
                "num_coach_contents": 0,
            },
        }
        stats_mock.return_value = stats
        response = self.client.get(
            reverse("kolibri:core:contentnode_granular-detail", kwargs={"pk": c1_id})
        )
        self.assertEqual(
            response.data,
            {
                "id": c1_id,
                "title": "root",
                "kind": "topic",
                "available": False,
                "total_resources": 2,
                "on_device_resources": 0,
                "coach_content": False,
                "importable": True,
                "num_coach_contents": 0,
                "children": [
                    {
                        "id": c2_id,
                        "title": "c1",
                        "kind": "video",
                        "available": False,
                        "total_resources": 1,
                        "on_device_resources": 0,
                        "importable": True,
                        "coach_content": False,
                        "num_coach_contents": 0,
                    },
                    {
                        "id": c3_id,
                        "title": "c2",
                        "kind": "topic",
                        "available": False,
                        "total_resources": 1,
                        "on_device_resources": 0,
                        "importable": True,
                        "coach_content": False,
                        "num_coach_contents": 0,
                    },
                ],
            },
        )

    @mock.patch("kolibri.core.content.api.get_channel_stats_from_disk")
    def test_contentnode_granular_local_import(self, stats_mock):
        content.LocalFile.objects.update(available=False)
        content.ContentNode.objects.update(available=False)

        c1_id = content.ContentNode.objects.get(title="root").id
        c2_id = content.ContentNode.objects.get(title="c1").id
        c3_id = content.ContentNode.objects.get(title="c2").id

        stats = {
            c1_id: {
                "total_resources": 1,
                "coach_content": False,
                "num_coach_contents": 0,
            },
            c3_id: {
                "total_resources": 1,
                "coach_content": False,
                "num_coach_contents": 0,
            },
        }
        stats_mock.return_value = stats

        response = self.client.get(
            reverse("kolibri:core:contentnode_granular-detail", kwargs={"pk": c1_id}),
            {"importing_from_drive_id": "123"},
        )
        self.assertEqual(
            response.data,
            {
                "id": c1_id,
                "title": "root",
                "kind": "topic",
                "available": False,
                "total_resources": 1,
                "on_device_resources": 0,
                "importable": True,
                "coach_content": False,
                "num_coach_contents": 0,
                "children": [
                    {
                        "id": c2_id,
                        "title": "c1",
                        "kind": "video",
                        "available": False,
                        "total_resources": 0,
                        "on_device_resources": 0,
                        "importable": False,
                        "coach_content": False,
                        "num_coach_contents": 0,
                    },
                    {
                        "id": c3_id,
                        "title": "c2",
                        "kind": "topic",
                        "available": False,
                        "total_resources": 1,
                        "on_device_resources": 0,
                        "importable": True,
                        "coach_content": False,
                        "num_coach_contents": 0,
                    },
                ],
            },
        )

    @mock.patch("kolibri.core.content.api.get_channel_stats_from_peer")
    def test_contentnode_granular_remote_import(self, stats_mock):
        content.LocalFile.objects.update(available=False)
        content.ContentNode.objects.update(available=False)

        c1_id = content.ContentNode.objects.get(title="root").id
        c2_id = content.ContentNode.objects.get(title="c1").id
        c3_id = content.ContentNode.objects.get(title="c2").id
        stats = {
            c1_id: {
                "total_resources": 1,
                "coach_content": False,
                "num_coach_contents": 0,
            },
            c3_id: {
                "total_resources": 1,
                "coach_content": False,
                "num_coach_contents": 0,
            },
        }
        stats_mock.return_value = stats

        response = self.client.get(
            reverse("kolibri:core:contentnode_granular-detail", kwargs={"pk": c1_id}),
            {"importing_from_peer_id": "test"},
        )
        self.assertEqual(
            response.data,
            {
                "id": c1_id,
                "title": "root",
                "kind": "topic",
                "available": False,
                "total_resources": 1,
                "on_device_resources": 0,
                "importable": True,
                "coach_content": False,
                "num_coach_contents": 0,
                "children": [
                    {
                        "id": c2_id,
                        "title": "c1",
                        "kind": "video",
                        "available": False,
                        "total_resources": 0,
                        "on_device_resources": 0,
                        "importable": False,
                        "coach_content": False,
                        "num_coach_contents": 0,
                    },
                    {
                        "id": c3_id,
                        "title": "c2",
                        "kind": "topic",
                        "available": False,
                        "total_resources": 1,
                        "on_device_resources": 0,
                        "importable": True,
                        "coach_content": False,
                        "num_coach_contents": 0,
                    },
                ],
            },
        )

    def test_contentnode_granular_export_available(self):
        c1_id = content.ContentNode.objects.get(title="c1").id
        content.ContentNode.objects.filter(title="c1").update(on_device_resources=1)
        response = self.client.get(
            reverse("kolibri:core:contentnode_granular-detail", kwargs={"pk": c1_id}),
            data={"for_export": True},
        )
        self.assertEqual(
            response.data,
            {
                "id": c1_id,
                "title": "c1",
                "kind": "video",
                "available": True,
                "total_resources": 1,
                "on_device_resources": 1,
                "importable": None,
                "children": [],
                "coach_content": False,
                "num_coach_contents": 0,
            },
        )

    def test_contentnode_granular_export_unavailable(self):
        c1_id = content.ContentNode.objects.get(title="c1").id
        content.ContentNode.objects.filter(title="c1").update(available=False)
        response = self.client.get(
            reverse("kolibri:core:contentnode_granular-detail", kwargs={"pk": c1_id}),
            data={"for_export": True},
        )
        self.assertEqual(
            response.data,
            {
                "id": c1_id,
                "title": "c1",
                "kind": "video",
                "available": False,
                "total_resources": 0,
                "on_device_resources": 0,
                "importable": None,
                "children": [],
                "coach_content": False,
                "num_coach_contents": 0,
            },
        )

    def test_contentnode_retrieve(self):
        c1_id = content.ContentNode.objects.get(title="c1").id
        response = self.client.get(
            reverse("kolibri:core:contentnode-detail", kwargs={"pk": c1_id})
        )
        self.assertEqual(response.data["id"], c1_id.__str__())

    def test_contentnode_field_filtering(self):
        c1_id = content.ContentNode.objects.get(title="c1").id
        response = self.client.get(
            reverse("kolibri:core:contentnode-detail", kwargs={"pk": c1_id}),
            data={"fields": "title,description"},
        )
        self.assertEqual(response.data["title"], "c1")
        self.assertEqual(response.data["description"], "balbla2")
        self.assertTrue("id" not in response.data)

    def test_contentnode_descendants_assessments_exercise_node(self):
        c1 = content.ContentNode.objects.filter(kind=content_kinds.EXERCISE).first()
        c1_id = c1.id
        response = self.client.get(
            reverse("kolibri:core:contentnode-descendants-assessments"),
            data={"ids": c1_id},
        )
        self.assertEqual(
            next(
                item["num_assessments"] for item in response.data if item["id"] == c1_id
            ),
            c1.assessmentmetadata.first().number_of_assessments,
        )

    def test_contentnode_descendants_assessments_exercise_parent(self):
        c1 = content.ContentNode.objects.filter(kind=content_kinds.EXERCISE).first()
        parent = c1.parent
        parent_id = parent.id
        response = self.client.get(
            reverse("kolibri:core:contentnode-descendants-assessments"),
            data={"ids": parent_id},
        )
        self.assertEqual(
            next(
                item["num_assessments"]
                for item in response.data
                if item["id"] == parent_id
            ),
            c1.assessmentmetadata.first().number_of_assessments,
        )

    def test_contentnode_descendants_assessments_exercise_root(self):
        c1 = content.ContentNode.objects.filter(kind=content_kinds.EXERCISE).first()
        root = content.ContentNode.objects.get(parent__isnull=True)
        root_id = root.id
        response = self.client.get(
            reverse("kolibri:core:contentnode-descendants-assessments"),
            data={"ids": root_id},
        )
        self.assertEqual(
            next(
                item["num_assessments"]
                for item in response.data
                if item["id"] == root_id
            ),
            c1.assessmentmetadata.first().number_of_assessments,
        )

    def test_contentnode_descendants_assessments_exercise_parent_sum_siblings(self):
        c1 = content.ContentNode.objects.filter(kind=content_kinds.EXERCISE).first()
        parent = c1.parent
        parent_id = parent.id
        sibling = content.ContentNode.objects.create(
            pk="6a406ac66b224106aa2e93f73a94333d",
            channel_id=c1.channel_id,
            content_id="ded4a083e75f4689b386fd2b706e792a",
            kind=content_kinds.EXERCISE,
            parent=parent,
            title="sibling exercise",
            available=True,
        )
        sibling_assessment_metadata = content.AssessmentMetaData.objects.create(
            id="6a406ac66b224106aa2e93f73a94333d",
            contentnode=sibling,
            number_of_assessments=5,
        )
        response = self.client.get(
            reverse("kolibri:core:contentnode-descendants-assessments"),
            data={"ids": parent_id},
        )
        self.assertEqual(
            next(
                item["num_assessments"]
                for item in response.data
                if item["id"] == parent_id
            ),
            c1.assessmentmetadata.first().number_of_assessments
            + sibling_assessment_metadata.number_of_assessments,
        )

    def test_contentnode_descendants_assessments_exercise_parent_sum_siblings_one_unavailable(
        self,
    ):
        c1 = content.ContentNode.objects.filter(kind=content_kinds.EXERCISE).first()
        c1.available = False
        c1.save()
        parent = c1.parent
        parent_id = parent.id
        sibling = content.ContentNode.objects.create(
            pk="6a406ac66b224106aa2e93f73a94333d",
            channel_id=c1.channel_id,
            content_id="ded4a083e75f4689b386fd2b706e792a",
            kind=content_kinds.EXERCISE,
            parent=parent,
            title="sibling exercise",
            available=True,
        )
        sibling_assessment_metadata = content.AssessmentMetaData.objects.create(
            id="6a406ac66b224106aa2e93f73a94333d",
            contentnode=sibling,
            number_of_assessments=5,
        )
        response = self.client.get(
            reverse("kolibri:core:contentnode-descendants-assessments"),
            data={"ids": parent_id},
        )
        self.assertEqual(
            next(
                item["num_assessments"]
                for item in response.data
                if item["id"] == parent_id
            ),
            sibling_assessment_metadata.number_of_assessments,
        )

    def test_contentnode_descendants_topic_siblings_ancestor_ids(self):
        root = content.ContentNode.objects.get(parent__isnull=True)
        topics = content.ContentNode.objects.filter(
            parent=root, kind=content_kinds.TOPIC
        )
        topic_ids = topics.values_list("id", flat=True)
        response = self.client.get(
            reverse("kolibri:core:contentnode-descendants"),
            data={"ids": ",".join(topic_ids)},
        )
        for datum in response.data:
            topic = topics.get(id=datum["ancestor_id"])
            self.assertTrue(topic.get_descendants().filter(id=datum["id"]).exists())

    def test_contentnode_descendants_topic_siblings_kind_filter(self):
        root = content.ContentNode.objects.get(parent__isnull=True)
        topics = content.ContentNode.objects.filter(
            parent=root, kind=content_kinds.TOPIC
        )
        topic_ids = topics.values_list("id", flat=True)
        response = self.client.get(
            reverse("kolibri:core:contentnode-descendants"),
            data={
                "ids": ",".join(topic_ids),
                "descendant_kind": content_kinds.EXERCISE,
            },
        )
        for datum in response.data:
            topic = topics.get(id=datum["ancestor_id"])
            self.assertTrue(
                topic.get_descendants()
                .filter(id=datum["id"], kind=content_kinds.EXERCISE)
                .exists()
            )

    def test_contentnode_descendants_topic_parent_child_ancestor_ids(self):
        root = content.ContentNode.objects.get(parent__isnull=True)
        topic = content.ContentNode.objects.filter(
            parent=root, kind=content_kinds.TOPIC, children__isnull=False
        ).first()
        response = self.client.get(
            reverse("kolibri:core:contentnode-descendants"),
            data={"ids": ",".join((root.id, topic.id))},
        )
        topic_items = [
            datum for datum in response.data if datum["ancestor_id"] == topic.id
        ]
        for node in topic.get_descendants(include_self=False).filter(available=True):
            self.assertTrue(next(item for item in topic_items if item["id"] == node.id))
        root_items = [
            datum for datum in response.data if datum["ancestor_id"] == root.id
        ]
        for node in root.get_descendants(include_self=False).filter(available=True):
            self.assertTrue(next(item for item in root_items if item["id"] == node.id))

    def test_contentnode_descendants_availability(self):
        content.ContentNode.objects.all().update(available=False)
        root = content.ContentNode.objects.get(parent__isnull=True)
        topics = content.ContentNode.objects.filter(
            parent=root, kind=content_kinds.TOPIC
        )
        topic_ids = topics.values_list("id", flat=True)
        response = self.client.get(
            reverse("kolibri:core:contentnode-descendants"),
            data={"ids": ",".join(topic_ids)},
        )
        self.assertEqual(len(response.data), 0)

    def test_contentnode_node_assessments_available(self):
        content.ContentNode.objects.all().update(available=True)
        root = content.ContentNode.objects.get(parent__isnull=True)
        exercise_ids = (
            root.get_descendants()
            .filter(kind=content_kinds.EXERCISE)
            .values_list("id", flat=True)
        )
        response = self.client.get(
            reverse("kolibri:core:contentnode-node-assessments"),
            data={"ids": ",".join(exercise_ids)},
        )
        self.assertEqual(response.data, 1)

    def test_contentnode_node_assessments_not_available(self):
        content.ContentNode.objects.all().update(available=False)
        root = content.ContentNode.objects.get(parent__isnull=True)
        exercise_ids = (
            root.get_descendants()
            .filter(kind=content_kinds.EXERCISE)
            .values_list("id", flat=True)
        )
        response = self.client.get(
            reverse("kolibri:core:contentnode-node-assessments"),
            data={"ids": ",".join(exercise_ids)},
        )
        self.assertEqual(response.data, 0)

    def test_contentnode_slim_recommendations(self):
        node_id = content.ContentNode.objects.get(title="c2c2").id
        response = self.client.get(
            reverse(
                "kolibri:core:contentnode_slim-recommendations-for",
                kwargs={"pk": node_id},
            )
        )
        self.assertEqual(len(response.data), 2)

    def test_contentnode_slim_recommendations_does_error_for_unavailable_node(self):
        node = content.ContentNode.objects.get(title="c2c2")
        node.available = False
        node.save()
        node_id = node.id
        response = self.client.get(
            reverse(
                "kolibri:core:contentnode_slim-recommendations-for",
                kwargs={"pk": node_id},
            )
        )
        self.assertEqual(response.status_code, 404)

    def test_contentnode_slim_ids(self):
        titles = ["c2c2", "c2c3"]
        nodes = [content.ContentNode.objects.get(title=title) for title in titles]
        response = self.client.get(
            reverse("kolibri:core:contentnode_slim-list"),
            data={"ids": ",".join([n.id for n in nodes])},
        )
        self.assertEqual(len(response.data), 2)
        for i in range(len(titles)):
            self.assertEqual(response.data[i]["title"], titles[i])

    def test_contentnode_slim_parent(self):
        parent = content.ContentNode.objects.get(title="c2")
        children = parent.get_children()
        response = self.client.get(
            reverse("kolibri:core:contentnode_slim-list"),
            data={"parent": parent.id, "user_kind": user_kinds.LEARNER},
        )
        self.assertEqual(len(response.data), children.count())
        for i in range(len(children)):
            self.assertEqual(response.data[i]["title"], children[i].title)

    def test_contentnode_slim_ancestors(self):
        node = content.ContentNode.objects.get(title="c2c2")
        ancestors = node.get_ancestors()
        ancestors_titles = {n.title for n in ancestors}
        response = self.client.get(
            reverse("kolibri:core:contentnode_slim-ancestors", kwargs={"pk": node.id})
        )
        response_titles = {n["title"] for n in response.data}
        self.assertEqual(len(response.data), ancestors.count())
        self.assertEqual(ancestors_titles, response_titles)

    def test_contentnodeslim_ids(self):
        titles = ["c2c2", "c2c3"]
        nodes = [content.ContentNode.objects.get(title=title) for title in titles]
        response = self.client.get(
            reverse("kolibri:core:contentnode_slim-list"),
            data={"ids": ",".join([n.id for n in nodes])},
        )
        self.assertEqual(len(response.data), 2)
        for i in range(len(titles)):
            self.assertEqual(response.data[i]["title"], titles[i])

    def test_contentnodeslim_parent(self):
        parent = content.ContentNode.objects.get(title="c2")
        children = parent.get_children()
        response = self.client.get(
            reverse("kolibri:core:contentnode_slim-list"),
            data={"parent": parent.id, "user_kind": user_kinds.LEARNER},
        )
        self.assertEqual(len(response.data), children.count())
        for i in range(len(children)):
            self.assertEqual(response.data[i]["title"], children[i].title)

    def test_contentnodeslim_ancestors(self):
        node = content.ContentNode.objects.get(title="c2c2")
        ancestors = node.get_ancestors()
        ancestors_titles = {n.title for n in ancestors}
        response = self.client.get(
            reverse("kolibri:core:contentnode_slim-ancestors", kwargs={"pk": node.id})
        )
        response_titles = {n["title"] for n in response.data}
        self.assertEqual(len(response.data), ancestors.count())
        self.assertEqual(ancestors_titles, response_titles)

    def test_channelmetadata_list(self):
        response = self.client.get(reverse("kolibri:core:channel-list", kwargs={}))
        self.assertEqual(response.data[0]["name"], "testing")

    def test_channelmetadata_retrieve(self):
        data = content.ChannelMetadata.objects.values()[0]
        response = self.client.get(
            reverse("kolibri:core:channel-detail", kwargs={"pk": data["id"]})
        )
        self.assertEqual(response.data["name"], "testing")

    def test_channelmetadata_langfield(self):
        data = content.ChannelMetadata.objects.first()
        root_lang = content.Language.objects.get(pk=1)
        data.root.lang = root_lang
        data.root.save()

        response = self.client.get(
            reverse("kolibri:core:channel-detail", kwargs={"pk": data.id})
        )
        self.assertEqual(response.data["lang_code"], root_lang.lang_code)
        self.assertEqual(response.data["lang_name"], root_lang.lang_name)

    def test_channelmetadata_langfield_none(self):
        data = content.ChannelMetadata.objects.first()

        response = self.client.get(
            reverse("kolibri:core:channel-detail", kwargs={"pk": data.id})
        )
        self.assertEqual(response.data["lang_code"], None)
        self.assertEqual(response.data["lang_name"], None)

    def test_channelmetadata_content_available_param_filter_lowercase_true(self):
        response = self.client.get(
            reverse("kolibri:core:channel-list"), {"available": "true"}
        )
        self.assertEqual(response.data[0]["id"], "6199dde695db4ee4ab392222d5af1e5c")

    def test_channelmetadata_content_available_param_filter_uppercase_true(self):
        response = self.client.get(
            reverse("kolibri:core:channel-list"), {"available": True}
        )
        self.assertEqual(response.data[0]["id"], "6199dde695db4ee4ab392222d5af1e5c")

    def test_channelmetadata_content_unavailable_param_filter_false(self):
        content.ContentNode.objects.filter(title="root").update(available=False)
        response = self.client.get(
            reverse("kolibri:core:channel-list"), {"available": False}
        )
        self.assertEqual(response.data[0]["id"], "6199dde695db4ee4ab392222d5af1e5c")

    def test_channelmetadata_content_available_field_true(self):
        response = self.client.get(reverse("kolibri:core:channel-list"))
        self.assertEqual(response.data[0]["available"], True)

    def test_channelmetadata_content_available_field_false(self):
        content.ContentNode.objects.filter(title="root").update(available=False)
        response = self.client.get(reverse("kolibri:core:channel-list"))
        self.assertEqual(response.data[0]["available"], False)

    def test_channelmetadata_has_exercises_filter(self):
        # Has nothing else for that matter...
        no_exercise_channel = content.ContentNode.objects.create(
            pk="6a406ac66b224106aa2e93f73a94333d",
            channel_id="f8ec4a5d14cd4716890999da596032d2",
            content_id="ded4a083e75f4689b386fd2b706e792a",
            kind="topic",
            title="no exercise channel",
        )
        content.ChannelMetadata.objects.create(
            id="63acff41781543828861ade41dbdd7ff",
            name="no exercise channel metadata",
            root=no_exercise_channel,
        )
        no_filter_response = self.client.get(reverse("kolibri:core:channel-list"))
        self.assertEqual(len(no_filter_response.data), 2)
        with_filter_response = self.client.get(
            reverse("kolibri:core:channel-list"), {"has_exercise": True}
        )
        self.assertEqual(len(with_filter_response.data), 1)
        self.assertEqual(with_filter_response.data[0]["name"], "testing")

    def test_file_list(self):
        response = self.client.get(reverse("kolibri:core:file-list"))
        self.assertEqual(len(response.data), 5)

    def test_file_retrieve(self):
        response = self.client.get(
            reverse(
                "kolibri:core:file-detail",
                kwargs={"pk": "6bdfea4a01830fdd4a585181c0b8068c"},
            )
        )
        self.assertEqual(response.data["preset"], "high_res_video")

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
                start_timestamp=datetime.datetime.now(),
            )

        return facility, root, c1, c2, c2c1, c2c3

    def test_contentnode_progress(self):

        facility, root, c1, c2, c2c1, c2c3 = self._setup_contentnode_progress()

        def assert_progress(node, progress):
            response = self.client.get(
                reverse("kolibri:core:contentnode-detail", kwargs={"pk": node.id})
            )
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
            response = self.client.get(
                reverse(
                    "kolibri:core:contentnodeprogress-detail", kwargs={"pk": node.id}
                )
            )
            self.assertEqual(response.data["progress_fraction"], progress)

        # check that there is no progress when not logged in
        assert_progress(root, 0)
        assert_progress(c1, 0)
        assert_progress(c2, 0)
        assert_progress(c2c1, 0)

        # check that progress is calculated appropriately when user is logged in
        self.client.login(username="learner", password="pass", facility=facility)

        # The progress endpoint is used, so should report progress for topics
        assert_progress(root, 0.24)
        assert_progress(c1, 0)
        assert_progress(c2, 0.4)
        assert_progress(c2c1, 0.7)

    def test_contentnode_progress_list_endpoint(self):

        facility, root, c1, c2, c2c1, c2c3 = self._setup_contentnode_progress()

        response = self.client.get(reverse("kolibri:core:contentnodeprogress-list"))

        def get_progress_fraction(node):
            return list(filter(lambda x: x["id"] == node.id, response.data))[0][
                "progress_fraction"
            ]

        # check that there is no progress when not logged in
        self.assertEqual(get_progress_fraction(root), 0)
        self.assertEqual(get_progress_fraction(c1), 0)
        self.assertEqual(get_progress_fraction(c2), 0)
        self.assertEqual(get_progress_fraction(c2c1), 0)

        # check that progress is calculated appropriately when user is logged in
        self.client.login(username="learner", password="pass", facility=facility)

        response = self.client.get(reverse("kolibri:core:contentnodeprogress-list"))

        # The progress endpoint is used, so should report progress for topics
        self.assertEqual(get_progress_fraction(root), 0.24)
        self.assertEqual(get_progress_fraction(c1), 0)
        self.assertEqual(get_progress_fraction(c2), 0.4)
        self.assertEqual(get_progress_fraction(c2c1), 0.7)

    def test_filtering_coach_content_anon(self):
        response = self.client.get(
            reverse("kolibri:core:contentnode-list"),
            data={"user_kind": user_kinds.ANONYMOUS},
        )
        # TODO make content_test.json fixture more organized. Here just, hardcoding the correct count
        self.assertEqual(len(response.data), 7)

    def test_filtering_coach_content_admin(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse("kolibri:core:contentnode-list"),
            data={"user_kind": user_kinds.ADMIN},
        )
        expected_output = content.ContentNode.objects.exclude(
            available=False
        ).count()  # coach_content node should be returned
        self.assertEqual(len(response.data), expected_output)

    def test_copies(self):
        # the pk is actually a content id
        response = self.client.get(
            reverse(
                "kolibri:core:contentnode-copies",
                kwargs={"pk": "c6f49ea527824f398f4d5d26faf19396"},
            )
        )
        expected_titles = set(["root", "c1", "copy"])
        response_titles = set()
        for node in response.data[0]:
            response_titles.add(node["title"])
        self.assertSetEqual(expected_titles, response_titles)

    def test_available_copies(self):
        # the pk is actually a content id
        response = self.client.get(
            reverse(
                "kolibri:core:contentnode-copies",
                kwargs={"pk": "f2332710c2fd483386cdeb5dcbdda81a"},
            )
        )
        # no results should be returned for unavailable content node
        self.assertEqual(len(response.data), 0)

    def test_copies_count(self):
        response = self.client.get(
            reverse("kolibri:core:contentnode-copies-count"),
            data={
                "content_ids": "f2332710c2fd483386cdeb5dcbdda81f,c6f49ea527824f398f4d5d26faf15555,f2332710c2fd483386cdeb5dcbdda81a"
            },
        )
        # assert non existent content id does not show up in results
        # no results should be returned for unavailable content node
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["count"],
            content.ContentNode.objects.filter(
                content_id="f2332710c2fd483386cdeb5dcbdda81f"
            ).count(),
        )

    def test_search_total_results(self):
        response = self.client.get(
            reverse("kolibri:core:contentnode_search-list"), data={"search": "root"}
        )
        self.assertEqual(response.data["total_results"], 1)

    def test_search_kinds(self):
        response = self.client.get(
            reverse("kolibri:core:contentnode_search-list"), data={"search": "root"}
        )
        self.assertEqual(list(response.data["content_kinds"]), [content_kinds.TOPIC])

    def test_search_repeated_kinds(self):
        # Ensure that each kind is only returned once.
        response = self.client.get(
            reverse("kolibri:core:contentnode_search-list"), data={"search": "c"}
        )
        kinds = response.data["content_kinds"][:]
        self.assertEqual(len(kinds), len(set(kinds)))

    def test_search_channels(self):
        response = self.client.get(
            reverse("kolibri:core:contentnode_search-list"), data={"search": "root"}
        )
        self.assertEqual(response.data["channel_ids"][:], [self.the_channel_id])

    def test_search_repeated_channels(self):
        # Ensure that each channel_id is only returned once.
        response = self.client.get(
            reverse("kolibri:core:contentnode_search-list"), data={"search": "c"}
        )
        channel_ids = response.data["channel_ids"][:]
        self.assertEqual(len(channel_ids), len(set(channel_ids)))

    def test_search(self):
        # ensure search works when there are no words not defined
        response = self.client.get(
            reverse("kolibri:core:contentnode_search-list"), data={"search": "!?,"}
        )
        self.assertEqual(len(response.data["results"]), 0)
        # ensure search words when there is only stopwords
        response = self.client.get(
            reverse("kolibri:core:contentnode_search-list"), data={"search": "or"}
        )
        self.assertEqual(len(response.data["results"]), 0)
        # regular search
        response = self.client.get(
            reverse("kolibri:core:contentnode_search-list"), data={"search": "root"}
        )
        self.assertEqual(len(response.data["results"]), 1)

    def _create_session_logs(self):
        content_ids = (
            "f2332710c2fd483386cdeb5ecbdda81f",
            "ce603df7c46b424b934348995e1b05fb",
            "481e1bda1faa445d801ceb2afbd2f42f",
        )
        channel_id = "6199dde695db4ee4ab392222d5af1e5c"
        [
            ContentSessionLog.objects.create(
                channel_id=channel_id,
                content_id=content_ids[0],
                start_timestamp=timezone.now(),
                kind="audio",
            )
            for _ in range(50)
        ]
        [
            ContentSessionLog.objects.create(
                channel_id=channel_id,
                content_id=content_ids[1],
                start_timestamp=timezone.now(),
                kind="exercise",
            )
            for _ in range(25)
        ]
        [
            ContentSessionLog.objects.create(
                channel_id=channel_id,
                content_id=content_ids[2],
                start_timestamp=timezone.now(),
                kind="document",
            )
            for _ in range(1)
        ]

        # create log for non existent content id
        # should not show up in api response
        ContentSessionLog.objects.create(
            channel_id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            start_timestamp=timezone.now(),
            kind="content",
        )
        return content_ids

    def test_popular(self):
        expected_content_ids = self._create_session_logs()
        response = self.client.get(reverse("kolibri:core:contentnode_slim-popular"))
        response_content_ids = set(node["content_id"] for node in response.json())
        self.assertSetEqual(set(expected_content_ids), response_content_ids)

    def test_popular_no_coach_content(self):
        expected_content_ids = self._create_session_logs()
        node = content.ContentNode.objects.get(content_id=expected_content_ids[0])
        node.coach_content = True
        node.save()
        expected_content_ids = expected_content_ids[1:]
        response = self.client.get(reverse("kolibri:core:contentnode_slim-popular"))
        response_content_ids = set(node["content_id"] for node in response.json())
        self.assertSetEqual(set(expected_content_ids), response_content_ids)

    def test_popular_coach_has_coach_content(self):
        coach = FacilityUser.objects.create(username="coach", facility=self.facility)
        coach.set_password(DUMMY_PASSWORD)
        coach.save()
        self.facility.add_coach(coach)
        expected_content_ids = self._create_session_logs()
        node = content.ContentNode.objects.get(content_id=expected_content_ids[0])
        node.coach_content = True
        node.save()
        self.client.login(username="coach", password=DUMMY_PASSWORD)
        response = self.client.get(reverse("kolibri:core:contentnode_slim-popular"))
        response_content_ids = set(node["content_id"] for node in response.json())
        self.assertSetEqual(set(expected_content_ids), response_content_ids)

    def test_popular_ten_minute_cache(self):
        self._create_session_logs()
        response = self.client.get(reverse("kolibri:core:contentnode_slim-popular"))
        self.assertEqual(response["Cache-Control"], "max-age=600")

    def _create_summary_logs(self):
        facility = Facility.objects.create(name="MyFac")
        user = FacilityUser.objects.create(username="user", facility=facility)
        content_ids = ("f2332710c2fd483386cdeb5ecbdda81f",)
        channel_id = "6199dde695db4ee4ab392222d5af1e5c"
        ContentSummaryLog.objects.create(
            channel_id=channel_id,
            content_id=content_ids[0],
            user_id=user.id,
            start_timestamp=timezone.now(),
            kind="audio",
        )
        # create log with progress of 1
        # should not show up in api response
        ContentSummaryLog.objects.create(
            channel_id=channel_id,
            content_id="ce603df7c46b424b934348995e1b05fb",
            user_id=user.id,
            progress=1,
            start_timestamp=timezone.now(),
            kind="audio",
        )

        # create log for non existent content id
        # should not show up in api response
        ContentSummaryLog.objects.create(
            channel_id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            user_id=user.id,
            start_timestamp=timezone.now(),
            kind="content",
        )
        user.set_password(DUMMY_PASSWORD)
        user.save()
        return user, content_ids

    def test_resume(self):
        user, expected_content_ids = self._create_summary_logs()
        self.client.login(username=user.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse("kolibri:core:contentnode_slim-resume", kwargs={"pk": user.id})
        )
        response_content_ids = set(node["content_id"] for node in response.json())
        self.assertSetEqual(set(expected_content_ids), response_content_ids)

    def test_resume_wrong_id(self):
        user, expected_content_ids = self._create_summary_logs()
        self.client.login(username=user.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse("kolibri:core:contentnode_slim-resume", kwargs={"pk": "wrong"})
        )
        response_content_ids = [node["content_id"] for node in response.json()]
        self.assertEqual([], response_content_ids)

    def test_resume_ten_minute_cache(self):
        user, expected_content_ids = self._create_summary_logs()
        self.client.login(username=user.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse("kolibri:core:contentnode_slim-resume", kwargs={"pk": user.id})
        )
        self.assertEqual(response["Cache-Control"], "max-age=600")

    def test_next_steps_prereq(self):
        facility = Facility.objects.create(name="MyFac")
        user = FacilityUser.objects.create(username="user", facility=facility)
        root = content.ContentNode.objects.get(title="root")
        ContentSummaryLog.objects.create(
            channel_id=root.channel_id,
            content_id=root.content_id,
            user_id=user.id,
            progress=1,
            start_timestamp=timezone.now(),
            kind="audio",
        )
        user.set_password(DUMMY_PASSWORD)
        user.save()
        self.client.login(username=user.username, password=DUMMY_PASSWORD)
        post_req = root.prerequisite_for.first()
        expected_content_ids = (post_req.content_id,)
        response = self.client.get(
            reverse("kolibri:core:contentnode_slim-next-steps", kwargs={"pk": user.id})
        )
        response_content_ids = set(node["content_id"] for node in response.json())
        self.assertSetEqual(set(expected_content_ids), response_content_ids)

    def test_next_steps_prereq_ten_minute_cache(self):
        facility = Facility.objects.create(name="MyFac")
        user = FacilityUser.objects.create(username="user", facility=facility)
        root = content.ContentNode.objects.get(title="root")
        ContentSummaryLog.objects.create(
            channel_id=root.channel_id,
            content_id=root.content_id,
            user_id=user.id,
            progress=1,
            start_timestamp=timezone.now(),
            kind="audio",
        )
        user.set_password(DUMMY_PASSWORD)
        user.save()
        self.client.login(username=user.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse("kolibri:core:contentnode_slim-next-steps", kwargs={"pk": user.id})
        )
        self.assertEqual(response["Cache-Control"], "max-age=600")

    def test_next_steps_prereq_wrong_id(self):
        facility = Facility.objects.create(name="MyFac")
        user = FacilityUser.objects.create(username="user", facility=facility)
        root = content.ContentNode.objects.get(title="root")
        ContentSummaryLog.objects.create(
            channel_id=root.channel_id,
            content_id=root.content_id,
            user_id=user.id,
            progress=1,
            start_timestamp=timezone.now(),
            kind="audio",
        )
        user.set_password(DUMMY_PASSWORD)
        user.save()
        self.client.login(username=user.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse("kolibri:core:contentnode_slim-next-steps", kwargs={"pk": "wrong"})
        )
        response_content_ids = [node["content_id"] for node in response.json()]
        self.assertEqual([], response_content_ids)

    def test_next_steps_prereq_in_progress(self):
        facility = Facility.objects.create(name="MyFac")
        user = FacilityUser.objects.create(username="user", facility=facility)
        root = content.ContentNode.objects.get(title="root")
        ContentSummaryLog.objects.create(
            channel_id=root.channel_id,
            content_id=root.content_id,
            user_id=user.id,
            progress=1,
            start_timestamp=timezone.now(),
            kind="audio",
        )
        user.set_password(DUMMY_PASSWORD)
        user.save()
        self.client.login(username=user.username, password=DUMMY_PASSWORD)
        post_req = root.prerequisite_for.first()
        ContentSummaryLog.objects.create(
            channel_id=post_req.channel_id,
            content_id=post_req.content_id,
            user_id=user.id,
            progress=0.5,
            start_timestamp=timezone.now(),
            kind="audio",
        )
        expected_content_ids = []
        response = self.client.get(
            reverse("kolibri:core:contentnode_slim-next-steps", kwargs={"pk": user.id})
        )
        response_content_ids = set(node["content_id"] for node in response.json())
        self.assertSetEqual(set(expected_content_ids), response_content_ids)

    def test_next_steps_prereq_coach_content_not_coach(self):
        facility = Facility.objects.create(name="MyFac")
        user = FacilityUser.objects.create(username="user", facility=facility)
        root = content.ContentNode.objects.get(title="root")
        ContentSummaryLog.objects.create(
            channel_id=root.channel_id,
            content_id=root.content_id,
            user_id=user.id,
            progress=1,
            start_timestamp=timezone.now(),
            kind="audio",
        )
        user.set_password(DUMMY_PASSWORD)
        user.save()
        self.client.login(username=user.username, password=DUMMY_PASSWORD)
        post_req = root.prerequisite_for.first()
        post_req.coach_content = True
        post_req.save()
        response = self.client.get(
            reverse("kolibri:core:contentnode_slim-next-steps", kwargs={"pk": user.id})
        )
        response_content_ids = set(node["content_id"] for node in response.json())
        self.assertSetEqual(set(), response_content_ids)

    def test_next_steps_prereq_coach_content_coach(self):
        facility = Facility.objects.create(name="MyFac")
        user = FacilityUser.objects.create(username="user", facility=facility)
        facility.add_coach(user)
        root = content.ContentNode.objects.get(title="root")
        ContentSummaryLog.objects.create(
            channel_id=root.channel_id,
            content_id=root.content_id,
            user_id=user.id,
            progress=1,
            start_timestamp=timezone.now(),
            kind="audio",
        )
        user.set_password(DUMMY_PASSWORD)
        user.save()
        self.client.login(username=user.username, password=DUMMY_PASSWORD)
        post_req = root.prerequisite_for.first()
        post_req.coach_content = True
        post_req.save()
        expected_content_ids = (post_req.content_id,)
        response = self.client.get(
            reverse("kolibri:core:contentnode_slim-next-steps", kwargs={"pk": user.id})
        )
        response_content_ids = set(node["content_id"] for node in response.json())
        self.assertSetEqual(set(expected_content_ids), response_content_ids)

    def test_next_steps_sibling(self):
        facility = Facility.objects.create(name="MyFac")
        user = FacilityUser.objects.create(username="user", facility=facility)
        node = content.ContentNode.objects.get(
            content_id="ce603df7c46b424b934348995e1b05fb"
        )
        ContentSummaryLog.objects.create(
            channel_id=node.channel_id,
            content_id=node.content_id,
            user_id=user.id,
            progress=1,
            start_timestamp=timezone.now(),
            kind="audio",
        )
        user.set_password(DUMMY_PASSWORD)
        user.save()
        self.client.login(username=user.username, password=DUMMY_PASSWORD)
        sibling = node.get_next_sibling()
        expected_content_ids = (sibling.content_id,)
        response = self.client.get(
            reverse("kolibri:core:contentnode_slim-next-steps", kwargs={"pk": user.id})
        )
        response_content_ids = set(node["content_id"] for node in response.json())
        self.assertSetEqual(set(expected_content_ids), response_content_ids)

    def test_next_steps_sibling_in_progress(self):
        facility = Facility.objects.create(name="MyFac")
        user = FacilityUser.objects.create(username="user", facility=facility)
        node = content.ContentNode.objects.get(
            content_id="ce603df7c46b424b934348995e1b05fb"
        )
        ContentSummaryLog.objects.create(
            channel_id=node.channel_id,
            content_id=node.content_id,
            user_id=user.id,
            progress=1,
            start_timestamp=timezone.now(),
            kind="audio",
        )
        user.set_password(DUMMY_PASSWORD)
        user.save()
        self.client.login(username=user.username, password=DUMMY_PASSWORD)
        sibling = node.get_next_sibling()
        ContentSummaryLog.objects.create(
            channel_id=sibling.channel_id,
            content_id=sibling.content_id,
            user_id=user.id,
            progress=0.5,
            start_timestamp=timezone.now(),
            kind="audio",
        )
        expected_content_ids = []
        response = self.client.get(
            reverse("kolibri:core:contentnode_slim-next-steps", kwargs={"pk": user.id})
        )
        response_content_ids = set(node["content_id"] for node in response.json())
        self.assertSetEqual(set(expected_content_ids), response_content_ids)

    def test_next_steps_sibling_coach_content_not_coach(self):
        facility = Facility.objects.create(name="MyFac")
        user = FacilityUser.objects.create(username="user", facility=facility)
        node = content.ContentNode.objects.get(
            content_id="ce603df7c46b424b934348995e1b05fb"
        )
        ContentSummaryLog.objects.create(
            channel_id=node.channel_id,
            content_id=node.content_id,
            user_id=user.id,
            progress=1,
            start_timestamp=timezone.now(),
            kind="audio",
        )
        user.set_password(DUMMY_PASSWORD)
        user.save()
        self.client.login(username=user.username, password=DUMMY_PASSWORD)
        sibling = node.get_next_sibling()
        sibling.coach_content = True
        sibling.save()
        response = self.client.get(
            reverse("kolibri:core:contentnode_slim-next-steps", kwargs={"pk": user.id})
        )
        response_content_ids = set(node["content_id"] for node in response.json())
        self.assertSetEqual(set(), response_content_ids)

    def test_next_steps_sibling_coach_content_coach(self):
        facility = Facility.objects.create(name="MyFac")
        user = FacilityUser.objects.create(username="user", facility=facility)
        facility.add_coach(user)
        node = content.ContentNode.objects.get(
            content_id="ce603df7c46b424b934348995e1b05fb"
        )
        ContentSummaryLog.objects.create(
            channel_id=node.channel_id,
            content_id=node.content_id,
            user_id=user.id,
            progress=1,
            start_timestamp=timezone.now(),
            kind="audio",
        )
        user.set_password(DUMMY_PASSWORD)
        user.save()
        self.client.login(username=user.username, password=DUMMY_PASSWORD)
        sibling = node.get_next_sibling()
        sibling.coach_content = True
        sibling.save()
        expected_content_ids = (sibling.content_id,)
        response = self.client.get(
            reverse("kolibri:core:contentnode_slim-next-steps", kwargs={"pk": user.id})
        )
        response_content_ids = set(node["content_id"] for node in response.json())
        self.assertSetEqual(set(expected_content_ids), response_content_ids)

    def tearDown(self):
        """
        clean up files/folders created during the test
        """
        cache.clear()
        super(ContentNodeAPITestCase, self).tearDown()


def mock_patch_decorator(func):
    def wrapper(*args, **kwargs):
        mock_object = mock.Mock()
        mock_object.json.return_value = [{"id": 1, "name": "studio"}]
        with mock.patch.object(requests, "get", return_value=mock_object):
            return func(*args, **kwargs)

    return wrapper


class KolibriStudioAPITestCase(APITestCase):
    def setUp(self):
        DeviceSettings.objects.create(is_provisioned=True)
        self.facility = Facility.objects.create(name="facility")
        superuser = FacilityUser.objects.create(
            username="superuser", facility=self.facility
        )
        superuser.set_password(DUMMY_PASSWORD)
        superuser.save()
        DevicePermissions.objects.create(user=superuser, is_superuser=True)
        self.client.login(username=superuser.username, password=DUMMY_PASSWORD)

    @mock_patch_decorator
    def test_channel_list(self):
        response = self.client.get(
            reverse("kolibri:core:remotechannel-list"), format="json"
        )
        self.assertEqual(response.data[0]["id"], 1)

    @mock_patch_decorator
    def test_no_permission_non_superuser_channel_list(self):
        user = FacilityUser.objects.create(username="user", facility=self.facility)
        user.set_password(DUMMY_PASSWORD)
        user.save()
        self.client.logout()
        self.client.login(username=user.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse("kolibri:core:remotechannel-list"), format="json"
        )
        self.assertEqual(response.status_code, 403)

    @mock_patch_decorator
    def test_channel_retrieve(self):
        response = self.client.get(
            reverse("kolibri:core:remotechannel-detail", kwargs={"pk": "abc"}),
            format="json",
        )
        self.assertEqual(response.data[0]["name"], "studio")

    @mock_patch_decorator
    def test_channel_info_cache(self):
        self.client.get(
            reverse("kolibri:core:remotechannel-detail", kwargs={"pk": "abc"}),
            format="json",
        )
        with mock.patch.object(cache, "set") as mock_cache_set:
            self.client.get(
                reverse("kolibri:core:remotechannel-detail", kwargs={"pk": "abc"}),
                format="json",
            )
            self.assertFalse(mock_cache_set.called)

    @mock_patch_decorator
    def test_channel_info_404(self):
        mock_object = mock.Mock()
        mock_object.status_code = 404
        requests.get.return_value = mock_object
        response = self.client.get(
            reverse("kolibri:core:remotechannel-detail", kwargs={"pk": "abc"}),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def tearDown(self):
        cache.clear()
