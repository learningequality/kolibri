from __future__ import annotations

import re
import threading
import typing
from collections.abc import Mapping
from concurrent.futures import Future
from concurrent.futures import ThreadPoolExecutor
from functools import wraps

from kolibri_app.config import BASE_APPLICATION_ID

# HTML tags and entities
TAGRE = re.compile("<.*?>|&([a-z0-9]+|#[0-9]{1,6}|#x[0-9a-f]{1,6});")


class SearchHandler(object):
    class SearchHandlerFailed(Exception):
        pass

    def get_item_ids_for_search(self, search: str) -> Future[list]:
        """
        Returns a Future for the list of item IDs matching a search query.
        """

        raise NotImplementedError()

    def get_metadata_for_item_ids(self, item_ids: list) -> Future[list]:
        """
        Returns a Future for the list of search metadata objects for the given
        item IDs.
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
            return f"t/{node_id}?{channel_id}"
        return f"c/{node_id}?{channel_id}"

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


def _close_db_connection_after(fn: typing.Callable) -> typing.Callable:
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        finally:
            # Django lives in kolibri/dist, importable only after init_kolibri().
            from django.db import connection

            connection.close()

    return wrapper


class LocalSearchHandler(SearchHandler):
    """
    Search handler that calls into Kolibri's Python code directly, in this
    process. Searches queue on a single worker thread until init() is called,
    because Kolibri's code is only usable after init_kolibri().
    """

    __kolibri_initialized: threading.Event
    __executor: ThreadPoolExecutor

    def __init__(self):
        self.__kolibri_initialized = threading.Event()
        self.__executor = ThreadPoolExecutor(
            max_workers=1, initializer=self.__kolibri_initialized.wait
        )

    def init(self):
        self.__kolibri_initialized.set()

    def shutdown(self):
        # A worker still blocked in its initializer would hang interpreter exit.
        self.__kolibri_initialized.set()
        self.__executor.shutdown(cancel_futures=True)

    def get_item_ids_for_search(self, search: str) -> Future[list]:
        return self.__executor.submit(
            LocalSearchHandler._get_item_ids_for_search,
            search,
        )

    def get_metadata_for_item_ids(self, item_ids: list) -> Future[list]:
        return self.__executor.submit(
            LocalSearchHandler._get_metadata_for_item_ids,
            item_ids,
        )

    @staticmethod
    @_close_db_connection_after
    def _get_item_ids_for_search(search: str) -> list:
        from kolibri.core.content.viewsets.contentnode.base import ContentNodeViewset
        from kolibri.dist.rest_framework.test import APIRequestFactory

        request = APIRequestFactory().get("", {"search": search, "max_results": 10})
        search_view = ContentNodeViewset.as_view({"get": "list"})
        response = search_view(request)
        search_results = response.data.get("results", [])

        return list(map(SearchHandler._node_data_to_item_id, search_results))

    @staticmethod
    @_close_db_connection_after
    def _get_metadata_for_item_ids(item_ids: list) -> list:
        return [
            metadata
            for metadata in map(LocalSearchHandler._get_metadata_for_item_id, item_ids)
            if metadata is not None
        ]

    @staticmethod
    def _get_metadata_for_item_id(item_id: str) -> dict:
        from kolibri.core.content.viewsets.contentnode.base import ContentNodeViewset
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
