import hashlib
import os
import tempfile
import zipfile

from django.template import loader
from django.test import Client
from django.test import TestCase
from le_utils.constants import exercises
from mock import patch

from ..models import LocalFile
from ..utils.paths import get_content_storage_file_path
from kolibri.core.auth.test.helpers import provision_device
from kolibri.utils.tests.helpers import override_option


DUMMY_FILENAME = 'hashi123.js'


@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class ZipContentTestCase(TestCase):
    """
    Testcase for zipcontent endpoint
    """

    index_name = "index.html"
    index_str = "<html></html>"
    other_name = "other.html"
    other_str = "<html></html>"
    test_name_1 = "testfile1.txt"
    test_str_1 = "This is a test!"
    test_name_2 = "testfile2.txt"
    test_str_2 = "And another test..."
    test_name_3 = "testfile3.json"
    test_str_3 = "A test of image placeholder replacement ${placeholder}".format(placeholder=exercises.IMG_PLACEHOLDER)

    def setUp(self):

        # Fetch with this header by default to run through non-hashi related behaviour.
        self.client = Client(HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        self.non_xhr_client = Client()

        provision_device()

        self.hash = hashlib.md5("DUMMYDATA".encode()).hexdigest()
        self.extension = "zip"
        self.filename = "{}.{}".format(self.hash, self.extension)

        self.zip_path = get_content_storage_file_path(self.filename)
        zip_path_dir = os.path.dirname(self.zip_path)
        if not os.path.exists(zip_path_dir):
            os.makedirs(zip_path_dir)

        with zipfile.ZipFile(self.zip_path, "w") as zf:
            zf.writestr(self.index_name, self.index_str)
            zf.writestr(self.other_name, self.other_str)
            zf.writestr(self.test_name_1, self.test_str_1)
            zf.writestr(self.test_name_2, self.test_str_2)
            zf.writestr(self.test_name_3, self.test_str_3)

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

    def test_non_allowed_file_internal_file_access(self):
        response = self.client.get(self.zip_file_base_url.replace('zip', 'png') + self.test_name_1)
        self.assertEqual(response.status_code, 404)

    def test_not_modified_response_when_if_modified_since_header_set(self):
        caching_client = Client(HTTP_IF_MODIFIED_SINCE="Sat, 10-Sep-2016 19:14:07 GMT")
        response = caching_client.get(self.zip_file_base_url + self.test_name_1)
        self.assertEqual(response.status_code, 304)

    def test_content_security_policy_header(self):
        response = self.client.get(self.zip_file_base_url + self.test_name_1)
        self.assertEqual(response.get("Content-Security-Policy"), "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http://testserver")

    def test_content_security_policy_header_http_referer(self):
        response = self.client.get(self.zip_file_base_url + self.test_name_1, HTTP_REFERER="http://testserver:1234/iam/a/real/path/#thatsomeonemightuse")
        self.assertEqual(response.get("Content-Security-Policy"), "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http://testserver:1234")

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

    def test_json_image_replacement_http_referer_header(self):
        server_name = "http://testserver"
        response = self.client.get(self.zip_file_base_url + self.test_name_3, HTTP_REFERER=server_name)
        self.assertEqual(
            response.content.decode('utf-8'),
            self.test_str_3.replace("$" + exercises.IMG_PLACEHOLDER, (server_name.replace('http:', '') + self.zip_file_base_url)).strip("/"))

    def test_json_image_replacement_no_http_referer_header(self):
        server_name = "http://testserver"
        response = self.client.get(self.zip_file_base_url + self.test_name_3)
        self.assertEqual(
            response.content.decode('utf-8'),
            self.test_str_3.replace("$" + exercises.IMG_PLACEHOLDER, (server_name.replace('http:', '') + self.zip_file_base_url)).strip("/"))

    @patch('kolibri.core.content.views.get_hashi_filename', return_value=DUMMY_FILENAME)
    def test_non_xhr_request_for_html_return_hashi(self, filename_patch):
        hashi_path = "content/{filename}".format(filename=DUMMY_FILENAME)
        client = Client()
        response = client.get(self.zip_file_base_url)
        template = loader.get_template('content/hashi.html')
        hashi_snippet = template.render({'hashi_path': hashi_path}, None)
        self.assertEqual(response.content.decode(), hashi_snippet)

    def test_xhr_request_for_html_return_html(self):
        response = self.client.get(self.zip_file_base_url)
        self.assertEqual(b"".join(response.streaming_content).decode(), self.index_str)

    @patch('kolibri.core.content.views.get_hashi_filename', return_value=DUMMY_FILENAME)
    def test_non_xhr_nonexistent_zip_file_access(self, filename_patch):
        client = Client()
        bad_base_url = self.zip_file_base_url.replace(self.zip_file_base_url[20:25], "aaaaa")
        response = client.get(bad_base_url + self.test_name_1)
        self.assertEqual(response.status_code, 404)

    @patch('kolibri.core.content.views.get_hashi_filename', return_value=DUMMY_FILENAME)
    def test_non_xhr_zip_file_nonexistent_internal_file_access(self, filename_patch):
        response = self.non_xhr_client.get(self.zip_file_base_url + "qqq" + self.index_name)
        self.assertEqual(response.status_code, 404)

    @patch('kolibri.core.content.views.get_hashi_filename', return_value=DUMMY_FILENAME)
    def test_non_xhr_not_modified_response_when_if_modified_since_header_set_index_file(self, filename_patch):
        caching_client = Client(HTTP_IF_MODIFIED_SINCE="Sat, 10-Sep-2016 19:14:07 GMT")
        response = caching_client.get(self.zip_file_base_url)
        self.assertEqual(response.status_code, 304)

    @patch('kolibri.core.content.views.get_hashi_filename', return_value=DUMMY_FILENAME)
    def test_non_xhr_not_modified_response_when_if_modified_since_header_set_other_html_file(self, filename_patch):
        caching_client = Client(HTTP_IF_MODIFIED_SINCE="Sat, 10-Sep-2016 19:14:07 GMT")
        response = caching_client.get(self.zip_file_base_url + self.other_name)
        self.assertEqual(response.status_code, 304)

    @patch('kolibri.core.content.views.get_hashi_filename', return_value=DUMMY_FILENAME)
    def test_non_xhr_content_security_policy_header(self, filename_patch):
        response = self.non_xhr_client.get(self.zip_file_base_url + self.index_name)
        self.assertEqual(response.get("Content-Security-Policy"), "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http://testserver")

    @patch('kolibri.core.content.views.get_hashi_filename', return_value=DUMMY_FILENAME)
    def test_non_xhr_access_control_allow_origin_header(self, filename_patch):
        response = self.non_xhr_client.get(self.zip_file_base_url + self.index_name)
        self.assertEqual(response.get("Access-Control-Allow-Origin"), "*")
        response = self.non_xhr_client.options(self.zip_file_base_url + self.index_name)
        self.assertEqual(response.get("Access-Control-Allow-Origin"), "*")

    @patch('kolibri.core.content.views.get_hashi_filename', return_value=DUMMY_FILENAME)
    def test_non_xhr_x_frame_options_header(self, filename_patch):
        response = self.non_xhr_client.get(self.zip_file_base_url + self.index_name)
        self.assertEqual(response.get("X-Frame-Options", ""), "")

    @patch('kolibri.core.content.views.get_hashi_filename', return_value=DUMMY_FILENAME)
    def test_non_xhr_access_control_allow_headers(self, filename_patch):
        headerval = "X-Penguin-Dance-Party"
        response = self.non_xhr_client.options(self.zip_file_base_url + self.index_name, HTTP_ACCESS_CONTROL_REQUEST_HEADERS=headerval)
        self.assertEqual(response.get("Access-Control-Allow-Headers", ""), headerval)
        response = self.non_xhr_client.get(self.zip_file_base_url + self.index_name, HTTP_ACCESS_CONTROL_REQUEST_HEADERS=headerval)
        self.assertEqual(response.get("Access-Control-Allow-Headers", ""), headerval)
