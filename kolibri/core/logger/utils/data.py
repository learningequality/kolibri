BYTES_PREFIXES = ("", "K", "M", "G", "T")
PREFIX_FACTOR_BYTES = 1024.0


def bytes_for_humans(size, suffix="B"):
    """
    Function to get bytes in more human readable format, untranslated, for logging purposes only.
    :type size: int
    :type suffix: str
    :rtype: str
    """
    for prefix in BYTES_PREFIXES:
        if size < PREFIX_FACTOR_BYTES:
            if prefix == "":
                return "{}{}".format(size, suffix)
            return "{:.2f}{}{}".format(size, prefix, suffix)
        size /= PREFIX_FACTOR_BYTES
    return "{:.2f}{}{}".format(size, "P", suffix)
