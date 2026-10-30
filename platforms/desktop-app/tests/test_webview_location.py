import json
import os
import tempfile
import unittest

from kolibri_app.webview_location import LastPage
from kolibri_app.webview_location import restore_url_for

ORIGIN = "http://127.0.0.1:46655"
PAGE_URL = "http://127.0.0.1:46655/en/facility/?token=x#/data/import"
PAGE_LOCATION = "/en/facility/?token=x#/data/import"
INITIALIZE_PATH = "/app/api/initialize/abc"


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


class TestLastPage(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.state_path = os.path.join(tmp.name, "app_state.json")

    def _served(self, origin=ORIGIN):
        last_page = LastPage(self.state_path)
        last_page.served_at(
            f"{origin}{INITIALIZE_PATH}?auth_token=u&next=%2Fen%2Flearn%2F"
        )
        return last_page

    def test_a_relaunch_opens_the_saved_page_without_its_fragment(self):
        self._served().save(PAGE_URL)
        relaunched = LastPage(self.state_path)
        self.assertEqual(relaunched.location, PAGE_LOCATION)
        self.assertEqual(relaunched.next_url, "/en/facility/?token=x")

    def test_saves_pages_on_the_port_it_was_last_served_at(self):
        self._served().save(PAGE_URL)
        relaunched = self._served("http://127.0.0.1:50000")
        relaunched.save("http://127.0.0.1:50000/en/facility/?token=x")
        self.assertEqual(LastPage(self.state_path).location, "/en/facility/?token=x")

    def test_anything_that_is_not_one_of_our_pages_is_not_saved(self):
        last_page = self._served()
        for url in (
            None,
            "about:blank",
            "https://learningequality.org/en/",
            "http://localhost:46655/en/learn/",
            "http://127.0.0.1:46656/zipcontent/abc.zip/index.html",
        ):
            with self.subTest(url=url):
                last_page.save(url)
                self.assertFalse(os.path.exists(self.state_path))

    def test_the_initialize_url_is_not_saved(self):
        last_page = self._served()
        last_page.save(PAGE_URL)
        last_page.save(f"{ORIGIN}{INITIALIZE_PATH}?auth_token=u&next=%2Fen%2Flearn%2F")
        self.assertEqual(LastPage(self.state_path).location, PAGE_LOCATION)

    def test_nothing_is_saved_before_the_server_is_known(self):
        LastPage(self.state_path).save(PAGE_URL)
        self.assertFalse(os.path.exists(self.state_path))

    def test_an_unchanged_location_is_not_rewritten(self):
        last_page = self._served()
        last_page.save(PAGE_URL)
        os.remove(self.state_path)
        last_page.save(PAGE_URL)
        self.assertFalse(os.path.exists(self.state_path))

    def test_a_state_file_with_only_the_old_url_key_opens_its_page(self):
        with open(self.state_path, "w", encoding="utf-8") as f:
            json.dump({"URL": f"http://localhost:46655{PAGE_LOCATION}"}, f)
        last_page = LastPage(self.state_path)
        self.assertEqual(last_page.location, PAGE_LOCATION)
        self.assertEqual(last_page.next_url, "/en/facility/?token=x")

    def test_an_old_url_key_on_another_host_opens_the_default_page(self):
        with open(self.state_path, "w", encoding="utf-8") as f:
            json.dump({"URL": f"https://example.org{PAGE_LOCATION}"}, f)
        self.assertIsNone(LastPage(self.state_path).location)

    def test_an_unreadable_state_file_opens_the_default_page(self):
        for content in ("not json", "[]"):
            with self.subTest(content=content):
                with open(self.state_path, "w", encoding="utf-8") as f:
                    f.write(content)
                self.assertIsNone(LastPage(self.state_path).location)
