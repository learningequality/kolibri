import logging
import os
import shutil

from django.core.management.base import BaseCommand

from kolibri.core.content.models import ChannelMetadata
from kolibri.utils import conf
from kolibri.utils.search import indexing

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    Creates full text indexes for each channel.
    """

    def handle(self, *args, **options):
        index_root = os.path.join(conf.KOLIBRI_HOME, "indexes")
        if os.path.exists(index_root):
            # we don't currently support updating existing indexes with this command.
            shutil.rmtree(index_root)
        os.makedirs(index_root)
        for channel in ChannelMetadata.objects.all():
            indexer = indexing.ChannelIndexer(channel=channel, index_root=index_root)
            indexer.index_nodes(channel.root.get_descendants())
