from __future__ import annotations

import typing
from urllib.parse import urldefrag
from urllib.parse import urlsplit


def _origin_of(url: str) -> typing.Optional[str]:
    parts = urlsplit(url)
    if not parts.scheme or not parts.netloc:
        return None
    return f"{parts.scheme}://{parts.netloc}"


def restore_url_for(
    loaded_url: typing.Optional[str], saved_location: typing.Optional[str]
) -> typing.Optional[str]:
    """
    The URL that puts `saved_location`'s fragment back on `loaded_url`, or None
    when it does not belong there.
    """
    if not loaded_url or not saved_location or "#" not in saved_location:
        return None
    origin = _origin_of(loaded_url)
    if origin is None:
        return None
    if urldefrag(loaded_url).url != origin + urldefrag(saved_location).url:
        return None
    restore_url = origin + saved_location
    return None if restore_url == loaded_url else restore_url
