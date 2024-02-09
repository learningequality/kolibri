from urllib.parse import urljoin

from django.urls import reverse

from kolibri.utils.conf import OPTIONS


def join_url(baseurl, url):
    # Join the URL to baseurl, but remove any leading "/" to ensure that if there is a path prefix on baseurl
    # it doesn't get ignored by the urljoin (which it would if the reversed_url had a leading '/',
    # as it would be read as an absolute path)
    return urljoin(baseurl, url.lstrip("/"))


def reverse_path(viewname, urlconf=None, args=None, kwargs=None, current_app=None):
    # Get the reversed URL
    reversed_path = reverse(
        viewname, urlconf=urlconf, args=args, kwargs=kwargs, current_app=current_app
    )
    # Remove any configured URL prefix from the URL that is specific to this deployment
    prefix_length = len(OPTIONS["Deployment"]["URL_PATH_PREFIX"])
    reversed_path = reversed_path[prefix_length:]
    return reversed_path


def reverse_remote(
    baseurl, viewname, urlconf=None, args=None, kwargs=None, current_app=None
):
    reversed_path = reverse_path(
        viewname, urlconf=urlconf, args=args, kwargs=kwargs, current_app=current_app
    )
    # Join the URL to baseurl, but remove any leading "/" to ensure that if there is a path prefix
    # on baseurl it doesn't get ignored by the urljoin (which it would if the reversed_url had
    # a leading '/', as it would be read as an absolute path)
    return join_url(baseurl, reversed_path)
