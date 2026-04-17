import tempfile
import uuid

from django.test import TestCase
from le_utils.constants import content_kinds
from le_utils.constants import format_presets
from le_utils.constants import modalities
from mock import patch
from sqlalchemy import create_engine

from kolibri.core.content.constants.schema_versions import CURRENT_SCHEMA_VERSION
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.content.test.helpers import ChannelBuilder
from kolibri.core.content.utils.annotation import mark_local_files_as_available
from kolibri.core.content.utils.channels import CHANNEL_UPDATE_STATS_CACHE_KEY
from kolibri.core.content.utils.sqlalchemybridge import load_metadata
from kolibri.core.content.utils.upgrade import count_removed_resources
from kolibri.core.content.utils.upgrade import get_automatically_updated_resources
from kolibri.core.content.utils.upgrade import get_import_data_for_update
from kolibri.core.content.utils.upgrade import get_new_resources_available_for_import
from kolibri.core.utils.cache import process_cache


class ChannelUpdateTestBase(TestCase):
    def setUp(self):
        patcher = patch(
            "kolibri.core.content.utils.upgrade.get_annotated_content_database_file_path",
            return_value=self.content_db_path,
        )
        # Do this as tearDown doesn't get called if there is an error in the test.
        self.addCleanup(patcher.stop)
        self.db_path_mock = patcher.start()
        super().setUp()

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


class CourseUpgradeTestCase(ChannelUpdateTestBase):
    """
    Tests course-aware upgrade logic.

    Fixture layout (upgrade DB):
        Root (topic)
        ├── Course (topic, modality=COURSE)   <- available in local DB
        │   ├── ExistingChild1..N (video)     <- available in local DB
        │   └── new_descendant (video)        <- only in upgrade DB, file unavailable
        └── non_course_sibling (video)        <- only in upgrade DB, file unavailable
    """

    @classmethod
    def setUpTestData(cls):
        # Small channel: root -> 1 topic -> 3 leaves
        cls.upgraded_channel = ChannelBuilder(levels=1, num_children=3)
        cls.upgraded_channel.insert_into_default_db()

        # Designate the first topic child of root as a COURSE
        root_children = cls.upgraded_channel.root_node["children"]
        cls.course_node = next(
            c for c in root_children if c["kind"] == content_kinds.TOPIC
        )
        cls.course_id = cls.course_node["id"]

        # Set COURSE modality in local DB (both the modality field and options JSON);
        # mark everything available
        ContentNode.objects.filter(pk=cls.course_id).update(
            modality=modalities.COURSE,
            options={"modality": modalities.COURSE},
        )
        ContentNode.objects.all().update(available=True)
        LocalFile.objects.all().update(available=True)

        # Add a new leaf under the course (only in upgrade DB)
        cls.new_descendant = cls.upgraded_channel.generate_leaf(cls.course_id)
        cls.course_node["children"].append(cls.new_descendant)

        # Add a new leaf outside the course at root level (only in upgrade DB)
        cls.non_course_sibling = cls.upgraded_channel.generate_leaf(
            cls.upgraded_channel.root_node["id"]
        )
        cls.upgraded_channel.root_node["children"].append(cls.non_course_sibling)

        # Rebuild lft/rght/tree_id to include the two new nodes
        cls.upgraded_channel.generate_nodes_from_root_node()

        # Set course options to valid JSON text so the LIKE query in upgrade.py matches
        cls.upgraded_channel.nodes[cls.course_id]["options"] = '{"modality": "COURSE"}'

        cls.set_content_fixture()

        # Mark files present in the local DB as available in the upgrade DB.
        # new_descendant and non_course_sibling files are not in local DB, so
        # they remain unavailable in the upgrade DB (triggering the update paths).
        mark_local_files_as_available(
            LocalFile.objects.all().values_list("id", flat=True),
            destination=cls.content_db_path,
        )

    def test_new_course_descendant_included_in_auto_update(self):
        (
            updated_ids,
            updated_content_ids,
            total_size,
        ) = get_automatically_updated_resources(self.content_db_path, self.channel_id)
        self.assertIn(self.new_descendant["id"], updated_ids)
        self.assertIn(self.new_descendant["content_id"], updated_content_ids)
        self.assertGreater(total_size, 0)

    def test_new_course_descendant_size_counted_in_auto_update(self):
        _, _, total_size = get_automatically_updated_resources(
            self.content_db_path, self.channel_id
        )
        primary_size = sum(
            self.upgraded_channel.localfiles[
                self.upgraded_channel.files[f_id]["local_file_id"]
            ]["file_size"]
            for f_id in self.upgraded_channel.node_to_files_map[
                self.new_descendant["id"]
            ]
            if not self.upgraded_channel.files[f_id]["supplementary"]
        )
        self.assertGreaterEqual(total_size, primary_size)

    def test_new_course_descendant_excluded_when_course_unavailable(self):
        ContentNode.objects.filter(pk=self.course_id).update(available=False)
        updated_ids, updated_content_ids, _ = get_automatically_updated_resources(
            self.content_db_path, self.channel_id
        )
        self.assertNotIn(self.new_descendant["id"], updated_ids)
        self.assertNotIn(self.new_descendant["content_id"], updated_content_ids)

    # ------------------------------------------------------------------
    # get_new_resources_available_for_import
    # ------------------------------------------------------------------

    def test_new_resources_excludes_course_descendants(self):
        updated_ids, updated_content_ids, _ = get_automatically_updated_resources(
            self.content_db_path, self.channel_id
        )
        new_ids, new_content_ids, _ = get_new_resources_available_for_import(
            self.content_db_path,
            self.channel_id,
            exclude_node_ids=set(updated_ids),
            exclude_content_ids=set(updated_content_ids),
        )
        self.assertNotIn(self.new_descendant["id"], new_ids)
        self.assertNotIn(self.new_descendant["content_id"], new_content_ids)

    def test_new_resources_still_includes_non_course_new_nodes(self):
        updated_ids, updated_content_ids, _ = get_automatically_updated_resources(
            self.content_db_path, self.channel_id
        )
        new_ids, new_content_ids, _ = get_new_resources_available_for_import(
            self.content_db_path,
            self.channel_id,
            exclude_node_ids=set(updated_ids),
            exclude_content_ids=set(updated_content_ids),
        )
        self.assertIn(self.non_course_sibling["id"], new_ids)
        self.assertIn(self.non_course_sibling["content_id"], new_content_ids)

    def test_new_resources_size_excludes_course_descendant_bytes(self):
        updated_ids, updated_content_ids, _ = get_automatically_updated_resources(
            self.content_db_path, self.channel_id
        )
        _, _, size_with_exclusion = get_new_resources_available_for_import(
            self.content_db_path,
            self.channel_id,
            exclude_node_ids=set(updated_ids),
            exclude_content_ids=set(updated_content_ids),
        )
        _, _, size_without_exclusion = get_new_resources_available_for_import(
            self.content_db_path, self.channel_id
        )
        self.assertLessEqual(size_with_exclusion, size_without_exclusion)


class CourseImportDataTestCase(TestCase):
    """
    Tests get_import_data_for_update picks up primary files for new course
    descendants present in the local DB (available=False) after channel DB import,
    and excludes their supplementary files.
    """

    @classmethod
    def setUpTestData(cls):
        channel_id = uuid.uuid4().hex

        root = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=channel_id,
            kind=content_kinds.TOPIC,
            title="Root",
            available=True,
        )
        course = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=channel_id,
            kind=content_kinds.TOPIC,
            title="Course",
            parent=root,
            available=True,
            modality=modalities.COURSE,
            options={"modality": modalities.COURSE},
        )
        # Unavailable descendant — simulates a node present in the local DB after
        # the channel DB import but before set_content_visibility runs.
        descendant = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=channel_id,
            kind=content_kinds.VIDEO,
            title="New Descendant",
            parent=course,
            available=False,
        )

        primary_lf = LocalFile.objects.create(
            id=uuid.uuid4().hex,
            file_size=500,
            extension="mp4",
            available=False,
        )
        File.objects.create(
            id=uuid.uuid4().hex,
            local_file=primary_lf,
            contentnode=descendant,
            supplementary=False,
            thumbnail=False,
            preset=format_presets.VIDEO_LOW_RES,
            lang_id=None,
            priority=None,
        )

        supp_lf = LocalFile.objects.create(
            id=uuid.uuid4().hex,
            file_size=100,
            extension="png",
            available=False,
        )
        File.objects.create(
            id=uuid.uuid4().hex,
            local_file=supp_lf,
            contentnode=descendant,
            supplementary=True,
            thumbnail=True,
            preset=format_presets.VIDEO_THUMBNAIL,
            lang_id=None,
            priority=None,
        )

        cls.channel_id = channel_id
        cls.primary_lf = primary_lf
        cls.supp_lf = supp_lf

    def setUp(self):
        process_cache.set(
            CHANNEL_UPDATE_STATS_CACHE_KEY.format(self.channel_id),
            {
                "updated_resource_ids": [],
                "updated_resource_content_ids": [],
                "updated_resource_total_size": 0,
                "new_resource_ids": [],
                "new_resource_content_ids": [],
                "new_resource_total_size": 0,
            },
            None,
        )

    def tearDown(self):
        process_cache.delete(CHANNEL_UPDATE_STATS_CACHE_KEY.format(self.channel_id))

    def test_primary_file_included_for_course_descendant(self):
        _, files_to_download, _ = get_import_data_for_update(self.channel_id)
        downloaded_ids = {f["id"] for f in files_to_download}
        self.assertIn(self.primary_lf.id, downloaded_ids)

    def test_supplementary_file_excluded_for_new_course_descendant(self):
        _, files_to_download, _ = get_import_data_for_update(self.channel_id)
        downloaded_ids = {f["id"] for f in files_to_download}
        self.assertNotIn(self.supp_lf.id, downloaded_ids)

    def test_total_bytes_includes_course_descendant_primary_file(self):
        _, _, total_bytes = get_import_data_for_update(self.channel_id)
        self.assertGreaterEqual(total_bytes, self.primary_lf.file_size)
