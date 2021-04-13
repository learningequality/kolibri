import io
import sys


def open_csv_for_writing(filepath):
    if sys.version_info[0] < 3:
        return io.open(filepath, "wb")
    return io.open(filepath, "w", newline="", encoding="utf-8-sig")
