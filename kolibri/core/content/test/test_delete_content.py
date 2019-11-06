import hashlib
import os
import uuid

from django.test import TransactionTestCase
from le_utils.constants import file_formats
from le_utils.constants import format_presets
from mock import patch

from .sqlalchemytesting import django_connection_engine
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.paths import get_content_storage_file_path


def get_engine(connection_string):
    return django_connection_engine()


@patch("kolibri.core.content.utils.sqlalchemybridge.get_engine", new=get_engine)
class UnavailableContentDeletion(TransactionTestCase):
    def setUp(self):
        super(UnavailableContentDeletion, self).setUp()

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
        self.filename = "{}.{}".format(self.hash, self.extension)

        self.path = get_content_storage_file_path(self.filename)
        path_dir = os.path.dirname(self.path)
        if not os.path.exists(path_dir):
            os.makedirs(path_dir)
        tempfile = open(self.path, "w")
        tempfile.write("wow")
        tempfile.close()

    def delete_content(self):
        num_deleted = 0
        freed_bytes = 0
        for deleted, file in LocalFile.objects.delete_unused_files():
            if deleted:
                num_deleted += 1
                freed_bytes += file.file_size
        return num_deleted, freed_bytes

    def test_delete_unavailable_stored_files(self):
        self.assertEqual(LocalFile.objects.get_unused_files().count(), 1)
        deleted, freed_bytes = self.delete_content()
        self.assertEqual(deleted, 1)
        self.assertEqual(freed_bytes, self.stored_local_file.file_size)

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
        deleted, freed_bytes = self.delete_content()
        self.assertEqual(deleted, 0)
