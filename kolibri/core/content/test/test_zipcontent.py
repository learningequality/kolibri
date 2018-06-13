import hashlib
import os
import tempfile
import zipfile

from django.test import Client
from django.test import TestCase

from ..models import LocalFile
from ..utils.paths import get_content_storage_file_path
from kolibri.core.auth.test.helpers import provision_device
from kolibri.utils.tests.helpers import override_option


@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
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

        provision_device()

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

        self.zip_file_obj = LocalFile(id=self.hash, extension=self.extension, available=True)
        self.zip_file_base_url = self.zip_file_obj.get_storage_url()

    def test_zip_file_url_reversal(self):
        file = LocalFile(id=self.hash, extension=self.extension, available=True)
        self.assertEqual(file.get_storage_url(), "/zipcontent/{}/".format(self.filename))

    def test_non_zip_file_url_reversal(self):
        file = LocalFile(id=self.hash, extension="otherextension", available=True)
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

    def test_content_security_policy_header(self):
        response = self.client.get(self.zip_file_base_url + self.test_name_1)
        self.assertEqual(response.get("Content-Security-Policy"), "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: http://testserver")

    def test_access_control_allow_origin_header(self):
        response = self.client.get(self.zip_file_base_url + self.test_name_1)
        self.assertEqual(response.get("Access-Control-Allow-Origin"), "*")
        response = self.client.options(self.zip_file_base_url + self.test_name_1)
        self.assertEqual(response.get("Access-Control-Allow-Origin"), "*")

    def test_x_frame_options_header(self):
        response = self.client.get(self.zip_file_base_url + self.test_name_1)
        self.assertEqual(response.get("X-Frame-Options", ""), "")

    def test_access_control_allow_headers(self):
        headerval = "X-Penguin-Dance-Party"
        response = self.client.options(self.zip_file_base_url + self.test_name_1, HTTP_ACCESS_CONTROL_REQUEST_HEADERS=headerval)
        self.assertEqual(response.get("Access-Control-Allow-Headers", ""), headerval)
        response = self.client.get(self.zip_file_base_url + self.test_name_1, HTTP_ACCESS_CONTROL_REQUEST_HEADERS=headerval)
        self.assertEqual(response.get("Access-Control-Allow-Headers", ""), headerval)
