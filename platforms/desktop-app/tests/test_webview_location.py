import json
import os
import tempfile
import unittest

from kolibri_app.webview_location import LastPage

ORIGIN = "http://127.0.0.1:46655"
PAGE_URL = "http://127.0.0.1:46655/en/facility/?token=x#/data/import"
PAGE_LOCATION = "/en/facility/?token=x#/data/import"
INITIALIZE_PATH = "/app/api/initialize/abc"


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

    def test_saves_pages_served_on_the_default_port(self):
        last_page = self._served("http://127.0.0.1:80")
        last_page.save("http://127.0.0.1/en/learn/#/topics/x")
        self.assertEqual(last_page.origin, "http://127.0.0.1")
        self.assertEqual(LastPage(self.state_path).location, "/en/learn/#/topics/x")

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
