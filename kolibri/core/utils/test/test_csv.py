import codecs
import io
from unittest import mock

import pytest

from kolibri.core.utils.csv import open_csv_for_reading

TEXT = "USERNAME,FULL_NAME\r\njose,José Núñez\r\n"

ENCODED_FILES = {
    "utf-8": TEXT.encode("utf-8"),
    "utf-8-sig": TEXT.encode("utf-8-sig"),
    "utf-16-le": codecs.BOM_UTF16_LE + TEXT.encode("utf-16-le"),
    "utf-16-be": codecs.BOM_UTF16_BE + TEXT.encode("utf-16-be"),
    "cp1252": TEXT.encode("cp1252"),
}

# Bytes that are valid in neither UTF-8 nor Windows-1252
UNDETECTABLE = b"USERNAME\r\n\x81\x8d\x8f\x90\x9d\r\n"


@pytest.mark.parametrize("encoding", ENCODED_FILES)
def test_open_csv_for_reading_local_file(tmp_path, encoding):
    path = tmp_path / "users.csv"
    path.write_bytes(ENCODED_FILES[encoding])
    with open_csv_for_reading(local_filepath=str(path)) as f:
        assert f.read() == TEXT


@pytest.mark.parametrize("encoding", ENCODED_FILES)
def test_open_csv_for_reading_storage_file(encoding):
    with mock.patch("kolibri.core.utils.csv.default_storage") as storage:
        storage.open.return_value = io.BytesIO(ENCODED_FILES[encoding])
        with open_csv_for_reading(storage_filepath="users.csv") as f:
            assert f.read() == TEXT


def test_open_csv_for_reading_undetectable_local_file(tmp_path):
    path = tmp_path / "users.csv"
    path.write_bytes(UNDETECTABLE)
    with pytest.raises(ValueError, match="UTF-8, UTF-16 and Windows-1252"):
        with open_csv_for_reading(local_filepath=str(path)):
            pass


def test_open_csv_for_reading_undetectable_storage_file():
    with mock.patch("kolibri.core.utils.csv.default_storage") as storage:
        storage.open.return_value = io.BytesIO(UNDETECTABLE)
        with pytest.raises(ValueError, match="UTF-8, UTF-16 and Windows-1252"):
            with open_csv_for_reading(storage_filepath="users.csv"):
                pass


UTF32_FILES = {
    "utf-32-le": codecs.BOM_UTF32_LE + TEXT.encode("utf-32-le"),
    "utf-32-be": codecs.BOM_UTF32_BE + TEXT.encode("utf-32-be"),
}


@pytest.mark.parametrize("encoding", UTF32_FILES)
def test_open_csv_for_reading_utf32_not_supported(tmp_path, encoding):
    path = tmp_path / "users.csv"
    path.write_bytes(UTF32_FILES[encoding])
    with pytest.raises(ValueError, match="UTF-8, UTF-16 and Windows-1252"):
        with open_csv_for_reading(local_filepath=str(path)):
            pass
