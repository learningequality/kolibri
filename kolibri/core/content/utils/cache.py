import hashlib
import time

from django.core.cache import cache
from django.utils.cache import add_never_cache_headers
from django.utils.cache import patch_cache_control
from django.utils.decorators import method_decorator
from django.utils.encoding import force_bytes
from django.utils.encoding import iri_to_uri
from django.utils.http import http_date
from django.views.decorators.cache import never_cache
from django.views.decorators.http import etag
from le_utils.constants import modalities
from rest_framework import status

from kolibri.core.auth.middleware import session_exempt
from kolibri.core.content.models import ContentNode
from kolibri.core.device.models import ContentCacheKey

REMOTE_ETAG_CACHE_KEY = "remote_content_etag_{}"

REMOTE_URL_PARAM = "baseurl"


def get_cache_key(*args, **kwargs):
    return str(ContentCacheKey.get_cache_key())


def get_course_ids():
    cache_key = "COURSE_IDS_{}".format(get_cache_key())
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return cached_data
    updated_data = list(
        ContentNode.objects.filter(
            available=True, modality=modalities.COURSE
        ).values_list("id", flat=True)
    )
    cache.set(cache_key, updated_data, 3600)
    return updated_data


def metadata_cache(view_func, cache_key_func=get_cache_key):
    """
    Decorator to apply an Etag sensitive page cache
    """

    @etag(cache_key_func)
    def wrapper_func(*args, **kwargs):
        try:
            request = args[0]
            request = kwargs.get("request", request)
        except IndexError:
            request = kwargs.get("request", None)
        # Prevent the Django caching middleware from caching
        # this response, as we want to cache it ourselves
        request._cache_update_cache = False
        key_prefix = cache_key_func(request)
        url_key = hashlib.md5(
            force_bytes(iri_to_uri(request.build_absolute_uri()))
        ).hexdigest()
        response = None
        if key_prefix is not None:
            cache_key = "{}:{}".format(key_prefix, url_key)
            response = cache.get(cache_key)
        if response is None:
            response = view_func(*args, **kwargs)
            if response.status_code == status.HTTP_200_OK:
                if key_prefix is None:
                    key_prefix = cache_key_func(request)
                if (
                    key_prefix is not None
                    and hasattr(response, "render")
                    and callable(response.render)
                ):
                    cache_key = "{}:{}".format(key_prefix, url_key)
                    response.add_post_render_callback(
                        lambda r: cache.set(cache_key, r, timeout=3600)
                    )
            else:
                # Don't cache responses that returned an error code
                add_never_cache_headers(response)
        return response

    return wrapper_func


def get_remote_cache_key(request, *args, **kwargs):
    if REMOTE_URL_PARAM in request.GET:
        return cache.get(REMOTE_ETAG_CACHE_KEY.format(request.GET[REMOTE_URL_PARAM]))
    return get_cache_key(*args, **kwargs)


def remote_metadata_cache(view_func):
    return session_exempt(
        metadata_cache(view_func, cache_key_func=get_remote_cache_key)
    )


def no_cache_on_method(view_func):
    """
    Decorator to disable caching for a particular method
    """
    return method_decorator(never_cache, name="dispatch")(view_func)


def public_metadata_cache(view_func):
    view_func = metadata_cache(view_func)

    def wrapped_view(*args, **kwargs):
        response = view_func(*args, **kwargs)
        # Matches the cache headers Studio sets on the same endpoints (#11464).
        patch_cache_control(
            response, max_age=300, stale_while_revalidate=100, public=True
        )
        response.headers["Expires"] = http_date(time.time() + 300)
        return response

    return session_exempt(wrapped_view)
