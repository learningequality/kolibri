from django.test import TestCase

from kolibri.core.kolibri_plugin import FrontEndCoreAppAssetHook
from kolibri.utils.tests.helpers import override_option


@override_option("Deployment", "ZIP_CONTENT_URL_PATH_PREFIX", "zip/")
class ContentUrlPluginDataTestCase(TestCase):
    def test_zip_content_storage_url_follows_zip_content_url_path_prefix(self):
        urls = FrontEndCoreAppAssetHook().plugin_data["urls"]
        self.assertEqual(urls["__zipContentStorageUrl"], "/zip/content/storage/")
