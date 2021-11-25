from __future__ import annotations

import io
import typing
from pathlib import Path

from gi.repository import Gio
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


def get_localized_file(file_path_template: str, file_path_fallback: str) -> Path:
    language = get_current_language()

    if not language:
        return Path(file_path_fallback)

    file_path = Path(file_path_template.format(language))

    if not file_path.exists():
        # TODO: Removing the country code like this isn't the same behaviour as
        #       gettext. Ideally our translated asset files should either be
        #       generated or should use the same language codes as the provided
        #       translations.
        language_base = language.split("_", 1)[0]
        file_path = Path(file_path_template.format(language_base))

    if not file_path.exists():
        file_path = Path(file_path_fallback)

    return file_path
