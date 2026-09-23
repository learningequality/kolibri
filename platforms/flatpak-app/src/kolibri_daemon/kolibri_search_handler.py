from __future__ import annotations

import multiprocessing
import re
import signal
import typing
from collections.abc import Mapping
from concurrent.futures import ProcessPoolExecutor

from kolibri_app.config import BASE_APPLICATION_ID
from kolibri_app.globals import init_logging

from .kolibri_utils import init_kolibri

# HTML tags and entities
TAGRE = re.compile("<.*?>|&([a-z0-9]+|#[0-9]{1,6}|#x[0-9a-f]{1,6});")


class SearchHandler(object):
    class SearchHandlerFailed(Exception):
        pass

    def get_item_ids_for_search(self, search: str) -> list:
        """
        Returns a list of item IDs matching a search query.
        """

        raise NotImplementedError()

    def get_metadata_for_item_ids(self, item_ids: list) -> list:
        """
        Returns a list of search metadata objects for the given item IDs.
        """

        raise NotImplementedError()

    @staticmethod
    def _node_data_to_item_id(node_data: dict) -> str:
        """
        Converts a Kolibri node ID to an item ID for a search result. An item
        ID consists of a node type and node ID, as well as the channel ID
        corresponding to the node. For example:

        - t/TOPIC_NODE_ID?CHANNEL_ID
        - c/CONTENT_NODE_ID?CHANNEL_ID
        """

        node_id = node_data.get("id")
        channel_id = node_data.get("channel_id")

        if node_data.get("kind") == "topic":
            return "t/{node_id}?{channel_id}".format(
                node_id=node_id, channel_id=channel_id
            )
        else:
            return "c/{node_id}?{channel_id}".format(
                node_id=node_id, channel_id=channel_id
            )

    @staticmethod
    def _item_id_to_node_id(item_id: str) -> str:
        """
        Converts an item ID from a search result back to a Kolibri node ID.
        Raises ValueError if item_id is an invalid format. The channel part
        of the item ID is unused here.
        """

        _kind_code, _sep, node_id_and_channel = item_id.partition("/")
        node_id, _sep, _channel = node_id_and_channel.partition("?")
        return node_id

    @staticmethod
    def _node_data_to_search_metadata(item_id: str, node_data: Mapping) -> dict:
        """
        Given a node data object, returns search metadata as described in the
        GNOME Shell SearchProvider interface:
        <https://developer.gnome.org/SearchProvider/#The_SearchProvider_interface>
        """

        if not isinstance(node_data, Mapping):
            return None

        node_kind = node_data.get("kind")
        node_title = node_data.get("title")
        node_description = node_data.get("description")

        metadata = {"id": item_id}

        if node_kind:
            metadata["gicon"] = get_search_media_icon(node_kind)

        if node_title:
            metadata["name"] = sanitize_text(node_title)

        if node_description:
            metadata["description"] = sanitize_text(node_description)

        return metadata


class LocalSearchHandler(SearchHandler):
    """
    Search handler that uses the locally available Kolibri database files. This
    works by setting up Django and calling into Kolibri's Python code directly.
    We use multiprocessing.Pool as a convenient way to pass results between
    processes. The actual work is IO-bound so we won't bother creating more than
    one process, but it is useful running the search handler in a separate
    process to avoid globals leaking into the main thread.
    """

    __executor: typing.Optional[ProcessPoolExecutor] = None

    def __init__(self):
        self.__executor = None

    def init(self):
        self.__executor = ProcessPoolExecutor(
            max_workers=1,
            initializer=self.__process_initializer,
            mp_context=multiprocessing.get_context("fork"),
        )

    def shutdown(self):
        self.__executor.shutdown()

    def __process_initializer(self):
        # The process spawned by the process pool inherits the signal handler
        # from its parent process, which is set in main.py.
        signal.signal(signal.SIGTERM, signal.SIG_DFL)

        from setproctitle import setproctitle

        setproctitle("kolibri-daemon-search")

        init_logging("kolibri-daemon-search.txt")

        init_kolibri(skip_update=True)

    def get_item_ids_for_search(self, search: str) -> list:
        assert self.__executor

        args = (search,)

        future = self.__executor.submit(
            LocalSearchHandler._get_item_ids_for_search, *args
        )
        return future.result()

    def get_metadata_for_item_ids(self, item_ids: list) -> list:
        assert self.__executor

        return list(
            filter(
                lambda metadata: metadata is not None,
                self.__executor.map(
                    LocalSearchHandler._get_metadata_for_item_id, item_ids
                ),
            )
        )

    @staticmethod
    def _get_item_ids_for_search(search: str) -> list:
        from kolibri.core.content.api import ContentNodeSearchViewset
        from kolibri.dist.rest_framework.test import APIRequestFactory

        request = APIRequestFactory().get("", {"search": search, "max_results": 10})
        search_view = ContentNodeSearchViewset.as_view({"get": "list"})
        response = search_view(request)
        search_results = response.data.get("results", [])

        return list(map(SearchHandler._node_data_to_item_id, search_results))

    @staticmethod
    def _get_metadata_for_item_id(item_id: str) -> dict:
        from kolibri.core.content.api import ContentNodeViewset
        from kolibri.dist.rest_framework.test import APIRequestFactory

        node_id = SearchHandler._item_id_to_node_id(item_id)

        request = APIRequestFactory().get("", {})
        node_view = ContentNodeViewset.as_view({"get": "retrieve"})
        response = node_view(request, pk=node_id)
        node_data = response.data

        return SearchHandler._node_data_to_search_metadata(item_id, node_data)


def sanitize_text(text: str) -> str:
    """
    Replace all line break with spaces and removes all the html tags
    """

    lines = text.splitlines()
    lines = [re.sub(TAGRE, "", line) for line in lines]

    return " ".join(lines)


def get_search_media_icon(kind: str) -> str:
    node_icon_lookup = {
        "video": "play-circle-outline",
        "exercise": "checkbox-marked-circle-outline",
        "document": "text-box-outline",
        "topic": "cube-outline",
        "audio": "podcast",
        "html5": "motion-outline",
        "slideshow": "image-outline",
    }

    return "{prefix}-{icon}".format(
        prefix=BASE_APPLICATION_ID,
        icon=node_icon_lookup.get(kind, "cube-outline"),
    )
