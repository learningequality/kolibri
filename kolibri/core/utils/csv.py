import io
import re
from numbers import Number


def open_csv_for_writing(filepath):
    return io.open(filepath, "w", newline="", encoding="utf-8-sig")


def open_csv_for_reading(filepath):
    return io.open(filepath, "r", newline="", encoding="utf-8-sig")


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
