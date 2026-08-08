import os
import shutil
import tempfile
import uuid

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db import connection
from django.db import DataError
from django.db.models import Exists
from django.db.models import OuterRef
from django.test import TestCase
from django.test import TransactionTestCase
from django.test.utils import CaptureQueriesContext
from le_utils.constants import content_kinds
from mock import patch

from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import Language
from kolibri.core.content.models import LocalFile
from kolibri.core.content.test.helpers import ChannelBuilder
from kolibri.core.content.utils.annotation import calculate_included_languages
from kolibri.core.content.utils.annotation import calculate_ordered_categories
from kolibri.core.content.utils.annotation import calculate_ordered_grade_levels
from kolibri.core.content.utils.annotation import calculate_published_size
from kolibri.core.content.utils.annotation import calculate_total_resource_count
from kolibri.core.content.utils.annotation import mark_local_files_as_available
from kolibri.core.content.utils.annotation import mark_local_files_as_unavailable
from kolibri.core.content.utils.annotation import recurse_annotation_up_tree
from kolibri.core.content.utils.annotation import set_channel_ancestors
from kolibri.core.content.utils.annotation import set_channel_metadata_fields
from kolibri.core.content.utils.annotation import (
    set_leaf_node_availability_from_local_file_availability,
)
from kolibri.core.content.utils.annotation import set_leaf_nodes_invisible
from kolibri.core.content.utils.annotation import set_local_file_availability_from_disk
from kolibri.core.content.utils.content_db import content_db
from kolibri.core.content.utils.content_db import create_schema
from kolibri.core.content.utils.tree import get_channel_node_depth

test_channel_id = "6199dde695db4ee4ab392222d5af1e5c"


class ChannelNodeDepthTestCase(TestCase):
    def test_a_channel_with_no_nodes_is_zero_deep(self):
        # Callers iterate range(depth, 0, -1), which raises on None.
        self.assertEqual(0, get_channel_node_depth(uuid.uuid4().hex))

    def test_depth_counts_the_levels_below_the_root(self):
        channel_id = uuid.uuid4().hex
        parent = None
        for title in ("root", "child", "grandchild"):
            parent = ContentNode.objects.create(
                id=uuid.uuid4().hex,
                content_id=uuid.uuid4().hex,
                channel_id=channel_id,
                parent=parent,
                title=title,
                kind=content_kinds.TOPIC,
                available=False,
            )
        self.assertEqual(2, get_channel_node_depth(channel_id))


class ExistsInUpdateEvaluatesPerRowTestCase(TransactionTestCase):
    """
    The leaf availability passes set available=Exists(...) in an update(), which
    is only correct if Django evaluates that Exists once per row, matching
    OuterRef("id") to the row being updated. Evaluated once for the whole
    statement instead, every node would come out with the same availability.
    """

    databases = "__all__"
    fixtures = ["content_test.json"]

    def test_update_with_exists_correlates_to_the_row_being_updated(self):
        available_checksum = (
            File.objects.filter(
                supplementary=False, contentnode__channel_id=test_channel_id
            )
            .exclude(contentnode__kind=content_kinds.TOPIC)
            .order_by("id")
            .values_list("local_file_id", flat=True)
            .first()
        )
        LocalFile.objects.all().update(available=False)
        LocalFile.objects.filter(id=available_checksum).update(available=True)
        ContentNode.objects.all().update(available=False)

        # Computed off the fixture rows in Python, so that a subquery that lost
        # its correlation cannot produce the expected set as well.
        nodes_with_an_available_file = {
            contentnode_id
            for contentnode_id, supplementary, local_file_id in File.objects.values_list(
                "contentnode_id", "supplementary", "local_file_id"
            )
            if not supplementary and local_file_id == available_checksum
        }
        non_topic_ids = {
            node_id
            for node_id, kind in ContentNode.objects.filter(
                channel_id=test_channel_id
            ).values_list("id", "kind")
            if kind != content_kinds.TOPIC
        }
        expected = non_topic_ids & nodes_with_an_available_file
        # An uncorrelated EXISTS flags every non-topic node or none of them, so
        # the expected set has to be neither for the outcome assertion to bite.
        self.assertTrue(expected)
        self.assertTrue(expected < non_topic_ids)

        with CaptureQueriesContext(connection) as captured:
            ContentNode.objects.filter(channel_id=test_channel_id).exclude(
                kind=content_kinds.TOPIC
            ).update(
                available=Exists(
                    File.objects.filter(
                        contentnode=OuterRef("id"),
                        supplementary=False,
                        local_file__available=True,
                    )
                )
            )

        self.assertEqual(
            expected,
            set(
                ContentNode.objects.filter(available=True).values_list("id", flat=True)
            ),
        )
        self.assertEqual(1, len(captured.captured_queries))
        sql = captured.captured_queries[0]["sql"]
        self.assertIn("EXISTS", sql)
        self.assertIn('"content_contentnode"."id"', sql)


class SetContentNodesInvisibleTestCase(TransactionTestCase):
    databases = "__all__"
    fixtures = ["content_test.json"]

    def test_all_leaves(self):
        ContentNode.objects.all().update(available=True)
        set_leaf_nodes_invisible(test_channel_id)
        self.assertFalse(
            any(
                ContentNode.objects.exclude(kind=content_kinds.TOPIC).values_list(
                    "available", flat=True
                )
            )
        )

    def test_other_channel_node_still_available(self):
        test = ContentNode.objects.filter(kind=content_kinds.VIDEO).first()
        test.id = uuid.uuid4().hex
        test.channel_id = uuid.uuid4().hex
        test.available = True
        test.parent = None
        test.save()
        set_leaf_nodes_invisible(test_channel_id)
        test.refresh_from_db()
        self.assertTrue(test.available)

    def test_include_ids_absent_from_the_channel_change_nothing(self):
        # No MPTT constraint applies in any range, which must select nothing rather
        # than fall back to an unconstrained update that hides the whole channel.
        ContentNode.objects.all().update(available=True)
        set_leaf_nodes_invisible(test_channel_id, node_ids=[uuid.uuid4().hex])
        self.assertEqual(0, ContentNode.objects.filter(available=False).count())

    def test_all_nodes_available_include_all(self):
        ContentNode.objects.all().update(available=True)
        include_ids = list(
            ContentNode.objects.exclude(kind=content_kinds.TOPIC).values_list(
                "id", flat=True
            )
        )
        set_leaf_nodes_invisible(test_channel_id, node_ids=include_ids)
        self.assertFalse(
            any(
                ContentNode.objects.exclude(kind=content_kinds.TOPIC).values_list(
                    "available", flat=True
                )
            )
        )

    def test_all_nodes_available_include_one(self):
        # These nodes in the fixture have erroneous mptt metadata so break tests that depend on it.
        ContentNode.objects.filter(title="copy").delete()
        ContentNode.objects.all().update(available=True)
        include_ids = [ContentNode.objects.exclude(kind=content_kinds.TOPIC).first().id]
        set_leaf_nodes_invisible(test_channel_id, node_ids=include_ids)
        self.assertEqual(ContentNode.objects.filter(available=False).count(), 1)

    def test_all_nodes_available_include_duplicate_topic_only(self):
        ContentNode.objects.all().update(available=True)
        parent = ContentNode.objects.get(title="c3")
        copy = ContentNode.objects.get(title="c2c1")
        copy.id = uuid.uuid4().hex
        copy.parent = None
        copy.lft = None
        copy.rght = None
        copy.tree_id = None
        copy.save()
        copy.move_to(parent)
        copy.save()
        include_ids = [parent.id]

        set_leaf_nodes_invisible(test_channel_id, node_ids=include_ids)
        self.assertEqual(ContentNode.objects.filter(title="c2c1").count(), 2)
        self.assertEqual(
            ContentNode.objects.filter(title="c2c1", available=False).count(), 1
        )

    def test_all_nodes_available_exclude_all(self):
        ContentNode.objects.all().update(available=True)
        exclude_ids = list(
            ContentNode.objects.exclude(kind=content_kinds.TOPIC).values_list(
                "id", flat=True
            )
        )
        set_leaf_nodes_invisible(test_channel_id, exclude_node_ids=exclude_ids)
        self.assertTrue(
            all(
                ContentNode.objects.exclude(kind=content_kinds.TOPIC).values_list(
                    "available", flat=True
                )
            )
        )

    def test_all_nodes_available_exclude_root(self):
        ContentNode.objects.all().update(available=True)
        exclude_ids = list(
            ContentNode.objects.filter(parent__isnull=True).values_list("id", flat=True)
        )
        set_leaf_nodes_invisible(test_channel_id, exclude_node_ids=exclude_ids)
        self.assertTrue(
            all(
                ContentNode.objects.exclude(kind=content_kinds.TOPIC).values_list(
                    "available", flat=True
                )
            )
        )

    def test_all_nodes_available_exclude_duplicate_topic(self):
        ContentNode.objects.all().update(available=True)
        parent = ContentNode.objects.get(title="c3")
        copy = ContentNode.objects.get(title="c2c1")
        copy.id = uuid.uuid4().hex
        copy.parent = None
        copy.lft = None
        copy.rght = None
        copy.tree_id = None
        copy.save()
        copy.move_to(parent)
        copy.save()
        exclude_ids = [parent.id]

        set_leaf_nodes_invisible(test_channel_id, exclude_node_ids=exclude_ids)
        self.assertEqual(ContentNode.objects.filter(title="c2c1").count(), 2)
        self.assertEqual(
            ContentNode.objects.filter(title="c2c1", available=False).count(), 1
        )

    def test_all_nodes_available_include_original_exclude_duplicate_topic(self):
        ContentNode.objects.all().update(available=True)
        parent = ContentNode.objects.get(title="c3")
        copy = ContentNode.objects.get(title="c2c1")
        original_id = copy.id
        copy.id = uuid.uuid4().hex
        copy.parent = None
        copy.lft = None
        copy.rght = None
        copy.tree_id = None
        copy.save()
        copy.move_to(parent)
        copy.save()
        original = ContentNode.objects.get(id=original_id)
        exclude_ids = [parent.id]

        set_leaf_nodes_invisible(
            test_channel_id, node_ids=[original.parent.id], exclude_node_ids=exclude_ids
        )
        self.assertEqual(ContentNode.objects.filter(title="c2c1").count(), 2)
        self.assertEqual(
            ContentNode.objects.filter(title="c2c1", available=False).count(), 1
        )

    def test_all_nodes_available_non_include_exclude_unaffected(self):
        ContentNode.objects.all().update(available=True)
        exclude = ContentNode.objects.get(title="c3")
        include = ContentNode.objects.get(title="c2")
        node = ContentNode.objects.get(title="copy", kind=content_kinds.VIDEO)
        set_leaf_nodes_invisible(
            test_channel_id, node_ids=[include.id], exclude_node_ids=[exclude.id]
        )
        node.refresh_from_db()
        self.assertTrue(node.available)

    def test_all_leaves_clear_admin_imported(self):
        ContentNode.objects.all().update(available=True)
        set_leaf_nodes_invisible(test_channel_id, clear_admin_imported=True)
        self.assertFalse(
            any(
                ContentNode.objects.exclude(kind=content_kinds.TOPIC).values_list(
                    "admin_imported", flat=True
                )
            )
        )

    def test_all_leaves_no_clear_admin_imported(self):
        ContentNode.objects.all().update(available=True, admin_imported=True)
        set_leaf_nodes_invisible(test_channel_id)
        self.assertTrue(
            all(
                ContentNode.objects.exclude(kind=content_kinds.TOPIC).values_list(
                    "admin_imported", flat=True
                )
            )
        )

    def tearDown(self):
        call_command("flush", interactive=False)
        super().tearDown()


class AnnotationFromLocalFileAvailability(TransactionTestCase):
    fixtures = ["content_test.json"]

    def test_all_local_files_available(self):
        LocalFile.objects.all().update(available=True)
        set_leaf_node_availability_from_local_file_availability(test_channel_id)
        self.assertTrue(
            all(
                ContentNode.objects.exclude(kind=content_kinds.TOPIC)
                .exclude(files=None)
                .values_list("available", flat=True)
            )
        )

    def test_no_local_files_available(self):
        LocalFile.objects.all().update(available=False)
        set_leaf_node_availability_from_local_file_availability(test_channel_id)
        self.assertEqual(
            ContentNode.objects.exclude(kind=content_kinds.TOPIC)
            .filter(available=True)
            .count(),
            0,
        )

    def test_one_local_file_available(self):
        LocalFile.objects.all().update(available=False)
        LocalFile.objects.filter(id="6bdfea4a01830fdd4a585181c0b8068c").update(
            available=True
        )
        set_leaf_node_availability_from_local_file_availability(test_channel_id)
        self.assertTrue(
            ContentNode.objects.get(id="32a941fb77c2576e8f6b294cde4c3b0c").available
        )
        self.assertFalse(
            all(
                ContentNode.objects.exclude(kind=content_kinds.TOPIC)
                .exclude(id="32a941fb77c2576e8f6b294cde4c3b0c")
                .values_list("available", flat=True)
            )
        )

    def test_other_channel_node_still_available(self):
        test = ContentNode.objects.filter(kind=content_kinds.VIDEO).first()
        test.id = uuid.uuid4().hex
        test.channel_id = uuid.uuid4().hex
        test.available = True
        test.parent = None
        test.save()
        set_leaf_node_availability_from_local_file_availability(test_channel_id)
        test.refresh_from_db()
        self.assertTrue(test.available)

    def test_all_local_files_available_include_all(self):
        ContentNode.objects.all().update(available=False)
        LocalFile.objects.all().update(available=True)
        include_ids = list(
            ContentNode.objects.exclude(kind=content_kinds.TOPIC).values_list(
                "id", flat=True
            )
        )
        set_leaf_node_availability_from_local_file_availability(
            test_channel_id, node_ids=include_ids
        )
        self.assertTrue(
            all(
                ContentNode.objects.exclude(kind=content_kinds.TOPIC)
                .exclude(files=None)
                .values_list("available", flat=True)
            )
        )

    def test_all_local_files_available_include_one(self):
        ContentNode.objects.all().update(available=False)
        LocalFile.objects.all().update(available=True)
        include_ids = [ContentNode.objects.exclude(kind=content_kinds.TOPIC).first().id]
        set_leaf_node_availability_from_local_file_availability(
            test_channel_id, node_ids=include_ids
        )
        self.assertEqual(ContentNode.objects.filter(available=True).count(), 1)

    def test_all_local_files_available_include_duplicate_topic_only(self):
        ContentNode.objects.all().update(available=False)
        LocalFile.objects.all().update(available=True)
        parent = ContentNode.objects.get(title="c3")
        copy = ContentNode.objects.get(title="c2c1")
        original_id = copy.id
        copy.id = uuid.uuid4().hex
        copy.parent = None
        copy.lft = None
        copy.rght = None
        copy.tree_id = None
        copy.save()
        copy.move_to(parent)
        copy.save()
        original = ContentNode.objects.get(id=original_id)
        for file in original.files.all():
            file.id = uuid.uuid4().hex
            file.contentnode = copy
            file.save()
        include_ids = [parent.id]

        set_leaf_node_availability_from_local_file_availability(
            test_channel_id, node_ids=include_ids
        )
        self.assertEqual(ContentNode.objects.filter(title="c2c1").count(), 2)
        self.assertEqual(
            ContentNode.objects.filter(title="c2c1", available=True).count(), 1
        )

    def test_all_local_files_available_exclude_all(self):
        ContentNode.objects.all().update(available=False)
        LocalFile.objects.all().update(available=True)
        exclude_ids = list(
            ContentNode.objects.exclude(kind=content_kinds.TOPIC).values_list(
                "id", flat=True
            )
        )
        set_leaf_node_availability_from_local_file_availability(
            test_channel_id, exclude_node_ids=exclude_ids
        )
        self.assertFalse(
            any(
                ContentNode.objects.exclude(kind=content_kinds.TOPIC)
                .exclude(files=None)
                .values_list("available", flat=True)
            )
        )

    def test_all_local_files_available_exclude_root(self):
        ContentNode.objects.all().update(available=False)
        LocalFile.objects.all().update(available=True)
        exclude_ids = list(
            ContentNode.objects.filter(parent__isnull=True).values_list("id", flat=True)
        )
        set_leaf_node_availability_from_local_file_availability(
            test_channel_id, exclude_node_ids=exclude_ids
        )
        self.assertFalse(
            any(
                ContentNode.objects.exclude(kind=content_kinds.TOPIC)
                .exclude(files=None)
                .values_list("available", flat=True)
            )
        )

    def test_all_local_files_available_exclude_duplicate_topic(self):
        ContentNode.objects.all().update(available=False)
        LocalFile.objects.all().update(available=True)
        parent = ContentNode.objects.get(title="c3")
        copy = ContentNode.objects.get(title="c2c1")
        original_id = copy.id
        copy.id = uuid.uuid4().hex
        copy.parent = None
        copy.lft = None
        copy.rght = None
        copy.tree_id = None
        copy.save()
        copy.move_to(parent)
        copy.save()
        original = ContentNode.objects.get(id=original_id)
        for file in original.files.all():
            file.id = uuid.uuid4().hex
            file.contentnode = copy
            file.save()
        exclude_ids = [parent.id]

        set_leaf_node_availability_from_local_file_availability(
            test_channel_id, exclude_node_ids=exclude_ids
        )
        self.assertEqual(ContentNode.objects.filter(title="c2c1").count(), 2)
        self.assertEqual(
            ContentNode.objects.filter(title="c2c1", available=True).count(), 1
        )

    def test_all_local_files_available_include_original_exclude_duplicate_topic(self):
        ContentNode.objects.all().update(available=False)
        LocalFile.objects.all().update(available=True)
        parent = ContentNode.objects.get(title="c3")
        copy = ContentNode.objects.get(title="c2c1")
        original_id = copy.id
        copy.id = uuid.uuid4().hex
        copy.parent = None
        copy.lft = None
        copy.rght = None
        copy.tree_id = None
        copy.save()
        copy.move_to(parent)
        copy.save()
        original = ContentNode.objects.get(id=original_id)
        for file in original.files.all():
            file.id = uuid.uuid4().hex
            file.contentnode = copy
            file.save()
        exclude_ids = [parent.id]

        set_leaf_node_availability_from_local_file_availability(
            test_channel_id, node_ids=[original.parent.id], exclude_node_ids=exclude_ids
        )
        self.assertEqual(ContentNode.objects.filter(title="c2c1").count(), 2)
        self.assertEqual(
            ContentNode.objects.filter(title="c2c1", available=True).count(), 1
        )

    def test_all_local_files_available_non_include_exclude_unaffected(self):
        ContentNode.objects.all().update(available=False)
        LocalFile.objects.all().update(available=True)
        exclude = ContentNode.objects.get(title="c3")
        include = ContentNode.objects.get(title="c2")
        node = ContentNode.objects.get(title="copy", kind=content_kinds.VIDEO)
        self.assertFalse(node.available)
        node.available = True
        node.save()
        set_leaf_node_availability_from_local_file_availability(
            test_channel_id, node_ids=[include.id], exclude_node_ids=[exclude.id]
        )
        node.refresh_from_db()
        self.assertTrue(node.available)

    def test_all_local_files_admin_imported_true(self):
        ContentNode.objects.all().update(available=False)
        LocalFile.objects.all().update(available=True)
        node = ContentNode.objects.get(title="copy", kind=content_kinds.VIDEO)
        set_leaf_node_availability_from_local_file_availability(
            test_channel_id, admin_imported=True
        )
        node.refresh_from_db()
        self.assertTrue(node.admin_imported)

    def test_all_local_files_admin_imported_true_overwrites(self):
        ContentNode.objects.all().update(available=False)
        LocalFile.objects.all().update(available=True)
        node = ContentNode.objects.get(title="copy", kind=content_kinds.VIDEO)
        node.admin_imported = False
        node.save()
        set_leaf_node_availability_from_local_file_availability(
            test_channel_id, admin_imported=True
        )
        node.refresh_from_db()
        self.assertTrue(node.admin_imported)

    def test_all_local_files_admin_imported_false(self):
        ContentNode.objects.all().update(available=False)
        LocalFile.objects.all().update(available=True)
        node = ContentNode.objects.get(title="copy", kind=content_kinds.VIDEO)
        set_leaf_node_availability_from_local_file_availability(
            test_channel_id, admin_imported=False
        )
        node.refresh_from_db()
        self.assertFalse(node.admin_imported)

    def test_admin_imported_false_writes_false_not_null(self):
        # assertFalse above passes on None, and the fixture leaves admin_imported
        # NULL — which is the coalesce branch of the value expression.
        ContentNode.objects.all().update(available=False)
        LocalFile.objects.all().update(available=True)
        node = ContentNode.objects.get(title="copy", kind=content_kinds.VIDEO)
        self.assertIsNone(node.admin_imported)
        set_leaf_node_availability_from_local_file_availability(
            test_channel_id, admin_imported=False
        )
        node.refresh_from_db()
        self.assertIs(False, node.admin_imported)

    def test_all_local_files_admin_imported_false_no_overwrite(self):
        ContentNode.objects.all().update(available=False)
        LocalFile.objects.all().update(available=True)
        node = ContentNode.objects.get(title="copy", kind=content_kinds.VIDEO)
        node.admin_imported = True
        node.save()
        set_leaf_node_availability_from_local_file_availability(
            test_channel_id, admin_imported=False
        )
        node.refresh_from_db()
        self.assertTrue(node.admin_imported)

    def test_all_local_files_admin_imported_none_no_effect(self):
        ContentNode.objects.all().update(available=False)
        LocalFile.objects.all().update(available=True)
        node = ContentNode.objects.get(title="copy", kind=content_kinds.VIDEO)
        set_leaf_node_availability_from_local_file_availability(test_channel_id)
        node.refresh_from_db()
        self.assertIsNone(node.admin_imported)

    def test_all_local_files_admin_imported_non_include_exclude_unaffected(self):
        ContentNode.objects.all().update(available=False)
        LocalFile.objects.all().update(available=True)
        exclude = ContentNode.objects.get(title="c3")
        include = ContentNode.objects.get(title="c2")
        node = ContentNode.objects.get(title="copy", kind=content_kinds.VIDEO)
        self.assertFalse(node.available)
        node.admin_imported = False
        node.save()
        set_leaf_node_availability_from_local_file_availability(
            test_channel_id,
            node_ids=[include.id],
            exclude_node_ids=[exclude.id],
            admin_imported=True,
        )
        node.refresh_from_db()
        self.assertFalse(node.admin_imported)

    def tearDown(self):
        call_command("flush", interactive=False)
        super().tearDown()


class AnnotationTreeRecursion(TransactionTestCase):
    fixtures = ["content_test.json"]

    def setUp(self):
        super().setUp()
        ContentNode.objects.all().update(available=False)

    def test_all_content_nodes_available(self):
        ContentNode.objects.exclude(kind=content_kinds.TOPIC).update(available=True)
        recurse_annotation_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        self.assertTrue(
            ContentNode.objects.get(id="da7ecc42e62553eebc8121242746e88a").available
        )
        self.assertTrue(
            ContentNode.objects.get(id="2e8bac07947855369fe2d77642dfc870").available
        )

    def test_no_content_nodes_available(self):
        ContentNode.objects.filter(kind=content_kinds.TOPIC).update(available=True)
        recurse_annotation_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        # 0, as although there are three childless topics in the fixture, these cannot exist in real databases
        # all availability for a channel gets set to False for topics before propagating availability up the tree.
        self.assertEqual(
            ContentNode.objects.filter(kind=content_kinds.TOPIC)
            .filter(available=True)
            .count(),
            0,
        )

    def test_one_content_node_available(self):
        ContentNode.objects.filter(id="32a941fb77c2576e8f6b294cde4c3b0c").update(
            available=True
        )
        recurse_annotation_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        # Check parent is available
        self.assertTrue(
            ContentNode.objects.get(id="da7ecc42e62553eebc8121242746e88a").available
        )

    def test_all_content_nodes_available_coach_content(self):
        ContentNode.objects.exclude(kind=content_kinds.TOPIC).update(
            available=True, coach_content=True
        )
        recurse_annotation_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        self.assertTrue(
            ContentNode.objects.get(id="da7ecc42e62553eebc8121242746e88a").coach_content
        )
        self.assertTrue(
            ContentNode.objects.get(id="2e8bac07947855369fe2d77642dfc870").coach_content
        )

    def test_no_content_nodes_coach_content(self):
        ContentNode.objects.all().update(available=True)
        ContentNode.objects.all().update(coach_content=False)
        recurse_annotation_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        self.assertEqual(ContentNode.objects.filter(coach_content=True).count(), 0)
        root = ChannelMetadata.objects.get(id=test_channel_id).root
        self.assertEqual(root.num_coach_contents, 0)

    def test_all_root_content_nodes_coach_content(self):
        ContentNode.objects.all().update(available=True, coach_content=False)
        root_node = ContentNode.objects.get(parent__isnull=True)
        ContentNode.objects.filter(parent=root_node).exclude(
            kind=content_kinds.TOPIC
        ).update(coach_content=True)
        recurse_annotation_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        root_node.refresh_from_db()
        self.assertFalse(root_node.coach_content)
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
        recurse_annotation_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        root_node.refresh_from_db()
        self.assertFalse(root_node.coach_content)
        self.assertEqual(root_node.num_coach_contents, 1)

    def test_one_root_topic_node_coach_content(self):
        ContentNode.objects.all().update(available=True, coach_content=False)
        root_node = ContentNode.objects.get(parent__isnull=True)
        node = ContentNode.objects.filter(
            parent=root_node, kind=content_kinds.TOPIC
        ).first()
        node.coach_content = True
        node.save()
        recurse_annotation_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        root_node.refresh_from_db()
        self.assertFalse(root_node.coach_content)
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
        recurse_annotation_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        root_node.refresh_from_db()
        node.refresh_from_db()
        self.assertFalse(root_node.coach_content)
        self.assertEqual(root_node.num_coach_contents, 1)
        self.assertFalse(node.coach_content)
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
        recurse_annotation_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        parent_node.refresh_from_db()
        self.assertFalse(parent_node.coach_content)
        self.assertEqual(parent_node.num_coach_contents, 1)

    def test_one_content_node_many_siblings_coach_content(self):
        ContentNode.objects.filter(kind=content_kinds.TOPIC).update(available=True)
        ContentNode.objects.filter(id="32a941fb77c2576e8f6b294cde4c3b0c").update(
            coach_content=True
        )
        recurse_annotation_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        # Check parent is not marked as coach_content True because there are non-coach_content siblings
        self.assertFalse(
            ContentNode.objects.get(id="da7ecc42e62553eebc8121242746e88a").coach_content
        )

    def test_two_channels_no_annotation_collision_child_false(self):
        root_node = ContentNode.objects.create(
            title="test",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
            kind=content_kinds.TOPIC,
            available=True,
            coach_content=True,
        )
        ContentNode.objects.create(
            title="test1",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node.channel_id,
            parent=root_node,
            kind=content_kinds.VIDEO,
            available=False,
            coach_content=False,
        )
        recurse_annotation_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        root_node.refresh_from_db()
        self.assertTrue(root_node.available)
        self.assertTrue(root_node.coach_content)

    def test_two_channels_no_annotation_collision_child_true(self):
        root_node = ContentNode.objects.create(
            title="test",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
            kind=content_kinds.TOPIC,
            available=False,
            coach_content=False,
        )
        ContentNode.objects.create(
            title="test1",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node.channel_id,
            parent=root_node,
            kind=content_kinds.VIDEO,
            available=True,
            coach_content=True,
        )
        recurse_annotation_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        root_node.refresh_from_db()
        self.assertFalse(root_node.available)
        self.assertFalse(root_node.coach_content)

    def tearDown(self):
        call_command("flush", interactive=False)
        super().tearDown()


class LocalFileAvailableByChecksum(TransactionTestCase):
    fixtures = ["content_test.json"]

    def setUp(self):
        super().setUp()
        LocalFile.objects.all().update(available=False)

    def test_set_one_file(self):
        file_id = "6bdfea4a01830fdd4a585181c0b8068c"
        mark_local_files_as_available([file_id])
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 1)
        self.assertTrue(LocalFile.objects.get(id=file_id).available)

    def test_set_two_files(self):
        file_id_1 = "6bdfea4a01830fdd4a585181c0b8068c"
        file_id_2 = "e00699f859624e0f875ac6fe1e13d648"
        mark_local_files_as_available([file_id_1, file_id_2])
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 2)
        self.assertTrue(LocalFile.objects.get(id=file_id_1).available)
        self.assertTrue(LocalFile.objects.get(id=file_id_2).available)

    def tearDown(self):
        call_command("flush", interactive=False)
        super().tearDown()


class LocalFileUnAvailableByChecksum(TransactionTestCase):
    fixtures = ["content_test.json"]

    def setUp(self):
        super().setUp()
        LocalFile.objects.all().update(available=True)

    def test_set_one_file(self):
        file_id = "6bdfea4a01830fdd4a585181c0b8068c"
        mark_local_files_as_unavailable([file_id])
        self.assertEqual(LocalFile.objects.filter(available=False).count(), 1)
        self.assertFalse(LocalFile.objects.get(id=file_id).available)

    def test_set_two_files(self):
        file_id_1 = "6bdfea4a01830fdd4a585181c0b8068c"
        file_id_2 = "e00699f859624e0f875ac6fe1e13d648"
        mark_local_files_as_unavailable([file_id_1, file_id_2])
        self.assertEqual(LocalFile.objects.filter(available=False).count(), 2)
        self.assertFalse(LocalFile.objects.get(id=file_id_1).available)
        self.assertFalse(LocalFile.objects.get(id=file_id_2).available)

    def tearDown(self):
        call_command("flush", interactive=False)
        super().tearDown()


class LocalFileAvailabilityDestinationTestCase(TransactionTestCase):
    checksum = "6bdfea4a01830fdd4a585181c0b8068c"

    def setUp(self):
        super().setUp()
        self.directory = tempfile.mkdtemp()
        self.path = os.path.join(self.directory, "destination.sqlite3")
        self.storage_file = os.path.join(self.directory, "storage.mp4")
        open(self.storage_file, "w").close()
        with content_db(self.path) as alias:
            create_schema(alias)
            LocalFile.objects.using(alias).create(
                id=self.checksum, extension="mp4", available=False
            )

    def tearDown(self):
        # Removing a directory holding an open SQLite file fails on Windows, so
        # this also checks the connection was released.
        shutil.rmtree(self.directory)
        super().tearDown()

    def _destination_availability(self):
        with content_db(self.path) as alias:
            return LocalFile.objects.using(alias).get(id=self.checksum).available

    def test_marks_availability_in_the_destination_file(self):
        mark_local_files_as_available([self.checksum], destination=self.path)
        self.assertTrue(self._destination_availability())

    def test_marking_a_destination_leaves_the_default_database_untouched(self):
        # The same checksum in both databases, so only the routing distinguishes them.
        LocalFile.objects.create(id=self.checksum, extension="mp4", available=False)
        mark_local_files_as_available([self.checksum], destination=self.path)
        self.assertTrue(self._destination_availability())
        self.assertFalse(LocalFile.objects.get(id=self.checksum).available)

    @patch("kolibri.core.content.utils.annotation.get_content_storage_file_path")
    def test_disk_availability_reads_the_destination_file(self, path_mock):
        # The default database holds no LocalFile, so the row this marks can only
        # have come from the read against the destination.
        path_mock.return_value = self.storage_file
        set_local_file_availability_from_disk(destination=self.path)
        self.assertTrue(self._destination_availability())


mock_content_file = tempfile.mkstemp()


class LocalFileByDisk(TransactionTestCase):
    fixtures = ["content_test.json"]

    file_id_1 = "6bdfea4a01830fdd4a585181c0b8068c"
    file_id_2 = "e00699f859624e0f875ac6fe1e13d648"

    def setUp(self):
        super().setUp()
        LocalFile.objects.all().update(available=False)

    @patch(
        "kolibri.core.content.utils.annotation.get_content_storage_file_path",
        return_value=mock_content_file[1],
    )
    def test_set_one_file_not_list_exists(self, path_mock):
        set_local_file_availability_from_disk(checksums=self.file_id_1)
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 1)
        self.assertTrue(LocalFile.objects.get(id=self.file_id_1).available)

    @patch(
        "kolibri.core.content.utils.annotation.get_content_storage_file_path",
        return_value="",
    )
    def test_set_one_file_not_list_not_exist(self, path_mock):
        set_local_file_availability_from_disk(checksums=self.file_id_1)
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 0)
        self.assertFalse(LocalFile.objects.get(id=self.file_id_1).available)

    @patch(
        "kolibri.core.content.utils.annotation.get_content_storage_file_path",
        return_value=mock_content_file[1],
    )
    def test_set_one_file_exists(self, path_mock):
        set_local_file_availability_from_disk(checksums=[self.file_id_1])
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 1)
        self.assertTrue(LocalFile.objects.get(id=self.file_id_1).available)

    @patch(
        "kolibri.core.content.utils.annotation.get_content_storage_file_path",
        return_value="",
    )
    def test_set_one_file_not_exist(self, path_mock):
        LocalFile.objects.filter(id=self.file_id_1).update(available=True)
        set_local_file_availability_from_disk(checksums=[self.file_id_1])
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 0)
        self.assertFalse(LocalFile.objects.get(id=self.file_id_1).available)

    @patch(
        "kolibri.core.content.utils.annotation.get_content_storage_file_path",
        return_value=mock_content_file[1],
    )
    def test_set_two_files_exist(self, path_mock):
        set_local_file_availability_from_disk(
            checksums=[self.file_id_1, self.file_id_2]
        )
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 2)
        self.assertTrue(LocalFile.objects.get(id=self.file_id_1).available)
        self.assertTrue(LocalFile.objects.get(id=self.file_id_2).available)

    @patch(
        "kolibri.core.content.utils.annotation.get_content_storage_file_path",
        side_effect=[mock_content_file[1], ""],
    )
    def test_set_two_files_one_exists(self, path_mock):
        LocalFile.objects.filter(id=self.file_id_2).update(available=True)
        set_local_file_availability_from_disk(
            checksums=[self.file_id_1, self.file_id_2]
        )
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 1)
        self.assertTrue(LocalFile.objects.get(id=self.file_id_1).available)
        self.assertFalse(LocalFile.objects.get(id=self.file_id_2).available)

    @patch(
        "kolibri.core.content.utils.annotation.get_content_storage_file_path",
        return_value="",
    )
    def test_set_two_files_none_exist(self, path_mock):
        LocalFile.objects.filter(id__in=[self.file_id_1, self.file_id_2]).update(
            available=True
        )
        set_local_file_availability_from_disk(
            checksums=[self.file_id_1, self.file_id_2]
        )
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 0)
        self.assertFalse(LocalFile.objects.get(id=self.file_id_1).available)
        self.assertFalse(LocalFile.objects.get(id=self.file_id_2).available)

    @patch(
        "kolibri.core.content.utils.annotation.get_content_storage_file_path",
        return_value="",
    )
    def test_set_all_files_none_exist(self, path_mock):
        LocalFile.objects.update(available=True)
        set_local_file_availability_from_disk()
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 0)

    @patch(
        "kolibri.core.content.utils.annotation.get_content_storage_file_path",
        return_value=mock_content_file[1],
    )
    def test_set_all_files_all_exist(self, path_mock):
        LocalFile.objects.update(available=False)
        set_local_file_availability_from_disk()
        self.assertEqual(LocalFile.objects.exclude(available=True).count(), 0)

    @patch(
        "kolibri.core.content.utils.annotation.get_content_storage_file_path",
        side_effect=[mock_content_file[1]] * 2 + [""] * 8,
    )
    def test_set_all_files_two_exist(self, path_mock):
        set_local_file_availability_from_disk()
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 2)
        self.assertEqual(LocalFile.objects.exclude(available=True).count(), 8)

    def test_set_bad_filenames(self):
        local_files = list(LocalFile.objects.all())
        LocalFile.objects.all().delete()
        for i, lf in enumerate(local_files):
            lf.id = "bananas" + str(i)
            lf.save()
        set_local_file_availability_from_disk()
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 0)

    def tearDown(self):
        call_command("flush", interactive=False)
        super().tearDown()


class SetChannelMetadataFieldsTestCase(TestCase):
    def setUp(self):
        self.node = ContentNode.objects.create(
            title="test",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
            available=True,
        )
        self.channel = ChannelMetadata.objects.create(
            id=self.node.channel_id, name="channel", root=self.node
        )
        Language.objects.create(id="en", lang_code="en")

    def test_calculate_included_languages(self):
        calculate_included_languages(self.channel)
        self.assertEqual(
            list(self.channel.included_languages.values_list("id", flat=True)), []
        )
        ContentNode.objects.update(lang_id="en")
        calculate_included_languages(self.channel)
        self.assertEqual(
            list(self.channel.included_languages.values_list("id", flat=True)), ["en"]
        )

    def test_calculate_ordered_categories(self):
        # Test with no categories
        calculate_ordered_categories(self.channel)
        self.assertIsNone(self.channel.included_categories)

        # Create nodes with different categories
        ContentNode.objects.filter(id=self.node.id).update(categories="math,science")
        ContentNode.objects.create(
            title="test2",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=self.node.channel_id,
            categories="math,history",
            available=True,
        )
        node3 = ContentNode.objects.create(
            title="test3",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=self.node.channel_id,
            categories="math",
            available=True,
        )

        # Test ordering by frequency
        calculate_ordered_categories(self.channel)
        self.assertEqual(self.channel.included_categories, "math,science,history")

        # Test with unavailable node
        node3.available = False
        node3.save()
        calculate_ordered_categories(self.channel)
        self.assertEqual(self.channel.included_categories, "math,science,history")

    def test_calculate_ordered_grade_levels(self):
        # Test with no grade levels
        calculate_ordered_grade_levels(self.channel)
        self.assertIsNone(self.channel.included_grade_levels)

        # Create nodes with different grade levels
        ContentNode.objects.filter(id=self.node.id).update(grade_levels="1,2")
        ContentNode.objects.create(
            title="test2",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=self.node.channel_id,
            grade_levels="2,3",
            available=True,
        )
        node3 = ContentNode.objects.create(
            title="test3",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=self.node.channel_id,
            grade_levels="2",
            available=True,
        )

        # Test ordering by frequency
        calculate_ordered_grade_levels(self.channel)
        self.assertEqual(self.channel.included_grade_levels, "2,1,3")

        # Test with unavailable node
        node3.available = False
        node3.save()
        calculate_ordered_grade_levels(self.channel)
        self.assertEqual(self.channel.included_grade_levels, "2,1,3")

    def test_calculate_included_languages_frequency(self):
        # Create additional languages
        Language.objects.create(id="es", lang_code="es")
        Language.objects.create(id="fr", lang_code="fr")

        # Create nodes with different languages
        self.node.lang_id = "en"
        self.node.save()
        ContentNode.objects.create(
            title="test2",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=self.node.channel_id,
            lang_id="es",
            available=True,
        )
        node3 = ContentNode.objects.create(
            title="test3",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=self.node.channel_id,
            lang_id="es",
            available=True,
        )
        ContentNode.objects.create(
            title="test4",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=self.node.channel_id,
            lang_id="fr",
            available=True,
        )

        # Test ordering by frequency
        calculate_included_languages(self.channel)
        languages = set(self.channel.included_languages.values_list("id", flat=True))
        self.assertEqual(languages, {"en", "es", "fr"})

        # Test with unavailable node
        node3.available = False
        node3.save()
        calculate_included_languages(self.channel)
        languages = set(self.channel.included_languages.values_list("id", flat=True))
        self.assertEqual(languages, {"en", "es", "fr"})

    def test_calculate_total_resources(self):
        local_file = LocalFile.objects.create(
            id=uuid.uuid4().hex, extension="mp4", available=True, file_size=10
        )
        File.objects.create(
            id=uuid.uuid4().hex, local_file=local_file, contentnode=self.node
        )
        calculate_total_resource_count(self.channel)
        self.assertEqual(self.channel.total_resource_count, 1)

    def test_calculate_published_size(self):
        local_file = LocalFile.objects.create(
            id=uuid.uuid4().hex, extension="mp4", available=True, file_size=10
        )
        File.objects.create(
            id=uuid.uuid4().hex, local_file=local_file, contentnode=self.node
        )
        calculate_published_size(self.channel)
        self.assertEqual(self.channel.published_size, 10)

    def test_published_size_big_integer_field(self):
        self.channel.published_size = (
            2150000000  # out of range for integer field on postgres
        )
        try:
            self.channel.save()
        except DataError:
            self.fail("DataError: integer out of range")

    def test_public(self):
        self.assertIsNone(self.channel.public)
        set_channel_metadata_fields(self.channel.id)

        self.channel.refresh_from_db()
        self.assertIsNone(self.channel.public)

        set_channel_metadata_fields(self.channel.id, public=True)

        self.channel.refresh_from_db()
        self.assertTrue(self.channel.public)


class AncestorAnnotationTestCase(TransactionTestCase):
    def test_ancestors(self):
        builder = ChannelBuilder()
        builder.insert_into_default_db()
        channel_id = builder.channel["id"]
        set_channel_ancestors(channel_id)
        for n in ContentNode.objects.filter(channel_id=channel_id):
            self.assertEqual(n.ancestors, list(n.get_ancestors().values("id", "title")))

    def test_ancestors_quotation_marks_in_title(self):
        builder = ChannelBuilder()
        builder._django_nodes[0].title = 'Title with "A title!" in it!'
        builder.insert_into_default_db()
        channel_id = builder.channel["id"]
        set_channel_ancestors(channel_id)
        try:
            for n in ContentNode.objects.filter(channel_id=channel_id):
                self.assertEqual(
                    n.ancestors, list(n.get_ancestors().values("id", "title"))
                )
        except ValidationError:
            self.fail("Did not coerce to proper JSON")

    def test_ancestors_are_byte_identical_to_the_rendered_json(self):
        # The two tests above compare after JSONField.from_db_value has parsed the
        # column, so neither would notice a spacing or escaping change.
        builder = ChannelBuilder()
        builder._django_nodes[0].title = 'Title with "A title!" in it!'
        builder.insert_into_default_db()
        channel_id = builder.channel["id"]
        set_channel_ancestors(channel_id)
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id, ancestors FROM content_contentnode WHERE channel_id = %s",
                [channel_id],
            )
            rows = cursor.fetchall()
        self.assertTrue(rows)
        for node_id, ancestors in rows:
            node = ContentNode.objects.get(id=node_id)
            expected = "[{}]".format(
                ",".join(
                    '{{"id": "{}","title": "{}"}}'.format(
                        ancestor.id, ancestor.title.replace('"', '\\"')
                    )
                    for ancestor in node.get_ancestors()
                )
            )
            self.assertEqual(expected, ancestors)
