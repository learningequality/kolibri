import hashlib

from django.test import TestCase

from kolibri.core.content.models import LocalFile
from kolibri.utils.tests.helpers import override_option


class LocalFilePathsTest(TestCase):
    def test_file_url_reversal(self):
        from kolibri.utils.conf import OPTIONS

        path_prefix = OPTIONS["Deployment"]["URL_PATH_PREFIX"]

        if path_prefix != "/":
            path_prefix = "/" + path_prefix

        self.hash = hashlib.md5("DUMMYDATA".encode()).hexdigest()
        file = LocalFile(id=self.hash, extension="otherextension", available=True)
        filename = file.get_filename()
        self.assertEqual(
            file.get_storage_url(),
            "{}content/storage/{}/{}/{}".format(
                path_prefix, filename[0], filename[1], filename
            ),
        )


@override_option("Deployment", "URL_PATH_PREFIX", "prefix_test/")
class PrefixedLocalFilesPathsTest(LocalFilePathsTest):
    pass
