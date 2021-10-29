import copy
import random
import tempfile
import uuid
from itertools import chain

from django.test import TestCase
from le_utils.constants import content_kinds
from le_utils.constants import format_presets
from le_utils.constants.labels.accessibility_categories import (
    ACCESSIBILITYCATEGORIESLIST,
)
from le_utils.constants.labels.learning_activities import LEARNINGACTIVITIESLIST
from le_utils.constants.labels.levels import LEVELSLIST
from le_utils.constants.labels.needs import NEEDSLIST
from le_utils.constants.labels.subjects import SUBJECTSLIST
from mock import patch
from sqlalchemy import create_engine

from kolibri.core.content.constants.schema_versions import CURRENT_SCHEMA_VERSION
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.annotation import mark_local_files_as_available
from kolibri.core.content.utils.content_types_tools import renderable_files_presets
from kolibri.core.content.utils.sqlalchemybridge import load_metadata
from kolibri.core.content.utils.upgrade import count_removed_resources
from kolibri.core.content.utils.upgrade import get_automatically_updated_resources
from kolibri.core.content.utils.upgrade import get_new_resources_available_for_import


def to_dict(instance):
    opts = instance._meta
    data = {}
    for f in chain(opts.concrete_fields, opts.private_fields):
        data[f.name] = f.value_from_object(instance)
    return data


def uuid4_hex():
    return uuid.uuid4().hex


def choices(sequence, k):
    return [random.choice(sequence) for _ in range(0, k)]


class ChannelBuilder(object):
    """
    This class is purely to generate all the relevant data for a single
    channel for use during testing.
    """

    __TREE_CACHE = {}

    tree_keys = (
        "channel",
        "files",
        "localfiles",
        "node_to_files_map",
        "localfile_to_files_map",
        "root_node",
    )

    def __init__(self, levels=3, num_children=5):
        self.levels = levels
        self.num_children = num_children

        self.modified = set()

        try:
            self.load_data()
        except KeyError:
            self.generate_new_tree()
            self.save_data()

        self.generate_nodes_from_root_node()

    @property
    def cache_key(self):
        return "{}_{}".format(self.levels, self.num_children)

    def generate_new_tree(self):
        self.channel = self.channel_data()
        self.files = {}
        self.localfiles = {}
        self.node_to_files_map = {}
        self.localfile_to_files_map = {}

        self.root_node = self.generate_topic()
        self.channel["root_id"] = self.root_node["id"]

        if self.levels:
            self.root_node["children"] = self.recurse_and_generate(
                self.root_node["id"], self.levels
            )

    def load_data(self):
        try:
            data = copy.deepcopy(self.__TREE_CACHE[self.cache_key])

            for key in self.tree_keys:
                setattr(self, key, data[key])
        except KeyError:
            print(
                "No tree cache found for {} levels and {} children per level".format(
                    self.levels, self.num_children
                )
            )
            raise

    def save_data(self):
        data = {}

        for key in self.tree_keys:
            data[key] = getattr(self, key)

        self.__TREE_CACHE[self.cache_key] = copy.deepcopy(data)

    def generate_nodes_from_root_node(self):
        self._django_nodes = ContentNode.objects.build_tree_nodes(self.root_node)

        self.nodes = {n["id"]: n for n in map(to_dict, self._django_nodes)}

    def insert_into_default_db(self):
        ContentNode.objects.bulk_create(self._django_nodes)
        ChannelMetadata.objects.create(**self.channel)
        LocalFile.objects.bulk_create(
            (LocalFile(**l) for l in self.localfiles.values())
        )
        File.objects.bulk_create((File(**f) for f in self.files.values()))

    def recurse_tree_until_leaf_container(self, parent):
        if not parent.get("children"):
            parent["children"] = []
            return parent
        child = random.choice(parent["children"])
        if child["kind"] != content_kinds.TOPIC:
            return parent
        return self.recurse_tree_until_leaf_container(child)

    def delete_file(self, file):
        try:
            index = self.localfile_to_files_map[file["local_file_id"]].index(file["id"])
            self.localfile_to_files_map[file["local_file_id"]].pop(index)
        except ValueError:
            pass
        if not self.localfile_to_files_map[file["local_file_id"]]:
            del self.localfiles[file["local_file_id"]]
        del self.files[file["id"]]

    def update_resource(self, resource):
        """
        Update any main files for the resource
        """
        new_localfiles = []
        keys_to_remove = set()
        # Make a copy of the node to file map
        # as it will otherwise change during iteration
        node_to_files_map = list(self.node_to_files_map[resource["id"]])
        for f_id in node_to_files_map:
            file = self.files[f_id]
            if not file["supplementary"]:
                self.delete_file(file)
                # Create a new file in its place
                localfile = self.localfile_data()
                self.file_data(
                    resource["id"], localfile["id"], preset=format_presets.VIDEO_LOW_RES
                )
                keys_to_remove.add(f_id)
                new_localfiles.append(localfile)
        self.node_to_files_map[resource["id"]] = list(
            filter(
                lambda x: x not in keys_to_remove,
                self.node_to_files_map[resource["id"]],
            )
        )
        return new_localfiles

    def update_thumbnail(self, node):
        """
        Update the thumbnail for a node
        """
        new_localfiles = []
        keys_to_remove = set()
        # Make a copy of the node to file map
        # as it will otherwise change during iteration
        node_to_files_map = list(self.node_to_files_map[node["id"]])
        for f_id in node_to_files_map:
            file = self.files[f_id]
            if file["thumbnail"]:
                self.delete_file(file)
                # Create a new file in its place
                thumbnail = self.localfile_data(extension="png")
                self.file_data(
                    node["id"],
                    thumbnail["id"],
                    thumbnail=True,
                    preset=format_presets.TOPIC_THUMBNAIL,
                )
                keys_to_remove.add(f_id)
                new_localfiles.append(thumbnail)
        self.node_to_files_map[node["id"]] = list(
            filter(
                lambda x: x not in keys_to_remove, self.node_to_files_map[node["id"]]
            )
        )
        return new_localfiles

    def delete_resource_files(self, resource):
        for f_id in self.node_to_files_map[resource["id"]]:
            file = self.files[f_id]
            self.delete_file(file)
        del self.node_to_files_map[resource["id"]]

    def duplicate_resource(self, resource):
        node = self.contentnode_data(
            parent_id=resource["parent_id"],
            content_id=resource["content_id"],
            kind=resource["kind"],
        )
        for f_id in self.node_to_files_map[resource["id"]]:
            file = self.files[f_id]
            self.file_data(
                node["id"],
                file["local_file_id"],
                thumbnail=file["thumbnail"],
                preset=file["preset"],
            )
        return node

    def duplicate_resources(self, num_resources):
        self.duplicated_resources = []
        for i in range(0, num_resources):
            child = None
            while child is None or child["id"] in self.modified:
                parent = self.recurse_tree_until_leaf_container(self.root_node)
                child = random.choice(parent["children"])
            duplicate = self.duplicate_resource(child)
            self.duplicated_resources.append(duplicate)
            parent["children"].append(duplicate)
            self.modified.add(duplicate["id"])
        self.generate_nodes_from_root_node()

    def move_resources(self, num_resources):
        self.moved_resources = []
        self.deleted_resources = []
        for i in range(0, num_resources):
            child = None
            while child is None or child["id"] in self.modified:
                parent = self.recurse_tree_until_leaf_container(self.root_node)
                child = random.choice(parent["children"])
            moved = self.duplicate_resource(child)
            self.moved_resources.append(moved)
            self.deleted_resources.append(child)
            parent["children"].pop(parent["children"].index(child))
            parent["children"].append(moved)
            self.modified.add(moved["id"])
        self.generate_nodes_from_root_node()

    def upgrade(self, new_resources=0, updated_resources=0, deleted_resources=0):
        self.new_resources = []
        self.updated_thumbnails = []
        for i in range(0, new_resources):
            parent = self.recurse_tree_until_leaf_container(self.root_node)
            child = self.generate_leaf(parent["id"])
            parent["children"].append(child)
            self.new_resources.append(child)
            # To emulate a common occurrence that produces edge cases
            # we also update the parent's thumbnail here
            self.updated_thumbnails.extend(self.update_thumbnail(parent))
            self.modified.add(child["id"])

        self.updated_resources = []
        self.updated_resource_localfiles = []
        for i in range(0, updated_resources):
            child = None
            while child is None or child["id"] in self.modified:
                parent = self.recurse_tree_until_leaf_container(self.root_node)
                child = random.choice(parent["children"])
            self.updated_resource_localfiles.extend(self.update_resource(child))
            self.updated_resources.append(child)
            self.modified.add(child["id"])

        self.deleted_resources = []
        for i in range(0, deleted_resources):
            child = None
            while child is None or child["id"] in self.modified:
                parent = self.recurse_tree_until_leaf_container(self.root_node)
                child_index = random.randint(0, len(parent["children"]) - 1)
                child = parent["children"][child_index]
            child = parent["children"].pop(child_index)
            self.delete_resource_files(child)
            self.deleted_resources.append(child)

        self.generate_nodes_from_root_node()

    @property
    def resources(self):
        return filter(lambda x: x["kind"] != content_kinds.TOPIC, self.nodes.values())

    def get_resource_localfiles(self, ids):
        localfiles = {}
        for r in ids:
            for f in self.node_to_files_map.get(r, []):
                file = self.files[f]
                localfile = self.localfiles[file["local_file_id"]]
                localfiles[localfile["id"]] = localfile
        return list(localfiles.values())

    @property
    def data(self):
        return {
            "content_channel": [self.channel],
            "content_contentnode": list(self.nodes.values()),
            "content_file": list(self.files.values()),
            "content_localfile": list(self.localfiles.values()),
        }

    def recurse_and_generate(self, parent_id, levels):
        children = []
        for i in range(0, self.num_children):
            if levels == 0:
                node = self.generate_leaf(parent_id)
            else:
                node = self.generate_topic(parent_id=parent_id)
                node["children"] = self.recurse_and_generate(node["id"], levels - 1)
            children.append(node)
        return children

    def generate_topic(self, parent_id=None):
        data = self.contentnode_data(
            kind=content_kinds.TOPIC, root=parent_id is None, parent_id=parent_id
        )
        thumbnail = self.localfile_data(extension="png")
        self.file_data(
            data["id"],
            thumbnail["id"],
            thumbnail=True,
            preset=format_presets.TOPIC_THUMBNAIL,
        )
        return data

    def generate_leaf(self, parent_id):
        node = self.contentnode_data(parent_id=parent_id, kind=content_kinds.VIDEO)
        localfile = self.localfile_data()
        thumbnail = self.localfile_data(extension="png")
        self.file_data(node["id"], localfile["id"], preset=format_presets.VIDEO_LOW_RES)
        self.file_data(
            node["id"],
            thumbnail["id"],
            thumbnail=True,
            preset=format_presets.VIDEO_THUMBNAIL,
        )
        return node

    def channel_data(self, channel_id=None, version=1):
        return {
            "root_id": None,
            "last_updated": None,
            "version": 1,
            "author": "Outis",
            "description": "Test channel",
            "tagline": None,
            "min_schema_version": "1",
            "thumbnail": "",
            "name": "testing",
            "id": channel_id or uuid4_hex(),
        }

    def localfile_data(self, extension="mp4"):
        data = {
            "file_size": random.randint(1, 1000),
            "extension": extension,
            "available": False,
            "id": uuid4_hex(),
        }

        self.localfiles[data["id"]] = data

        return data

    def file_data(
        self,
        contentnode_id,
        local_file_id,
        thumbnail=False,
        preset=None,
        supplementary=False,
    ):
        data = {
            "priority": None,
            "supplementary": supplementary or thumbnail,
            "id": uuid4_hex(),
            "local_file_id": local_file_id or uuid4_hex(),
            "contentnode_id": contentnode_id,
            "thumbnail": thumbnail,
            "preset": preset or random.choice(list(renderable_files_presets)),
            "lang_id": None,
        }
        self.files[data["id"]] = data
        if contentnode_id not in self.node_to_files_map:
            self.node_to_files_map[contentnode_id] = []
        self.node_to_files_map[contentnode_id].append(data["id"])
        if local_file_id not in self.localfile_to_files_map:
            self.localfile_to_files_map[local_file_id] = []
        self.localfile_to_files_map[local_file_id].append(data["id"])
        return data

    def contentnode_data(
        self, node_id=None, content_id=None, parent_id=None, kind=None, root=False
    ):
        # First kind in choices is Topic, so exclude it here.
        kind = kind or random.choice(content_kinds.choices[1:])[0]
        return {
            "options": "{}",
            "content_id": content_id or uuid4_hex(),
            "channel_id": self.channel["id"],
            "description": "Blah blah blah",
            "id": node_id or uuid4_hex(),
            "license_name": "GNU",
            "license_owner": "",
            "license_description": None,
            "lang_id": None,
            "author": "",
            "title": "Test",
            "parent_id": None if root else parent_id or uuid4_hex(),
            "kind": kind,
            "coach_content": False,
            "available": False,
            "learning_activities": ",".join(
                set(choices(LEARNINGACTIVITIESLIST, k=random.randint(1, 3)))
            ),
            "accessibility_labels": ",".join(
                set(choices(ACCESSIBILITYCATEGORIESLIST, k=random.randint(1, 3)))
            ),
            "grade_levels": ",".join(set(choices(LEVELSLIST, k=random.randint(1, 2)))),
            "categories": ",".join(set(choices(SUBJECTSLIST, k=random.randint(1, 10)))),
            "learner_needs": ",".join(set(choices(NEEDSLIST, k=random.randint(1, 5)))),
        }


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

        cls.content_engine = create_engine(
            "sqlite:///" + cls.content_db_path, convert_unicode=True
        )

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
