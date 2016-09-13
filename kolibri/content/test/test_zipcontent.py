import os
import tempfile
from django.test import TestCase
from django.test import Client
from django.test.utils import override_settings
from kolibri.auth.models import DeviceOwner
import hashlib
import zipfile

from ..models import File
from ..utils.paths import get_content_storage_file_path

CONTENT_STORAGE_DIR_TEMP = tempfile.mkdtemp()

@override_settings(
    CONTENT_STORAGE_DIR=CONTENT_STORAGE_DIR_TEMP,
)
class ZipContentTestCase(TestCase):
    """
    Testcase for zipcontent endpoint
    """

    test_name_1 = "testfile1.txt"
    test_str_1 = "This is a test!"
    test_name_2 = "testfile2.txt"
    test_str_2 = "And another test..."

    def setUp(self):

        self.client = Client()

        # create DeviceOwner to pass the setup_wizard middleware check
        DeviceOwner.objects.create(username='test-device-owner', password=123)

        self.hash = hashlib.md5("DUMMYDATA".encode()).hexdigest()
        self.extension = "zip"
        self.filename = "{}.{}".format(self.hash, self.extension)

        self.zip_path = get_content_storage_file_path(self.filename)
        zip_path_dir = os.path.dirname(self.zip_path)
        if not os.path.exists(zip_path_dir):
            os.makedirs(zip_path_dir)

        with zipfile.ZipFile(self.zip_path, "w") as zf:
            zf.writestr(self.test_name_1, self.test_str_1)
            zf.writestr(self.test_name_2, self.test_str_2)

        self.zip_file_obj = File(checksum=self.hash, extension=self.extension, available=True)
        self.zip_file_base_url = self.zip_file_obj.get_storage_url()

    def test_zip_file_url_reversal(self):
        file = File(checksum=self.hash, extension=self.extension, available=True)
        self.assertEqual(file.get_storage_url(), "/zipcontent/{}/".format(self.filename))

    def test_non_zip_file_url_reversal(self):
        file = File(checksum=self.hash, extension="otherextension", available=True)
        filename = file.get_filename()
        self.assertEqual(file.get_storage_url(), "/content/storage/{}/{}/{}".format(filename[0], filename[1], filename))

    def test_zip_file_internal_file_access(self):

        # test reading the data from file #1 inside the zip
        response = self.client.get(self.zip_file_base_url + self.test_name_1)
        self.assertEqual(next(response.streaming_content).decode(), self.test_str_1)

        # test reading the data from file #2 inside the zip
        response = self.client.get(self.zip_file_base_url + self.test_name_2)
        self.assertEqual(next(response.streaming_content).decode(), self.test_str_2)

    def test_nonexistent_zip_file_access(self):
        bad_base_url = self.zip_file_base_url.replace(self.zip_file_base_url[20:25], "aaaaa")
        response = self.client.get(bad_base_url + self.test_name_1)
        self.assertEqual(response.status_code, 404)

    def test_zip_file_nonexistent_internal_file_access(self):
        response = self.client.get(self.zip_file_base_url + "qqq" + self.test_name_1)
        self.assertEqual(response.status_code, 404)

    def test_not_modified_response_when_if_modified_since_header_set(self):
        caching_client = Client(HTTP_IF_MODIFIED_SINCE="Sat, 10-Sep-2016 19:14:07 GMT")
        response = caching_client.get(self.zip_file_base_url + self.test_name_1)
        self.assertEqual(response.status_code, 304)
