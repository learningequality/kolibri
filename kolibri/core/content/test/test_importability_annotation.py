import json
import os
import shutil
import tempfile
import uuid

from django.core.management import call_command
from django.db import DataError
from django.db.models import Sum
from django.test import TestCase
from django.test import TransactionTestCase
from le_utils.constants import content_kinds
from mock import patch

from .sqlalchemytesting import django_connection_engine
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.importability_annotation import (
    annotate_importability_from_disk,
)
from kolibri.core.content.utils.importability_annotation import (
    annotate_importability_from_remote,
)
from kolibri.core.content.utils.importability_annotation import (
    annotate_importability_from_studio,
)
from kolibri.core.content.utils.importability_annotation import (
    calculate_importable_duplication_index,
)
from kolibri.core.content.utils.importability_annotation import (
    calculate_importable_file_size,
)
from kolibri.core.content.utils.importability_annotation import (
    calculate_importable_resource_count,
)
from kolibri.core.content.utils.importability_annotation import (
    mark_local_files_as_importable,
)
from kolibri.core.content.utils.importability_annotation import (
    recurse_importability_up_tree,
)
from kolibri.core.content.utils.importability_annotation import (
    set_leaf_node_importability_from_local_file_importability,
)


def get_engine(connection_string):
    return django_connection_engine()


test_channel_id = "6199dde695db4ee4ab392222d5af1e5c"


@patch("kolibri.core.content.utils.sqlalchemybridge.get_engine", new=get_engine)
class AnnotationFromLocalFileImportability(TransactionTestCase):

    fixtures = ["content_test.json"]

    def setUp(self):
        LocalFile.objects.all().update(available=False)
        File.objects.all().update(available=False)

    def test_all_local_files_importable(self):
        LocalFile.objects.all().update(importable=True, file_size=1)
        set_leaf_node_importability_from_local_file_importability(test_channel_id)
        self.assertTrue(all(File.objects.all().values_list("importable", flat=True)))
        self.assertTrue(
            all(
                ContentNode.objects.exclude(kind=content_kinds.TOPIC)
                .exclude(files=None)
                .values_list("importable", flat=True)
            )
        )

    def test_all_local_files_importable_file_size(self):
        LocalFile.objects.all().update(importable=True)
        set_leaf_node_importability_from_local_file_importability(test_channel_id)
        node = (
            ContentNode.objects.exclude(kind=content_kinds.TOPIC)
            .exclude(files=None)
            .first()
        )
        local_files = LocalFile.objects.filter(files__contentnode=node)
        self.assertEqual(
            node.importable_file_size,
            local_files.distinct().aggregate(Sum("file_size"))["file_size__sum"],
        )

    def test_all_local_files_importable_resources(self):
        LocalFile.objects.all().update(importable=True)
        set_leaf_node_importability_from_local_file_importability(test_channel_id)
        node = (
            ContentNode.objects.exclude(kind=content_kinds.TOPIC)
            .exclude(files=None)
            .first()
        )
        self.assertEqual(node.importable_resources, 1)

    def test_no_local_files_importable(self):
        LocalFile.objects.all().update(importable=False)
        set_leaf_node_importability_from_local_file_importability(test_channel_id)
        self.assertEqual(File.objects.filter(importable=True).count(), 0)
        self.assertEqual(
            ContentNode.objects.exclude(kind=content_kinds.TOPIC)
            .filter(importable=True)
            .count(),
            0,
        )

    def test_no_local_files_importable_file_size(self):
        LocalFile.objects.all().update(importable=False)
        set_leaf_node_importability_from_local_file_importability(test_channel_id)
        self.assertEqual(ContentNode.objects.first().importable_file_size, 0)

    def test_one_local_file_importable(self):
        LocalFile.objects.all().update(importable=False)
        LocalFile.objects.filter(id="6bdfea4a01830fdd4a585181c0b8068c").update(
            importable=True
        )
        set_leaf_node_importability_from_local_file_importability(test_channel_id)
        self.assertTrue(
            ContentNode.objects.get(id="32a941fb77c2576e8f6b294cde4c3b0c").importable
        )
        self.assertFalse(
            all(
                ContentNode.objects.exclude(kind=content_kinds.TOPIC)
                .exclude(id="32a941fb77c2576e8f6b294cde4c3b0c")
                .values_list("importable", flat=True)
            )
        )

    def tearDown(self):
        call_command("flush", interactive=False)
        super(AnnotationFromLocalFileImportability, self).tearDown()


@patch("kolibri.core.content.utils.sqlalchemybridge.get_engine", new=get_engine)
class AnnotationTreeRecursion(TransactionTestCase):

    fixtures = ["content_test.json"]

    def setUp(self):
        super(AnnotationTreeRecursion, self).setUp()
        ContentNode.objects.all().update(importable=False)

    def test_all_content_nodes_importable(self):
        ContentNode.objects.exclude(kind=content_kinds.TOPIC).update(
            importable=True, importable_file_size=2, importable_resources=1
        )
        recurse_importability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        self.assertTrue(
            ContentNode.objects.get(id="da7ecc42e62553eebc8121242746e88a").importable
        )
        self.assertTrue(
            ContentNode.objects.get(id="2e8bac07947855369fe2d77642dfc870").importable
        )
        root = ChannelMetadata.objects.get(id=test_channel_id).root
        self.assertEqual(
            root.importable_resources,
            ContentNode.objects.exclude(kind=content_kinds.TOPIC).count(),
        )
        self.assertEqual(
            root.importable_file_size,
            2 * ContentNode.objects.exclude(kind=content_kinds.TOPIC).count(),
        )

    def test_no_content_nodes_importable(self):
        ContentNode.objects.filter(kind=content_kinds.TOPIC).update(importable=True)
        recurse_importability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        # 0, as although there are three childless topics in the fixture, these cannot exist in real databases
        # and we reset the importability of topics before recursing.
        self.assertEqual(
            ContentNode.objects.filter(kind=content_kinds.TOPIC)
            .filter(importable=True)
            .count(),
            0,
        )

    def test_no_content_nodes_importable_file_size(self):
        ContentNode.objects.filter(kind=content_kinds.TOPIC).update(importable=True)
        ContentNode.objects.all().update(importable_file_size=None)
        recurse_importability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        # 0, as although there are three childless topics in the fixture, these cannot exist in real databases
        # and we reset the importability of topics before recursing.
        self.assertEqual(
            ContentNode.objects.filter(kind=content_kinds.TOPIC)
            .first()
            .importable_file_size,
            0,
        )

    def test_one_content_node_importable(self):
        ContentNode.objects.filter(id="32a941fb77c2576e8f6b294cde4c3b0c").update(
            importable=True
        )
        recurse_importability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        # Check parent is importable
        self.assertTrue(
            ContentNode.objects.get(id="da7ecc42e62553eebc8121242746e88a").importable
        )

    def test_all_content_nodes_importable_coach_content(self):
        ContentNode.objects.exclude(kind=content_kinds.TOPIC).update(
            importable=True, coach_content=True
        )
        recurse_importability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        root = ChannelMetadata.objects.get(id=test_channel_id).root
        self.assertEqual(root.importable_coach_contents, 5)

    def test_no_content_nodes_coach_content(self):
        ContentNode.objects.all().update(importable=True)
        ContentNode.objects.all().update(coach_content=False)
        recurse_importability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        self.assertEqual(ContentNode.objects.filter(coach_content=True).count(), 0)
        root = ChannelMetadata.objects.get(id=test_channel_id).root
        self.assertEqual(root.importable_coach_contents, 0)

    def test_all_root_content_nodes_coach_content(self):
        ContentNode.objects.all().update(importable=True, coach_content=False)
        root_node = ContentNode.objects.get(parent__isnull=True)
        ContentNode.objects.filter(parent=root_node).exclude(
            kind=content_kinds.TOPIC
        ).update(coach_content=True)
        recurse_importability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        root_node.refresh_from_db()
        self.assertEqual(root_node.importable_coach_contents, 2)

    def test_one_root_content_node_coach_content(self):
        ContentNode.objects.all().update(importable=True, coach_content=False)
        root_node = ContentNode.objects.get(parent__isnull=True)
        node = (
            ContentNode.objects.filter(parent=root_node)
            .exclude(kind=content_kinds.TOPIC)
            .first()
        )
        node.coach_content = True
        node.save()
        recurse_importability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        root_node.refresh_from_db()
        self.assertEqual(root_node.importable_coach_contents, 1)

    def test_one_root_topic_node_coach_content(self):
        ContentNode.objects.all().update(importable=True, coach_content=False)
        root_node = ContentNode.objects.get(parent__isnull=True)
        node = ContentNode.objects.filter(
            parent=root_node, kind=content_kinds.TOPIC
        ).first()
        node.coach_content = True
        node.save()
        recurse_importability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        root_node.refresh_from_db()
        self.assertEqual(root_node.importable_coach_contents, 0)

    def test_one_child_node_coach_content(self):
        ContentNode.objects.all().update(importable=True, coach_content=False)
        root_node = ContentNode.objects.get(parent__isnull=True)
        node = ContentNode.objects.filter(
            parent=root_node, kind=content_kinds.TOPIC
        ).first()
        ContentNode.objects.create(
            title="test1",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node.channel_id,
            parent=node,
            kind=content_kinds.VIDEO,
            importable=True,
            coach_content=True,
        )
        recurse_importability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        root_node.refresh_from_db()
        node.refresh_from_db()
        self.assertEqual(root_node.importable_coach_contents, 1)
        self.assertFalse(node.coach_content)
        self.assertEqual(node.importable_coach_contents, 1)

    def test_one_child_coach_content_parent_no_siblings(self):
        ContentNode.objects.all().update(importable=True, coach_content=False)
        root_node = ContentNode.objects.get(parent__isnull=True)
        topic_node = ContentNode.objects.filter(
            parent=root_node, kind=content_kinds.TOPIC
        ).first()
        parent_node = ContentNode.objects.create(
            title="test1",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node.channel_id,
            parent=topic_node,
            kind=content_kinds.TOPIC,
            importable=True,
            coach_content=False,
        )
        ContentNode.objects.create(
            title="test2",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node.channel_id,
            parent=parent_node,
            kind=content_kinds.VIDEO,
            importable=True,
            coach_content=True,
        )
        ContentNode.objects.create(
            title="test3",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node.channel_id,
            parent=parent_node,
            kind=content_kinds.VIDEO,
            importable=True,
            coach_content=False,
        )
        recurse_importability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        parent_node.refresh_from_db()
        self.assertEqual(parent_node.importable_coach_contents, 1)

    def tearDown(self):
        call_command("flush", interactive=False)
        super(AnnotationTreeRecursion, self).tearDown()


@patch("kolibri.core.content.utils.sqlalchemybridge.get_engine", new=get_engine)
class LocalFileByChecksum(TransactionTestCase):

    fixtures = ["content_test.json"]

    def setUp(self):
        super(LocalFileByChecksum, self).setUp()
        LocalFile.objects.all().update(importable=False, available=False)

    def test_set_one_file(self):
        file_id = "6bdfea4a01830fdd4a585181c0b8068c"
        mark_local_files_as_importable([file_id])
        self.assertEqual(LocalFile.objects.filter(importable=True).count(), 1)
        self.assertTrue(LocalFile.objects.get(id=file_id).importable)

    def test_set_two_files(self):
        file_id_1 = "6bdfea4a01830fdd4a585181c0b8068c"
        file_id_2 = "e00699f859624e0f875ac6fe1e13d648"
        mark_local_files_as_importable([file_id_1, file_id_2])
        self.assertEqual(LocalFile.objects.filter(importable=True).count(), 2)
        self.assertTrue(LocalFile.objects.get(id=file_id_1).importable)
        self.assertTrue(LocalFile.objects.get(id=file_id_2).importable)

    def test_set_two_files_one_available(self):
        file_id_1 = "6bdfea4a01830fdd4a585181c0b8068c"
        file_id_2 = "e00699f859624e0f875ac6fe1e13d648"
        LocalFile.objects.filter(id=file_id_1).update(available=True)
        mark_local_files_as_importable([file_id_1, file_id_2])
        self.assertEqual(LocalFile.objects.filter(importable=True).count(), 1)
        self.assertFalse(LocalFile.objects.get(id=file_id_1).importable)
        self.assertTrue(LocalFile.objects.get(id=file_id_2).importable)

    def test_set_two_files_both_available(self):
        file_id_1 = "6bdfea4a01830fdd4a585181c0b8068c"
        file_id_2 = "e00699f859624e0f875ac6fe1e13d648"
        LocalFile.objects.all().update(available=True)
        mark_local_files_as_importable([file_id_1, file_id_2])
        self.assertEqual(LocalFile.objects.filter(importable=True).count(), 0)
        self.assertFalse(LocalFile.objects.get(id=file_id_1).importable)
        self.assertFalse(LocalFile.objects.get(id=file_id_2).importable)

    def tearDown(self):
        call_command("flush", interactive=False)
        super(LocalFileByChecksum, self).tearDown()


@patch("kolibri.core.content.utils.sqlalchemybridge.get_engine", new=get_engine)
class LocalFileByDisk(TransactionTestCase):

    fixtures = ["content_test.json"]

    file_id_1 = "6bdfea4a01830fdd4a585181c0b8068c"
    file_id_2 = "e00699f859624e0f875ac6fe1e13d648"

    def setUp(self):
        super(LocalFileByDisk, self).setUp()
        LocalFile.objects.all().update(importable=False, available=False)
        self.mock_home_dir = tempfile.mkdtemp()
        self.mock_storage_dir = os.path.join(self.mock_home_dir, "content", "storage")
        os.makedirs(self.mock_storage_dir)

    def createmock_content_file(self, prefix, suffix="mp4"):
        second_dir = os.path.join(self.mock_storage_dir, prefix[0], prefix[1])
        try:
            os.makedirs(second_dir)
        except OSError:
            pass
        open(os.path.join(second_dir, prefix + "." + suffix), "w+b")

    def createmock_content_file1(self):
        self.createmock_content_file(self.file_id_1, suffix="mp4")

    def createmock_content_file2(self):
        self.createmock_content_file(self.file_id_2, suffix="epub")

    def test_set_one_file_in_channel(self):
        self.createmock_content_file1()
        annotate_importability_from_disk(test_channel_id, self.mock_home_dir)
        self.assertEqual(LocalFile.objects.filter(importable=True).count(), 1)
        self.assertTrue(LocalFile.objects.get(id=self.file_id_1).importable)

    def test_set_one_file_not_in_channel(self):
        self.createmock_content_file(uuid.uuid4().hex)
        annotate_importability_from_disk(test_channel_id, self.mock_home_dir)
        self.assertEqual(LocalFile.objects.filter(importable=True).count(), 0)
        self.assertFalse(LocalFile.objects.get(id=self.file_id_1).importable)

    def test_set_two_files_in_channel(self):
        self.createmock_content_file1()
        self.createmock_content_file2()
        annotate_importability_from_disk(test_channel_id, self.mock_home_dir)
        self.assertEqual(LocalFile.objects.filter(importable=True).count(), 2)
        self.assertTrue(LocalFile.objects.get(id=self.file_id_1).importable)
        self.assertTrue(LocalFile.objects.get(id=self.file_id_2).importable)

    def test_set_two_files_in_channel_one_available(self):
        self.createmock_content_file1()
        self.createmock_content_file2()
        LocalFile.objects.filter(id=self.file_id_1).update(available=True)
        annotate_importability_from_disk(test_channel_id, self.mock_home_dir)
        self.assertEqual(LocalFile.objects.filter(importable=True).count(), 1)
        self.assertFalse(LocalFile.objects.get(id=self.file_id_1).importable)
        self.assertTrue(LocalFile.objects.get(id=self.file_id_2).importable)

    def test_set_two_files_in_channel_both_available(self):
        self.createmock_content_file1()
        self.createmock_content_file2()
        LocalFile.objects.all().update(available=True)
        annotate_importability_from_disk(test_channel_id, self.mock_home_dir)
        self.assertEqual(LocalFile.objects.filter(importable=True).count(), 0)
        self.assertFalse(LocalFile.objects.get(id=self.file_id_1).importable)
        self.assertFalse(LocalFile.objects.get(id=self.file_id_2).importable)

    def test_set_two_files_one_in_channel(self):
        self.createmock_content_file1()
        self.createmock_content_file(uuid.uuid4().hex)
        annotate_importability_from_disk(test_channel_id, self.mock_home_dir)
        self.assertEqual(LocalFile.objects.filter(importable=True).count(), 1)
        self.assertTrue(LocalFile.objects.get(id=self.file_id_1).importable)
        self.assertFalse(LocalFile.objects.get(id=self.file_id_2).importable)

    def test_set_two_files_none_in_channel(self):
        self.createmock_content_file(uuid.uuid4().hex)
        self.createmock_content_file(uuid.uuid4().hex)
        annotate_importability_from_disk(test_channel_id, self.mock_home_dir)
        self.assertEqual(LocalFile.objects.filter(importable=True).count(), 0)
        self.assertFalse(LocalFile.objects.get(id=self.file_id_1).importable)
        self.assertFalse(LocalFile.objects.get(id=self.file_id_2).importable)

    def tearDown(self):
        call_command("flush", interactive=False)
        shutil.rmtree(self.mock_home_dir)
        super(LocalFileByDisk, self).tearDown()


file_id_1 = "6bdfea4a01830fdd4a585181c0b8068c"
file_id_2 = "e00699f859624e0f875ac6fe1e13d648"


@patch("kolibri.core.content.utils.sqlalchemybridge.get_engine", new=get_engine)
class LocalFileRemote(TransactionTestCase):

    fixtures = ["content_test.json"]

    def setUp(self):
        super(LocalFileRemote, self).setUp()
        LocalFile.objects.all().update(importable=False, available=False)

    @patch("kolibri.core.content.utils.importability_annotation.requests")
    def test_set_one_file_in_channel(self, requests_mock):
        requests_mock.get.return_value.status_code = 200
        requests_mock.get.return_value.content = json.dumps([file_id_1])
        annotate_importability_from_remote(test_channel_id, "test")
        self.assertEqual(LocalFile.objects.filter(importable=True).count(), 1)
        self.assertTrue(LocalFile.objects.get(id=file_id_1).importable)

    @patch("kolibri.core.content.utils.importability_annotation.requests")
    def test_set_one_file_not_in_channel(self, requests_mock):
        # This shouldn't happen unless something weird is happening on the other
        # end of the request, but make sure we behave anyway
        requests_mock.get.return_value.status_code = 200
        requests_mock.get.return_value.content = json.dumps([uuid.uuid4().hex])
        annotate_importability_from_remote(test_channel_id, "test")
        self.assertEqual(LocalFile.objects.filter(importable=True).count(), 0)
        self.assertFalse(LocalFile.objects.get(id=file_id_1).importable)

    @patch("kolibri.core.content.utils.importability_annotation.requests")
    def test_set_two_files_in_channel(self, requests_mock):
        requests_mock.get.return_value.status_code = 200
        requests_mock.get.return_value.content = json.dumps([file_id_1, file_id_2])
        annotate_importability_from_remote(test_channel_id, "test")
        self.assertEqual(LocalFile.objects.filter(importable=True).count(), 2)
        self.assertTrue(LocalFile.objects.get(id=file_id_1).importable)
        self.assertTrue(LocalFile.objects.get(id=file_id_2).importable)

    @patch("kolibri.core.content.utils.importability_annotation.requests")
    def test_set_two_files_in_channel_one_available(self, requests_mock):
        requests_mock.get.return_value.status_code = 200
        requests_mock.get.return_value.content = json.dumps([file_id_1, file_id_2])
        LocalFile.objects.filter(id=file_id_1).update(available=True)
        annotate_importability_from_remote(test_channel_id, "test")
        self.assertEqual(LocalFile.objects.filter(importable=True).count(), 1)
        self.assertFalse(LocalFile.objects.get(id=file_id_1).importable)
        self.assertTrue(LocalFile.objects.get(id=file_id_2).importable)

    @patch("kolibri.core.content.utils.importability_annotation.requests")
    def test_set_two_files_in_channel_both_available(self, requests_mock):
        requests_mock.get.return_value.status_code = 200
        requests_mock.get.return_value.content = json.dumps([file_id_1, file_id_2])
        LocalFile.objects.all().update(available=True)
        annotate_importability_from_remote(test_channel_id, "test")
        self.assertEqual(LocalFile.objects.filter(importable=True).count(), 0)
        self.assertFalse(LocalFile.objects.get(id=file_id_1).importable)
        self.assertFalse(LocalFile.objects.get(id=file_id_2).importable)

    @patch("kolibri.core.content.utils.importability_annotation.requests")
    def test_set_two_files_one_in_channel(self, requests_mock):
        requests_mock.get.return_value.status_code = 200
        requests_mock.get.return_value.content = json.dumps(
            [file_id_1, uuid.uuid4().hex]
        )
        annotate_importability_from_remote(test_channel_id, "test")
        self.assertEqual(LocalFile.objects.filter(importable=True).count(), 1)
        self.assertTrue(LocalFile.objects.get(id=file_id_1).importable)
        self.assertFalse(LocalFile.objects.get(id=file_id_2).importable)

    @patch("kolibri.core.content.utils.importability_annotation.requests")
    def test_set_two_files_none_in_channel(self, requests_mock):
        requests_mock.get.return_value.status_code = 200
        requests_mock.get.return_value.content = json.dumps(
            [uuid.uuid4().hex, uuid.uuid4().hex]
        )
        annotate_importability_from_remote(test_channel_id, "test")
        self.assertEqual(LocalFile.objects.filter(importable=True).count(), 0)
        self.assertFalse(LocalFile.objects.get(id=file_id_1).importable)
        self.assertFalse(LocalFile.objects.get(id=file_id_2).importable)

    @patch("kolibri.core.content.utils.importability_annotation.requests")
    def test_404_remote_checksum_response(self, requests_mock):
        requests_mock.get.return_value.status_code = 404
        annotate_importability_from_remote(test_channel_id, "test")
        self.assertEqual(
            LocalFile.objects.filter(importable=True).count(),
            LocalFile.objects.all().count(),
        )

    @patch("kolibri.core.content.utils.importability_annotation.requests")
    def test_invalid_json_remote_checksum_response(self, requests_mock):
        requests_mock.get.return_value.status_code = 200
        requests_mock.get.return_value.content = "I am not a json, I am a free man!"
        annotate_importability_from_remote(test_channel_id, "test")
        self.assertEqual(
            LocalFile.objects.filter(importable=True).count(),
            LocalFile.objects.all().count(),
        )

    @patch("kolibri.core.content.utils.importability_annotation.requests")
    def test_invalid_checksums_remote_checksum_response(self, requests_mock):
        requests_mock.get.return_value.status_code = 200
        requests_mock.get.return_value.content = json.dumps(
            ["I am not a checksum, I am a free man!", file_id_1 + ".mp4"]
        )
        annotate_importability_from_remote(test_channel_id, "test")
        self.assertEqual(LocalFile.objects.filter(importable=True).count(), 0)

    def tearDown(self):
        call_command("flush", interactive=False)
        super(LocalFileRemote, self).tearDown()


@patch("kolibri.core.content.utils.sqlalchemybridge.get_engine", new=get_engine)
class LocalFileStudio(TransactionTestCase):

    fixtures = ["content_test.json"]

    def setUp(self):
        super(LocalFileStudio, self).setUp()
        LocalFile.objects.all().update(importable=False, available=False)

    def test_files_in_channel_one_available(self):
        LocalFile.objects.filter(id=file_id_1).update(available=True)
        annotate_importability_from_studio(test_channel_id)
        self.assertEqual(LocalFile.objects.filter(importable=True).count(), 4)
        self.assertFalse(LocalFile.objects.get(id=file_id_1).importable)
        self.assertTrue(LocalFile.objects.get(id=file_id_2).importable)

    def test_files_in_channel_all_available(self):
        LocalFile.objects.all().update(available=True)
        annotate_importability_from_studio(test_channel_id)
        self.assertEqual(LocalFile.objects.filter(importable=True).count(), 0)
        self.assertFalse(LocalFile.objects.get(id=file_id_1).importable)
        self.assertFalse(LocalFile.objects.get(id=file_id_2).importable)

    def tearDown(self):
        call_command("flush", interactive=False)
        super(LocalFileStudio, self).tearDown()


class CalculateChannelFieldsTestCase(TestCase):
    def setUp(self):
        self.node = ContentNode.objects.create(
            title="test",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
            importable=True,
        )
        self.channel = ChannelMetadata.objects.create(
            id=self.node.channel_id, name="channel", root=self.node
        )

    def test_calculate_importable_resource_duplication(self):
        self.channel.importable_resources = 1
        self.channel.importable_file_size = 10
        ContentNode.objects.create(
            title="test",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
            importable=False,
        )
        calculate_importable_duplication_index(self.channel)
        self.assertEqual(self.channel.importable_resource_duplication, 1.0)

    def test_calculate_importable_resource_duplication_no_error(self):
        self.channel.importable_resources = 0
        self.channel.importable_file_size = 10
        try:
            calculate_importable_duplication_index(self.channel)
        except ZeroDivisionError:
            self.fail("Failed to catch a division by zero.")

    def test_calculate_importable_file_size_duplication(self):
        self.channel.importable_resources = 10
        self.channel.importable_file_size = 10
        local_file1 = LocalFile.objects.create(
            id=uuid.uuid4().hex, extension="mp4", importable=True, file_size=10
        )
        File.objects.create(
            id=uuid.uuid4().hex,
            local_file=local_file1,
            importable=True,
            contentnode=self.node,
        )
        local_file2 = LocalFile.objects.create(
            id=uuid.uuid4().hex, extension="mp4", importable=False, file_size=10
        )
        File.objects.create(
            id=uuid.uuid4().hex,
            local_file=local_file2,
            importable=False,
            contentnode=self.node,
        )
        calculate_importable_duplication_index(self.channel)
        self.assertEqual(self.channel.importable_file_duplication, 1.0)

    def test_calculate_importable_file_size_duplication_no_error(self):
        self.channel.importable_resources = 10
        self.channel.importable_file_size = 0
        try:
            calculate_importable_duplication_index(self.channel)
        except ZeroDivisionError:
            self.fail("Failed to catch a division by zero.")

    def test_calculate_importable_resources(self):
        local_file = LocalFile.objects.create(
            id=uuid.uuid4().hex, extension="mp4", importable=True, file_size=10
        )
        File.objects.create(
            id=uuid.uuid4().hex,
            local_file=local_file,
            importable=True,
            contentnode=self.node,
        )
        calculate_importable_resource_count(self.channel)
        self.assertEqual(self.channel.importable_resources, 1)

    def test_calculate_importable_file_size(self):
        local_file = LocalFile.objects.create(
            id=uuid.uuid4().hex, extension="mp4", importable=True, file_size=10
        )
        File.objects.create(
            id=uuid.uuid4().hex,
            local_file=local_file,
            importable=True,
            contentnode=self.node,
        )
        calculate_importable_file_size(self.channel)
        self.assertEqual(self.channel.importable_file_size, 10)

    def test_importable_file_size_big_integer_field(self):
        self.channel.importable_file_size = (
            2150000000
        )  # out of range for integer field on postgres
        try:
            self.channel.save()
        except DataError:
            self.fail("DataError: integer out of range")
