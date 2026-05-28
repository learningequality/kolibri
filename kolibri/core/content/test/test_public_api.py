from django.db import connection
from django.db.models import Q
from django.urls import reverse
from le_utils.constants import content_kinds
from rest_framework.test import APITestCase

from kolibri.core.content import base_models
from kolibri.core.content import models as content
from kolibri.core.content.constants.schema_versions import CONTENT_SCHEMA_VERSION
from kolibri.core.content.test.helpers import ChannelBuilder


class ImportMetadataTestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.builder = ChannelBuilder()
        cls.builder.insert_into_default_db()
        content.ContentNode.objects.all().update(available=True)
        cls.root = content.ContentNode.objects.get(id=cls.builder.root_node["id"])
        cls.node = cls.root.get_descendants().exclude(kind=content_kinds.TOPIC).first()
        cls.all_nodes = cls.node.get_ancestors(include_self=True)
        cls.files = content.File.objects.filter(contentnode__in=cls.all_nodes)
        cls.assessmentmetadata = content.AssessmentMetaData.objects.filter(
            contentnode__in=cls.all_nodes
        )
        cls.localfiles = content.LocalFile.objects.filter(
            files__in=cls.files
        ).distinct()
        cls.languages = content.Language.objects.filter(
            Q(id__in=cls.files.values_list("lang_id", flat=True))
            | Q(id__in=cls.all_nodes.values_list("lang_id", flat=True))
        )
        cls.through_tags = content.ContentNode.tags.through.objects.filter(
            contentnode__in=cls.all_nodes
        )
        cls.tags = content.ContentTag.objects.filter(
            id__in=cls.through_tags.values_list("contenttag_id", flat=True)
        ).distinct()

    def _assert_data(self, Model, queryset):
        response = self.client.get(
            reverse("kolibri:core:importmetadata-detail", kwargs={"pk": self.node.id})
        )
        fields = Model._meta.fields
        BaseModel = getattr(base_models, Model.__name__, Model)
        field_names = {field.column for field in BaseModel._meta.fields}
        if hasattr(BaseModel, "_mptt_meta"):
            field_names.add(BaseModel._mptt_meta.parent_attr)
            field_names.add(BaseModel._mptt_meta.tree_id_attr)
            field_names.add(BaseModel._mptt_meta.left_attr)
            field_names.add(BaseModel._mptt_meta.right_attr)
            field_names.add(BaseModel._mptt_meta.level_attr)
        # Row order is not part of the API contract for these tables (only the
        # ContentNode descendants response guarantees order, asserted separately).
        # Sort both sides by pk so we test row equality, not incidental order.
        pk_col = Model._meta.pk.column
        response_rows = sorted(
            response.data[Model._meta.db_table],
            key=lambda r: str(r[pk_col]).replace("-", ""),
        )
        expected_rows = sorted(
            queryset, key=lambda o: str(getattr(o, pk_col)).replace("-", "")
        )
        for response_data, obj in zip(response_rows, expected_rows):
            # Ensure that we are not returning any empty objects
            self.assertNotEqual(response_data, {})
            for field in fields:
                if field.column in field_names:
                    value = response_data[field.column]
                    if hasattr(field, "from_db_value"):
                        value = field.from_db_value(value, None, connection)
                    self.assertEqual(value, getattr(obj, field.column))

    def test_import_metadata_nodes(self):
        self._assert_data(content.ContentNode, self.all_nodes)

    def test_import_metadata_files(self):
        self._assert_data(content.File, self.files)

    def test_import_metadata_assessmentmetadata(self):
        self._assert_data(content.AssessmentMetaData, self.assessmentmetadata)

    def test_import_metadata_localfiles(self):
        self._assert_data(content.LocalFile, self.localfiles)

    def test_import_metadata_languages(self):
        self._assert_data(content.Language, self.languages)

    def test_import_metadata_through_tags(self):
        self._assert_data(content.ContentNode.tags.through, self.through_tags)

    def test_import_metadata_tags(self):
        self._assert_data(content.ContentTag, self.tags)

    def test_schema_version_too_low(self):
        response = self.client.get(
            reverse("kolibri:core:importmetadata-detail", kwargs={"pk": self.node.id})
            + "?schema_version=1"
        )
        self.assertEqual(response.status_code, 400)

    def test_schema_version_too_high(self):
        response = self.client.get(
            reverse("kolibri:core:importmetadata-detail", kwargs={"pk": self.node.id})
            + "?schema_version={}".format(int(CONTENT_SCHEMA_VERSION) + 1)
        )
        self.assertEqual(response.status_code, 400)

    def test_import_metadata_none_pk(self):
        response = self.client.get(
            reverse(
                "kolibri:core:importmetadata-detail",
                kwargs={"pk": None},
            )
        )
        self.assertEqual(response.status_code, 400)

    def test_import_metadata_bad_pk(self):
        response = self.client.get(
            reverse(
                "kolibri:core:importmetadata-detail",
                kwargs={"pk": "this is not a UUID"},
            )
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Invalid UUID format.")

    def test_schema_version_just_right(self):
        response = self.client.get(
            reverse("kolibri:core:importmetadata-detail", kwargs={"pk": self.node.id})
            + "?schema_version={}".format(CONTENT_SCHEMA_VERSION)
        )
        self.assertEqual(response.status_code, 200)

    def test_import_metadata_with_descendants_returns_ancestors_and_descendants(self):
        """Test that descendants=true returns both ancestors and descendants (ancestors first)."""
        response = self.client.get(
            reverse("kolibri:core:importmetadata-detail", kwargs={"pk": self.root.id})
            + "?descendants=true"
        )
        self.assertEqual(response.status_code, 200)
        # For the root node, ancestors (include_self) == [root] and descendants (exclude_self)
        # == all other nodes, so the combined set equals get_descendants(include_self=True).
        expected_nodes = self.root.get_descendants(include_self=True)
        nodes_data = response.data[content.ContentNode._meta.db_table]
        self.assertEqual(len(nodes_data), expected_nodes.count())

    def test_import_metadata_with_descendants_includes_ancestors_for_non_root_node(
        self,
    ):
        """Test that descendants=true on a non-root node includes the node's ancestors."""
        response = self.client.get(
            reverse("kolibri:core:importmetadata-detail", kwargs={"pk": self.node.id})
            + "?descendants=true"
        )
        self.assertEqual(response.status_code, 200)
        ancestors = self.node.get_ancestors(include_self=True)
        node_descendants = self.node.get_descendants(include_self=False)
        expected_count = ancestors.count() + node_descendants.count()
        nodes_data = response.data[content.ContentNode._meta.db_table]
        self.assertEqual(len(nodes_data), expected_count)
        # Ancestors must appear before descendants — verify ordering by lft.
        returned_ids = [n["id"] for n in nodes_data]
        ancestor_positions = [
            returned_ids.index(str(n.id).replace("-", "")) for n in ancestors
        ]
        descendant_ids = {str(n.id).replace("-", "") for n in node_descendants}
        descendant_positions = [
            i for i, nid in enumerate(returned_ids) if nid in descendant_ids
        ]
        if descendant_positions:
            self.assertLess(max(ancestor_positions), min(descendant_positions))

    def test_import_metadata_with_pagination(self):
        """Test that max_results enables pagination."""
        response = self.client.get(
            reverse("kolibri:core:importmetadata-detail", kwargs={"pk": self.root.id})
            + "?descendants=true&max_results=2"
        )
        self.assertEqual(response.status_code, 200)
        # Paginated response should have 'more' and 'results' keys
        self.assertIn("more", response.data)
        self.assertIn("results", response.data)
        # Results should contain the content node table data
        self.assertIn(content.ContentNode._meta.db_table, response.data["results"])

    def test_import_metadata_pagination_respects_max_results(self):
        """Test that pagination returns correct number of nodes."""
        max_results = 2
        response = self.client.get(
            reverse("kolibri:core:importmetadata-detail", kwargs={"pk": self.root.id})
            + "?descendants=true&max_results={}".format(max_results)
        )
        self.assertEqual(response.status_code, 200)
        nodes_data = response.data["results"][content.ContentNode._meta.db_table]
        self.assertLessEqual(len(nodes_data), max_results)
