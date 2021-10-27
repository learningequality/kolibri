from __future__ import annotations

import filecmp
import logging
import re
import shutil
import typing
from concurrent.futures import Future
from functools import partial
from pathlib import Path

from gi.repository import GLib
from kolibri_app.config import BASE_APPLICATION_ID
from kolibri_app.config import KOLIBRI_HOME_TEMPLATE_DIR
from kolibri_app.globals import KOLIBRI_HOME_PATH

logger = logging.getLogger(__name__)

# HTML tags and entities
TAGRE = re.compile("<.*?>|&([a-z0-9]+|#[0-9]{1,6}|#x[0-9a-f]{1,6});")


def kolibri_update_from_home_template():
    """
    Construct a Kolibri home directory based on the Kolibri home template, if
    necessary.
    """

    # TODO: This code should probably be in Kolibri itself

    kolibri_home_template_dir = Path(KOLIBRI_HOME_TEMPLATE_DIR)

    if not kolibri_home_template_dir.is_dir():
        return

    if not KOLIBRI_HOME_PATH.is_dir():
        KOLIBRI_HOME_PATH.mkdir(parents=True, exist_ok=True)

    compare = filecmp.dircmp(
        kolibri_home_template_dir,
        KOLIBRI_HOME_PATH,
        ignore=["logs", "job_storage.sqlite3"],
    )

    if len(compare.common) > 0:
        return

    # If Kolibri home was not already initialized, copy files from the
    # template directory to the new home directory.

    logger.info("Copying KOLIBRI_HOME template to '{}'".format(KOLIBRI_HOME_PATH))

    for filename in compare.left_only:
        left_file = Path(compare.left, filename)
        right_file = Path(compare.right, filename)
        if left_file.is_dir():
            shutil.copytree(left_file, right_file)
        else:
            shutil.copy2(left_file, right_file)


class AsyncResultFuture(Future):
    """
    Future subclass with helpers to deal with asynchronous operations from Gio.
    If return_source is True, async_result_handler will return the source
    object instead. This is useful for chaining with init_async callbacks.
    """

    def __init__(self, return_source: bool = False):
        self.__return_source = return_source
        super().__init__()

    @property
    def return_source(self) -> bool:
        return self.__return_source

    def async_result_handler(
        self, source: GLib.Object, result: typing.Any, user_data: typing.Any = None
    ):
        """
        Gio.AsyncReadyCallback function which returns the result (or an
        exception) to this Future.
        """

        if isinstance(result, Exception):
            self.set_exception(result)
        elif self.__return_source:
            self.set_result(source)
        else:
            self.set_result(result)


def future_chain(
    from_future: typing.Any,
    to_future: typing.Optional[Future] = None,
    map_fn: typing.Callable = None,
) -> Future:
    """
    This is an attempt to build a simple way of chaining together Future
    objects, with an optional mapping function, to make it easier to deal with
    deeply nested async functions. It would be better to use asyncio properly,
    but at the moment that is problematic with pygobject and GLib.
    """

    if not isinstance(from_future, Future):
        _from_future_value = from_future
        from_future = Future()
        from_future.set_result(_from_future_value)

    if to_future is None:
        to_future = Future()

    from_future.add_done_callback(
        partial(_future_chain_from_future_done_cb, to_future=to_future, map_fn=map_fn)
    )

    return to_future


def _future_chain_from_future_done_cb(
    from_future: Future, to_future: Future, map_fn: typing.Callable = None
):
    try:
        result = from_future.result()
    except Exception as error:
        to_future.set_exception(error)
    else:
        if callable(map_fn):
            result = map_fn(result)

        if isinstance(result, Future):
            future_chain(result, to_future)
        else:
            to_future.set_result(result)


def dict_to_vardict(data: dict) -> dict:
    """
    Convert all the values in a Python dict to GLib.Variant.
    """

    return dict((key, _value_to_variant(value)) for key, value in data.items())


def _value_to_variant(value: typing.Union[bytes, int, float, str]) -> GLib.Variant:
    """
    Automatically convert a Python value to a GLib.Variant by guessing the
    matching variant type.
    """

    if isinstance(value, bool):
        return GLib.Variant("b", value)
    elif isinstance(value, bytes):
        return GLib.Variant("y", value)
    elif isinstance(value, int):
        return GLib.Variant("x", value)
    elif isinstance(value, float):
        return GLib.Variant("d", value)
    elif isinstance(value, str):
        return GLib.Variant("s", value)
    else:
        raise ValueError("Unknown value type", value)


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
