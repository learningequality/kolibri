import glob
import logging
import os
import time

import whoosh
from concurrent import futures
from whoosh.qparser import MultifieldParser
from whoosh.qparser import QueryParser

logger = logging.getLogger(__name__)


class IndexSearcher:
    def __init__(self, index_root):
        self.index_root = index_root

    def search_channel(self, query, channel_id):
        return self.search_index(query, "channel_{}".format(channel_id))

    def search_index(self, query, index_name, field=None):
        root = self.index_root
        logger.info("Root = {}".format(root))
        index = whoosh.index.open_dir(root, indexname=index_name)

        with index.searcher() as searcher:
            default_fields = [
                "node_id",
                "content_id",
                "title",
                "description",
                "tags",
                "content",
            ]
            parser = MultifieldParser(default_fields, index.schema)
            if field:
                parser = QueryParser("content", index.schema)
            whoosh_query = parser.parse(query)
            start = time.time()
            results = searcher.search(whoosh_query, terms=True, limit=None)
            elapsed = time.time() - start
            logger.debug("Search took {} seconds".format(elapsed))

            # What terms matched in each hit?
            logger.debug("num matched terms: {}".format(len(results)))
            results_list = []
            for result in results:
                result_dict = {}
                for key in result.keys():
                    result_dict[key] = result[key]

                result_dict["score"] = result.score
                results_list.append(result_dict)
            return results_list

    def search(self, query):
        index_dirs = glob.glob("{}/_*.toc".format(self.index_root))

        ex = futures.ProcessPoolExecutor(max_workers=5)

        wait_for = []
        for index_dir in index_dirs:
            index_name = os.path.splitext(os.path.basename(index_dir))[0][1:-2]
            logger.info("Adding {} to search indexes".format(index_name))

            wait_for.append(ex.submit(self.search_index, query, index_name))

        all_results = []
        all_nodes = []
        all_titles = []
        for f in futures.as_completed(wait_for):
            results = f.result()
            logger.info("Num results = {}".format(len(results)))
            for result in results:
                logger.debug("Result keys = {}".format(result.keys()))
                if "title" in result:
                    if result["title"] in all_titles:
                        logger.info("Found duplicate!")
                        assert not result["node_id"]

                if "node_id" in result:
                    if result["node_id"] in all_nodes:
                        continue
                    all_nodes.append(result["node_id"])

                all_results.append(result)

        return sorted(all_results, key=lambda x: -x["score"])
