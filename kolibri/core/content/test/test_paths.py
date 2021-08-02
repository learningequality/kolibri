import hashlib

from django.test import TestCase

from kolibri.core.content.models import LocalFile


class LocalFilePathsTest(TestCase):
    def test_file_url_reversal(self):
        self.hash = hashlib.md5("DUMMYDATA".encode()).hexdigest()
        file = LocalFile(id=self.hash, extension="otherextension", available=True)
        filename = file.get_filename()
        self.assertEqual(
            file.get_storage_url(),
            "/content/storage/{}/{}/{}".format(filename[0], filename[1], filename),
        )
