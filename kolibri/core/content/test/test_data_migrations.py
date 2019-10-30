import os
import unittest
import uuid

from django.db import DataError

from kolibri.core.auth.test.migrationtestcase import TestMigrations


class ChannelFieldsTestCase(TestMigrations):

    migrate_from = "0011_auto_20180907_1017"
    migrate_to = "0012_auto_20180910_1702"
    app = "content"

    def setUp(self):
        self.file_size = 10
        super(ChannelFieldsTestCase, self).setUp()

    def setUpBeforeMigration(self, apps):
        ChannelMetadata = apps.get_model("content", "ChannelMetadata")
        ContentNode = apps.get_model("content", "ContentNode")
        LocalFile = apps.get_model("content", "LocalFile")
        File = apps.get_model("content", "File")
        Language = apps.get_model("content", "Language")

        channel_id = uuid.uuid4().hex
        Language.objects.create(id="es", lang_code="es")
        Language.objects.create(id="en", lang_code="en")
        root = ContentNode.objects.create(
            id=uuid.uuid4(),
            title="test",
            content_id=uuid.uuid4(),
            channel_id=channel_id,
            lft=1,
            rght=12,
            tree_id=1,
            level=1,
            available=True,
            lang_id="es",
        )
        l1 = LocalFile.objects.create(
            id=uuid.uuid4().hex, available=True, file_size=self.file_size
        )
        File.objects.create(
            id=uuid.uuid4().hex, available=True, contentnode=root, local_file=l1
        )
        # unavailable objects which should not be included in calculations
        child = ContentNode.objects.create(
            id=uuid.uuid4(),
            title="test",
            content_id=uuid.uuid4(),
            channel_id=channel_id,
            lft=1,
            rght=12,
            tree_id=1,
            level=2,
            available=False,
            lang_id="en",
            parent=root,
        )
        l2 = LocalFile.objects.create(
            id=uuid.uuid4().hex, available=False, file_size=self.file_size
        )
        File.objects.create(
            id=uuid.uuid4().hex, available=False, contentnode=child, local_file=l2
        )
        ChannelMetadata.objects.create(id=channel_id, name="test", root=root)

    def test_calculated_fields(self):
        ChannelMetadata = self.apps.get_model("content", "ChannelMetadata")
        ContentNode = self.apps.get_model("content", "ContentNode")
        channel = ChannelMetadata.objects.get()
        self.assertEqual(channel.published_size, self.file_size)
        self.assertEqual(
            channel.total_resource_count,
            ContentNode.objects.filter(available=True).count(),
        )
        self.assertListEqual(
            list(channel.included_languages.values_list("id", flat=True)), ["es"]
        )


class ChannelOrderTestCase(TestMigrations):

    migrate_from = "0015_auto_20190125_1715"
    migrate_to = "0016_auto_20190124_1639"
    app = "content"

    def setUp(self):
        super(ChannelOrderTestCase, self).setUp()

    def setUpBeforeMigration(self, apps):
        ChannelMetadata = apps.get_model("content", "ChannelMetadata")
        ContentNode = apps.get_model("content", "ContentNode")
        node = ContentNode.objects.create(
            id=uuid.uuid4(),
            title="test",
            content_id=uuid.uuid4(),
            channel_id=uuid.uuid4(),
            lft=1,
            rght=12,
            tree_id=1,
            level=2,
        )
        ChannelMetadata.objects.create(id=uuid.uuid4().hex, name="c1", root=node)
        ChannelMetadata.objects.create(id=uuid.uuid4().hex, name="c2", root=node)
        ChannelMetadata.objects.create(id=uuid.uuid4().hex, name="c3", root=node)

    def test_channel_order(self):
        ChannelMetadata = self.apps.get_model("content", "ChannelMetadata")
        pos = 1
        for channel in ChannelMetadata.objects.all():
            self.assertEqual(channel.order, pos)
            pos += 1

    @unittest.skipIf(
        os.environ.get("TOX_ENV") != "postgres", "Should only be run for postgres"
    )
    def test_channel_published_size(self):
        # tests the integer field overflow for postgres
        ChannelMetadata = self.apps.get_model("content", "ChannelMetadata")
        channel = ChannelMetadata.objects.first()
        channel.published_size = (
            2150000000  # out of range for integer field on postgres
        )
        with self.assertRaises(DataError):
            channel.save()
