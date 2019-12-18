import hashlib
import os
import tempfile
import zipfile

from bs4 import BeautifulSoup
from django.test import Client
from django.test import TestCase
from mock import patch

from ..models import LocalFile
from ..utils.paths import get_content_storage_file_path
from kolibri.core.auth.test.helpers import provision_device
from kolibri.utils.tests.helpers import override_option


DUMMY_FILENAME = "hashi123.js"

empty_content = '<html><head><script src="/static/content/hashi123.js"></script></head><body></body></html>'


@patch("kolibri.core.content.views.get_hashi_filename", return_value=DUMMY_FILENAME)
@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class ZipContentTestCase(TestCase):
    """
    Testcase for zipcontent endpoint
    """

    index_name = "index.html"
    index_str = "<html></html>"
    other_name = "other.html"
    other_str = "<html><head></head></html>"
    script_name = "script.html"
    script_str = "<html><head><script>test</script></head></html>"
    async_script_name = "async_script.html"
    async_script_str = (
        '<html><head><script async src="url/url.js"></script></head></html>'
    )
    empty_html_name = "empty.html"
    empty_html_str = ""
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
            zf.writestr(self.index_name, self.index_str)
            zf.writestr(self.other_name, self.other_str)
            zf.writestr(self.script_name, self.script_str)
            zf.writestr(self.async_script_name, self.async_script_str)
            zf.writestr(self.empty_html_name, self.empty_html_str)
            zf.writestr(self.test_name_1, self.test_str_1)
            zf.writestr(self.test_name_2, self.test_str_2)

        self.zip_file_obj = LocalFile(
            id=self.hash, extension=self.extension, available=True
        )
        self.zip_file_base_url = self.zip_file_obj.get_storage_url()

    def test_zip_file_url_reversal(self, filename_patch):
        file = LocalFile(id=self.hash, extension=self.extension, available=True)
        self.assertEqual(
            file.get_storage_url(), "/zipcontent/{}/".format(self.filename)
        )

    def test_non_zip_file_url_reversal(self, filename_patch):
        file = LocalFile(id=self.hash, extension="otherextension", available=True)
        filename = file.get_filename()
        self.assertEqual(
            file.get_storage_url(),
            "/content/storage/{}/{}/{}".format(filename[0], filename[1], filename),
        )

    def test_zip_file_internal_file_access(self, filename_patch):

        # test reading the data from file #1 inside the zip
        response = self.client.get(self.zip_file_base_url + self.test_name_1)
        self.assertEqual(next(response.streaming_content).decode(), self.test_str_1)

        # test reading the data from file #2 inside the zip
        response = self.client.get(self.zip_file_base_url + self.test_name_2)
        self.assertEqual(next(response.streaming_content).decode(), self.test_str_2)

    def test_nonexistent_zip_file_access(self, filename_patch):
        bad_base_url = self.zip_file_base_url.replace(
            self.zip_file_base_url[20:25], "aaaaa"
        )
        response = self.client.get(bad_base_url + self.test_name_1)
        self.assertEqual(response.status_code, 404)

    def test_zip_file_nonexistent_internal_file_access(self, filename_patch):
        response = self.client.get(self.zip_file_base_url + "qqq" + self.test_name_1)
        self.assertEqual(response.status_code, 404)

    def test_non_allowed_file_internal_file_access(self, filename_patch):
        response = self.client.get(
            self.zip_file_base_url.replace("zip", "png") + self.test_name_1
        )
        self.assertEqual(response.status_code, 404)

    def test_not_modified_response_when_if_modified_since_header_set(
        self, filename_patch
    ):
        caching_client = Client(HTTP_IF_MODIFIED_SINCE="Sat, 10-Sep-2016 19:14:07 GMT")
        response = caching_client.get(self.zip_file_base_url + self.test_name_1)
        self.assertEqual(response.status_code, 304)

    def test_content_security_policy_header(self, filename_patch):
        response = self.client.get(self.zip_file_base_url + self.test_name_1)
        self.assertEqual(
            response.get("Content-Security-Policy"),
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http://testserver",
        )

    def test_content_security_policy_header_http_referer(self, filename_patch):
        response = self.client.get(
            self.zip_file_base_url + self.test_name_1,
            HTTP_REFERER="http://testserver:1234/iam/a/real/path/#thatsomeonemightuse",
        )
        self.assertEqual(
            response.get("Content-Security-Policy"),
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http://testserver:1234",
        )

    def test_access_control_allow_origin_header(self, filename_patch):
        response = self.client.get(self.zip_file_base_url + self.test_name_1)
        self.assertEqual(response.get("Access-Control-Allow-Origin"), "*")
        response = self.client.options(self.zip_file_base_url + self.test_name_1)
        self.assertEqual(response.get("Access-Control-Allow-Origin"), "*")

    def test_x_frame_options_header(self, filename_patch):
        response = self.client.get(self.zip_file_base_url + self.test_name_1)
        self.assertEqual(response.get("X-Frame-Options", ""), "")

    def test_access_control_allow_headers(self, filename_patch):
        headerval = "X-Penguin-Dance-Party"
        response = self.client.options(
            self.zip_file_base_url + self.test_name_1,
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS=headerval,
        )
        self.assertEqual(response.get("Access-Control-Allow-Headers", ""), headerval)
        response = self.client.get(
            self.zip_file_base_url + self.test_name_1,
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS=headerval,
        )
        self.assertEqual(response.get("Access-Control-Allow-Headers", ""), headerval)

    def test_request_for_html_no_head_return_hashi_modified_html(self, filename_patch):
        response = self.client.get(self.zip_file_base_url)
        content = '<html><head><script src="/static/content/hashi123.js"></script></head><body></body></html>'
        self.assertEqual(response.content.decode("utf-8"), content)

    def test_request_for_html_body_no_script_return_hashi_modified_html(
        self, filename_patch
    ):
        response = self.client.get(self.zip_file_base_url + self.other_name)
        self.assertEqual(response.content.decode("utf-8"), empty_content)

    def test_request_for_html_body_script_return_hashi_modified_html(
        self, filename_patch
    ):
        response = self.client.get(self.zip_file_base_url + self.script_name)
        content = (
            '<html><head><template hashi-script="true"><script>test</script></template><script src="/static/content/hashi123.js"></script></head>'
            + "<body></body></html>"
        )
        self.assertEqual(response.content.decode("utf-8"), content)

    def test_request_for_html_body_script_skip_get_param_return_unmodified_html(
        self, filename_patch
    ):
        response = self.client.get(
            self.zip_file_base_url + self.script_name + "?SKIP_HASHI=true"
        )
        self.assertEqual(next(response.streaming_content).decode(), self.script_str)

    def test_request_for_html_body_script_return_correct_length_header(
        self, filename_patch
    ):
        response = self.client.get(self.zip_file_base_url + self.script_name)
        file_size = len(
            '<html><head><template hashi-script="true"><script>test</script></template><script src="/static/content/hashi123.js"></script></head>'
            + "<body></body></html>"
        )
        self.assertEqual(int(response["Content-Length"]), file_size)

    def test_request_for_html_body_async_script_return_hashi_modified_html(
        self, filename_patch
    ):
        response = self.client.get(self.zip_file_base_url + self.async_script_name)
        soup = BeautifulSoup(response.content, "html.parser")
        template = soup.find("template")
        self.assertEqual(template.attrs["async"], "true")

    def test_request_for_html_empty_html_no_modification(self, filename_patch):
        response = self.client.get(self.zip_file_base_url + self.empty_html_name)
        self.assertEqual(response.content.decode("utf-8"), empty_content)

    def test_not_modified_response_when_if_modified_since_header_set_index_file(
        self, filename_patch
    ):
        caching_client = Client(HTTP_IF_MODIFIED_SINCE="Sat, 10-Sep-2016 19:14:07 GMT")
        response = caching_client.get(self.zip_file_base_url)
        self.assertEqual(response.status_code, 304)

    def test_not_modified_response_when_if_modified_since_header_set_other_html_file(
        self, filename_patch
    ):
        caching_client = Client(HTTP_IF_MODIFIED_SINCE="Sat, 10-Sep-2016 19:14:07 GMT")
        response = caching_client.get(self.zip_file_base_url + self.other_name)
        self.assertEqual(response.status_code, 304)
