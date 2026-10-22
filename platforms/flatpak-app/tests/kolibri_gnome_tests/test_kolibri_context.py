import unittest
from unittest import mock
from urllib.parse import parse_qs
from urllib.parse import urlsplit

from kolibri_gnome.kolibri_context import KolibriChannelContext
from kolibri_gnome.kolibri_context import KolibriContext
from kolibri_gnome.kolibri_context import LEARN_PATH_PREFIX
from kolibri_gnome.kolibri_daemon_manager import KolibriDaemonManager


class KolibriContextTestCase(unittest.TestCase):
    kolibri_context: KolibriContext

    def assert_kolibri_path_equal(self, url1: str, url2: str):
        url1_tuple = urlsplit(url1)
        url1_inner_tuple = urlsplit(url1_tuple.fragment)
        url2_tuple = urlsplit(url2)
        url2_inner_tuple = urlsplit(url2_tuple.fragment)

        self.assertEqual(
            url1_tuple._replace(fragment=""), url2_tuple._replace(fragment="")
        )

        self.assertEqual(
            url1_inner_tuple._replace(query=""), url2_inner_tuple._replace(query="")
        )

        self.assertEqual(
            parse_qs(url1_inner_tuple.query), parse_qs(url2_inner_tuple.query)
        )


class TestKolibriContext(KolibriContextTestCase):
    CONTENT_ID = "89abcde"
    TOPIC_ID = "01234567"

    def setUp(self):
        self.kolibri_context = KolibriContext()

    def test_parse_kolibri_url_tuple_content(self):
        self.assert_kolibri_path_equal(
            self.kolibri_context.parse_kolibri_url_tuple(
                urlsplit(f"kolibri:c/{self.CONTENT_ID}")
            ),
            f"{LEARN_PATH_PREFIX}topics/c/{self.CONTENT_ID}",
        )

    def test_parse_kolibri_url_tuple_content_with_search(self):
        self.assert_kolibri_path_equal(
            self.kolibri_context.parse_kolibri_url_tuple(
                urlsplit(f"kolibri:c/{self.CONTENT_ID}?search=addition")
            ),
            f"{LEARN_PATH_PREFIX}topics/c/{self.CONTENT_ID}?keywords=addition&last=TOPICS_TOPIC_SEARCH",
        )

    def test_parse_kolibri_url_tuple_topic(self):
        self.assert_kolibri_path_equal(
            self.kolibri_context.parse_kolibri_url_tuple(
                urlsplit(f"kolibri:t/{self.TOPIC_ID}")
            ),
            f"{LEARN_PATH_PREFIX}topics/t/{self.TOPIC_ID}",
        )

    def test_parse_kolibri_url_tuple_topic_with_search(self):
        self.assert_kolibri_path_equal(
            self.kolibri_context.parse_kolibri_url_tuple(
                urlsplit(f"kolibri:t/{self.TOPIC_ID}?search=addition")
            ),
            f"{LEARN_PATH_PREFIX}topics/t/{self.TOPIC_ID}",
        )

    def test_parse_kolibri_url_tuple_base_with_search(self):
        self.assert_kolibri_path_equal(
            self.kolibri_context.parse_kolibri_url_tuple(
                urlsplit("kolibri:?search=addition")
            ),
            f"{LEARN_PATH_PREFIX}library?keywords=addition",
        )

        self.assert_kolibri_path_equal(
            self.kolibri_context.parse_kolibri_url_tuple(
                urlsplit("kolibri:?search=addition+and+subtraction")
            ),
            f"{LEARN_PATH_PREFIX}library?keywords=addition+and+subtraction",
        )


class TestKolibriChannelContext(KolibriContextTestCase):
    CHANNEL_ID = "fedcba9"
    CONTENT_ID = "89abcde"
    TOPIC_ID = "01234567"

    def setUp(self):
        self.kolibri_context = KolibriChannelContext(self.CHANNEL_ID)

    def test_parse_kolibri_url_tuple_content(self):
        TestKolibriContext.test_parse_kolibri_url_tuple_content(self)

    def test_parse_kolibri_url_tuple_content_with_search(self):
        TestKolibriContext.test_parse_kolibri_url_tuple_content_with_search(self)

    def test_parse_kolibri_url_tuple_topic(self):
        TestKolibriContext.test_parse_kolibri_url_tuple_topic(self)

    def test_parse_kolibri_url_tuple_topic_with_search(self):
        TestKolibriContext.test_parse_kolibri_url_tuple_topic_with_search(self)

    def test_parse_kolibri_url_tuple_base_with_search(self):
        self.assert_kolibri_path_equal(
            self.kolibri_context.parse_kolibri_url_tuple(
                urlsplit("kolibri:?search=addition")
            ),
            f"{LEARN_PATH_PREFIX}topics/t/{self.CHANNEL_ID}/search?keywords=addition",
        )

        self.assert_kolibri_path_equal(
            self.kolibri_context.parse_kolibri_url_tuple(
                urlsplit("kolibri:?search=addition+and+subtraction")
            ),
            f"{LEARN_PATH_PREFIX}topics/t/{self.CHANNEL_ID}/search?keywords=addition+and+subtraction",
        )

    def _should_open_restoring(
        self, restore_location, url="http://127.0.0.1:46655/en/learn/"
    ):
        with (
            mock.patch.object(
                KolibriDaemonManager, "is_url_in_scope", return_value=True
            ),
            mock.patch.object(
                KolibriDaemonManager,
                "kolibri_api_get",
                return_value={"channel_id": "other"},
            ),
        ):
            return self.kolibri_context.should_open_url(url, restore_location)

    def test_opens_the_page_a_channel_restore_lands_on(self):
        self.assertTrue(
            self._should_open_restoring(f"/en/learn/#/topics/t/{self.CHANNEL_ID}")
        )

    def test_does_not_open_the_page_an_off_channel_restore_lands_on(self):
        self.assertFalse(
            self._should_open_restoring(f"/en/learn/#/topics/t/{self.TOPIC_ID}")
        )

    def test_does_not_open_an_off_channel_page_the_restored_path_shows(self):
        self.assertFalse(
            self._should_open_restoring(
                f"/en/learn/#/topics/t/{self.CHANNEL_ID}",
                "http://127.0.0.1:46655/en/learn/#/home",
            )
        )


if __name__ == "__main__":
    unittest.main()
