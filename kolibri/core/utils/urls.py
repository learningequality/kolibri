from django.urls import reverse
from six.moves.urllib.parse import urljoin

from kolibri.utils.conf import OPTIONS


def reverse_remote(
    baseurl, viewname, urlconf=None, args=None, kwargs=None, current_app=None
):
    # Get the reversed URL
    reversed_url = reverse(
        viewname, urlconf=urlconf, args=args, kwargs=kwargs, current_app=current_app
    )
    # Remove any configured URL prefix from the URL that is specific to this deployment
    prefix_length = len(OPTIONS["Deployment"]["URL_PATH_PREFIX"])
    reversed_url = reversed_url[prefix_length:]
    # Join the URL to baseurl, but remove any leading "/" to ensure that if there is a path prefix on baseurl
    # it doesn't get ignored by the urljoin (which it would if the reversed_url had a leading '/',
    # as it would be read as an absolute path)
    return urljoin(baseurl, reversed_url.lstrip("/"))
