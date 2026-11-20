import hashlib
import os
import uuid
from typing import ClassVar
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase
from le_utils.constants import content_kinds
from le_utils.constants import file_formats
from le_utils.constants import format_presets

from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.content.models import VirtualContentNode
from kolibri.core.content.models import VirtualContentRoot
from kolibri.core.content.utils.paths import get_content_storage_file_path

test_channel_id = "6199dde695db4ee4ab392222d5af1e5c"


class UnavailableContentDeletion(TestCase):
    databases = "__all__"

    def setUp(self):
        super().setUp()

        # create an unavailable contentnode
        self.unavailable_contentnode = ContentNode(
            title="wow",
            available=False,
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
        )
        self.unavailable_contentnode.save()

        self.hash = hashlib.md5("wow".encode()).hexdigest()
        self.extension = file_formats.PDF

        # with an associated stored local file
        self.stored_local_file = LocalFile(
            id=self.hash, extension=self.extension, available=True, file_size=1000000
        )
        self.stored_local_file.save()

        self.file = File(
            local_file=self.stored_local_file,
            contentnode=self.unavailable_contentnode,
            preset=format_presets.DOCUMENT,
            id=uuid.uuid4().hex,
        )
        self.file.save()

        # actually store a dummy local file
        self.filename = f"{self.hash}.{self.extension}"

        self.path = get_content_storage_file_path(self.filename)
        path_dir = os.path.dirname(self.path)
        if not os.path.exists(path_dir):
            os.makedirs(path_dir)
        with open(self.path, "w") as tempfile:
            tempfile.write("wow")

    def delete_content(self):
        num_deleted = 0
        for deleted, _file in LocalFile.objects.delete_unused_files():
            if deleted:
                num_deleted += 1
        return num_deleted

    def test_delete_unavailable_stored_files(self):
        self.assertEqual(LocalFile.objects.get_unused_files().count(), 1)
        deleted = self.delete_content()
        self.assertEqual(deleted, 1)

        self.assertEqual(os.path.exists(self.path), False)
        self.assertEqual(LocalFile.objects.get_unused_files().count(), 0)

    def test_dont_delete_used_stored_files(self):
        available_contentnode = ContentNode.objects.create(
            title="wow",
            available=True,
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
        )
        File.objects.create(
            local_file=self.stored_local_file,
            contentnode=available_contentnode,
            preset=format_presets.DOCUMENT,
            id=uuid.uuid4().hex,
        )
        self.assertEqual(LocalFile.objects.get_unused_files().count(), 0)
        deleted = self.delete_content()
        self.assertEqual(deleted, 0)


class DeleteContentTestCase(TestCase):
    """
    Testcase for delete content management command
    """

    databases = "__all__"
    fixtures: ClassVar[list] = ["content_test.json"]

    def _get_node_ids(self):
        return list(
            ContentNode.objects.exclude(kind=content_kinds.TOPIC).values_list(
                "id", flat=True
            )
        )

    def _setup_test_node(self, node, available=True):
        node.available = available
        node.id = uuid.uuid4().hex
        node.channel_id = uuid.uuid4().hex
        node.available = available
        node.parent = None
        node.save()
        return node

    def _setup_test_files(self, original_node_id, test_node):
        original = ContentNode.objects.get(id=original_node_id)
        for file in original.files.all():
            file.id = uuid.uuid4().hex
            file.contentnode = test_node
            file.supplementary = False
            file.save()
        return original

    def _call_delete_command(self, **kwargs):
        call_command("deletecontent", test_channel_id, **kwargs)

    def test_include_all_nodes_all_deleted(self):
        LocalFile.objects.all().update(available=True)
        ContentNode.objects.all().update(available=True)
        call_command("deletecontent", test_channel_id, node_ids=self._get_node_ids())
        self.assertEqual(ContentNode.objects.all().count(), 0)

    def test_include_all_nodes_other_channel_node_still_available(self):
        LocalFile.objects.all().update(available=True)
        ContentNode.objects.all().update(available=True)
        test = ContentNode.objects.filter(kind=content_kinds.VIDEO).first()
        original_id = test.id
        test = self._setup_test_node(test)
        self._setup_test_files(original_id, test)
        self._call_delete_command(node_ids=self._get_node_ids())
        test.refresh_from_db()
        self.assertTrue(test.available)

    def test_include_all_nodes_force_delete_other_channel_node_not_available(self):
        LocalFile.objects.all().update(available=True)
        ContentNode.objects.all().update(available=True)
        test = ContentNode.objects.filter(kind=content_kinds.VIDEO).first()
        original_id = test.id
        test = self._setup_test_node(test)
        self._setup_test_files(original_id, test)
        self._call_delete_command(node_ids=self._get_node_ids(), force_delete=True)
        test.refresh_from_db()
        self.assertFalse(test.available)

    def test_exclude_all_nodes_force_delete_other_channel_node_not_available_no_delete(
        self,
    ):
        LocalFile.objects.all().update(available=True)
        ContentNode.objects.all().update(available=True)
        test = ContentNode.objects.filter(kind=content_kinds.VIDEO).first()
        original_id = test.id
        test = self._setup_test_node(test, available=False)
        original = self._setup_test_files(original_id, test)
        self._call_delete_command(
            exclude_node_ids=self._get_node_ids(), force_delete=True
        )
        try:
            self.assertTrue(original.available)
        except ContentNode.DoesNotExist:
            self.fail("Content node has been deleted")

    @patch("kolibri.core.content.utils.content_delete.clear_channel_stats")
    def test_deleting_channel_clears_stats_cache(self, channel_stats_clear_mock):
        self.assertFalse(channel_stats_clear_mock.called)
        self._call_delete_command(node_ids=self._get_node_ids())
        self.assertTrue(channel_stats_clear_mock.called)

    def _create_virtual_node(self, root_id, channel_id):
        VirtualContentRoot.objects.get_or_create(
            root_id=root_id,
            defaults={"channel_id": channel_id, "local_file_id": uuid.uuid4().hex},
        )
        return VirtualContentNode.objects.create(
            id=uuid.uuid4().hex,
            root_id=root_id,
            channel_id=channel_id,
            title="virtual page",
            kind=content_kinds.DOCUMENT,
            options={},
        )

    def test_full_deletion_removes_all_virtual_contentnodes(self):
        LocalFile.objects.all().update(available=True)
        ContentNode.objects.all().update(available=True)
        root_id = (
            ContentNode.objects.filter(
                kind=content_kinds.VIDEO, channel_id=test_channel_id
            )
            .first()
            .id
        )
        self._create_virtual_node(root_id, test_channel_id)
        call_command("deletecontent", test_channel_id)
        self.assertFalse(
            VirtualContentNode.objects.filter(channel_id=test_channel_id).exists()
        )

    def test_selective_deletion_removes_only_removed_roots_virtual_contentnodes(self):
        LocalFile.objects.all().update(available=True)
        ContentNode.objects.all().update(available=True)
        videos = list(
            ContentNode.objects.filter(
                kind=content_kinds.VIDEO, channel_id=test_channel_id
            )
        )
        removed_root, kept_root = videos[0], videos[1]
        removed_virtual = self._create_virtual_node(removed_root.id, test_channel_id)
        kept_virtual = self._create_virtual_node(kept_root.id, test_channel_id)

        self._call_delete_command(node_ids=[removed_root.id])

        self.assertFalse(
            VirtualContentNode.objects.filter(id=removed_virtual.id).exists()
        )
        self.assertTrue(VirtualContentNode.objects.filter(id=kept_virtual.id).exists())

    def test_selective_deletion_removes_topic_rooted_virtual_contentnodes(self):
        channel_id = uuid.uuid4().hex
        channel_root = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=channel_id,
            kind=content_kinds.TOPIC,
            title="root",
            available=True,
        )
        ChannelMetadata.objects.create(
            id=channel_id,
            name="topic root deletion test",
            min_schema_version="1",
            root=channel_root,
        )
        removed_topic = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=channel_id,
            kind=content_kinds.TOPIC,
            title="removed subtopic",
            parent=channel_root,
            available=True,
        )
        ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=channel_id,
            kind=content_kinds.DOCUMENT,
            title="removed resource",
            parent=removed_topic,
            available=True,
        )
        kept_resource = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=channel_id,
            kind=content_kinds.VIDEO,
            title="kept resource",
            parent=channel_root,
            available=True,
        )

        removed_virtual = self._create_virtual_node(removed_topic.id, channel_id)
        kept_virtual = self._create_virtual_node(kept_resource.id, channel_id)

        call_command("deletecontent", channel_id, node_ids=[removed_topic.id])

        channel = ChannelMetadata.objects.get(id=channel_id)
        self.assertTrue(channel.root.available)

        self.assertFalse(
            VirtualContentNode.objects.filter(id=removed_virtual.id).exists()
        )
        self.assertTrue(VirtualContentNode.objects.filter(id=kept_virtual.id).exists())

    def test_deletion_does_not_touch_other_channels_virtual_contentnodes(self):
        LocalFile.objects.all().update(available=True)
        ContentNode.objects.all().update(available=True)
        other_channel_id = uuid.uuid4().hex
        other_virtual = self._create_virtual_node(uuid.uuid4().hex, other_channel_id)

        call_command("deletecontent", test_channel_id)

        self.assertTrue(VirtualContentNode.objects.filter(id=other_virtual.id).exists())
