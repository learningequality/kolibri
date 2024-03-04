import tempfile

from django.test import TestCase
from le_utils.constants import content_kinds
from mock import patch
from sqlalchemy import create_engine

from kolibri.core.content.constants.schema_versions import CURRENT_SCHEMA_VERSION
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import LocalFile
from kolibri.core.content.test.helpers import ChannelBuilder
from kolibri.core.content.utils.annotation import mark_local_files_as_available
from kolibri.core.content.utils.sqlalchemybridge import load_metadata
from kolibri.core.content.utils.upgrade import count_removed_resources
from kolibri.core.content.utils.upgrade import get_automatically_updated_resources
from kolibri.core.content.utils.upgrade import get_new_resources_available_for_import


class ChannelUpdateTestBase(TestCase):
    def setUp(self):
        patcher = patch(
            "kolibri.core.content.utils.upgrade.get_annotated_content_database_file_path",
            return_value=self.content_db_path,
        )
        # Do this as tearDown doesn't get called if there is an error in the test.
        self.addCleanup(patcher.stop)
        self.db_path_mock = patcher.start()
        super(ChannelUpdateTestBase, self).setUp()

    @classmethod
    def set_content_fixture(cls):
        _, cls.content_db_path = tempfile.mkstemp(suffix=".sqlite3")

        cls.content_engine = create_engine("sqlite:///" + cls.content_db_path)

        metadata = load_metadata(CURRENT_SCHEMA_VERSION)

        metadata.bind = cls.content_engine

        metadata.create_all()

        conn = cls.content_engine.connect()

        # Write data for each fixture into the table
        for table in metadata.sorted_tables:
            if table.name in cls.upgraded_channel.data:
                conn.execute(table.insert(), cls.upgraded_channel.data[table.name])

        conn.close()

        cls.channel_id = cls.upgraded_channel.channel["id"]


class ChannelUpdateAllNewTestCase(ChannelUpdateTestBase):
    @classmethod
    def setUpTestData(cls):
        cls.upgraded_channel = ChannelBuilder()
        cls.set_content_fixture()
        ContentNode.objects.all().update(available=True)
        LocalFile.objects.all().update(available=True)

    def test_new_resources(self):
        (
            new_resource_ids,
            new_resource_content_ids,
            new_resource_total_size,
        ) = get_new_resources_available_for_import(
            self.content_db_path, self.channel_id
        )

        self.assertEqual(
            set(new_resource_ids),
            set(map(lambda x: x["id"], self.upgraded_channel.resources)),
        )
        self.assertEqual(
            set(new_resource_content_ids),
            set(map(lambda x: x["content_id"], self.upgraded_channel.resources)),
        )
        self.assertEqual(
            new_resource_total_size,
            sum(
                map(
                    lambda x: x["file_size"],
                    self.upgraded_channel.get_resource_localfiles(
                        map(lambda x: x["id"], self.upgraded_channel.resources)
                    ),
                )
            ),
        )

    def test_deleted_resources(self):
        resources_to_be_deleted_count = count_removed_resources(
            self.content_db_path, self.channel_id
        )

        self.assertEqual(resources_to_be_deleted_count, 0)

    def test_update_resources(self):
        (
            updated_resource_ids,
            updated_resource_content_ids,
            updated_resource_total_size,
        ) = get_automatically_updated_resources(self.content_db_path, self.channel_id)

        self.assertEqual(updated_resource_ids, [])
        self.assertEqual(updated_resource_content_ids, [])
        self.assertEqual(updated_resource_total_size, 0)


class ChannelDeleteAllTestCase(ChannelUpdateTestBase):
    @classmethod
    def setUpTestData(cls):
        cls.upgraded_channel = ChannelBuilder(0)
        cls.set_content_fixture()
        cls.already_imported_channel = ChannelBuilder()
        cls.already_imported_channel.insert_into_default_db()
        cls.channel_id = cls.already_imported_channel.channel["id"]
        ContentNode.objects.all().update(available=True)
        LocalFile.objects.all().update(available=True)

    def test_new_resources(self):
        (
            new_resource_ids,
            new_resource_content_ids,
            new_resource_total_size,
        ) = get_new_resources_available_for_import(
            self.content_db_path, self.channel_id
        )

        self.assertEqual(new_resource_ids, [])
        self.assertEqual(new_resource_content_ids, [])
        self.assertEqual(new_resource_total_size, 0)

    def test_deleted_resources(self):
        resources_to_be_deleted_count = count_removed_resources(
            self.content_db_path, self.channel_id
        )

        self.assertEqual(
            resources_to_be_deleted_count,
            ContentNode.objects.exclude(kind=content_kinds.TOPIC)
            .filter(channel_id=self.channel_id, available=True)
            .values("content_id")
            .distinct()
            .count(),
        )

    def test_update_resources(self):
        (
            updated_resource_ids,
            updated_resource_content_ids,
            updated_resource_total_size,
        ) = get_automatically_updated_resources(self.content_db_path, self.channel_id)

        self.assertEqual(updated_resource_ids, [])
        self.assertEqual(updated_resource_content_ids, [])
        self.assertEqual(updated_resource_total_size, 0)


class ChannelMixedTestCase(ChannelUpdateTestBase):
    @classmethod
    def setUpTestData(cls):
        cls.upgraded_channel = ChannelBuilder()
        cls.upgraded_channel.insert_into_default_db()
        cls.upgraded_channel.upgrade(
            new_resources=3, updated_resources=4, deleted_resources=5
        )
        cls.set_content_fixture()
        mark_local_files_as_available(
            LocalFile.objects.all().values_list("id", flat=True),
            destination=cls.content_db_path,
        )
        ContentNode.objects.all().update(available=True)
        LocalFile.objects.all().update(available=True)

    def test_new_resources(self):
        (
            new_resource_ids,
            new_resource_content_ids,
            new_resource_total_size,
        ) = get_new_resources_available_for_import(
            self.content_db_path, self.channel_id
        )

        self.assertEqual(
            set(new_resource_ids),
            set(map(lambda x: x["id"], self.upgraded_channel.new_resources)),
        )
        self.assertEqual(
            set(new_resource_content_ids),
            set(map(lambda x: x["content_id"], self.upgraded_channel.new_resources)),
        )

        new_resource_local_files = self.upgraded_channel.get_resource_localfiles(
            map(lambda x: x["id"], self.upgraded_channel.new_resources)
        )

        self.assertEqual(
            new_resource_total_size,
            sum(map(lambda x: x["file_size"], new_resource_local_files)),
        )

    def test_deleted_resources(self):
        resources_to_be_deleted_count = count_removed_resources(
            self.content_db_path, self.channel_id
        )

        self.assertEqual(resources_to_be_deleted_count, 5)

    def test_update_resources(self):
        (
            updated_resource_ids,
            updated_resource_content_ids,
            updated_resource_total_size,
        ) = get_automatically_updated_resources(self.content_db_path, self.channel_id)

        self.assertEqual(
            set(updated_resource_ids),
            set(map(lambda x: x["id"], self.upgraded_channel.updated_resources)),
        )
        self.assertEqual(
            set(updated_resource_content_ids),
            set(
                map(lambda x: x["content_id"], self.upgraded_channel.updated_resources)
            ),
        )
        self.assertEqual(
            updated_resource_total_size,
            sum(
                map(
                    lambda x: x["file_size"],
                    self.upgraded_channel.updated_resource_localfiles,
                )
            ),
        )


class ChannelDuplicateTestCase(ChannelUpdateTestBase):
    @classmethod
    def setUpTestData(cls):
        cls.upgraded_channel = ChannelBuilder()
        cls.upgraded_channel.insert_into_default_db()
        cls.upgraded_channel.duplicate_resources(10)
        cls.set_content_fixture()
        mark_local_files_as_available(
            LocalFile.objects.all().values_list("id", flat=True),
            destination=cls.content_db_path,
        )
        ContentNode.objects.all().update(available=True)
        LocalFile.objects.all().update(available=True)

    def test_new_resources(self):
        (
            new_resource_ids,
            new_resource_content_ids,
            new_resource_total_size,
        ) = get_new_resources_available_for_import(
            self.content_db_path, self.channel_id
        )

        self.assertEqual(
            set(new_resource_ids),
            set(map(lambda x: x["id"], self.upgraded_channel.duplicated_resources)),
        )
        self.assertEqual(set(new_resource_content_ids), set())

        self.assertEqual(new_resource_total_size, 0)

    def test_deleted_resources(self):
        resources_to_be_deleted_count = count_removed_resources(
            self.content_db_path, self.channel_id
        )

        self.assertEqual(resources_to_be_deleted_count, 0)

    def test_update_resources(self):
        (
            updated_resource_ids,
            updated_resource_content_ids,
            updated_resource_total_size,
        ) = get_automatically_updated_resources(self.content_db_path, self.channel_id)

        self.assertEqual(set(updated_resource_ids), set())
        self.assertEqual(set(updated_resource_content_ids), set())
        self.assertEqual(updated_resource_total_size, 0)


class ChannelNodesMovedTestCase(ChannelUpdateTestBase):
    @classmethod
    def setUpTestData(cls):
        cls.upgraded_channel = ChannelBuilder()
        cls.upgraded_channel.insert_into_default_db()
        cls.upgraded_channel.move_resources(10)
        cls.set_content_fixture()
        mark_local_files_as_available(
            LocalFile.objects.all().values_list("id", flat=True),
            destination=cls.content_db_path,
        )
        ContentNode.objects.all().update(available=True)
        LocalFile.objects.all().update(available=True)

    def test_new_resources(self):
        (
            new_resource_ids,
            new_resource_content_ids,
            new_resource_total_size,
        ) = get_new_resources_available_for_import(
            self.content_db_path, self.channel_id
        )

        self.assertEqual(
            set(new_resource_ids),
            set(map(lambda x: x["id"], self.upgraded_channel.moved_resources)),
        )

        self.assertEqual(set(new_resource_content_ids), set())

        self.assertEqual(new_resource_total_size, 0)

    def test_deleted_resources(self):
        resources_to_be_deleted_count = count_removed_resources(
            self.content_db_path, self.channel_id
        )

        self.assertEqual(
            resources_to_be_deleted_count, len(self.upgraded_channel.deleted_resources)
        )

    def test_update_resources(self):
        (
            updated_resource_ids,
            updated_resource_content_ids,
            updated_resource_total_size,
        ) = get_automatically_updated_resources(self.content_db_path, self.channel_id)

        self.assertEqual(set(updated_resource_ids), set())
        self.assertEqual(set(updated_resource_content_ids), set())
        self.assertEqual(updated_resource_total_size, 0)
