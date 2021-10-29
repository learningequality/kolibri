from django.test import TestCase

from kolibri.core.content.models import ContentNode
from kolibri.core.content.test.test_channel_upgrade import ChannelBuilder
from kolibri.core.content.utils.search import annotate_label_bitmasks
from kolibri.core.content.utils.search import metadata_lookup


class BitMaskTestCase(TestCase):
    def test_ancestors(self):
        builder = ChannelBuilder()
        builder.insert_into_default_db()
        annotate_label_bitmasks(ContentNode.objects.all())
        for field, LIST in metadata_lookup.items():
            for label in LIST:
                self.assertEqual(
                    ContentNode.objects.filter(**{field + "__contains": label}).count(),
                    ContentNode.objects.has_all_labels(field, [label]).count(),
                    "{} {}".format(field, label),
                )
