import uuid

from django.db import connections
from django.db import router
from django.db.backends.sqlite3.base import DatabaseWrapper as SQLiteDatabaseWrapper
from django.test import TestCase
from testapp.models import Chunk
from testapp.models import ChunkVector
from testapp.models import Document
from testapp.models import DocumentChunkVector

from django_vectors.db.backends.sqlite3.base import DatabaseWrapper

FIXTURE_MODELS = (ChunkVector, Chunk, Document, DocumentChunkVector)


class VectorAliasRoutingTestCase(TestCase):
    databases = "__all__"

    def test_fixture_models_route_to_vectors_alias(self):
        for model in FIXTURE_MODELS:
            with self.subTest(model=model.__name__):
                self.assertEqual(router.db_for_read(model), "vectors")
                self.assertEqual(router.db_for_write(model), "vectors")

    def test_fixture_tables_exist_only_on_vectors_alias(self):
        vectors_tables = set(connections["vectors"].introspection.table_names())
        default_tables = set(connections["default"].introspection.table_names())
        for model in FIXTURE_MODELS:
            with self.subTest(model=model.__name__):
                self.assertIn(model._meta.db_table, vectors_tables)
                self.assertNotIn(model._meta.db_table, default_tables)

    def test_unlisted_testapp_models_stay_off_vectors_alias(self):
        self.assertFalse(
            router.allow_migrate("vectors", "testapp", model_name="unlisted")
        )
        self.assertTrue(
            router.allow_migrate("default", "testapp", model_name="unlisted")
        )

    def test_only_vectors_alias_uses_library_backend(self):
        self.assertIsInstance(connections["vectors"], DatabaseWrapper)
        self.assertIs(type(connections["default"]), SQLiteDatabaseWrapper)

    def test_related_models_round_trip_without_using(self):
        vector = ChunkVector.objects.create(
            embedding=b"\x00" * 16, channel_id=uuid.uuid4().hex, kind="text"
        )
        document = Document.objects.create()
        chunk = Chunk.objects.create(
            content_node_id=uuid.uuid4(), text="chunk", ordinal=0, vector=vector
        )
        link = DocumentChunkVector.objects.create(document=document, vector=vector)

        self.assertEqual(Chunk.objects.get(pk=chunk.pk)._state.db, "vectors")
        self.assertEqual(list(Chunk.objects.filter(vector__kind="text")), [chunk])
        self.assertEqual(
            list(
                DocumentChunkVector.objects.filter(
                    document=document, vector__channel_id=vector.channel_id
                )
            ),
            [link],
        )
