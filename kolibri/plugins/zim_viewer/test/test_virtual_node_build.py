import hashlib
import os
import tempfile
import uuid as uuid_module
from unittest import mock

from django.test import TestCase
from le_utils.constants import content_kinds

from kolibri.core.content.hooks import VirtualRootUnreadable
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.content.models import VirtualContentNode
from kolibri.core.content.models import VirtualContentRoot
from kolibri.core.content.utils.paths import get_content_storage_file_path
from kolibri.core.content.utils.virtual_content_build import build_virtual_contentnodes
from kolibri.core.content.utils.virtual_nodes import virtual_node_id
from kolibri.plugins.zim_viewer.test.fixtures import build_minimal_zim
from kolibri.plugins.zim_viewer.test.fixtures import build_zim
from kolibri.plugins.zim_viewer.test.fixtures import build_zim_with_redirect
from kolibri.plugins.zim_viewer.virtual_nodes import enumerate_zim_subnodes
from kolibri.plugins.zim_viewer.virtual_nodes import zim_roots
from kolibri.utils.tests.helpers import override_option


def _write_zim(checksum, zim_contents):
    path = get_content_storage_file_path(f"{checksum}.zim")
    if not os.path.exists(os.path.dirname(path)):
        os.makedirs(os.path.dirname(path))
    with open(path, "wb") as fh:
        fh.write(zim_contents)
    return LocalFile.objects.create(
        id=checksum, extension="zim", available=True, file_size=1
    )


@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class VirtualNodeBuildTestCase(TestCase):
    databases = "__all__"

    def _build_zim_channel(self, checksum, zim_contents):
        channel_id = uuid_module.uuid4().hex
        root = ContentNode.objects.create(
            id=uuid_module.uuid4().hex,
            content_id=uuid_module.uuid4().hex,
            channel_id=channel_id,
            title="ZIM root",
            kind="topic",
            available=True,
        )
        ChannelMetadata.objects.create(id=channel_id, name="ZIM channel", root=root)
        File.objects.create(
            id=uuid_module.uuid4().hex,
            local_file=_write_zim(checksum, zim_contents),
            contentnode=root,
            preset="zim",
        )
        return channel_id, root

    def setUp(self):
        self.checksum = hashlib.md5(b"zim-build-test").hexdigest()
        self.channel_id, self.root = self._build_zim_channel(
            self.checksum, build_minimal_zim()
        )

    def test_enumerates_html_pages(self):
        entries = list(enumerate_zim_subnodes(self.checksum))
        self.assertEqual(len(entries), 1)
        entry = entries[0]
        self.assertEqual(entry["path"], "C/Index")
        self.assertEqual(entry["kind"], content_kinds.DOCUMENT)
        self.assertEqual(entry["options"], {"entry": "C/Index"})

    def test_enumerates_renderable_non_image_entries_with_kind_by_mime_family(self):
        checksum = hashlib.md5(b"zim-build-test-native").hexdigest()
        _write_zim(
            checksum,
            build_zim(
                [
                    (b"C", b"Index", "text/html", b"<html></html>"),
                    (b"C", b"Doc.pdf", "application/pdf", b"%PDF-1.4"),
                    (b"C", b"Clip.mp4", "video/mp4", b"\x00\x00"),
                    (b"C", b"Song.mp3", "audio/mpeg", b"\x00\x00"),
                    (b"C", b"Quiz.perseus", "application/perseus+zip", b"PK"),
                    (b"C", b"Pic.png", "image/png", b"\x89PNG"),
                    (b"C", b"Data.bin", "application/octet-stream", b"\x00"),
                ]
            ),
        )
        kinds = {e["path"]: e["kind"] for e in enumerate_zim_subnodes(checksum)}
        self.assertEqual(
            kinds,
            {
                "C/Index": content_kinds.DOCUMENT,
                "C/Doc.pdf": content_kinds.DOCUMENT,
                "C/Clip.mp4": content_kinds.VIDEO,
                "C/Song.mp3": content_kinds.AUDIO,
                "C/Quiz.perseus": content_kinds.DOCUMENT,
            },
        )

    def test_classifies_entries_by_mime_essence_ignoring_parameters_and_case(self):
        checksum = hashlib.md5(b"zim-build-test-mime-params").hexdigest()
        _write_zim(
            checksum,
            build_zim(
                [
                    (
                        b"C",
                        b"Latin",
                        "text/html; charset=iso-8859-1",
                        b"<html></html>",
                    ),
                    (b"C", b"Upper", "Text/HTML", b"<html></html>"),
                    (b"C", b"Doc.pdf", "application/pdf; name=Doc", b"%PDF-1.4"),
                    (b"C", b"Clip.mp4", "Video/MP4; codecs=avc1", b"\x00\x00"),
                    (b"C", b"Pic.png", "image/png; q=1", b"\x89PNG"),
                ]
            ),
        )
        kinds = {e["path"]: e["kind"] for e in enumerate_zim_subnodes(checksum)}
        self.assertEqual(
            kinds,
            {
                "C/Latin": content_kinds.DOCUMENT,
                "C/Upper": content_kinds.DOCUMENT,
                "C/Doc.pdf": content_kinds.DOCUMENT,
                "C/Clip.mp4": content_kinds.VIDEO,
            },
        )

    def test_enumerates_only_content_namespace_entries(self):
        checksum = hashlib.md5(b"zim-build-test-namespaces").hexdigest()
        _write_zim(
            checksum,
            build_zim(
                [
                    (b"C", b"Index", "text/html", b"<html></html>"),
                    (b"M", b"Description", "text/html", b"<html></html>"),
                ]
            ),
        )
        entries = list(enumerate_zim_subnodes(checksum))
        self.assertEqual([e["path"] for e in entries], ["C/Index"])

    def test_skips_redirect_entries(self):
        checksum = hashlib.md5(b"zim-build-test-redirect").hexdigest()
        _write_zim(checksum, build_zim_with_redirect())

        entries = list(enumerate_zim_subnodes(checksum))
        self.assertEqual([e["path"] for e in entries], ["C/Index"])

    def test_missing_zim_file_is_unreadable(self):
        os.remove(get_content_storage_file_path(f"{self.checksum}.zim"))
        with self.assertRaises(VirtualRootUnreadable):
            list(enumerate_zim_subnodes(self.checksum))

    def test_zim_path_that_cannot_be_opened_is_unreadable(self):
        path = get_content_storage_file_path(f"{self.checksum}.zim")
        os.remove(path)
        os.mkdir(path)
        self.addCleanup(os.rmdir, path)
        with self.assertRaises(VirtualRootUnreadable):
            list(enumerate_zim_subnodes(self.checksum))

    def test_non_zim_file_is_unreadable(self):
        checksum = hashlib.md5(b"zim-build-test-not-zim").hexdigest()
        _write_zim(checksum, b"not a zim")
        with self.assertRaises(VirtualRootUnreadable):
            list(enumerate_zim_subnodes(checksum))

    def test_roots_exclude_unavailable_nodes(self):
        self.assertEqual(zim_roots(self.channel_id), {self.root.id: self.checksum})
        ContentNode.objects.filter(id=self.root.id).update(available=False)
        self.assertEqual(zim_roots(self.channel_id), {})

    def test_build_populates_table(self):
        build_virtual_contentnodes(self.channel_id)
        row = VirtualContentNode.objects.get(channel_id=self.channel_id)
        self.assertEqual(row.id, virtual_node_id(self.root.id, "C/Index"))
        self.assertEqual(
            VirtualContentRoot.objects.get(root_id=self.root.id).local_file_id,
            self.checksum,
        )

    def test_build_truncates_titles_to_the_column_length(self):
        checksum = hashlib.md5(b"zim-build-test-long-title").hexdigest()
        channel_id, _ = self._build_zim_channel(
            checksum, build_zim([(b"C", b"x" * 250, "text/html", b"<html></html>")])
        )

        build_virtual_contentnodes(channel_id)

        title = VirtualContentNode.objects.get(channel_id=channel_id).title
        self.assertEqual(
            len(title), VirtualContentNode._meta.get_field("title").max_length
        )

    def test_rebuild_skips_unchanged_roots(self):
        build_virtual_contentnodes(self.channel_id)
        with mock.patch(
            "kolibri.plugins.zim_viewer.virtual_nodes.enumerate_zim_subnodes"
        ) as enumerate_mock:
            build_virtual_contentnodes(self.channel_id)
        enumerate_mock.assert_not_called()
        self.assertEqual(
            VirtualContentNode.objects.filter(channel_id=self.channel_id).count(), 1
        )

    def test_rebuild_reenumerates_a_replaced_file(self):
        build_virtual_contentnodes(self.channel_id)
        checksum = hashlib.md5(b"zim-build-test-replacement").hexdigest()
        replacement = _write_zim(
            checksum,
            build_zim([(b"C", b"Other", "text/html", b"<html></html>")]),
        )
        File.objects.filter(contentnode=self.root).update(local_file=replacement)

        build_virtual_contentnodes(self.channel_id)

        self.assertEqual(
            list(
                VirtualContentNode.objects.filter(
                    channel_id=self.channel_id
                ).values_list("id", flat=True)
            ),
            [virtual_node_id(self.root.id, "C/Other")],
        )
        self.assertEqual(
            VirtualContentRoot.objects.get(root_id=self.root.id).local_file_id,
            checksum,
        )

    def test_rebuild_retries_a_root_whose_file_was_missing(self):
        zim_path = get_content_storage_file_path(f"{self.checksum}.zim")
        os.rename(zim_path, f"{zim_path}.moved")
        build_virtual_contentnodes(self.channel_id)
        self.assertFalse(
            VirtualContentRoot.objects.filter(root_id=self.root.id).exists()
        )
        os.rename(f"{zim_path}.moved", zim_path)

        build_virtual_contentnodes(self.channel_id)

        self.assertEqual(
            list(
                VirtualContentNode.objects.filter(
                    channel_id=self.channel_id
                ).values_list("id", flat=True)
            ),
            [virtual_node_id(self.root.id, "C/Index")],
        )

    def test_rebuild_drops_pages_when_a_replaced_file_is_unreadable(self):
        build_virtual_contentnodes(self.channel_id)
        checksum = hashlib.md5(b"zim-build-test-unreadable-replacement").hexdigest()
        File.objects.filter(contentnode=self.root).update(
            local_file=_write_zim(checksum, b"not a zim")
        )

        build_virtual_contentnodes(self.channel_id)

        self.assertFalse(
            VirtualContentNode.objects.filter(channel_id=self.channel_id).exists()
        )
        self.assertFalse(
            VirtualContentRoot.objects.filter(root_id=self.root.id).exists()
        )

    def test_rebuild_drops_unavailable_roots(self):
        build_virtual_contentnodes(self.channel_id)
        ContentNode.objects.filter(id=self.root.id).update(available=False)

        build_virtual_contentnodes(self.channel_id)

        self.assertFalse(
            VirtualContentNode.objects.filter(channel_id=self.channel_id).exists()
        )
        self.assertFalse(
            VirtualContentRoot.objects.filter(channel_id=self.channel_id).exists()
        )
