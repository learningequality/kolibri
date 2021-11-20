from uuid import uuid4

from django.test import TestCase
from le_utils.constants import content_kinds
from parameterized import parameterized

from kolibri.core.content.models import ContentNode
from kolibri.core.content.test.test_channel_upgrade import ChannelBuilder
from kolibri.core.content.utils.search import annotate_label_bitmasks
from kolibri.core.content.utils.search import get_available_metadata_labels
from kolibri.core.content.utils.search import metadata_lookup


class RandomBitMaskTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        builder = ChannelBuilder()
        builder.insert_into_default_db()
        annotate_label_bitmasks(ContentNode.objects.all())

    @parameterized.expand(
        (field, label)
        for field in metadata_lookup.keys()
        for label in metadata_lookup[field]
    )
    def test_bitmasks(self, field, label):
        self.assertEqual(
            ContentNode.objects.filter(**{field + "__contains": label}).count(),
            ContentNode.objects.has_all_labels(field, [label]).count(),
            "{} {}".format(field, label),
        )


class ConstrainedBitMaskTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        for field in metadata_lookup.keys():
            for label in metadata_lookup[field]:
                ContentNode.objects.create(
                    content_id=uuid4().hex,
                    channel_id=uuid4().hex,
                    description="Blah blah blah",
                    id=uuid4().hex,
                    license_name="GNU",
                    license_owner="",
                    license_description=None,
                    lang_id=None,
                    author="",
                    title="Test{}_{}".format(field, label),
                    parent_id=None,
                    kind=content_kinds.VIDEO,
                    coach_content=False,
                    available=False,
                    **{field: label}
                )
        annotate_label_bitmasks(ContentNode.objects.all())

    @parameterized.expand(
        (field, label)
        for field in metadata_lookup.keys()
        for label in metadata_lookup[field]
    )
    def test_bitmasks(self, field, label):
        self.assertEqual(
            ContentNode.objects.filter(**{field + "__contains": label}).count(),
            ContentNode.objects.has_all_labels(field, [label]).count(),
            "{} {}".format(field, label),
        )


class RandomMetadataLabelsTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        builder = ChannelBuilder()
        builder.insert_into_default_db()
        annotate_label_bitmasks(ContentNode.objects.all())

    def _run_test_for_qs(self, queryset):
        metadata_labels = get_available_metadata_labels(queryset)
        for field, LIST in metadata_labels.items():
            if field != "channels" and field != "languages":
                all_labels = metadata_lookup[field]
                for label in all_labels:
                    if label in LIST:
                        self.assertTrue(
                            queryset.filter(**{field + "__contains": label}).exists(),
                            "{} {}".format(field, label),
                        )
                    else:
                        self.assertFalse(
                            queryset.filter(**{field + "__contains": label}).exists(),
                            "{} {}".format(field, label),
                        )

    def test_all(self):
        self._run_test_for_qs(ContentNode.objects.all())

    @parameterized.expand(content_kinds.choices)
    def test_filtered_kind(self, kind, kind_name):
        self._run_test_for_qs(ContentNode.objects.filter(kind=kind))

    @parameterized.expand(
        (field, label)
        for field in metadata_lookup.keys()
        for label in metadata_lookup[field]
    )
    def test_labels(self, field, label):
        self._run_test_for_qs(ContentNode.objects.has_all_labels(field, [label]))


class ConstrainedMetadataLabelsTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        for field in metadata_lookup.keys():
            for label in metadata_lookup[field]:
                ContentNode.objects.create(
                    content_id=uuid4().hex,
                    channel_id=uuid4().hex,
                    description="Blah blah blah",
                    id=uuid4().hex,
                    license_name="GNU",
                    license_owner="",
                    license_description=None,
                    lang_id=None,
                    author="",
                    title="Test{}_{}".format(field, label),
                    parent_id=None,
                    kind=content_kinds.VIDEO,
                    coach_content=False,
                    available=False,
                    **{field: label}
                )
        annotate_label_bitmasks(ContentNode.objects.all())

    @parameterized.expand(
        (field, label)
        for field in metadata_lookup.keys()
        for label in metadata_lookup[field]
    )
    def test_labels(self, field, label):
        metadata_labels = get_available_metadata_labels(
            ContentNode.objects.filter(**{field: label})
        )
        split_labels = label.split(".")
        expected = [
            ".".join(split_labels[0:i]) for i in range(1, len(split_labels) + 1)
        ]
        self.assertEqual(
            set(metadata_labels[field]), set(expected), "{} {}".format(field, label)
        )
