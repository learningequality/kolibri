from __future__ import annotations

import typing
from concurrent.futures import Future

from gi.repository import GLib


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
