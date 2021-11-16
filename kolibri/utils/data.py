import re

from six import string_types

BYTES_PREFIXES = ("", "K", "M", "G", "T", "P")
PREFIX_FACTOR_BYTES = 1000.0


def bytes_for_humans(size, suffix="B"):
    """
    Function to get bytes in more human readable format, untranslated, for logging purposes only.
    :type size: int
    :type suffix: str
    :rtype: str
    """
    for prefix in BYTES_PREFIXES[:-1]:
        if size < PREFIX_FACTOR_BYTES:
            if prefix == "":
                return "{}{}".format(size, suffix)
            return "{:.2f}{}{}".format(size, prefix, suffix)
        size /= PREFIX_FACTOR_BYTES
    return "{:.2f}{}{}".format(size, "P", suffix)


def bytes_from_humans(size, suffix="B"):
    """
    Function to parse bytes in a human readable format.
    :type size: {int,str}
    :type suffix: str
    :rtype: int
    """
    try:
        size = int(size)
    except ValueError:
        pass
    if isinstance(size, int):
        # If it is already an integer, return early.
        return size
    if not isinstance(size, string_types):
        raise ValueError("size must be an integer or string")
    # Be lenient by making all input uppercase to maximize chance of a match.
    size = size.upper()
    for i, prefix in enumerate(BYTES_PREFIXES):
        regex = "(([0-9]*[.])?[0-9]+){}{}".format(prefix, suffix)
        match = re.match(regex, size)
        if match:
            return int(float(match.groups()[0]) * PREFIX_FACTOR_BYTES ** i)
    raise ValueError("Could not parse bytes value from {}".format(size))
