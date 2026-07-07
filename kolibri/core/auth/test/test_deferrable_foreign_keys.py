import pytest
from django.conf import settings
from django.db import connection
from django.test import TransactionTestCase
from morango.deferrable_foreign_keys import _get_table_sql

from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import Facility
from kolibri.core.auth.upgrade import make_foreign_keys_deferrable


class DeferrableForeignKeysTestCase(TransactionTestCase):
    def _rewrite_collection_fk_immediate(self):
        table = Collection._meta.db_table
        sql = _get_table_sql(connection, table)
        immediate = sql.replace(" DEFERRABLE INITIALLY DEFERRED", "")
        assert "DEFERRABLE" not in immediate
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name=%s AND sql IS NOT NULL",
                [table],
            )
            indexes = [r[0] for r in cursor.fetchall()]
            cursor.execute("PRAGMA foreign_keys = OFF")
            cursor.execute("DROP TABLE {}".format(table))
            cursor.execute(immediate)
            for idx in indexes:
                cursor.execute(idx)
            cursor.execute("PRAGMA foreign_keys = ON")

    @pytest.mark.skipif(
        "sqlite3" not in settings.DATABASES["default"]["ENGINE"],
        reason="sqlite3 only",
    )
    def test_remake_makes_deferrable_and_preserves_data(self):
        table = Collection._meta.db_table
        # fresh schema should be deferrable
        self.assertIn("DEFERRABLE", _get_table_sql(connection, table))

        # downgrade schema to immediate FK (table is rebuilt empty)
        self._rewrite_collection_fk_immediate()
        self.assertNotIn("DEFERRABLE", _get_table_sql(connection, table))

        # create some data on the immediate-FK schema
        f = Facility.objects.create(name="testfac")
        f_id = f.id
        self.assertTrue(Collection.objects.filter(id=f_id).exists())

        make_foreign_keys_deferrable()

        # now deferrable again, and data preserved
        self.assertIn("DEFERRABLE", _get_table_sql(connection, table))
        self.assertTrue(Collection.objects.filter(id=f_id).exists())
