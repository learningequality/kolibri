import os
import shutil
import sqlite3
import tempfile
import uuid
from contextlib import closing

from django.apps import apps
from django.conf import settings
from django.db import connections
from django.db import DEFAULT_DB_ALIAS
from django.db.utils import ConnectionDoesNotExist
from django.db.utils import OperationalError
from django.test import TestCase

from kolibri.core.content.models import ContentTag
from kolibri.core.content.utils.channel_import import no_schema_models
from kolibri.core.content.utils.content_db import attached_database
from kolibri.core.content.utils.content_db import content_db
from kolibri.core.content.utils.content_db import CONTENT_DB_ALIAS_PREFIX
from kolibri.core.content.utils.content_db import create_schema


class ContentDBTestCase(TestCase):
    def setUp(self):
        self.directory = tempfile.mkdtemp()
        self.path = os.path.join(self.directory, "content.sqlite3")

    def tearDown(self):
        # Removing a directory holding an open SQLite file fails on Windows, so this
        # also checks that the context manager released the connection.
        shutil.rmtree(self.directory)

    def test_yields_a_registered_alias_for_a_path(self):
        with content_db(self.path) as alias:
            self.assertTrue(alias.startswith(CONTENT_DB_ALIAS_PREFIX))
            self.assertEqual(self.path, connections[alias].settings_dict["NAME"])
            # The alias is a connection for this block, not global configuration.
            self.assertNotIn(alias, settings.DATABASES)

    def test_yields_the_default_alias_without_registering_anything(self):
        default = connections[DEFAULT_DB_ALIAS]
        with content_db(None) as alias:
            self.assertEqual(DEFAULT_DB_ALIAS, alias)

        # Exiting must neither deregister nor close the default connection.
        self.assertIs(default, connections[DEFAULT_DB_ALIAS])
        self.assertIsNotNone(default.connection)

    def test_releases_the_alias_and_connection_on_exit(self):
        with content_db(self.path) as alias:
            create_schema(alias)
            connection = connections[alias]

        self.assertIsNone(connection.connection)
        with self.assertRaises(ConnectionDoesNotExist):
            connections[alias]

    def test_releases_the_alias_and_connection_when_the_caller_raises(self):
        with self.assertRaises(ValueError):
            with content_db(self.path) as alias:
                create_schema(alias)
                raise ValueError("boom")

        with self.assertRaises(ConnectionDoesNotExist):
            connections[alias]

    def test_rows_written_through_the_alias_land_in_the_file(self):
        tag_id = uuid.uuid4().hex
        with content_db(self.path) as alias:
            create_schema(alias)
            ContentTag.objects.using(alias).create(id=tag_id, tag_name="a tag")

        with closing(sqlite3.connect(self.path)) as connection:
            rows = connection.execute(
                "SELECT tag_name FROM content_contenttag WHERE id = ?", [tag_id]
            ).fetchall()
        self.assertEqual([("a tag",)], rows)

    def test_rows_written_through_the_alias_do_not_land_in_the_default_database(self):
        before = ContentTag.objects.count()
        with content_db(self.path) as alias:
            create_schema(alias)
            ContentTag.objects.using(alias).create(
                id=uuid.uuid4().hex, tag_name="a tag"
            )

        self.assertEqual(before, ContentTag.objects.count())

    def test_schema_creation_is_idempotent(self):
        with content_db(self.path) as alias:
            create_schema(alias)
            first = set(connections[alias].introspection.table_names())
            create_schema(alias)
            second = set(connections[alias].introspection.table_names())

        self.assertEqual(first, second)

    def test_creates_exactly_the_current_content_schema_tables(self):
        with content_db(self.path) as alias:
            create_schema(alias)
            created = set(connections[alias].introspection.table_names())

        # A model added to the current content schema but not to _SCHEMA_MODELS fails here.
        self.assertEqual(
            {
                model._meta.db_table
                for model in apps.get_app_config("content").get_models(
                    include_auto_created=True
                )
                if model not in no_schema_models
            },
            created,
        )

    def _count_attached_tags(self, alias):
        with connections[alias].cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM sourcedb.content_contenttag")
            return cursor.fetchone()[0]

    def test_attach_and_detach_a_database(self):
        other_path = os.path.join(self.directory, "other.sqlite3")
        with content_db(other_path) as other:
            create_schema(other)

        with content_db(self.path) as alias:
            create_schema(alias)
            with attached_database(alias, other_path, "sourcedb"):
                self.assertEqual(0, self._count_attached_tags(alias))

            with self.assertRaises(OperationalError):
                self._count_attached_tags(alias)

    def test_detaches_when_the_caller_raises(self):
        with content_db(self.path) as alias:
            create_schema(alias)
            with self.assertRaises(ValueError):
                with attached_database(alias, self.path, "sourcedb"):
                    raise ValueError("boom")

            with self.assertRaises(OperationalError):
                self._count_attached_tags(alias)

    def test_attach_rejects_a_name_that_is_not_an_identifier(self):
        with content_db(self.path) as alias:
            for name in ("source db; DROP", "sourcedb\n", "1sourcedb", ""):
                with self.subTest(name=name):
                    with self.assertRaises(ValueError):
                        with attached_database(alias, self.path, name):
                            pass
