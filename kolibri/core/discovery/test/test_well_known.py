from django.test import TestCase

from kolibri.core.discovery.well_known import is_central_content_base_url
from kolibri.utils.tests.helpers import override_option


class IsCentralContentBaseUrlTestCase(TestCase):
    @override_option("Urls", "CENTRAL_CONTENT_BASE_URL", "https://central.example.org")
    def test_scheme_and_trailing_slash_do_not_matter(self):
        for url in (
            "https://central.example.org",
            "https://central.example.org/",
            "http://central.example.org",
            "http://central.example.org/",
        ):
            with self.subTest(url=url):
                self.assertTrue(is_central_content_base_url(url))

    @override_option(
        "Urls", "CENTRAL_CONTENT_BASE_URL", "http://central.example.org:8080"
    )
    def test_port_and_path_must_match(self):
        self.assertTrue(
            is_central_content_base_url("https://central.example.org:8080/")
        )
        for url in (
            "http://central.example.org:8000/",
            "http://central.example.org/",
            "http://central.example.org:8080/studio/",
            "http://192.168.1.5:8080/",
            "not a url",
        ):
            with self.subTest(url=url):
                self.assertFalse(is_central_content_base_url(url))
