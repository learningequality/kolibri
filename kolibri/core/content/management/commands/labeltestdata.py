import logging
import random

from django.core.management.base import BaseCommand
from le_utils.constants import content_kinds
from le_utils.constants.labels.accessibility_categories import (
    ACCESSIBILITYCATEGORIESLIST,
)
from le_utils.constants.labels.learning_activities import LEARNINGACTIVITIESLIST
from le_utils.constants.labels.levels import LEVELSLIST
from le_utils.constants.labels.needs import NEEDSLIST
from le_utils.constants.labels.subjects import SUBJECTSLIST

from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.utils.search import annotate_label_bitmasks
from kolibri.core.device.models import ContentCacheKey

logger = logging.getLogger(__name__)


def choices(sequence, k):
    return [random.choice(sequence) for _ in range(0, k)]


class Command(BaseCommand):
    """
    This command will try to fix the content tables in the database,
    reviewing the availability of all the existing files, to recover
    content that's not visible in Kolibri.
    """

    help = "Scan content and databases in Kolibri folder and updates the database to show if available"

    def add_arguments(self, parser):

        channels_help_text = """
        Constrain the label generation to a particular set of channels. Other channels will not be affected.
        Separate multiple channel IDs with commas.
        """
        parser.add_argument(
            "--channels",
            # Split the comma separated string we get, into a list of strings
            type=lambda x: x.split(","),
            default=None,
            required=False,
            dest="channels",
            help=channels_help_text,
        )

    def _handle_channel(self, channel):
        logger.info("Adding fake metadata labels to channel: {}".format(channel.name))
        channel_resource_nodes = channel.root.get_descendants().exclude(
            kind=content_kinds.TOPIC
        )
        for node in channel_resource_nodes:
            random.seed(node.id)
            node.learning_activities = ",".join(
                set(choices(LEARNINGACTIVITIESLIST, k=random.randint(1, 3)))
            )
            node.accessibility_labels = ",".join(
                set(choices(ACCESSIBILITYCATEGORIESLIST, k=random.randint(1, 3)))
            )
            node.grade_levels = ",".join(
                set(choices(LEVELSLIST, k=random.randint(1, 2)))
            )
            node.categories = ",".join(
                set(choices(SUBJECTSLIST, k=random.randint(1, 10)))
            )
            node.learner_needs = ",".join(
                set(choices(NEEDSLIST, k=random.randint(1, 5)))
            )
            node.save()
        annotate_label_bitmasks(channel_resource_nodes)
        logger.info("Added fake metadata labels to channel: {}".format(channel.name))

    def handle(self, *args, **options):
        channels = ChannelMetadata.objects.all()
        if options["channels"]:
            channels.filter(id__in=options["channels"])

        logger.info(
            "Adding fake metadata labels to channels: {}".format(
                ", ".join(channels.values_list("name", flat=True))
            )
        )
        for channel in channels:
            self._handle_channel(channel)
        ContentCacheKey.update_cache_key()
        logger.info(
            "Successfully added fake metadata labels to {} channels".format(
                len(channels)
            )
        )
