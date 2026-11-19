from base64 import b64encode
from urllib.parse import urlencode


def encode_cursor(**tokens):
    return b64encode(urlencode(tokens).encode("ascii")).decode("ascii")
