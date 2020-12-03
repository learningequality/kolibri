import logging
import os

from django.core.management.base import BaseCommand

from kolibri.utils import conf
from kolibri.utils.search import searching

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    Prints out channel order.
    """

    def add_arguments(self, parser):
        parser.add_argument("query", type=str)

    def handle(self, *args, **options):
        index_root = os.path.join(conf.KOLIBRI_HOME, "indexes")

        searcher = searching.IndexSearcher(index_root=index_root)
        results = searcher.search(options["query"])
        for result in results[:30]:
            print(result["title"], result["score"])
