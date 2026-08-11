import uuid

from django.test import TestCase

from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.exams.models import IndividualSyncableExam
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


class InlineInTestCase(TestCase):
    def setUp(self):
        self.checksum = uuid.uuid4().hex
        LocalFile.objects.create(id=self.checksum, extension="mp4", available=True)

    def sql_for(self, values):
        return LocalFile.objects.filter(id__inline_in=values).query.sql_with_params()

    def test_inlinable_values_are_not_bound(self):
        sql, params = self.sql_for([self.checksum])
        self.assertEqual((), params)
        self.assertIn(self.checksum, sql)

    def test_a_quote_falls_back_to_binding(self):
        sql, params = self.sql_for(["' OR '1'='1"])
        self.assertEqual(("' OR '1'='1",), params)

    def test_a_placeholder_falls_back_to_binding(self):
        # Inlined, `%s` would survive into the SQL string that the SQLite backend
        # rewrites to `?`, shifting every parameter bound after it.
        sql, params = self.sql_for(["%s"])
        self.assertEqual(("%s",), params)

    def test_one_unsafe_value_binds_the_whole_list(self):
        sql, params = self.sql_for([self.checksum, "%s"])
        self.assertEqual({self.checksum, "%s"}, set(params))

    def test_integers_are_inlined_unquoted(self):
        # A quoted literal against an integer column is a postgres error, and a
        # deferred fetch inlines whatever pk its model happens to have.
        sql, params = LocalFile.objects.filter(
            file_size__inline_in=[17, 42]
        ).query.sql_with_params()
        self.assertEqual((), params)
        self.assertIn("(17,42)", sql)

    def test_a_uuid_instance_is_inlined(self):
        # Django's own UUIDField prepares a UUID instance on a backend with a
        # native uuid type, and 32-char hex on one without. Binding either costs
        # a deferred fetch one variable per parent.
        sql, params = IndividualSyncableExam.objects.filter(
            exam_id__inline_in=[uuid.uuid4()]
        ).query.sql_with_params()
        self.assertEqual((), params)

    def test_an_unsafe_value_matches_nothing_rather_than_injecting(self):
        self.assertEqual(
            [self.checksum],
            list(
                LocalFile.objects.filter(
                    id__inline_in=[self.checksum, "' OR '1'='1"]
                ).values_list("id", flat=True)
            ),
        )
