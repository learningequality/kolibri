"""
To run this test, type this in command line <kolibri manage test -- kolibri.core.content>
"""

import datetime
import time
import unittest
import uuid
from base64 import urlsafe_b64decode

import mock
from django.conf import settings
from django.core.cache import cache
from django.test import LiveServerTestCase
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from le_utils.constants import content_kinds
from le_utils.constants import library as library_constants
from le_utils.constants import modalities
from rest_framework import status

from kolibri.core import error_constants
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.test.helpers import KolibriAPITestCase as APITestCase
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content import models as content
from kolibri.core.content.api import NUM_CHILDREN
from kolibri.core.content.test.helpers import ChannelBuilder
from kolibri.core.content.utils.paths import get_v2_channel_lookup_url
from kolibri.core.device.models import ContentCacheKey
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.core.discovery.models import NetworkLocation
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationConnectionFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseTimeout
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.utils.tests.helpers import override_option

DUMMY_PASSWORD = "password"


class ContentNodeTestBase:
    """
    Basecase for content metadata methods
    """

    databases = "__all__"

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

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = Facility.objects.create(name="facility")
        cls.admin = FacilityUser.objects.create(username="admin", facility=cls.facility)
        cls.admin.set_password(DUMMY_PASSWORD)
        cls.admin.save()
        cls.facility.add_admin(cls.admin)

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


kind_activity_map = {
    content_kinds.EXERCISE: "practice",
    content_kinds.VIDEO: "watch",
    content_kinds.AUDIO: "listen",
    content_kinds.DOCUMENT: "read",
    content_kinds.HTML5: "explore",
}


def infer_learning_activity(kind):
    activity = kind_activity_map.get(kind)
    if activity:
        return [activity]
    return []


class ContentNodeAPIBase:
    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"
    baseurl = None

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = Facility.objects.create(name="facility")
        cls.admin = FacilityUser.objects.create(username="admin", facility=cls.facility)
        cls.admin.set_password(DUMMY_PASSWORD)
        cls.admin.save()
        cls.facility.add_admin(cls.admin)

    def setUp(self):
        self.client_cache = {}

    def _get(self, *args, **kwargs):
        return self.client.get(*args, **kwargs)

    def _cached_get(self, path, *args, **kwargs):
        cached_resp = self.client_cache.get(path)
        if cached_resp:
            self.assertTrue(cached_resp.has_header("ETag"))
            kwargs["HTTP_IF_NONE_MATCH"] = cached_resp["ETag"]
        resp = self.client.get(path, *args, **kwargs)
        if resp.status_code == 200:
            if resp.has_header("ETag"):
                self.client_cache[path] = resp
            else:
                self.client_cache.pop(path, None)
        return resp

    def map_language(self, lang):
        if lang:
            return {
                f: getattr(lang, f)
                for f in [
                    "id",
                    "lang_code",
                    "lang_subcode",
                    "lang_name",
                    "lang_direction",
                ]
            }

    def _assert_node(self, actual, expected):
        assessmentmetadata = (
            expected.assessmentmetadata.all()
            .values(
                "assessment_item_ids",
                "number_of_assessments",
                "mastery_model",
                "randomize",
                "is_manipulable",
                "contentnode",
            )
            .first()
        )
        thumbnail = None
        files = []
        for f in expected.files.all():
            ("local_file__id",)
            ("local_file__available",)
            ("local_file__file_size",)
            ("local_file__extension",)
            ("lang_id",)
            file = {}
            for field in [
                "id",
                "priority",
                "preset",
                "supplementary",
                "thumbnail",
            ]:
                file[field] = getattr(f, field)
            file["checksum"] = f.local_file_id
            for field in [
                "available",
                "file_size",
                "extension",
            ]:
                file[field] = getattr(f.local_file, field)
            file["lang"] = self.map_language(f.lang)
            file["storage_url"] = f.get_storage_url()
            if self.baseurl and file["storage_url"]:
                file["storage_url"] += "?baseurl={}".format(self.baseurl)
            files.append(file)
            if f.thumbnail:
                thumbnail = f.get_storage_url()
                if self.baseurl and thumbnail:
                    thumbnail += "?baseurl={}".format(self.baseurl)
        files = sorted(files, key=lambda x: x["id"])
        actual["files"] = sorted(actual["files"], key=lambda x: x["id"])
        self.assertEqual(
            actual,
            {
                "id": expected.id,
                "available": expected.available,
                "author": expected.author,
                "channel_id": expected.channel_id,
                "coach_content": expected.coach_content,
                "content_id": expected.content_id,
                "description": expected.description,
                "duration": expected.duration,
                "learning_activities": (
                    expected.learning_activities.split(",")
                    if expected.learning_activities
                    else []
                ),
                "learner_needs": (
                    expected.learner_needs.split(",") if expected.learner_needs else []
                ),
                "grade_levels": (
                    expected.grade_levels.split(",") if expected.grade_levels else []
                ),
                "resource_types": (
                    expected.resource_types.split(",")
                    if expected.resource_types
                    else []
                ),
                "accessibility_labels": (
                    expected.accessibility_labels.split(",")
                    if expected.accessibility_labels
                    else []
                ),
                "categories": (
                    expected.categories.split(",") if expected.categories else []
                ),
                "kind": expected.kind,
                "lang": self.map_language(expected.lang),
                "license_description": expected.license_description,
                "license_name": expected.license_name,
                "license_owner": expected.license_owner,
                "num_coach_contents": expected.num_coach_contents,
                "on_device_resources": expected.on_device_resources,
                "options": expected.options,
                "parent": expected.parent_id,
                "sort_order": expected.sort_order,
                "title": expected.title,
                "lft": expected.lft,
                "rght": expected.rght,
                "tree_id": expected.tree_id,
                "ancestors": [],
                "tags": list(
                    expected.tags.all()
                    .order_by("tag_name")
                    .values_list("tag_name", flat=True)
                ),
                "thumbnail": thumbnail,
                "assessmentmetadata": assessmentmetadata,
                "is_leaf": expected.kind != "topic",
                "files": files,
                "admin_imported": bool(expected.admin_imported),
                "modality": expected.modality,
            },
        )

    def _assert_nodes(self, data, nodes):
        for actual, expected in zip(
            sorted(data, key=lambda x: x["id"]), sorted(nodes, key=lambda x: x.id)
        ):
            self._assert_node(actual, expected)

    def test_contentnode_list(self):
        root = content.ContentNode.objects.get(title="root")
        nodes = root.get_descendants(include_self=True).filter(available=True)
        expected_output = len(nodes)
        response = self._get(reverse("kolibri:core:contentnode-list"))
        self.assertEqual(len(response.data), expected_output)
        self._assert_nodes(response.data, nodes)

    def test_contentnode_channel_metadata_label_absent_in_internal_api(self):
        response = self._get(
            reverse("kolibri:core:contentnode-list"), data={"max_results": 5}
        )
        self.assertEqual(response.status_code, 200)
        if not self.baseurl:
            self.assertNotIn("channels", response.data.get("labels"))
        else:
            self.assertIn("channels", response.data.get("labels"))

    def test_contentnode_channel_metadata_label_present_in_public_api(self):
        response = self._get(
            reverse("kolibri:core:publiccontentnode-list"), data={"max_results": 5}
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("channels", response.data.get("labels"))

    def test_contentnode_etag(self):
        root = content.ContentNode.objects.get(title="root")
        nodes = root.get_descendants(include_self=True).filter(available=True)
        expected_len = len(nodes)
        url = reverse("kolibri:core:contentnode-list")

        # A new response should be received with no cached response.
        self.assertNotIn(url, self.client_cache)
        cache_key = str(ContentCacheKey.get_cache_key())
        expected_etag = '"{}"'.format(cache_key)
        response = self._cached_get(url)
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("HTTP_IF_NONE_MATCH", response.request)
        self.assertEqual(len(response.data), expected_len)
        self.assertEqual(response.headers["ETag"], expected_etag)
        self.assertIn(url, self.client_cache)
        cached_response = self.client_cache[url]
        self.assertEqual(len(cached_response.data), expected_len)

        # 304 Not Modified should be returned when the content cache key
        # ETag hasn't changed.
        response = self._cached_get(url)
        self.assertEqual(response.status_code, 304)
        self.assertIn("HTTP_IF_NONE_MATCH", response.request)
        self.assertEqual(response.request["HTTP_IF_NONE_MATCH"], expected_etag)
        self.assertEqual(response.content, b"")
        self.assertEqual(response.headers["ETag"], '"{}"'.format(cache_key))

        # Update the content cache key to get a new response.
        time.sleep(0.01)
        ContentCacheKey.update_cache_key()
        cache_key = str(ContentCacheKey.get_cache_key())
        old_expected_etag = expected_etag
        expected_etag = '"{}"'.format(cache_key)
        response = self._cached_get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn("HTTP_IF_NONE_MATCH", response.request)
        self.assertEqual(response.request["HTTP_IF_NONE_MATCH"], old_expected_etag)
        self.assertEqual(len(response.data), expected_len)
        self.assertEqual(response.headers["ETag"], '"{}"'.format(cache_key))
        old_cached_response = cached_response
        cached_response = self.client_cache[url]
        self.assertEqual(len(cached_response.data), expected_len)
        self.assertNotEqual(cached_response, old_cached_response)

        # 304 Not Modified should be returned again since the content
        # cache key hasn't changed.
        response = self._cached_get(url)
        self.assertEqual(response.status_code, 304)
        self.assertIn("HTTP_IF_NONE_MATCH", response.request)
        self.assertEqual(response.request["HTTP_IF_NONE_MATCH"], expected_etag)
        self.assertEqual(response.content, b"")
        self.assertEqual(response.headers["ETag"], '"{}"'.format(cache_key))

    def _recurse_and_assert(self, data, nodes, recursion_depth=0):
        recursion_depths = []
        nodes_by_id = {n.id: n for n in nodes}
        for actual in data:
            expected = nodes_by_id[actual["id"]]
            children = actual.pop("children", None)
            self._assert_node(actual, expected)
            if children:
                child_nodes = content.ContentNode.objects.filter(
                    available=True, parent=expected
                ).order_by("lft")
                if children["more"] is None:
                    self.assertEqual(len(child_nodes), len(children["results"]))
                else:
                    self.assertGreater(len(child_nodes), len(children["results"]))
                    self.assertEqual(children["more"]["id"], expected.id)
                    self.assertEqual(
                        children["more"]["params"]["next__gt"], child_nodes[11].rght
                    )
                    self.assertEqual(
                        children["more"]["params"]["depth"], 2 - recursion_depth
                    )
                    if self.baseurl:
                        self.assertEqual(
                            children["more"]["params"]["baseurl"], self.baseurl
                        )
                recursion_depths.append(
                    self._recurse_and_assert(
                        children["results"],
                        child_nodes,
                        recursion_depth=recursion_depth + 1,
                    )
                )
        return recursion_depth if not recursion_depths else max(recursion_depths)

    def test_contentnode_tree(self):
        root = content.ContentNode.objects.get(title="root")
        response = self._get(
            reverse("kolibri:core:contentnode_tree-detail", kwargs={"pk": root.id})
        )
        self._recurse_and_assert([response.data], [root])

    def test_contentnode_tree_filtered_queryset_node(self):
        root = content.ContentNode.objects.get(title="root")
        response = self.client.get(
            reverse("kolibri:core:contentnode_tree-detail", kwargs={"pk": root.id})
            + "?parent={}".format(uuid.uuid4().hex)
        )
        self.assertEqual(response.status_code, 404)

    def test_contentnode_tree_none_pk(self):
        response = self.client.get("/api/content/contentnode_tree/")
        self.assertEqual(response.status_code, 404)

    def test_contentnode_tree_bad_pk(self):
        response = self.client.get(
            reverse(
                "kolibri:core:contentnode_tree-detail",
                kwargs={"pk": "this is not UUID"},
            )
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Invalid UUID format.")

    @unittest.skipIf(
        getattr(settings, "DATABASES")["default"]["ENGINE"]
        == "django.db.backends.postgresql",
        "Skipping postgres as not as vulnerable to large queries and large insertions are less performant",
    )
    def test_contentnode_tree_long(self):
        # One past a page triggers the "more" marker at both root and child levels.
        builder = ChannelBuilder(levels=2, num_children=NUM_CHILDREN + 1)
        builder.insert_into_default_db()
        content.ContentNode.objects.all().update(available=True)
        root = content.ContentNode.objects.get(id=builder.root_node["id"])
        response = self._get(
            reverse("kolibri:core:contentnode_tree-detail", kwargs={"pk": root.id})
        )
        self._recurse_and_assert([response.data], [root])

    def test_contentnode_tree_depth_1(self):
        root = content.ContentNode.objects.get(title="root")
        response = self._get(
            reverse("kolibri:core:contentnode_tree-detail", kwargs={"pk": root.id}),
            data={"depth": 1},
        )
        self._recurse_and_assert([response.data], [root])

    @unittest.skipIf(
        getattr(settings, "DATABASES")["default"]["ENGINE"]
        == "django.db.backends.postgresql",
        "Skipping postgres as not as vulnerable to large queries and large insertions are less performant",
    )
    def test_contentnode_tree_next__gt(self):
        # A page plus a partial second page, so paging past the first returns
        # the remainder with no further "more" marker.
        remainder = 5
        builder = ChannelBuilder(levels=2, num_children=NUM_CHILDREN + remainder)
        builder.insert_into_default_db()
        content.ContentNode.objects.all().update(available=True)
        root = content.ContentNode.objects.get(id=builder.root_node["id"])
        next__gt = content.ContentNode.objects.filter(parent=root)[
            NUM_CHILDREN - 1
        ].rght
        response = self._get(
            reverse("kolibri:core:contentnode_tree-detail", kwargs={"pk": root.id}),
            data={"next__gt": next__gt},
        )
        self.assertEqual(len(response.data["children"]["results"]), remainder)
        self.assertIsNone(response.data["children"]["more"])
        first_node = content.ContentNode.objects.filter(parent=root)[NUM_CHILDREN]
        self._recurse_and_assert(
            [response.data["children"]["results"][0]], [first_node], recursion_depth=1
        )

    @unittest.skipIf(
        getattr(settings, "DATABASES")["default"]["ENGINE"]
        == "django.db.backends.postgresql",
        "Skipping postgres as not as vulnerable to large queries and large insertions are less performant",
    )
    def test_contentnode_tree_more(self):
        # A page plus a partial second page, so following the "more" marker
        # returns the remainder with no further marker.
        remainder = 5
        builder = ChannelBuilder(levels=2, num_children=NUM_CHILDREN + remainder)
        builder.insert_into_default_db()
        content.ContentNode.objects.all().update(available=True)
        root = content.ContentNode.objects.get(id=builder.root_node["id"])
        response = self._get(
            reverse("kolibri:core:contentnode_tree-detail", kwargs={"pk": root.id})
        )
        first_child = response.data["children"]["results"][0]
        self.assertEqual(first_child["children"]["more"]["params"]["depth"], 1)
        nested_page_response = self._get(
            reverse(
                "kolibri:core:contentnode_tree-detail",
                kwargs={"pk": first_child["children"]["more"]["id"]},
            ),
            data=first_child["children"]["more"]["params"],
        )
        self.assertEqual(
            len(nested_page_response.data["children"]["results"]), remainder
        )
        self.assertIsNone(nested_page_response.data["children"]["more"])

    def test_contentnode_tree_singleton_path(self):
        builder = ChannelBuilder(levels=5, num_children=1)
        builder.insert_into_default_db()
        content.ContentNode.objects.all().update(available=True)
        root = content.ContentNode.objects.get(id=builder.root_node["id"])
        response = self._get(
            reverse("kolibri:core:contentnode_tree-detail", kwargs={"pk": root.id})
        )
        max_depth = self._recurse_and_assert([response.data], [root])
        # Should recurse all the way down the tree through a total of 6 levels
        # including the root.
        self.assertEqual(max_depth, 6)

    def test_contentnode_tree_singleton_child(self):
        builder = ChannelBuilder(levels=5, num_children=2)
        builder.insert_into_default_db()
        content.ContentNode.objects.all().update(available=True)
        root = content.ContentNode.objects.get(id=builder.root_node["id"])
        first_child = root.children.first()
        first_child.available = False
        first_child.save()
        response = self._get(
            reverse("kolibri:core:contentnode_tree-detail", kwargs={"pk": root.id})
        )
        max_depth = self._recurse_and_assert([response.data], [root])
        # Should recurse an extra level to find multiple descendants under the first grandchild.
        self.assertEqual(max_depth, 3)

    def test_contentnode_tree_singleton_grandchild(self):
        builder = ChannelBuilder(levels=5, num_children=2)
        builder.insert_into_default_db()
        content.ContentNode.objects.all().update(available=True)
        root = content.ContentNode.objects.get(id=builder.root_node["id"])
        first_grandchild = root.children.first().children.first()
        first_grandchild.available = False
        first_grandchild.save()
        response = self._get(
            reverse("kolibri:core:contentnode_tree-detail", kwargs={"pk": root.id})
        )
        max_depth = self._recurse_and_assert([response.data], [root])
        # Should recurse an extra level to find multiple descendants under the first child.
        self.assertEqual(max_depth, 3)


class ContentNodeAPITestCase(ContentNodeAPIBase, APITestCase):
    """
    Testcase for content API methods
    """

    databases = "__all__"

    maxDiff = None

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

    @mock.patch("kolibri.core.content.api.get_channel_stats_from_studio")
    def test_contentnode_granular_network_import(self, stats_mock):
        c1 = content.ContentNode.objects.get(title="root")
        c1_id = c1.id
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
                "modality": None,
                "is_leaf": False,
                "available": False,
                "total_resources": 2,
                "on_device_resources": 0,
                "coach_content": False,
                "importable": True,
                "num_coach_contents": 0,
                "new_resource": False,
                "num_new_resources": 0,
                "updated_resource": False,
                "ancestors": list(c1.get_ancestors().values("id", "title")),
                "children": [
                    {
                        "id": c2_id,
                        "title": "c1",
                        "kind": "video",
                        "modality": None,
                        "is_leaf": True,
                        "available": False,
                        "total_resources": 1,
                        "on_device_resources": 0,
                        "importable": True,
                        "coach_content": False,
                        "num_coach_contents": 0,
                        "new_resource": False,
                        "num_new_resources": 0,
                        "updated_resource": False,
                    },
                    {
                        "id": c3_id,
                        "title": "c2",
                        "kind": "topic",
                        "modality": None,
                        "is_leaf": False,
                        "available": False,
                        "total_resources": 1,
                        "on_device_resources": 0,
                        "importable": True,
                        "coach_content": False,
                        "num_coach_contents": 0,
                        "new_resource": False,
                        "num_new_resources": 0,
                        "updated_resource": False,
                    },
                ],
            },
        )

    @mock.patch("kolibri.core.content.api.get_channel_stats_from_disk")
    def test_contentnode_granular_local_import(self, stats_mock):
        content.LocalFile.objects.update(available=False)
        content.ContentNode.objects.update(available=False)

        c1 = content.ContentNode.objects.get(title="root")
        c1_id = c1.id
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
                "modality": None,
                "is_leaf": False,
                "available": False,
                "total_resources": 1,
                "on_device_resources": 0,
                "importable": True,
                "coach_content": False,
                "num_coach_contents": 0,
                "new_resource": False,
                "num_new_resources": 0,
                "updated_resource": False,
                "ancestors": list(c1.get_ancestors().values("id", "title")),
                "children": [
                    {
                        "id": c2_id,
                        "title": "c1",
                        "kind": "video",
                        "modality": None,
                        "is_leaf": True,
                        "available": False,
                        "total_resources": 0,
                        "on_device_resources": 0,
                        "importable": False,
                        "coach_content": False,
                        "num_coach_contents": 0,
                        "new_resource": False,
                        "num_new_resources": 0,
                        "updated_resource": False,
                    },
                    {
                        "id": c3_id,
                        "title": "c2",
                        "kind": "topic",
                        "modality": None,
                        "is_leaf": False,
                        "available": False,
                        "total_resources": 1,
                        "on_device_resources": 0,
                        "importable": True,
                        "coach_content": False,
                        "num_coach_contents": 0,
                        "new_resource": False,
                        "num_new_resources": 0,
                        "updated_resource": False,
                    },
                ],
            },
        )

    @mock.patch("kolibri.core.content.api.get_channel_stats_from_peer")
    def test_contentnode_granular_remote_import(self, stats_mock):
        content.LocalFile.objects.update(available=False)
        content.ContentNode.objects.update(available=False)

        c1 = content.ContentNode.objects.get(title="root")
        c1_id = c1.id
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
                "modality": None,
                "is_leaf": False,
                "available": False,
                "total_resources": 1,
                "on_device_resources": 0,
                "importable": True,
                "coach_content": False,
                "num_coach_contents": 0,
                "new_resource": False,
                "num_new_resources": 0,
                "updated_resource": False,
                "ancestors": list(c1.get_ancestors().values("id", "title")),
                "children": [
                    {
                        "id": c2_id,
                        "title": "c1",
                        "kind": "video",
                        "modality": None,
                        "is_leaf": True,
                        "available": False,
                        "total_resources": 0,
                        "on_device_resources": 0,
                        "importable": False,
                        "coach_content": False,
                        "num_coach_contents": 0,
                        "new_resource": False,
                        "num_new_resources": 0,
                        "updated_resource": False,
                    },
                    {
                        "id": c3_id,
                        "title": "c2",
                        "kind": "topic",
                        "modality": None,
                        "is_leaf": False,
                        "available": False,
                        "total_resources": 1,
                        "on_device_resources": 0,
                        "importable": True,
                        "coach_content": False,
                        "num_coach_contents": 0,
                        "new_resource": False,
                        "num_new_resources": 0,
                        "updated_resource": False,
                    },
                ],
            },
        )

    def test_contentnode_granular_export_available(self):
        c1 = content.ContentNode.objects.get(title="c1")
        c1_id = c1.id
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
                "modality": None,
                "is_leaf": True,
                "available": True,
                "total_resources": 1,
                "on_device_resources": 1,
                "importable": None,
                "children": [],
                "coach_content": False,
                "num_coach_contents": 0,
                "new_resource": None,
                "num_new_resources": None,
                "updated_resource": None,
                "ancestors": list(c1.get_ancestors().values("id", "title")),
            },
        )

    def test_contentnode_granular_export_unavailable(self):
        c1 = content.ContentNode.objects.get(title="c1")
        c1_id = c1.id
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
                "modality": None,
                "is_leaf": True,
                "available": False,
                "total_resources": 0,
                "on_device_resources": 0,
                "importable": None,
                "children": [],
                "coach_content": False,
                "num_coach_contents": 0,
                "new_resource": None,
                "num_new_resources": None,
                "updated_resource": None,
                "ancestors": list(c1.get_ancestors().values("id", "title")),
            },
        )

    def test_contentnode_granular_includes_modality(self):
        c1 = content.ContentNode.objects.get(title="c1")
        content.ContentNode.objects.filter(pk=c1.pk).update(modality="COURSE")
        response = self.client.get(
            reverse("kolibri:core:contentnode_granular-detail", kwargs={"pk": c1.id}),
            data={"for_export": True},
        )
        self.assertEqual(response.data["modality"], "COURSE")

    def test_contentnode_retrieve(self):
        c1_id = content.ContentNode.objects.get(title="c1").id
        response = self.client.get(
            reverse("kolibri:core:contentnode-detail", kwargs={"pk": c1_id})
        )
        self.assertEqual(response.data["id"], c1_id.__str__())

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

    def test_contentnode_descendants_assessments_surveys_not_included(self):
        c1 = content.ContentNode.objects.filter(kind=content_kinds.EXERCISE).first()
        parent = c1.parent
        parent_id = parent.id
        sibling_survey = content.ContentNode.objects.create(
            pk="6a406ac66b224106aa2e93f73a94333d",
            channel_id=c1.channel_id,
            content_id="ded4a083e75f4689b386fd2b706e792a",
            kind=content_kinds.EXERCISE,
            parent=parent,
            title="sibling survey",
            available=True,
            modality=modalities.SURVEY,
        )
        content.AssessmentMetaData.objects.create(
            id="6a406ac66b224106aa2e93f73a94333d",
            contentnode=sibling_survey,
            # These should not be counted
            number_of_assessments=5,
        )
        sibling_non_survey = content.ContentNode.objects.create(
            pk="6a406ac66b224106aa2e93f73a94333e",
            channel_id=c1.channel_id,
            content_id="ded4a083e75f4689b386fd2b706e792b",
            kind=content_kinds.EXERCISE,
            parent=parent,
            title="sibling exercise",
            available=True,
        )
        sibling_non_survey_assessment_metadata = (
            content.AssessmentMetaData.objects.create(
                id="6a406ac66b224106aa2e93f73a94333e",
                contentnode=sibling_non_survey,
                number_of_assessments=3,
            )
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
            # Number of assesments for survey sibling should not be taken into account
            c1.assessmentmetadata.first().number_of_assessments
            + sibling_non_survey_assessment_metadata.number_of_assessments,
        )

    def test_contentnode_recommendations(self):
        node_id = content.ContentNode.objects.get(title="c2c2").id
        response = self.client.get(
            reverse(
                "kolibri:core:contentnode-recommendations-for", kwargs={"pk": node_id}
            )
        )
        self.assertEqual(len(response.data), 2)

    def test_contentnode_recommendations_does_error_for_unavailable_node(self):
        node = content.ContentNode.objects.get(title="c2c2")
        node.available = False
        node.save()
        node_id = node.id
        response = self.client.get(
            reverse(
                "kolibri:core:contentnode-recommendations-for", kwargs={"pk": node_id}
            )
        )
        self.assertEqual(response.status_code, 404)

    def test_contentnode_ids(self):
        titles = ["c2c2", "c2c3"]
        nodes = [content.ContentNode.objects.get(title=title) for title in titles]
        response = self.client.get(
            reverse("kolibri:core:contentnode-list"),
            data={"ids": ",".join([n.id for n in nodes])},
        )
        self.assertEqual(len(response.data), 2)
        for i in range(len(titles)):
            self.assertEqual(response.data[i]["title"], titles[i])

    def test_contentnode_content_id(self):
        node = content.ContentNode.objects.get(title="c2c2")
        response = self.client.get(
            reverse("kolibri:core:contentnode-list"),
            data={"content_id": node.content_id},
        )
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], node.title)

    def test_contentnode_bad_content_id(self):
        response = self.client.get(
            reverse("kolibri:core:contentnode-list"),
            data={"content_id": "this is not a uuid"},
        )
        self.assertEqual(response.status_code, 400)

    def test_contentnode_parent(self):
        parent = content.ContentNode.objects.get(title="c2")
        children = parent.get_children()
        response = self.client.get(
            reverse("kolibri:core:contentnode-list"),
            data={"parent": parent.id, "include_coach_content": False},
        )
        self.assertEqual(len(response.data), children.count())
        for i in range(len(children)):
            self.assertEqual(response.data[i]["title"], children[i].title)

    def test_contentnode_tags(self):
        expected = {
            "root": ["tag_1", "tag_2", "tag_3"],
            "c1": ["tag_1"],
            "c2": ["tag_2"],
        }
        for title, tags in expected.items():
            node = content.ContentNode.objects.get(title=title)
            response = self.client.get(
                reverse("kolibri:core:contentnode-detail", kwargs={"pk": node.id})
            )
            self.assertEqual(set(response.data["tags"]), set(tags))

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

    def test_channelmetadata_contains_exercise_filter(self):
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
            reverse("kolibri:core:channel-list"), {"contains_exercise": True}
        )
        self.assertEqual(len(with_filter_response.data), 1)
        self.assertEqual(with_filter_response.data[0]["name"], "testing")

    def test_channelmetadata_contains_quiz_filter(self):
        no_quiz_channel = content.ContentNode.objects.create(
            pk="7b406ac66b224106aa2e93f73a94344d",
            channel_id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            kind="topic",
            title="no quiz channel",
        )
        no_quiz_metadata_id = no_quiz_channel.channel_id
        content.ChannelMetadata.objects.create(
            id=no_quiz_metadata_id,
            name="no quiz channel metadata",
            root=no_quiz_channel,
        )
        content.ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=no_quiz_channel.channel_id,
            content_id=uuid.uuid4().hex,
            kind=content_kinds.EXERCISE,
            title="exercise but not quiz",
            parent=no_quiz_channel,
            available=True,
            modality=modalities.SURVEY,
        )

        quiz_channel_id = uuid.uuid4().hex
        quiz_root = content.ContentNode.objects.create(
            pk=uuid.uuid4().hex,
            channel_id=quiz_channel_id,
            content_id=uuid.uuid4().hex,
            kind="topic",
            title="quiz root",
        )
        content.ChannelMetadata.objects.create(
            id=quiz_channel_id,
            name="quiz channel metadata",
            root=quiz_root,
        )
        content.ContentNode.objects.create(
            content_id=uuid.uuid4().hex,
            channel_id=quiz_channel_id,
            description="Quiz content",
            id=uuid.uuid4().hex,
            license_name="GNU",
            license_owner="",
            license_description=None,
            lang_id=None,
            author="",
            title="quiz node",
            parent_id=quiz_root.id,
            kind=content_kinds.EXERCISE,
            coach_content=False,
            available=True,
            modality=modalities.QUIZ,
        )

        no_filter_response = self.client.get(reverse("kolibri:core:channel-list"))
        self.assertGreaterEqual(len(no_filter_response.data), 3)

        with_filter_response = self.client.get(
            reverse("kolibri:core:channel-list"), {"contains_quiz": True}
        )
        self.assertEqual(len(with_filter_response.data), 1)
        returned_ids = {ch["id"] for ch in with_filter_response.data}
        self.assertIn(quiz_channel_id, returned_ids)

    def test_contentnode_contains_quiz_filter(self):
        quiz_channel_id = uuid.uuid4().hex
        quiz_root = content.ContentNode.objects.create(
            pk=uuid.uuid4().hex,
            channel_id=quiz_channel_id,
            content_id=uuid.uuid4().hex,
            kind="topic",
            title="quiz root",
            available=True,
        )
        content.ChannelMetadata.objects.create(
            id=uuid.uuid4().hex,
            name="quiz channel metadata",
            root=quiz_root,
        )

        quiz_node = content.ContentNode.objects.create(
            content_id=uuid.uuid4().hex,
            channel_id=quiz_channel_id,
            description="Blah",
            id=uuid.uuid4().hex,
            license_name="GNU",
            license_owner="",
            license_description=None,
            lang_id=None,
            author="",
            title="quiz node",
            parent_id=quiz_root.id,
            kind=content_kinds.EXERCISE,
            coach_content=False,
            available=True,
            modality=modalities.QUIZ,
        )

        response = self.client.get(
            reverse("kolibri:core:contentnode-list"),
            data={"contains_quiz": True, "channels": quiz_channel_id},
        )
        returned_ids = {n["id"] for n in response.data}
        self.assertIn(quiz_node.id, returned_ids)

    def test_channelmetadata_contains_quiz_filter_false(self):
        quiz_channel_id = uuid.uuid4().hex
        quiz_root = content.ContentNode.objects.create(
            pk=uuid.uuid4().hex,
            channel_id=quiz_channel_id,
            content_id=uuid.uuid4().hex,
            kind=content_kinds.TOPIC,
            title="quiz channel root",
            available=True,
        )
        content.ChannelMetadata.objects.create(
            id=quiz_channel_id, name="quiz channel", root=quiz_root
        )
        content.ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=quiz_channel_id,
            kind=content_kinds.EXERCISE,
            title="quiz node",
            parent=quiz_root,
            available=True,
            modality=modalities.QUIZ,
            license_name="GNU",
            license_owner="",
        )

        no_quiz_channel_id = uuid.uuid4().hex
        no_quiz_root = content.ContentNode.objects.create(
            pk=uuid.uuid4().hex,
            channel_id=no_quiz_channel_id,
            content_id=uuid.uuid4().hex,
            kind=content_kinds.TOPIC,
            title="no quiz channel root",
            available=True,
        )
        content.ChannelMetadata.objects.create(
            id=no_quiz_channel_id, name="no quiz channel", root=no_quiz_root
        )
        content.ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=no_quiz_channel_id,
            kind=content_kinds.VIDEO,
            title="non quiz node",
            parent=no_quiz_root,
            available=True,
            license_name="GNU",
            license_owner="",
        )

        baseline = self.client.get(reverse("kolibri:core:channel-list"))
        self.assertEqual(baseline.status_code, 200)
        baseline_ids = {c["id"] for c in baseline.data}

        # contains_quiz=false should behave like baseline (no filtering)
        false_response = self.client.get(
            reverse("kolibri:core:channel-list"), {"contains_quiz": "false"}
        )
        self.assertEqual(false_response.status_code, 200)
        false_ids = {c["id"] for c in false_response.data}

        self.assertEqual(baseline_ids, false_ids)

        # Check that both channels are in the unfiltered response
        self.assertIn(quiz_channel_id, baseline_ids)
        self.assertIn(no_quiz_channel_id, baseline_ids)

    def test_file_list(self):
        response = self.client.get(reverse("kolibri:core:file-list"))
        self.assertEqual(len(response.data), 10)

    def test_file_retrieve(self):
        response = self.client.get(
            reverse(
                "kolibri:core:file-detail",
                kwargs={"pk": "6bdfea4a01830fdd4a585181c0b8068c"},
            )
        )
        self.assertEqual(response.data["preset"], "high_res_video")

    def test_modality_filter(self):
        # Create a node with a specific modality
        lesson_topic = content.ContentNode.objects.filter(
            kind=content_kinds.TOPIC
        ).first()
        course_topic = content.ContentNode.objects.filter(
            kind=content_kinds.TOPIC
        ).last()

        # Just making sure our fixtures are different so our future assertions are strong
        self.assertNotEqual(lesson_topic.id, course_topic.id)
        self.assertGreater(content.ContentNode.objects.count(), 2)

        lesson_topic.modality = modalities.LESSON
        course_topic.modality = modalities.COURSE

        # Filters will only return available nodes so just to be sure
        lesson_topic.available = True
        course_topic.available = True

        lesson_topic.save()
        course_topic.save()

        response = self.client.get(
            reverse("kolibri:core:contentnode-list"),
            data={"modality": modalities.LESSON},
        )

        self.assertEqual(response.data[0]["id"], str(lesson_topic.id))

        response = self.client.get(
            reverse("kolibri:core:contentnode-list"),
            data={"modality": modalities.COURSE},
        )

        self.assertEqual(response.data[0]["id"], str(course_topic.id))

    def test_exclude_modalities_filter(self):
        # Create a node with a specific modality
        lesson_topic = content.ContentNode.objects.filter(
            kind=content_kinds.TOPIC
        ).first()
        course_topic = content.ContentNode.objects.filter(
            kind=content_kinds.TOPIC
        ).last()

        # Just making sure our fixtures are different so our future assertions are strong
        self.assertNotEqual(lesson_topic.id, course_topic.id)
        self.assertGreater(content.ContentNode.objects.count(), 2)

        lesson_topic.modality = modalities.LESSON
        course_topic.modality = modalities.COURSE

        # Filters will only return available nodes so just to be sure
        lesson_topic.available = True
        course_topic.available = True

        lesson_topic.save()
        course_topic.save()

        response = self.client.get(
            reverse("kolibri:core:contentnode-list"),
            data={"exclude_modalities": f"{modalities.LESSON}"},
        )

        self.assertNotIn(str(lesson_topic.id), [node["id"] for node in response.data])
        self.assertIn(str(course_topic.id), [node["id"] for node in response.data])

    def test_exclude_modalities_filter_multiple(self):
        # Create a node with a specific modality
        lesson_topic = content.ContentNode.objects.filter(
            kind=content_kinds.TOPIC
        ).first()
        course_topic = content.ContentNode.objects.filter(
            kind=content_kinds.TOPIC
        ).last()

        # Just making sure our fixtures are different so our future assertions are strong
        self.assertNotEqual(lesson_topic.id, course_topic.id)
        self.assertGreater(content.ContentNode.objects.count(), 2)

        lesson_topic.modality = modalities.LESSON
        course_topic.modality = modalities.COURSE

        # Filters will only return available nodes so just to be sure
        lesson_topic.available = True
        course_topic.available = True

        lesson_topic.save()
        course_topic.save()

        response = self.client.get(
            reverse("kolibri:core:contentnode-list"),
            data={"exclude_modalities": f"{modalities.LESSON},{modalities.COURSE}"},
        )

        self.assertNotIn(str(lesson_topic.id), [node["id"] for node in response.data])
        self.assertNotIn(str(course_topic.id), [node["id"] for node in response.data])

    def test_exclude_course_ancestry_filter(self):
        # Mark c2 (a topic with children) as a Course
        course_node = content.ContentNode.objects.get(title="c2")
        course_node.modality = modalities.COURSE
        course_node.available = True
        course_node.save()

        # Get the descendants of the course node
        descendant_ids = set(
            str(pk)
            for pk in content.ContentNode.objects.filter(
                tree_id=course_node.tree_id,
                lft__gt=course_node.lft,
                rght__lt=course_node.rght,
            )
            .filter(available=True)
            .values_list("id", flat=True)
        )
        self.assertGreater(len(descendant_ids), 0)

        response = self.client.get(
            reverse("kolibri:core:contentnode-list"),
            data={"exclude_course_ancestry": True},
        )

        result_ids = {node["id"] for node in response.data}

        # Course descendants should be excluded
        self.assertTrue(descendant_ids.isdisjoint(result_ids))

        # The course node itself should still be present
        self.assertIn(str(course_node.id), result_ids)

    def test_exclude_course_ancestry_filter_false(self):
        # Mark c2 as a Course
        course_node = content.ContentNode.objects.get(title="c2")
        course_node.modality = modalities.COURSE
        course_node.available = True
        course_node.save()

        descendant_ids = set(
            str(pk)
            for pk in content.ContentNode.objects.filter(
                tree_id=course_node.tree_id,
                lft__gt=course_node.lft,
                rght__lt=course_node.rght,
            )
            .filter(available=True)
            .values_list("id", flat=True)
        )

        response = self.client.get(
            reverse("kolibri:core:contentnode-list"),
            data={"exclude_course_ancestry": False},
        )

        result_ids = {node["id"] for node in response.data}

        # With false, descendants should NOT be excluded
        self.assertTrue(descendant_ids.issubset(result_ids))

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

    def test_contentnode_progress_list_endpoint(self):
        facility, root, c1, c2, c2c1, c2c3 = self._setup_contentnode_progress()

        response = self.client.get(reverse("kolibri:core:contentnodeprogress-list"))

        def get_progress_fraction(node):
            return list(
                filter(lambda x: x["content_id"] == node.content_id, response.data)
            )[0]["progress"]

        # check that there is no progress when not logged in
        self.assertEqual(len(response.data), 0)

        # check that progress is calculated appropriately when user is logged in
        self.client.login(username="learner", password="pass", facility=facility)

        response = self.client.get(reverse("kolibri:core:contentnodeprogress-list"))

        self.assertEqual(get_progress_fraction(c2c1), 0.7)

    def test_filtering_coach_content_anon(self):
        response = self.client.get(
            reverse("kolibri:core:contentnode-list"),
            data={"include_coach_content": False},
        )
        # TODO make content_test.json fixture more organized. Here just, hardcoding the correct count
        self.assertEqual(len(response.data), 7)

    def test_filtering_coach_content_admin(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse("kolibri:core:contentnode-list"),
            data={"include_coach_content": True},
        )
        expected_output = content.ContentNode.objects.exclude(
            available=False
        ).count()  # coach_content node should be returned
        self.assertEqual(len(response.data), expected_output)

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
        response = self.client.get(
            reverse("kolibri:core:usercontentnode-list"), data={"popular": True}
        )
        response_content_ids = {node["content_id"] for node in response.json()}
        self.assertSetEqual(set(expected_content_ids), response_content_ids)

    def test_popular_no_coach_content(self):
        expected_content_ids = self._create_session_logs()
        node = content.ContentNode.objects.get(content_id=expected_content_ids[0])
        node.coach_content = True
        node.save()
        expected_content_ids = expected_content_ids[1:]
        response = self.client.get(
            reverse("kolibri:core:usercontentnode-list"),
            data={"popular": True, "include_coach_content": False},
        )
        response_content_ids = {node["content_id"] for node in response.json()}
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
        response = self.client.get(
            reverse("kolibri:core:usercontentnode-list"),
            data={"popular": True, "include_coach_content": True},
        )
        response_content_ids = {node["content_id"] for node in response.json()}
        self.assertSetEqual(set(expected_content_ids), response_content_ids)

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
            progress=0.5,
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
            progress=0.5,
        )
        user.set_password(DUMMY_PASSWORD)
        user.save()
        return user, content_ids

    def test_resume(self):
        user, expected_content_ids = self._create_summary_logs()
        self.client.login(username=user.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse("kolibri:core:usercontentnode-list"), data={"resume": True}
        )
        response_content_ids = {node["content_id"] for node in response.json()}
        self.assertSetEqual(set(expected_content_ids), response_content_ids)

    def test_resume_zero_cache(self):
        user, expected_content_ids = self._create_summary_logs()
        self.client.login(username=user.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse("kolibri:core:usercontentnode-list"), data={"resume": True}
        )
        self.assertEqual(response.headers["Cache-Control"], "max-age=0")

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
            reverse("kolibri:core:usercontentnode-list"), data={"next_steps": True}
        )
        response_content_ids = {node["content_id"] for node in response.json()}
        self.assertSetEqual(set(expected_content_ids), response_content_ids)

    def test_next_steps_prereq_zero_cache(self):
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
            reverse("kolibri:core:usercontentnode-list"), data={"next_steps": True}
        )
        self.assertEqual(response.headers["Cache-Control"], "max-age=0")

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
            reverse("kolibri:core:usercontentnode-list"), data={"next_steps": True}
        )
        response_content_ids = {node["content_id"] for node in response.json()}
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
            reverse("kolibri:core:usercontentnode-list"), data={"next_steps": True}
        )
        response_content_ids = {node["content_id"] for node in response.json()}
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
            reverse("kolibri:core:usercontentnode-list"), data={"next_steps": True}
        )
        response_content_ids = {node["content_id"] for node in response.json()}
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
            reverse("kolibri:core:usercontentnode-list"), data={"next_steps": True}
        )
        response_content_ids = {node["content_id"] for node in response.json()}
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
            reverse("kolibri:core:usercontentnode-list"), data={"next_steps": True}
        )
        response_content_ids = {node["content_id"] for node in response.json()}
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
            reverse("kolibri:core:usercontentnode-list"), data={"next_steps": True}
        )
        response_content_ids = {node["content_id"] for node in response.json()}
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
            reverse("kolibri:core:usercontentnode-list"), data={"next_steps": True}
        )
        response_content_ids = {node["content_id"] for node in response.json()}
        self.assertSetEqual(set(expected_content_ids), response_content_ids)

    def test_lesson_filter(self):
        classroom = Classroom.objects.create(name="classroom", parent=self.facility)
        user = FacilityUser.objects.create(username="user", facility=self.facility)
        classroom.add_member(user)
        node = content.ContentNode.objects.get(
            content_id="ce603df7c46b424b934348995e1b05fb"
        )

        resources = [
            {
                "contentnode_id": node.id,
                "content_id": node.content_id,
                "channel_id": node.channel_id,
            }
        ]

        own_lesson = Lesson.objects.create(
            title="Lesson",
            collection=classroom,
            created_by=self.admin,
            is_active=True,
            resources=resources,
        )
        LessonAssignment.objects.create(
            lesson=own_lesson, assigned_by=self.admin, collection=classroom
        )
        user.set_password(DUMMY_PASSWORD)
        user.save()
        self.client.login(username=user.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse("kolibri:core:usercontentnode-list"), data={"lesson": own_lesson.id}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["content_id"], node.content_id)

    def test_lesson_filter_not_own_lesson(self):
        classroom = Classroom.objects.create(name="classroom", parent=self.facility)
        user = FacilityUser.objects.create(username="user", facility=self.facility)
        node = content.ContentNode.objects.get(
            content_id="ce603df7c46b424b934348995e1b05fb"
        )

        resources = [
            {
                "contentnode_id": node.id,
                "content_id": node.content_id,
                "channel_id": node.channel_id,
            }
        ]

        own_lesson = Lesson.objects.create(
            title="Lesson",
            collection=classroom,
            created_by=self.admin,
            is_active=True,
            resources=resources,
        )
        LessonAssignment.objects.create(
            lesson=own_lesson, assigned_by=self.admin, collection=classroom
        )
        user.set_password(DUMMY_PASSWORD)
        user.save()
        self.client.login(username=user.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse("kolibri:core:usercontentnode-list"), data={"lesson": own_lesson.id}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_lesson_filter_multiple_assignment(self):
        classroom = Classroom.objects.create(name="classroom", parent=self.facility)
        user = FacilityUser.objects.create(username="user", facility=self.facility)
        classroom.add_member(user)
        node = content.ContentNode.objects.get(
            content_id="ce603df7c46b424b934348995e1b05fb"
        )

        resources = [
            {
                "contentnode_id": node.id,
                "content_id": node.content_id,
                "channel_id": node.channel_id,
            }
        ]

        own_lesson = Lesson.objects.create(
            title="Lesson",
            collection=classroom,
            created_by=self.admin,
            is_active=True,
            resources=resources,
        )
        LessonAssignment.objects.create(
            lesson=own_lesson, assigned_by=self.admin, collection=classroom
        )
        user.set_password(DUMMY_PASSWORD)
        user.save()
        self.client.login(username=user.username, password=DUMMY_PASSWORD)
        group = LearnerGroup.objects.create(name="Own Group", parent=classroom)
        group.add_member(user)
        LessonAssignment.objects.create(
            lesson=own_lesson, assigned_by=self.admin, collection=group
        )
        self.client.login(username=user.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse("kolibri:core:usercontentnode-list"), data={"lesson": own_lesson.id}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["content_id"], node.content_id)

    def test_remote_content_node_missing_attributes(self):
        with mock.patch("kolibri.core.content.api.NetworkClient") as nc:
            mock_response = mock.Mock()
            mock_response.headers = {}
            mock_response.status_code = 200
            expected = content.ContentNode.objects.get(title="c2c2")
            assessmentmetadata = (
                expected.assessmentmetadata.all()
                .values(
                    "assessment_item_ids",
                    "number_of_assessments",
                    "mastery_model",
                    "randomize",
                    "is_manipulable",
                    "contentnode",
                )
                .first()
            )
            thumbnail = None
            files = []

            for f in expected.files.all():
                ("local_file__id",)
                ("local_file__available",)
                ("local_file__file_size",)
                ("local_file__extension",)
                ("lang_id",)
                file = {}
                for field in [
                    "id",
                    "priority",
                    "preset",
                    "supplementary",
                    "thumbnail",
                ]:
                    file[field] = getattr(f, field)
                file["checksum"] = f.local_file_id
                for field in [
                    "available",
                    "file_size",
                    "extension",
                ]:
                    file[field] = getattr(f.local_file, field)
                file["lang"] = self.map_language(f.lang)
                file["storage_url"] = f.get_storage_url()
                if self.baseurl and file["storage_url"]:
                    file["storage_url"] += "?baseurl={}".format(self.baseurl)
                files.append(file)
                if f.thumbnail:
                    thumbnail = f.get_storage_url()
                    if self.baseurl and thumbnail:
                        thumbnail += "?baseurl={}".format(self.baseurl)

            expected_modality = modalities.COURSE
            expected_old_data = {
                "id": expected.id,
                "available": expected.available,
                "author": expected.author,
                "channel_id": expected.channel_id,
                "coach_content": expected.coach_content,
                "content_id": expected.content_id,
                "description": expected.description,
                "duration": expected.duration,
                "learning_activities": (
                    expected.learning_activities.split(",")
                    if expected.learning_activities
                    else []
                ),
                "grade_levels": (
                    expected.grade_levels.split(",") if expected.grade_levels else []
                ),
                "resource_types": (
                    expected.resource_types.split(",")
                    if expected.resource_types
                    else []
                ),
                "accessibility_labels": (
                    expected.accessibility_labels.split(",")
                    if expected.accessibility_labels
                    else []
                ),
                "categories": (
                    expected.categories.split(",") if expected.categories else []
                ),
                "kind": expected.kind,
                "lang": self.map_language(expected.lang),
                "license_description": expected.license_description,
                "license_name": expected.license_name,
                "license_owner": expected.license_owner,
                "num_coach_contents": expected.num_coach_contents,
                "options": {
                    "modality": expected_modality,
                },
                "parent": expected.parent_id,
                "sort_order": expected.sort_order,
                "title": expected.title,
                "lft": expected.lft,
                "rght": expected.rght,
                "tree_id": expected.tree_id,
                "ancestors": [],
                "tags": list(
                    expected.tags.all()
                    .order_by("tag_name")
                    .values_list("tag_name", flat=True)
                ),
                "thumbnail": thumbnail,
                "assessmentmetadata": assessmentmetadata,
                "is_leaf": expected.kind != "topic",
                "files": files,
                "admin_imported": bool(expected.admin_imported),
            }
            mock_response.json.return_value = expected_old_data
            mock_client = mock.MagicMock()
            mock_client.get.return_value = mock_response
            nc.build_for_address.return_value = mock_client
            response = self.client.get(
                reverse("kolibri:core:contentnode-detail", kwargs={"pk": expected.id}),
                data={"baseurl": "http://example.com/"},
            )
            self.assertEqual(response.data["learner_needs"], [])
            self.assertEqual(response.data["on_device_resources"], None)
            self.assertEqual(response.data["modality"], modalities.COURSE)

    def test_remote_content_node_missing_modality(self):
        with mock.patch("kolibri.core.content.api.NetworkClient") as nc:
            mock_response = mock.Mock()
            mock_response.headers = {}
            mock_response.status_code = 200
            expected = content.ContentNode.objects.get(title="c2c2")
            assessmentmetadata = (
                expected.assessmentmetadata.all()
                .values(
                    "assessment_item_ids",
                    "number_of_assessments",
                    "mastery_model",
                    "randomize",
                    "is_manipulable",
                    "contentnode",
                )
                .first()
            )
            thumbnail = None
            files = []

            for f in expected.files.all():
                ("local_file__id",)
                ("local_file__available",)
                ("local_file__file_size",)
                ("local_file__extension",)
                ("lang_id",)
                file = {}
                for field in [
                    "id",
                    "priority",
                    "preset",
                    "supplementary",
                    "thumbnail",
                ]:
                    file[field] = getattr(f, field)
                file["checksum"] = f.local_file_id
                for field in [
                    "available",
                    "file_size",
                    "extension",
                ]:
                    file[field] = getattr(f.local_file, field)
                file["lang"] = self.map_language(f.lang)
                file["storage_url"] = f.get_storage_url()
                if self.baseurl and file["storage_url"]:
                    file["storage_url"] += "?baseurl={}".format(self.baseurl)
                files.append(file)
                if f.thumbnail:
                    thumbnail = f.get_storage_url()
                    if self.baseurl and thumbnail:
                        thumbnail += "?baseurl={}".format(self.baseurl)

            expected_old_data = {
                "id": expected.id,
                "available": expected.available,
                "author": expected.author,
                "channel_id": expected.channel_id,
                "coach_content": expected.coach_content,
                "content_id": expected.content_id,
                "description": expected.description,
                "duration": expected.duration,
                "learning_activities": (
                    expected.learning_activities.split(",")
                    if expected.learning_activities
                    else []
                ),
                "grade_levels": (
                    expected.grade_levels.split(",") if expected.grade_levels else []
                ),
                "resource_types": (
                    expected.resource_types.split(",")
                    if expected.resource_types
                    else []
                ),
                "accessibility_labels": (
                    expected.accessibility_labels.split(",")
                    if expected.accessibility_labels
                    else []
                ),
                "categories": (
                    expected.categories.split(",") if expected.categories else []
                ),
                "kind": expected.kind,
                "lang": self.map_language(expected.lang),
                "license_description": expected.license_description,
                "license_name": expected.license_name,
                "license_owner": expected.license_owner,
                "num_coach_contents": expected.num_coach_contents,
                # options is empty, no modality provided
                "options": {},
                "parent": expected.parent_id,
                "sort_order": expected.sort_order,
                "title": expected.title,
                "lft": expected.lft,
                "rght": expected.rght,
                "tree_id": expected.tree_id,
                "ancestors": [],
                "tags": list(
                    expected.tags.all()
                    .order_by("tag_name")
                    .values_list("tag_name", flat=True)
                ),
                "thumbnail": thumbnail,
                "assessmentmetadata": assessmentmetadata,
                "is_leaf": expected.kind != "topic",
                "files": files,
                "admin_imported": bool(expected.admin_imported),
            }
            mock_response.json.return_value = expected_old_data
            mock_client = mock.MagicMock()
            mock_client.get.return_value = mock_response
            nc.build_for_address.return_value = mock_client
            response = self.client.get(
                reverse("kolibri:core:contentnode-detail", kwargs={"pk": expected.id}),
                data={"baseurl": "http://example.com/"},
            )
            self.assertEqual(response.data["learner_needs"], [])
            self.assertEqual(response.data["on_device_resources"], None)
            self.assertEqual(response.data["modality"], None)

    def tearDown(self):
        """
        clean up files/folders created during the test
        """
        cache.clear()
        super().tearDown()


class V2ChannelLookupUrlTestCase(TestCase):
    def test_returns_v2_channel_url_with_identifier(self):
        url = get_v2_channel_lookup_url("abc123")
        self.assertEqual(url, "/api/public/v2/channel/abc123?public=false")


def mock_patch_decorator(func):
    def wrapper(*args, **kwargs):
        mock_object = mock.Mock()
        mock_object.json.return_value = [{"id": 1, "name": "studio"}]
        with mock.patch.object(NetworkClient, "get", return_value=mock_object):
            return func(*args, **kwargs)

    return wrapper


class ChannelMetadataLibraryFieldTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        builder = ChannelBuilder()
        builder.insert_into_default_db()

    def test_library_field_defaults_to_null(self):
        channel = content.ChannelMetadata.objects.first()
        self.assertIsNone(channel.library)

    def test_library_field_accepts_community(self):
        channel = content.ChannelMetadata.objects.first()
        channel.library = library_constants.COMMUNITY
        channel.save()
        channel.refresh_from_db()
        self.assertEqual(channel.library, library_constants.COMMUNITY)


class KolibriStudioAPITestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        DeviceSettings.objects.create(is_provisioned=True)
        cls.facility = Facility.objects.create(name="facility")
        superuser = FacilityUser.objects.create(
            username="superuser", facility=cls.facility
        )
        superuser.set_password(DUMMY_PASSWORD)
        superuser.save()
        cls.superuser = superuser
        DevicePermissions.objects.create(user=superuser, is_superuser=True)

    def setUp(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)

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
        self.assertEqual(response.data["name"], "studio")

    @mock.patch.object(
        NetworkClient,
        "get",
        side_effect=NetworkLocationResponseFailure(response=mock.Mock(status_code=404)),
    )
    def test_channel_info_404(self, mock_get):
        response = self.client.get(
            reverse("kolibri:core:remotechannel-detail", kwargs={"pk": "abc"}),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @mock.patch.object(
        NetworkClient, "get", side_effect=NetworkLocationConnectionFailure
    )
    def test_channel_info_offline(self, mock_get):
        response = self.client.get(
            reverse("kolibri:core:remotechannel-detail", kwargs={"pk": "abc"}),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.json()["status"], "offline")

    @mock.patch.object(
        NetworkClient, "get", side_effect=NetworkLocationConnectionFailure
    )
    def test_channel_list_offline(self, mock_get):
        response = self.client.get(
            reverse("kolibri:core:remotechannel-list"), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.json()["status"], "offline")

    @mock.patch.object(
        NetworkClient,
        "get",
        side_effect=NetworkLocationResponseFailure(response=None),
    )
    def test_channel_list_response_failure_without_response(self, mock_get):
        response = self.client.get(
            reverse("kolibri:core:remotechannel-list"), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.json()["status"], "offline")

    @mock.patch.object(
        NetworkClient,
        "get",
        side_effect=NetworkLocationResponseFailure(response=None),
    )
    def test_channel_retrieve_response_failure_without_response(self, mock_get):
        response = self.client.get(
            reverse("kolibri:core:remotechannel-detail", kwargs={"pk": "abc"}),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.json()["status"], "offline")

    @mock.patch.object(
        NetworkClient,
        "get",
        side_effect=NetworkLocationResponseFailure(response=mock.Mock(status_code=502)),
    )
    def test_channel_list_upstream_error(self, mock_get):
        response = self.client.get(
            reverse("kolibri:core:remotechannel-list"), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.json()["status"], "offline")

    @mock.patch.object(
        NetworkClient,
        "get",
        side_effect=NetworkLocationResponseFailure(response=mock.Mock(status_code=502)),
    )
    def test_channel_retrieve_upstream_error(self, mock_get):
        response = self.client.get(
            reverse("kolibri:core:remotechannel-detail", kwargs={"pk": "abc"}),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.json()["status"], "offline")

    @mock.patch.object(NetworkClient, "get", side_effect=NetworkLocationResponseTimeout)
    def test_channel_list_timeout(self, mock_get):
        response = self.client.get(
            reverse("kolibri:core:remotechannel-list"), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.json()["status"], "offline")

    @mock.patch.object(NetworkClient, "get", side_effect=NetworkLocationResponseTimeout)
    def test_channel_retrieve_timeout(self, mock_get):
        response = self.client.get(
            reverse("kolibri:core:remotechannel-detail", kwargs={"pk": "abc"}),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.json()["status"], "offline")

    def _create_community_channel(self):
        builder = ChannelBuilder()
        builder.insert_into_default_db()
        channel = content.ChannelMetadata.objects.get(id=builder.channel["id"])
        channel.library = library_constants.COMMUNITY
        channel.save()
        return channel.id

    def test_community_channel_retrieve_response_failure_without_response(self):
        channel_id = self._create_community_channel()
        with mock.patch.object(
            NetworkClient,
            "get",
            side_effect=NetworkLocationResponseFailure(response=None),
        ):
            response = self.client.get(
                reverse(
                    "kolibri:core:remotechannel-detail",
                    kwargs={"pk": str(channel_id)},
                ),
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.json()["status"], "offline")

    def test_community_channel_retrieve_upstream_error(self):
        channel_id = self._create_community_channel()
        with mock.patch.object(
            NetworkClient,
            "get",
            side_effect=NetworkLocationResponseFailure(
                response=mock.Mock(status_code=502)
            ),
        ):
            response = self.client.get(
                reverse(
                    "kolibri:core:remotechannel-detail",
                    kwargs={"pk": str(channel_id)},
                ),
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.json()["status"], "offline")

    def test_community_channel_retrieve_uses_v2_api(self):
        """retrieve() queries v2 API when the installed channel is COMMUNITY."""
        builder = ChannelBuilder()
        builder.insert_into_default_db()
        channel = content.ChannelMetadata.objects.get(id=builder.channel["id"])
        channel.library = library_constants.COMMUNITY
        channel.save()
        channel_id = channel.id

        v2_response = {
            "id": str(channel_id),
            "name": "community channel",
            "version": 7,
            "description": "",
            "language": None,
            "included_languages": [],
            "icon_encoding": None,
            "public": False,
            "total_resource_count": 0,
            "published_size": 0,
            "last_published": None,
            "version_notes": "",
            "tagline": None,
        }
        mock_response = mock.Mock()
        mock_response.json.return_value = v2_response
        with mock.patch.object(
            NetworkClient, "get", return_value=mock_response
        ) as mock_get:
            response = self.client.get(
                reverse(
                    "kolibri:core:remotechannel-detail",
                    kwargs={"pk": str(channel_id)},
                ),
                format="json",
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["version"], 7)
        called_url = mock_get.call_args[0][0]
        self.assertIn("/v2/channel/", called_url)
        self.assertIn("public=false", called_url)
        self.assertNotIn("/v1/channels/", called_url)

    def test_non_community_channel_retrieve_uses_v1_api(self):
        """retrieve() queries v1 API for channels without COMMUNITY library."""
        builder = ChannelBuilder()
        builder.insert_into_default_db()
        channel = content.ChannelMetadata.objects.get(id=builder.channel["id"])
        # library is NULL (default) — should fall through to v1
        channel_id = channel.id

        v1_response = [
            {
                "id": str(channel_id),
                "name": "regular channel",
                "version": 3,
                "description": "",
                "language": None,
                "included_languages": [],
                "icon_encoding": None,
                "public": True,
                "total_resource_count": 0,
                "published_size": 0,
                "last_published": None,
                "version_notes": "",
                "tagline": None,
            }
        ]
        mock_response = mock.Mock()
        mock_response.json.return_value = v1_response
        with mock.patch.object(
            NetworkClient, "get", return_value=mock_response
        ) as mock_get:
            response = self.client.get(
                reverse(
                    "kolibri:core:remotechannel-detail",
                    kwargs={"pk": str(channel_id)},
                ),
                format="json",
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["version"], 3)
        called_url = mock_get.call_args[0][0]
        self.assertIn("/v1/channels/", called_url)

    def test_uninstalled_channel_retrieve_uses_v1_api(self):
        """retrieve() falls back to v1 API when channel is not installed."""
        uninstalled_id = uuid.uuid4().hex
        v1_response = [
            {
                "id": uninstalled_id,
                "name": "uninstalled channel",
                "version": 1,
                "description": "",
                "language": None,
                "included_languages": [],
                "icon_encoding": None,
                "public": True,
                "total_resource_count": 0,
                "published_size": 0,
                "last_published": None,
                "version_notes": "",
                "tagline": None,
            }
        ]
        mock_response = mock.Mock()
        mock_response.json.return_value = v1_response
        with mock.patch.object(
            NetworkClient, "get", return_value=mock_response
        ) as mock_get:
            response = self.client.get(
                reverse(
                    "kolibri:core:remotechannel-detail",
                    kwargs={"pk": uninstalled_id},
                ),
                format="json",
            )
        self.assertEqual(response.status_code, 200)
        called_url = mock_get.call_args[0][0]
        self.assertIn("/v1/channels/", called_url)

    def test_retrieve_with_token_uses_token_as_studio_identifier(self):
        """retrieve() uses the token (not pk) as the Studio lookup identifier when provided."""
        channel_id = uuid.uuid4().hex
        v1_response = [
            {
                "id": channel_id,
                "name": "draft channel",
                "version": 1,
                "description": "",
                "language": None,
                "included_languages": [],
                "icon_encoding": None,
                "public": False,
                "total_resource_count": 0,
                "published_size": 0,
                "last_published": None,
                "version_notes": "",
                "tagline": None,
            }
        ]
        mock_response = mock.Mock()
        mock_response.json.return_value = v1_response
        with mock.patch.object(
            NetworkClient, "get", return_value=mock_response
        ) as mock_get:
            response = self.client.get(
                reverse(
                    "kolibri:core:remotechannel-detail",
                    kwargs={"pk": channel_id},
                ),
                data={"token": "draft-token-xyz"},
                format="json",
            )
        self.assertEqual(response.status_code, 200)
        called_url = mock_get.call_args[0][0]
        self.assertIn("draft-token-xyz", called_url)
        self.assertNotIn(channel_id, called_url)

    def test_community_channel_with_baseurl_uses_v1_api(self):
        """retrieve() uses v1 API for COMMUNITY channels when a custom baseurl is provided."""
        builder = ChannelBuilder()
        builder.insert_into_default_db()
        channel = content.ChannelMetadata.objects.get(id=builder.channel["id"])
        channel.library = library_constants.COMMUNITY
        channel.save()
        channel_id = channel.id

        v1_response = [
            {
                "id": str(channel_id),
                "name": "community channel",
                "version": 5,
                "description": "",
                "language": None,
                "included_languages": [],
                "icon_encoding": None,
                "public": True,
                "total_resource_count": 0,
                "published_size": 0,
                "last_published": None,
                "version_notes": "",
                "tagline": None,
            }
        ]
        mock_response = mock.Mock()
        mock_response.json.return_value = v1_response
        with mock.patch.object(
            NetworkClient,
            "build_for_address",
            return_value=mock.Mock(get=mock.Mock(return_value=mock_response)),
        ) as mock_build:
            response = self.client.get(
                reverse(
                    "kolibri:core:remotechannel-detail",
                    kwargs={"pk": str(channel_id)},
                ),
                data={"baseurl": "http://otherstudio.example.com"},
                format="json",
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["version"], 5)
        # baseurl was provided — should have used build_for_address (v1 path), not v2
        mock_build.assert_called_once()

    def tearDown(self):
        cache.clear()


class ProxyContentMetadataTestCase(ContentNodeAPIBase, LiveServerTestCase):
    databases = "__all__"
    maxDiff = None

    @property
    def baseurl(self):
        return self.live_server_url

    def setUp(self):
        super().setUp()
        NetworkLocation.objects.update_or_create(base_url=self.baseurl)

    def _get(self, *args, **kwargs):
        if "data" not in kwargs:
            kwargs["data"] = {}
        kwargs["data"]["baseurl"] = self.baseurl
        return self.client.get(*args, **kwargs)


@override_option("Deployment", "URL_PATH_PREFIX", "test/")
class PrefixedProxyContentMetadataTestCase(ProxyContentMetadataTestCase):
    @property
    def baseurl(self):
        return self.live_server_url + "/test/"


class ChannelThumbnailViewTestCase(APITestCase):
    def setUp(self):
        self.content_node = content.ContentNode.objects.create(
            pk="6a406ac66b224106aa2e93f73a94333d",
            channel_id="f8ec4a5d14cd4716890999da596032d2",
            content_id="ded4a083e75f4689b386fd2b706e792a",
        )
        self.thumbnail = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABjElEQVR42mNk"
        self.channel_metadata = content.ChannelMetadata.objects.create(
            id="63acff41781543828861ade41dbdd7ff",
            name="no exercise channel metadata",
            thumbnail=self.thumbnail,
            root=self.content_node,
        )

    def test_channel_thumbnail_view(self):
        response = self.client.get(
            reverse("kolibri:core:channel-thumbnail", args=[self.channel_metadata.id])
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "image/png")
        self.assertEqual(
            response.content, urlsafe_b64decode(self.thumbnail.split(",")[1])
        )

    def test_channel_thumbnail_view_not_found(self):
        response = self.client.get(
            reverse("kolibri:core:channel-thumbnail", args=["deadpool"])
        )
        self.assertEqual(response.status_code, 404)

    def test_channel_thumbnail_view_no_thumbnail(self):
        self.channel_metadata.thumbnail = ""
        self.channel_metadata.save()
        response = self.client.get(
            reverse("kolibri:core:channel-thumbnail", args=[self.channel_metadata.id])
        )
        self.assertEqual(response.status_code, 404)


class ShareFileViewTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="ShareFileFacility")
        cls.superuser = FacilityUser.objects.create_superuser(
            username="sharefilesuper",
            password=DUMMY_PASSWORD,
            facility=cls.facility,
        )
        provision_device()
        cls.builder = ChannelBuilder()
        cls.builder.insert_into_default_db()
        # Mark all nodes available so the serializer's queryset finds them
        content.ContentNode.objects.all().update(available=True)
        cls.root = content.ContentNode.objects.get(id=cls.builder.root_node["id"])
        cls.leaf = (
            cls.root.get_descendants()
            .exclude(kind="topic")
            .exclude(kind="exercise")
            .first()
        )

    def setUp(self):
        self.client.login(username="sharefilesuper", password=DUMMY_PASSWORD)

    def test_post_returns_static_error_code_on_hook_failure(self):
        """Response body must not contain raw exception text on hook failure."""
        with mock.patch(
            "kolibri.core.device.permissions.valid_app_key_on_request",
            return_value=True,
        ), mock.patch(
            "kolibri.core.content.api.ShareFileHook.execute_file_share",
            side_effect=Exception("internal server path /secrets/file"),
        ):
            response = self.client.post(
                reverse("kolibri:core:sharefile"),
                {"content_node": str(self.leaf.id), "message": "test"},
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error = response.data.get("error", {})
        self.assertEqual(error.get("id"), error_constants.SHARE_FILE_FAILED)
        # Raw exception text must not appear in the response
        self.assertNotIn("internal server path", str(response.data))

    def test_post_returns_201_on_success(self):
        with mock.patch(
            "kolibri.core.device.permissions.valid_app_key_on_request",
            return_value=True,
        ), mock.patch(
            "kolibri.core.content.api.ShareFileHook.execute_file_share",
        ):
            response = self.client.post(
                reverse("kolibri:core:sharefile"),
                {"content_node": str(self.leaf.id), "message": "test"},
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
