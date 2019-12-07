from django.core.management import call_command
from django.test import TransactionTestCase
from mock import patch

from .sqlalchemytesting import django_connection_engine
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.importability_annotation import (
    get_channel_annotation_stats,
)


def get_engine(connection_string):
    return django_connection_engine()


test_channel_id = "6199dde695db4ee4ab392222d5af1e5c"
file_id_1 = "6bdfea4a01830fdd4a585181c0b8068c"
file_id_2 = "e00699f859624e0f875ac6fe1e13d648"


@patch("kolibri.core.content.utils.sqlalchemybridge.get_engine", new=get_engine)
class ImportabilityStats(TransactionTestCase):

    fixtures = ["content_test.json"]

    def test_all_files(self):
        File.objects.update(supplementary=False)
        checksums = list(LocalFile.objects.all().values_list("id", flat=True))
        stats = get_channel_annotation_stats(test_channel_id, checksums)
        self.assertEqual(len(stats), 4)

    def test_all_files_available_no_files_remote(self):
        LocalFile.objects.update(available=True)
        File.objects.update(supplementary=False)
        checksums = []
        stats = get_channel_annotation_stats(test_channel_id, checksums)
        self.assertEqual(len(stats), 4)

    def tearDown(self):
        call_command("flush", interactive=False)
        super(ImportabilityStats, self).tearDown()
