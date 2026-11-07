import unittest

from kolibri_gnome.webview_location import restore_url_for

ORIGIN = "http://127.0.0.1:46655"
PAGE_URL = "http://127.0.0.1:46655/en/facility/?token=x#/data/import"
PAGE_LOCATION = "/en/facility/?token=x#/data/import"


class TestRestoreUrlFor(unittest.TestCase):
    def test_restores_the_fragment_when_path_and_query_match(self):
        self.assertEqual(
            restore_url_for(f"{ORIGIN}/en/facility/?token=x", PAGE_LOCATION), PAGE_URL
        )

    def test_restores_over_a_route_the_landed_page_already_set(self):
        self.assertEqual(
            restore_url_for(f"{ORIGIN}/en/facility/?token=x#/data", PAGE_LOCATION),
            PAGE_URL,
        )

    def test_is_none_when_a_redirect_changed_the_path(self):
        self.assertIsNone(restore_url_for(f"{ORIGIN}/en/device/", "/en/auth/#/signin"))

    def test_is_none_when_the_query_differs(self):
        self.assertIsNone(
            restore_url_for(f"{ORIGIN}/en/facility/?token=y", PAGE_LOCATION)
        )

    def test_is_none_when_the_saved_location_has_no_fragment(self):
        self.assertIsNone(restore_url_for(f"{ORIGIN}/en/learn/#/home", "/en/learn/"))

    def test_is_none_when_the_loaded_url_is_already_the_restore_url(self):
        self.assertIsNone(restore_url_for(PAGE_URL, PAGE_LOCATION))

    def test_is_none_without_a_loaded_url_or_saved_location(self):
        self.assertIsNone(restore_url_for(None, PAGE_LOCATION))
        self.assertIsNone(restore_url_for("about:blank", PAGE_LOCATION))
        self.assertIsNone(restore_url_for(PAGE_URL, None))
