from django.test import TestCase
from le_utils.constants.labels import learning_activities

from kolibri.core.content.models import ContentNode
from kolibri.core.content.test.test_channel_upgrade import ChannelBuilder
from kolibri.core.content.utils.search import annotate_label_bitmasks


class BitMaskTestCase(TestCase):
    def test_ancestors(self):
        builder = ChannelBuilder()
        builder.insert_into_default_db()
        annotate_label_bitmasks(ContentNode.objects.all())
        for la in learning_activities.LEARNINGACTIVITIESLIST:
            self.assertEqual(
                list(ContentNode.objects.filter(learning_activities__contains=la)),
                list(ContentNode.objects.has_all_labels("learning_activities", [la])),
            )
            print(ContentNode.objects.has_all_labels("learning_activities", [la]))
