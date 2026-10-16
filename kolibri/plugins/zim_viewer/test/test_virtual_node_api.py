import hashlib
import os
import tempfile
import uuid as uuid_module
from unittest import mock

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse

from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.bookmarks.models import Bookmark
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.content.models import VirtualContentNode
from kolibri.core.content.utils.paths import get_content_storage_file_path
from kolibri.core.content.utils.virtual_content_build import build_virtual_contentnodes
from kolibri.core.content.utils.virtual_nodes import virtual_content_id
from kolibri.core.content.utils.virtual_nodes import virtual_node_id
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment
from kolibri.core.logger.csv_export import get_cached_content_data
from kolibri.plugins.zim_viewer.test.fixtures import build_minimal_zim
from kolibri.utils.tests.helpers import override_option


@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class VirtualNodeApiTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        checksum = hashlib.md5(b"zim-api-test").hexdigest()
        path = get_content_storage_file_path(f"{checksum}.zim")
        if not os.path.exists(os.path.dirname(path)):
            os.makedirs(os.path.dirname(path))
        with open(path, "wb") as fh:
            fh.write(build_minimal_zim())

        self.channel_id = uuid_module.uuid4().hex
        self.root = ContentNode.objects.create(
            id=uuid_module.uuid4().hex,
            content_id=uuid_module.uuid4().hex,
            channel_id=self.channel_id,
            title="ZIM root",
            kind="topic",
            available=True,
        )
        ChannelMetadata.objects.create(
            id=self.channel_id, name="ZIM channel", root=self.root
        )
        local_file = LocalFile.objects.create(
            id=checksum, extension="zim", available=True, file_size=1
        )
        File.objects.create(
            id=uuid_module.uuid4().hex,
            local_file=local_file,
            contentnode=self.root,
            preset="zim",
        )
        build_virtual_contentnodes(self.channel_id)

    def _detail_url(self, pk):
        return reverse("kolibri:core:contentnode-detail", kwargs={"pk": pk})

    def test_synthetic_id_resolves_to_a_node(self):
        node_id = virtual_node_id(self.root.id, "C/Index")
        response = self.client.get(self._detail_url(node_id))
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["id"], node_id)
        self.assertEqual(
            body["content_id"], virtual_content_id(self.root.content_id, "C/Index")
        )
        self.assertEqual(body["channel_id"], self.channel_id)
        self.assertEqual(body["title"], "Index")
        self.assertEqual(body["kind"], "document")
        self.assertEqual(body["parent"], self.root.id)
        self.assertTrue(body["is_leaf"])
        self.assertEqual(len(body["files"]), 1)
        self.assertEqual(body["files"][0]["preset"], "zim")
        self.assertEqual(body["options"], {"entry": "C/Index"})

    def test_synthesized_node_includes_root_id(self):
        node_id = virtual_node_id(self.root.id, "C/Index")
        response = self.client.get(self._detail_url(node_id))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["root_id"], self.root.id)

    def test_synthesized_node_is_marked_virtual(self):
        node_id = virtual_node_id(self.root.id, "C/Index")
        response = self.client.get(self._detail_url(node_id))
        self.assertIs(response.json().get("virtual"), True)

    def test_real_node_carries_no_virtual_key(self):
        response = self.client.get(self._detail_url(self.root.id))
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("virtual", response.json())

    def test_permalink_redirects_a_virtual_node(self):
        node_id = virtual_node_id(self.root.id, "C/Index")
        url = reverse("kolibri:core:contentpermalink")
        response = self.client.get(url, {"node_id": node_id})
        self.assertEqual(response.status_code, 302)
        self.assertIn(f"#/topics/c/{node_id}", response["Location"])

    def test_unknown_id_is_404(self):
        response = self.client.get(self._detail_url(uuid_module.uuid4().hex))
        self.assertEqual(response.status_code, 404)

    def test_real_node_still_resolves_normally(self):
        leaf = ContentNode.objects.create(
            id=uuid_module.uuid4().hex,
            content_id=uuid_module.uuid4().hex,
            channel_id=self.channel_id,
            parent=self.root,
            title="Real leaf",
            kind="document",
            available=True,
        )
        response = self.client.get(self._detail_url(leaf.id))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["title"], "Real leaf")

    def test_synthesized_node_inherits_root_visibility_and_metadata(self):
        ContentNode.objects.filter(id=self.root.id).update(
            coach_content=True,
            author="Kiwix",
            ancestors=[{"id": self.channel_id, "title": "ZIM channel"}],
        )
        node_id = virtual_node_id(self.root.id, "C/Index")
        body = self.client.get(self._detail_url(node_id)).json()
        self.assertTrue(body["coach_content"])
        self.assertEqual(body["author"], "Kiwix")
        self.assertEqual(
            body["ancestors"],
            [
                {"id": self.channel_id, "title": "ZIM channel"},
                {"id": self.root.id, "title": "ZIM root"},
            ],
        )

    def test_unavailable_root_is_404(self):
        ContentNode.objects.filter(id=self.root.id).update(available=False)
        node_id = virtual_node_id(self.root.id, "C/Index")
        response = self.client.get(self._detail_url(node_id))
        self.assertEqual(response.status_code, 404)

    def test_row_from_another_channel_is_404(self):
        node_id = virtual_node_id(self.root.id, "C/Index")
        VirtualContentNode.objects.filter(id=node_id).update(
            channel_id=uuid_module.uuid4().hex
        )
        response = self.client.get(self._detail_url(node_id))
        self.assertEqual(response.status_code, 404)

    def test_coach_content_root_hides_its_page_from_retrieve(self):
        ContentNode.objects.filter(id=self.root.id).update(coach_content=True)
        node_id = virtual_node_id(self.root.id, "C/Index")
        response = self.client.get(
            self._detail_url(node_id), {"include_coach_content": False}
        )
        self.assertEqual(response.status_code, 404)

    def test_public_retrieve_resolves_a_page(self):
        ChannelMetadata.objects.filter(id=self.channel_id).update(public=True)
        node_id = virtual_node_id(self.root.id, "C/Index")
        response = self.client.get(
            reverse("kolibri:core:publiccontentnode-detail", kwargs={"pk": node_id})
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], node_id)

    def test_recommendations_for_a_page_are_empty(self):
        node_id = virtual_node_id(self.root.id, "C/Index")
        response = self.client.get(
            reverse(
                "kolibri:core:contentnode-recommendations-for", kwargs={"pk": node_id}
            )
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])


@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class VirtualNodeIdListTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        checksum = hashlib.md5(b"zim-id-list-test").hexdigest()
        path = get_content_storage_file_path(f"{checksum}.zim")
        if not os.path.exists(os.path.dirname(path)):
            os.makedirs(os.path.dirname(path))
        with open(path, "wb") as fh:
            fh.write(build_minimal_zim())

        self.channel_id = uuid_module.uuid4().hex
        self.channel_root = ContentNode.objects.create(
            id=uuid_module.uuid4().hex,
            content_id=uuid_module.uuid4().hex,
            channel_id=self.channel_id,
            title="Channel",
            kind="topic",
            available=True,
        )
        ChannelMetadata.objects.create(
            id=self.channel_id, name="ZIM channel", root=self.channel_root
        )
        self.zim = ContentNode.objects.create(
            id=uuid_module.uuid4().hex,
            content_id=uuid_module.uuid4().hex,
            channel_id=self.channel_id,
            parent=self.channel_root,
            title="ZIM",
            kind="zim",
            available=True,
        )
        self.leaf = ContentNode.objects.create(
            id=uuid_module.uuid4().hex,
            content_id=uuid_module.uuid4().hex,
            channel_id=self.channel_id,
            parent=self.channel_root,
            title="Index of things",
            kind="document",
            available=True,
        )
        local_file = LocalFile.objects.create(
            id=checksum, extension="zim", available=True, file_size=1
        )
        File.objects.create(
            id=uuid_module.uuid4().hex,
            local_file=local_file,
            contentnode=self.zim,
            preset="zim",
        )
        build_virtual_contentnodes(self.channel_id)
        self.page_id = virtual_node_id(self.zim.id, "C/Index")

    def _list(self, **params):
        return self.client.get(reverse("kolibri:core:contentnode-list"), params).json()

    def test_ids_returns_real_and_virtual_nodes_in_request_order(self):
        ids = [self.page_id, self.leaf.id, self.zim.id]
        nodes = self._list(ids=",".join(ids))
        self.assertEqual([node["id"] for node in nodes], ids)

    def test_ids_excludes_a_page_whose_root_is_coach_content(self):
        ContentNode.objects.filter(id=self.zim.id).update(coach_content=True)
        nodes = self._list(
            ids=f"{self.page_id},{self.leaf.id}", include_coach_content=False
        )
        self.assertEqual([node["id"] for node in nodes], [self.leaf.id])

    def test_ids_with_a_metadata_filter_excludes_pages(self):
        nodes = self._list(
            ids=f"{self.page_id},{self.leaf.id}", channel_id=self.channel_id
        )
        self.assertEqual([node["id"] for node in nodes], [self.leaf.id])

    def test_ids_with_only_visibility_params_keeps_pages(self):
        nodes = self._list(
            ids=self.page_id,
            include_coach_content=True,
            exclude_course_ancestry=True,
        )
        self.assertEqual([node["id"] for node in nodes], [self.page_id])

    def test_retrieve_of_a_page_with_a_metadata_filter_is_404(self):
        response = self.client.get(
            reverse("kolibri:core:contentnode-detail", kwargs={"pk": self.page_id}),
            {"channel_id": self.channel_id},
        )
        self.assertEqual(response.status_code, 404)

    def test_ids_returns_a_repeated_id_once(self):
        nodes = self._list(ids=f"{self.page_id},{self.page_id}")
        self.assertEqual([node["id"] for node in nodes], [self.page_id])

    def test_ids_with_an_invalid_window_is_400(self):
        for window in (
            {"max_results": 1, "ids_offset": "abc"},
            {"max_results": 1, "ids_offset": -1},
            {"max_results": -1},
        ):
            response = self.client.get(
                reverse("kolibri:core:contentnode-list"),
                {"ids": self.page_id, **window},
            )
            self.assertEqual(response.status_code, 400, window)

    def test_ids_window_counts_only_nodes_that_pass_the_filters(self):
        ContentNode.objects.filter(id=self.zim.id).update(coach_content=True)
        response = self.client.get(
            reverse("kolibri:core:contentnode-list"),
            {
                "ids": f"{self.page_id},{self.leaf.id}",
                "include_coach_content": False,
                "max_results": 1,
            },
        ).json()
        self.assertEqual(
            ([node["id"] for node in response["results"]], response["more"]),
            ([self.leaf.id], None),
        )

    def test_random_honours_ids(self):
        response = self.client.get(
            reverse("kolibri:core:contentnode-random"), {"ids": self.leaf.id}
        )
        self.assertEqual([node["id"] for node in response.json()], [self.leaf.id])

    def test_descendants_assessments_covers_only_the_requested_ids(self):
        response = self.client.get(
            reverse("kolibri:core:contentnode-descendants-assessments"),
            {"ids": self.leaf.id},
        )
        self.assertEqual([item["id"] for item in response.json()], [self.leaf.id])

    def test_malformed_pk_is_404_on_detail_routes(self):
        for url in (
            reverse("kolibri:core:contentnode-detail", kwargs={"pk": "notauuid"}),
            reverse(
                "kolibri:core:contentnode-recommendations-for",
                kwargs={"pk": "notauuid"},
            ),
            reverse("kolibri:core:publiccontentnode-detail", kwargs={"pk": "notauuid"}),
        ):
            self.assertEqual(self.client.get(url).status_code, 404, url)

    def test_proxied_ids_mark_admin_imported_nodes_beyond_the_first_page(self):
        ContentNode.objects.filter(id=self.leaf.id).update(admin_imported=True)
        remote_response = mock.Mock(headers={}, status_code=200)
        remote_response.json.return_value = {
            "more": None,
            "results": [
                {"id": self.leaf.id, "thumbnail": None, "files": [], "options": {}}
            ],
        }
        with mock.patch(
            "kolibri.core.content.viewsets.remote.NetworkClient"
        ) as network_client:
            network_client.build_for_address.return_value.get.return_value = (
                remote_response
            )
            response = self.client.get(
                reverse("kolibri:core:contentnode-list"),
                {"ids": self.leaf.id, "max_results": 1, "baseurl": "http://peer/"},
            )
        self.assertIs(response.json()["results"][0]["admin_imported"], True)

    def _tree(self, pk, **params):
        return self.client.get(
            reverse("kolibri:core:contentnode_tree-detail", kwargs={"pk": pk}), params
        )

    def test_tree_of_a_page_is_the_page_as_a_leaf(self):
        response = self._tree(self.page_id)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], self.page_id)
        self.assertNotIn("children", response.json())

    def test_tree_of_a_page_whose_root_is_coach_content_is_404(self):
        ContentNode.objects.filter(id=self.zim.id).update(coach_content=True)
        response = self._tree(self.page_id, include_coach_content=False)
        self.assertEqual(response.status_code, 404)

    def test_tree_of_an_unknown_id_is_404(self):
        self.assertEqual(self._tree(uuid_module.uuid4().hex).status_code, 404)

    def test_search_never_returns_pages(self):
        nodes = self._list(search="Index")
        ids = {node["id"] for node in nodes}
        self.assertIn(self.leaf.id, ids)
        self.assertNotIn(self.page_id, ids)

    def _bookmarking_learner(self):
        facility = Facility.objects.first() or Facility.objects.create(name="f")
        learner = FacilityUser.objects.create(username="reader", facility=facility)
        self.client.force_login(learner)
        return learner

    def _bookmark_page(self, learner):
        return self.client.post(
            reverse("kolibri:core:bookmarks-list"),
            {"contentnode_id": self.page_id, "user": learner.id},
            content_type="application/json",
        )

    def _bookmarked_ids(self, **params):
        response = self.client.get(
            reverse("kolibri:core:contentnode_bookmarks-list"), params
        )
        return [node["id"] for node in response.json()]

    def test_bookmark_create_for_a_page_takes_its_content_id(self):
        response = self._bookmark_page(self._bookmarking_learner())
        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            Bookmark.objects.get(contentnode_id=self.page_id).content_id,
            virtual_content_id(self.zim.content_id, "C/Index"),
        )

    def test_bookmarked_page_is_listed_while_its_root_is_available(self):
        self._bookmark_page(self._bookmarking_learner())
        self.assertEqual(self._bookmarked_ids(available=True), [self.page_id])
        ContentNode.objects.filter(id=self.zim.id).update(available=False)
        self.assertEqual(self._bookmarked_ids(available=True), [])

    def test_bookmarked_page_is_excluded_by_a_kind_filter(self):
        self._bookmark_page(self._bookmarking_learner())
        self.assertEqual(self._bookmarked_ids(kind="document"), [])

    def test_bookmarks_descendant_of_includes_pages_below(self):
        self._bookmark_page(self._bookmarking_learner())
        response = self.client.get(
            reverse("kolibri:core:bookmarks-list"),
            {"descendant_of": self.channel_root.id},
        )
        self.assertEqual(
            [bookmark["contentnode_id"] for bookmark in response.json()],
            [self.page_id],
        )

    def test_csv_export_titles_a_page_by_its_node_id(self):
        cache.clear()
        title, ancestors = get_cached_content_data(
            {
                "content_id": virtual_content_id(self.zim.content_id, "C/Index"),
                "channel_id": self.channel_id,
                "most_recent_session_log_extra_fields": {
                    "context": {"node_id": self.page_id}
                },
            }
        )
        self.assertEqual(title, "Index")
        self.assertEqual(ancestors[-1]["id"], self.zim.id)

    def test_sharefile_rejects_a_page(self):
        facility = Facility.objects.first() or Facility.objects.create(name="f")
        admin = FacilityUser.objects.create_superuser(
            username="admin", password="password", facility=facility
        )
        self.client.force_login(admin)
        with mock.patch(
            "kolibri.core.device.permissions.valid_app_key_on_request",
            return_value=True,
        ):
            response = self.client.post(
                reverse("kolibri:core:sharefile"),
                {"content_node": self.page_id, "message": "test"},
                content_type="application/json",
            )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()[0]["metadata"]["field"], "content_node")

    def test_lesson_returns_its_page_resources(self):
        facility = Facility.objects.create(name="facility")
        classroom = Classroom.objects.create(name="classroom", parent=facility)
        learner = FacilityUser.objects.create(username="learner", facility=facility)
        classroom.add_member(learner)
        lesson = Lesson.objects.create(
            title="Lesson",
            collection=classroom,
            created_by=learner,
            is_active=True,
            resources=[
                {
                    "contentnode_id": self.page_id,
                    "content_id": virtual_content_id(self.zim.content_id, "C/Index"),
                    "channel_id": self.channel_id,
                }
            ],
        )
        LessonAssignment.objects.create(
            lesson=lesson, assigned_by=learner, collection=classroom
        )
        self.client.force_login(learner)
        response = self.client.get(
            reverse("kolibri:core:usercontentnode-list"), {"lesson": lesson.id}
        )
        self.assertEqual([node["id"] for node in response.json()], [self.page_id])

        response = self.client.get(
            reverse("kolibri:core:usercontentnode-list"),
            {"lesson": lesson.id, "ids": self.leaf.id},
        )
        self.assertEqual(response.json(), [])
