import codecs
import io
import logging
import re
from contextlib import contextmanager
from numbers import Number

from django.core.files.storage import default_storage

logger = logging.getLogger(__name__)


def validate_open_csv_params(storage_filepath, local_filepath):
    if storage_filepath is None and local_filepath is None:
        raise ValueError("Either storage_filepath or local_filepath must be provided")
    if storage_filepath and local_filepath:
        raise ValueError(
            "Only one of storage_filepath or local_filepath should be provided"
        )


@contextmanager
def open_csv_for_writing(storage_filepath=None, local_filepath=None):
    validate_open_csv_params(storage_filepath, local_filepath)

    if storage_filepath:
        # If the file does not exist, we need to create it and return it wrapped in a TextIOWrapper
        with io.BytesIO() as f:
            encoded_fh = io.TextIOWrapper(
                f,
                newline="",
                encoding="utf-8-sig",
                write_through=True,
                line_buffering=True,
            )
            yield encoded_fh
            encoded_fh.flush()
            if default_storage.exists(storage_filepath):
                default_storage.delete(storage_filepath)
            default_storage.save(storage_filepath, f)
        logger.info("CSV file %s saved", storage_filepath)
    else:
        with open(local_filepath, "w", newline="", encoding="utf-8-sig") as local_fh:
            yield local_fh
        logger.info("CSV file %s saved", local_filepath)


_UNDETECTABLE_ENCODING_MESSAGE = (
    "Unable to detect the file encoding. "
    "Supported encodings are UTF-8, UTF-16 and Windows-1252."
)


def _detect_csv_encoding(raw):
    """
    Return the name of the encoding used by the CSV file contents ``raw`` (bytes).
    """
    if raw.startswith(codecs.BOM_UTF8):
        return "utf-8-sig"
    # UTF-32 is not supported. Its little-endian BOM starts with the UTF-16
    # little-endian BOM, so rule it out before checking for UTF-16.
    if raw.startswith((codecs.BOM_UTF32_LE, codecs.BOM_UTF32_BE)):
        raise ValueError(_UNDETECTABLE_ENCODING_MESSAGE)
    if raw.startswith((codecs.BOM_UTF16_LE, codecs.BOM_UTF16_BE)):
        return "utf-16"
    for encoding in ("utf-8", "cp1252"):
        try:
            raw.decode(encoding)
        except UnicodeDecodeError:
            continue
        return encoding
    raise ValueError(_UNDETECTABLE_ENCODING_MESSAGE)


@contextmanager
def open_csv_for_reading(storage_filepath=None, local_filepath=None):
    validate_open_csv_params(storage_filepath, local_filepath)

    if storage_filepath:
        with default_storage.open(storage_filepath, "rb") as f:
            encoding = _detect_csv_encoding(f.read())
            f.seek(0)
            encoded_fh = io.TextIOWrapper(
                f,
                newline="",
                encoding=encoding,
                write_through=True,
                line_buffering=True,
            )
            yield encoded_fh
            encoded_fh.flush()
    else:
        with open(local_filepath, "rb") as raw_fh:
            encoding = _detect_csv_encoding(raw_fh.read())
        with open(local_filepath, newline="", encoding=encoding) as local_fh:
            yield local_fh


negative_number_regex = re.compile("^-?[0-9,\\.]+$")
csv_injection_chars = {"@", "+", "-", "=", "|", "%"}


def sanitize(value):
    if value is None or isinstance(value, Number):
        return value

    value = str(value)
    if (
        value
        and value[0] in csv_injection_chars
        and not negative_number_regex.match(value)
    ):
        value = value.replace("|", "\\|")
        value = "'" + value
    return value


def output_mapper(obj, labels=None, output_mappings=None, exclude_fields=None):
    if exclude_fields is None:
        exclude_fields = set()
    mapped_obj = {}
    labels = labels or {}
    output_mappings = output_mappings or {}
    for header, label in labels.items():
        if header in output_mappings:
            mapped_obj[label] = sanitize(output_mappings[header](obj))
        elif header in obj:
            mapped_obj[label] = sanitize(obj[header])
    return mapped_obj
