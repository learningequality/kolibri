from django.db import connection
from django.db.models import Q
from django.urls import reverse
from le_utils.constants import content_kinds
from rest_framework.test import APITestCase

from kolibri.core.content import base_models
from kolibri.core.content import models as content
from kolibri.core.content.constants.schema_versions import CONTENT_SCHEMA_VERSION
from kolibri.core.content.test.test_channel_upgrade import ChannelBuilder


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
        for response_data, obj in zip(response.data[Model._meta.db_table], queryset):
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
