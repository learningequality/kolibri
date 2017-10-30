import os
import tempfile
import hashlib
import mimetypes
from django.test import TestCase, Client
from django.test.utils import override_settings
from kolibri.content.models import File, ContentNode, LocalFile
from kolibri.content.utils.paths import get_content_storage_file_path
from kolibri.auth.test.helpers import provision_device
from le_utils.constants import file_formats, format_presets

CONTENT_STORAGE_DIR_TEMP = tempfile.mkdtemp()


@override_settings(
    CONTENT_STORAGE_DIR=CONTENT_STORAGE_DIR_TEMP,
)
class DownloadContentTestCase(TestCase):
    """
    Test case for the downloadcontent endpoint.
    """

    def setUp(self):
        provision_device()

        self.client = Client()
        self.hash = hashlib.md5("DUMMYDATA".encode()).hexdigest()
        self.extension = file_formats.PDF
        self.filename = "{}.{}".format(self.hash, self.extension)
        self.title = "abc123!@#$%^&*();'[],./?><"
        self.contentnode = ContentNode(title=self.title)
        self.available = True
        self.preset = format_presets.DOCUMENT
        self.local_file = LocalFile(id=self.hash, extension=self.extension, available=self.available)
        self.file = File(local_file=self.local_file, available=self.available,
                         contentnode=self.contentnode, preset=self.preset)

        self.path = get_content_storage_file_path(self.filename)
        path_dir = os.path.dirname(self.path)
        if not os.path.exists(path_dir):
            os.makedirs(path_dir)
        tempfile = open(self.path, "w")
        tempfile.write("test")
        tempfile.close()

    def test_generate_download_filename(self):
        self.assertEqual(self.file.get_download_filename(), "abc123._Document.{}".format(self.extension))

    def test_generate_download_url(self):
        self.assertEqual(self.file.get_download_url(), "/downloadcontent/{}/{}".format(self.filename,
                                                                                       self.file.get_download_filename()))

    def test_download_existing_file(self):
        response = self.client.get(self.file.get_download_url())
        self.assertEqual(response.status_code, 200)

    def test_download_non_existing_file(self):
        bad_download_url = self.file.get_download_url().replace(self.file.get_download_url()[25:25], "aaaaa")
        response = self.client.get(bad_download_url)
        self.assertEqual(response.status_code, 404)

    def test_download_headers(self):
        response = self.client.get(self.file.get_download_url())
        self.assertEqual(response['Content-Type'], mimetypes.guess_type(self.filename)[0])
        self.assertEqual(response['Content-Disposition'], 'attachment;')
        self.assertEqual(response['Content-Length'], str(os.path.getsize(self.path)))
