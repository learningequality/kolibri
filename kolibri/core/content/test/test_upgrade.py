import tempfile
import uuid

from django.core.management import call_command
from django.test import TransactionTestCase
from le_utils.constants import content_kinds
from mock import call
from mock import patch

from .sqlalchemytesting import django_connection_engine
from kolibri.core.content.constants.schema_versions import CONTENT_SCHEMA_VERSION
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.upgrade import fix_multiple_trees_with_tree_id1
from kolibri.core.content.upgrade import update_num_coach_contents


def get_engine(connection_string):
    return django_connection_engine()


test_channel_id = "6199dde695db4ee4ab392222d5af1e5c"


mock_content_file = tempfile.mkstemp()
mock_content_db_file = tempfile.mkstemp()


@patch("kolibri.core.content.upgrade.import_channel_from_local_db")
class FixMultipleTreesWithId1TestCase(TransactionTestCase):

    fixtures = ["content_test.json"]

    def execute(self):
        fix_multiple_trees_with_tree_id1()

    @patch(
        "kolibri.core.content.upgrade.get_content_database_file_path",
        return_value=mock_content_file[1],
    )
    def test_extra_channel_contentdb_exists(self, path_mock, import_mock):
        root_node = ContentNode.objects.create(
            title="test",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
        )
        ChannelMetadata.objects.create(
            id=root_node.channel_id,
            root=root_node,
            name="test",
            min_schema_version=CONTENT_SCHEMA_VERSION,
        )
        # Do this to side step django mptts auto tree_id code
        ContentNode.objects.filter(parent=None).update(tree_id=1)
        self.assertEqual(ContentNode.objects.filter(parent=None, tree_id=1).count(), 2)
        self.execute()
        self.assertEqual(ContentNode.objects.filter(parent=None, tree_id=1).count(), 1)
        import_mock.assert_called_with(root_node.channel_id)

    @patch(
        "kolibri.core.content.upgrade.get_content_database_file_path",
        return_value=mock_content_file[1],
    )
    def test_two_extra_channels_contentdb_exists(self, path_mock, import_mock):
        root_node_1 = ContentNode.objects.create(
            title="test",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
        )
        ChannelMetadata.objects.create(
            id=root_node_1.channel_id,
            root=root_node_1,
            name="test",
            min_schema_version=CONTENT_SCHEMA_VERSION,
        )
        root_node_2 = ContentNode.objects.create(
            title="test",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
        )
        # Add an additional node so that root_node_1 channel is processed first.
        ContentNode.objects.create(
            title="test1",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node_2.channel_id,
            parent=root_node_2,
        )
        ChannelMetadata.objects.create(
            id=root_node_2.channel_id,
            root=root_node_2,
            name="test",
            min_schema_version=CONTENT_SCHEMA_VERSION,
        )
        # Do this to side step django mptts auto tree_id code
        ContentNode.objects.filter(parent=None).update(tree_id=1)
        self.assertEqual(ContentNode.objects.filter(parent=None, tree_id=1).count(), 3)
        self.execute()
        self.assertEqual(ContentNode.objects.filter(parent=None, tree_id=1).count(), 1)
        import_mock.assert_has_calls(
            [call(root_node_1.channel_id), call(root_node_2.channel_id)]
        )

    @patch(
        "kolibri.core.content.upgrade.get_content_database_file_path", return_value=""
    )
    def test_extra_channel_no_contentdb_exists(self, path_mock, import_mock):
        root_node = ContentNode.objects.create(
            title="test",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
        )
        ChannelMetadata.objects.create(
            id=root_node.channel_id,
            root=root_node,
            name="test",
            min_schema_version=CONTENT_SCHEMA_VERSION,
        )
        # Do this to side step django mptts auto tree_id code
        ContentNode.objects.filter(parent=None).update(tree_id=1)
        self.assertEqual(ContentNode.objects.filter(parent=None, tree_id=1).count(), 2)
        self.execute()
        self.assertEqual(ContentNode.objects.filter(parent=None, tree_id=1).count(), 2)
        import_mock.assert_not_called()

    @patch(
        "kolibri.core.content.upgrade.get_content_database_file_path",
        side_effect=["", mock_content_file[1]],
    )
    def test_two_extra_channels_one_contentdb_exists(self, path_mock, import_mock):
        root_node_1 = ContentNode.objects.create(
            title="test",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
        )
        ChannelMetadata.objects.create(
            id=root_node_1.channel_id,
            root=root_node_1,
            name="test",
            min_schema_version=CONTENT_SCHEMA_VERSION,
        )
        root_node_2 = ContentNode.objects.create(
            title="test",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
        )
        # Add an additional node so that root_node_1 channel is processed first.
        ContentNode.objects.create(
            title="test1",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node_2.channel_id,
            parent=root_node_2,
        )
        ChannelMetadata.objects.create(
            id=root_node_2.channel_id,
            root=root_node_2,
            name="test",
            min_schema_version=CONTENT_SCHEMA_VERSION,
        )
        # Do this to side step django mptts auto tree_id code
        ContentNode.objects.filter(parent=None).update(tree_id=1)
        self.assertEqual(ContentNode.objects.filter(parent=None, tree_id=1).count(), 3)
        self.execute()
        self.assertEqual(ContentNode.objects.filter(parent=None, tree_id=1).count(), 2)
        with self.assertRaises(AssertionError):
            import_mock.assert_called_with(root_node_1.channel_id)
        import_mock.assert_called_with(root_node_2.channel_id)


@patch("kolibri.core.content.utils.sqlalchemybridge.get_engine", new=get_engine)
class UpdateNumCoachContents(TransactionTestCase):

    fixtures = ["content_test.json"]

    def setUp(self):
        super(UpdateNumCoachContents, self).setUp()
        ContentNode.objects.all().update(available=False)

    def test_no_content_nodes_coach_content(self):
        ContentNode.objects.all().update(available=True)
        ContentNode.objects.all().update(coach_content=False)
        update_num_coach_contents()
        root = ChannelMetadata.objects.get(id=test_channel_id).root
        self.assertEqual(root.num_coach_contents, 0)

    def test_all_root_content_nodes_coach_content(self):
        ContentNode.objects.all().update(available=True, coach_content=False)
        root_node = ContentNode.objects.get(parent__isnull=True)
        ContentNode.objects.filter(parent=root_node).exclude(
            kind=content_kinds.TOPIC
        ).update(coach_content=True)
        update_num_coach_contents()
        root_node.refresh_from_db()
        self.assertEqual(root_node.num_coach_contents, 2)

    def test_one_root_content_node_coach_content(self):
        ContentNode.objects.all().update(available=True, coach_content=False)
        root_node = ContentNode.objects.get(parent__isnull=True)
        node = (
            ContentNode.objects.filter(parent=root_node)
            .exclude(kind=content_kinds.TOPIC)
            .first()
        )
        node.coach_content = True
        node.save()
        update_num_coach_contents()
        root_node.refresh_from_db()
        self.assertEqual(root_node.num_coach_contents, 1)

    def test_one_root_topic_node_coach_content(self):
        ContentNode.objects.all().update(available=True, coach_content=False)
        root_node = ContentNode.objects.get(parent__isnull=True)
        node = ContentNode.objects.filter(
            parent=root_node, kind=content_kinds.TOPIC
        ).first()
        node.coach_content = True
        node.save()
        update_num_coach_contents()
        root_node.refresh_from_db()
        self.assertEqual(root_node.num_coach_contents, 0)

    def test_one_child_node_coach_content(self):
        ContentNode.objects.all().update(available=True, coach_content=False)
        root_node = ContentNode.objects.get(parent__isnull=True)
        node = ContentNode.objects.filter(
            parent=root_node, kind=content_kinds.TOPIC
        ).first()
        ContentNode.objects.create(
            title="test1",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node.channel_id,
            parent=node,
            kind=content_kinds.VIDEO,
            available=True,
            coach_content=True,
        )
        update_num_coach_contents()
        root_node.refresh_from_db()
        node.refresh_from_db()
        self.assertEqual(root_node.num_coach_contents, 1)
        self.assertEqual(node.num_coach_contents, 1)

    def test_one_child_coach_content_parent_no_siblings(self):
        ContentNode.objects.all().update(available=True, coach_content=False)
        root_node = ContentNode.objects.get(parent__isnull=True)
        topic_node = ContentNode.objects.filter(
            parent=root_node, kind=content_kinds.TOPIC
        ).first()
        parent_node = ContentNode.objects.create(
            title="test1",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node.channel_id,
            parent=topic_node,
            kind=content_kinds.TOPIC,
            available=True,
            coach_content=False,
        )
        ContentNode.objects.create(
            title="test2",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node.channel_id,
            parent=parent_node,
            kind=content_kinds.VIDEO,
            available=True,
            coach_content=True,
        )
        ContentNode.objects.create(
            title="test3",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node.channel_id,
            parent=parent_node,
            kind=content_kinds.VIDEO,
            available=True,
            coach_content=False,
        )
        update_num_coach_contents()
        parent_node.refresh_from_db()
        self.assertEqual(parent_node.num_coach_contents, 1)

    def tearDown(self):
        call_command("flush", interactive=False)
        super(UpdateNumCoachContents, self).tearDown()
