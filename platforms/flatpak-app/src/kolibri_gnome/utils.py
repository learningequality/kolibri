from __future__ import annotations

import io
import typing
from pathlib import Path

from gi.repository import Gio
from gi.repository import GLib
from gi.repository import GObject
from kolibri_app.globals import get_current_language


class GioInputStreamIO(io.RawIOBase):
    """
    A file-like object to read a Gio.InputStream.
    """

    __stream: Gio.InputStream

    def __init__(self, stream: Gio.InputStream):
        self.__stream = stream

    def read(self, size: int = -1) -> bytes:
        return b"".join(self.__read_iter(size))

    def __read_iter(self, size: int = -1):
        bytes_returned = 0
        while size == -1 or bytes_returned < size:
            if size == -1:
                chunk_size = 4096
            else:
                chunk_size = min(size - bytes_returned, 4096)
            data_size, data_bytes = self.__read_chunk(chunk_size)
            bytes_returned += data_size
            yield data_bytes
            if data_size == 0:
                break

    def __read_chunk(self, chunk_size: int) -> typing.Tuple[int, bytes]:
        gbytes = self.__stream.read_bytes(count=chunk_size)
        return gbytes.get_size(), gbytes.get_data()

    def write(self, data: typing.Any):
        raise NotImplementedError()


def get_localized_file(file_path_template: str, fallback_language: str) -> Path:
    ui_language = get_current_language()

    language_options = []

    if ui_language:
        language_options += [
            ui_language,
            "-".join(ui_language.split("_", 1)),
            ui_language.split("_", 1)[0],
        ]

    language_options += [fallback_language]

    for language in language_options:
        file_path = Path(file_path_template.format(language))
        if file_path.exists():
            break

    if not file_path.exists():
        file_path = Path(file_path_template.format(fallback_language))

    return file_path


def bubble_signal(
    source: GObject.Object,
    source_signal: str,
    next: GObject.Object,
    next_signal: typing.Optional[str] = None,
) -> int:
    next_signal = next_signal or source_signal

    def bubble_cb(_source: GObject.Object, *args, **kwargs):
        return next.emit(next_signal, *args, **kwargs)

    return source.connect(source_signal, bubble_cb)


class PropertyWatcher(object):
    __map_cb: typing.Optional[typing.Callable]
    __all_properties: typing.Tuple[typing.Tuple[GObject.Object, str], ...]
    __signal_handlers: typing.Set[typing.Tuple[GObject.Object, int]]
    __idle_notify_source: int

    def __init__(self, *all_properties: typing.Tuple[GObject.Object, str]):
        self.__map_cb = None
        self.__all_properties = all_properties
        self.__signal_handlers = set()
        self.__idle_notify_source = 0
        self.__connect()

    def map(self, map_cb: typing.Callable):
        self.__map_cb = map_cb
        return self

    def all(self, await_cb: typing.Callable):
        def map_cb(*values):
            if all(values):
                await_cb(*values)

        self.__map_cb = map_cb
        return self

    def __connect(self):
        for source, prop in self.__all_properties:
            handler_id = source.connect(
                "notify::{}".format(prop), self.__notify_debounced
            )
            self.__signal_handlers.add((source, handler_id))

    def disconnect(self):
        for source, handler_id in self.__signal_handlers:
            source.disconnect(handler_id)

    def notify(self):
        if callable(self.__map_cb):
            self.__map_cb(
                *(source.get_property(prop) for source, prop in self.__all_properties)
            )
        return self

    def __notify_debounced(
        self, _source: GObject.Object, pspec: GObject.ParamSpec = None
    ):
        if self.__idle_notify_source == 0:
            self.__idle_notify_source = GLib.idle_add(self.__idle_notify_cb)

    def __idle_notify_cb(self) -> bool:
        self.notify()
        self.__idle_notify_source = 0
        return GLib.SOURCE_REMOVE
