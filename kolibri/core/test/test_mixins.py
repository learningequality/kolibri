import uuid

from django.test import TestCase

from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.mixins import checksums_q


class FilterByChecksumTestCase(TestCase):
    def setUp(self):
        self.checksums = [uuid.uuid4().hex for _ in range(15000)]
        self.seeded = self.checksums[:2]
        for checksum in self.seeded:
            LocalFile.objects.create(id=checksum, extension="mp4", available=True)

    def test_checksums_are_inlined_rather_than_bound(self):
        sql, params = LocalFile.objects.filter_by_checksums(
            self.checksums
        ).query.sql_with_params()
        # Inlined literals do not count against SQLITE_MAX_VARIABLE_NUMBER.
        self.assertEqual((), params)
        self.assertIn(self.checksums[0], sql)

    def test_matches_the_seeded_checksums(self):
        self.assertEqual(
            set(self.seeded),
            set(
                LocalFile.objects.filter_by_checksums(self.checksums).values_list(
                    "id", flat=True
                )
            ),
        )

    def test_an_invalid_checksum_yields_no_results(self):
        self.assertEqual(
            0, LocalFile.objects.filter_by_checksums(["' OR '1'='1"]).count()
        )

    def test_checksums_q_matches_against_a_foreign_key_column(self):
        # get_channel_annotation_stats filters File.local_file_id, not a pk. A
        # CharField-only registration raises FieldError here rather than counting.
        self.assertEqual(
            0, File.objects.filter(checksums_q("local_file_id", self.seeded)).count()
        )
