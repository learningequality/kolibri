import hashlib
import os
import tempfile
import zipfile
from wsgiref.util import setup_testing_defaults

from django.test import override_settings
from django.test import TestCase
from django.utils.http import http_date

from kolibri.core.content.utils.paths import get_content_storage_file_path
from kolibri.core.content.zip_wsgi import generate_zip_content_response
from kolibri.core.content.zip_wsgi import INITIALIZE_HASHI_FROM_IFRAME
from kolibri.utils.tests.helpers import override_option


hashi_injection = '<script type="text/javascript">{}</script>'.format(
    INITIALIZE_HASHI_FROM_IFRAME
)

empty_content = "<html><head>{}</head><body></body></html>".format(hashi_injection)

# datetime.datetime(2016, 9, 10, 19, 14, 7) in time from EPOCH
# do this to avoid having to backport `timestamp` method of datetime
# to Python 2.7
caching_http_date = http_date(1473560047.0)


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
    empty_html_name = "empty.html"
    empty_html_str = ""
    doctype_name = "doctype.html"
    doctype = """
    <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
    """
    doctype_str = doctype + "<html><head><script>test</script></head></html>"
    html5_doctype_name = "html5_doctype.html"
    html5_doctype = "<!DOCTYPE HTML>"
    html5_doctype_str = (
        html5_doctype + "<html><head><script>test</script></head></html>"
    )
    test_name_1 = "testfile1.txt"
    test_str_1 = "This is a test!"
    test_name_2 = "testfile2.txt"
    test_str_2 = "And another test..."
    embedded_file_name = "test/this/path/test.txt"
    embedded_file_str = "Embedded file test"

    def setUp(self):

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
            zf.writestr(self.empty_html_name, self.empty_html_str)
            zf.writestr(self.doctype_name, self.doctype_str)
            zf.writestr(self.html5_doctype_name, self.html5_doctype_str)
            zf.writestr(self.test_name_1, self.test_str_1)
            zf.writestr(self.test_name_2, self.test_str_2)
            zf.writestr(self.embedded_file_name, self.embedded_file_str)

        self.zip_file_base_url = "/{}/".format(self.filename)

        self.environ = {}
        setup_testing_defaults(self.environ)

    def _get_file(self, file_name, base_url=None, **kwargs):
        if base_url is None:
            base_url = self.zip_file_base_url
        self.environ["PATH_INFO"] = base_url + file_name
        self.environ.update(kwargs)
        return generate_zip_content_response(self.environ)

    def test_zip_file_internal_file_access(self):
        # test reading the data from file #1 inside the zip
        response = self._get_file(self.test_name_1)
        self.assertEqual(next(response.streaming_content).decode(), self.test_str_1)

        # test reading the data from file #2 inside the zip
        response = self._get_file(self.test_name_2)
        self.assertEqual(next(response.streaming_content).decode(), self.test_str_2)

    def test_nonexistent_zip_file_access(self):
        bad_base_url = self.zip_file_base_url.replace(
            self.zip_file_base_url[20:25], "aaaaa"
        )
        response = self._get_file(self.test_name_1, base_url=bad_base_url)
        self.assertEqual(response.status_code, 404)

    def test_zip_file_nonexistent_internal_file_access(self):
        response = self._get_file("qqq" + self.test_name_1)
        self.assertEqual(response.status_code, 404)

    def test_non_allowed_file_internal_file_access(self):
        response = self._get_file(
            self.test_name_1, base_url=self.zip_file_base_url.replace("zip", "png")
        )
        self.assertEqual(response.status_code, 404)

    def test_not_modified_response_when_if_modified_since_header_set(self):
        response = self._get_file(
            self.test_name_1, HTTP_IF_MODIFIED_SINCE=caching_http_date
        )
        self.assertEqual(response.status_code, 304)

    def test_last_modified_set_on_response(self):
        response = self._get_file(self.test_name_1)
        self.assertIsNotNone(response.get("Last-Modified"))

    def test_expires_set_on_response(self):
        response = self._get_file(self.test_name_1)
        self.assertIsNotNone(response.get("Expires"))

    def test_content_security_policy_header_http_host(self):
        response = self._get_file(self.test_name_1, HTTP_HOST="testserver.com")
        self.assertEqual(
            response.get("Content-Security-Policy"),
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
        )

    def test_content_security_policy_header_server_name(self):
        self.environ.pop("HTTP_HOST")
        response = self._get_file(self.test_name_1, SERVER_NAME="testserver.com")
        self.assertEqual(
            response.get("Content-Security-Policy"),
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
        )

    @override_settings(USE_X_FORWARDED_HOST=True)
    def test_content_security_policy_header_forward_for(self):
        response = self._get_file(
            self.test_name_1,
            HTTP_X_FORWARDED_HOST="testserver:1234",
        )
        self.assertEqual(
            response.get("Content-Security-Policy"),
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
        )

    def test_access_control_allow_origin_header(self):
        response = self._get_file(self.test_name_1)
        self.assertEqual(response.get("Access-Control-Allow-Origin"), "*")
        response = self._get_file(self.test_name_1, REQUEST_METHOD="OPTIONS")
        self.assertEqual(response.get("Access-Control-Allow-Origin"), "*")

    def test_options_returns_empty(self):
        response = self._get_file(self.test_name_1, REQUEST_METHOD="OPTIONS")
        self.assertEqual(response.content.decode(), "")

    def test_x_frame_options_header(self):
        response = response = self._get_file(self.test_name_1)
        self.assertEqual(response.get("X-Frame-Options", ""), "")

    def test_access_control_allow_headers(self):
        headerval = "X-Penguin-Dance-Party"
        response = self._get_file(
            self.test_name_1,
            REQUEST_METHOD="OPTIONS",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS=headerval,
        )
        self.assertEqual(response.get("Access-Control-Allow-Headers", ""), headerval)
        response = self._get_file(
            self.test_name_1,
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS=headerval,
        )
        self.assertEqual(response.get("Access-Control-Allow-Headers", ""), headerval)

    def test_request_for_html_no_head_return_hashi_modified_html(self):
        response = self._get_file("")
        self.assertEqual(response.content.decode("utf-8"), empty_content)

    def test_request_for_html_body_no_script_return_hashi_modified_html(self):
        response = self._get_file(self.other_name)
        self.assertEqual(response.content.decode("utf-8"), empty_content)

    def test_request_for_html_body_script_return_hashi_modified_html(self):
        response = self._get_file(self.script_name)
        content = (
            "<html><head>{}<script>test</script></head><body></body></html>".format(
                hashi_injection
            )
        )
        self.assertEqual(response.content.decode("utf-8"), content)

    def test_request_for_html_body_script_with_extra_slash_return_hashi_modified_html(
        self,
    ):
        response = self._get_file("/" + self.script_name)
        content = (
            "<html><head>{}<script>test</script></head><body></body></html>".format(
                hashi_injection
            )
        )
        self.assertEqual(response.content.decode("utf-8"), content)

    def test_request_for_embedded_file_return_embedded_file(self):
        response = self._get_file(self.embedded_file_name)
        self.assertEqual(
            next(response.streaming_content).decode(), self.embedded_file_str
        )

    def test_request_for_embedded_file_with_double_slashes_return_embedded_file(self):
        response = self._get_file(self.embedded_file_name.replace("/", "//"))
        self.assertEqual(
            next(response.streaming_content).decode(), self.embedded_file_str
        )

    def test_request_for_html_doctype_return_with_doctype(self):
        response = self._get_file(self.doctype_name)
        content = response.content.decode("utf-8")
        self.assertEqual(
            content[:92].lower().replace("  ", " "), self.doctype.strip().lower()
        )

    def test_request_for_html5_doctype_return_with_doctype(self):
        response = self._get_file(self.html5_doctype_name)
        content = response.content.decode("utf-8")
        self.assertEqual(content[:15].lower(), self.html5_doctype.strip().lower())

    def test_request_for_html_body_script_return_correct_length_header(self):
        response = self._get_file(self.script_name)
        expected_content = (
            "<html><head>{}<script>test</script></head><body></body></html>".format(
                hashi_injection
            )
        )
        file_size = len(expected_content)
        self.assertEqual(int(response["Content-Length"]), file_size)

    def test_request_for_html_empty_html(self):
        response = self._get_file(self.empty_html_name)
        self.assertEqual(response.content.decode("utf-8"), empty_content)

    def test_not_modified_response_when_if_modified_since_header_set_index_file(self):
        response = self._get_file("", HTTP_IF_MODIFIED_SINCE=caching_http_date)
        self.assertEqual(response.status_code, 304)

    def test_not_modified_response_when_if_modified_since_header_set_other_html_file(
        self,
    ):
        response = self._get_file(
            self.other_name, HTTP_IF_MODIFIED_SINCE=caching_http_date
        )
        self.assertEqual(response.status_code, 304)

    def test_post_not_allowed(self):
        response = self._get_file(self.test_name_1, REQUEST_METHOD="POST")
        self.assertEqual(response.status_code, 405)

    def test_put_not_allowed(self):
        response = self._get_file(self.test_name_1, REQUEST_METHOD="PUT")
        self.assertEqual(response.status_code, 405)

    def test_patch_not_allowed(self):
        response = self._get_file(self.test_name_1, REQUEST_METHOD="PATCH")
        self.assertEqual(response.status_code, 405)

    def test_delete_not_allowed(self):
        response = self._get_file(self.test_name_1, REQUEST_METHOD="DELETE")
        self.assertEqual(response.status_code, 405)


@override_option("Deployment", "ZIP_CONTENT_URL_PATH_PREFIX", "prefix_test/")
class UrlPrefixZipContentTestCase(ZipContentTestCase):
    pass
