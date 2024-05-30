from __future__ import annotations

import io
import typing
from pathlib import Path

from gi.repository import Gio
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
):
    next_signal = next_signal or source_signal

    def bubble_cb(_source: GObject.Object, *args, **kwargs):
        return next.emit(next_signal, *args, **kwargs)

    source.connect(source_signal, bubble_cb)


def map_properties(
    all_properties: typing.List[typing.Tuple[GObject.Object, str]],
    map_cb: typing.Callable,
):
    def notify_cb(_source: GObject.Object, pspec: GObject.ParamSpec = None):
        map_cb(*(source.get_property(prop) for source, prop in all_properties))

    for source, prop in all_properties:
        source.connect("notify::{}".format(prop), notify_cb)


def await_properties(
    all_properties: typing.List[typing.Tuple[GObject.Object, str]],
    await_cb: typing.Callable,
):
    def map_cb(*values):
        if all(values):
            await_cb(*values)

    map_properties(all_properties, map_cb)
