from django.test import RequestFactory
from django.test import TestCase

from kolibri_opensearch_plugin.views import Descriptor
from kolibri_opensearch_plugin.views import Search


class DescriptorViewTestCase(TestCase):
    def test_descriptor_returns_opensearch_xml(self):
        request = RequestFactory().get("/opensearch/")
        response = Descriptor.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            response["Content-Type"].startswith("application/opensearchdescription+xml")
        )
        body = response.content.decode("utf-8")
        self.assertIn("<ShortName>Kolibri</ShortName>", body)
        self.assertIn("OpenSearchDescription", body)
        self.assertIn("{searchTerms}", body)


class SearchViewTestCase(TestCase):
    fixtures = ["content_test.json"]

    def test_missing_q_returns_412(self):
        request = RequestFactory().get("/opensearch/search/")
        response = Search.as_view()(request)
        self.assertEqual(response.status_code, 412)

    def test_valid_q_returns_atom_feed_with_matching_content(self):
        request = RequestFactory().get("/opensearch/search/", {"q": "root"})
        response = Search.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response["Content-Type"].startswith("application/atom+xml"))
        body = response.content.decode("utf-8")
        # `root` is an available ContentNode in content_test.json; the search
        # filter matches it on title and the view renders each result as an
        # Atom <entry>. Assert on the entry (a rendered result), NOT on the
        # bare string "root": the feed's <subtitle> echoes the query term, so
        # "root" appears in the body even when zero results match — a bare
        # `assertIn("root", body)` would pass on an empty feed and prove
        # nothing. The matched node's title becomes the entry title.
        self.assertIn("<entry>", body)
        self.assertIn("<title>root</title>", body)
