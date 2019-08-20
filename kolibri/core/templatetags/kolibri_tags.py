"""
Kolibri template tags
=====================
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging

from django import template
from django.conf import settings
from django.core.urlresolvers import get_resolver
from django.core.urlresolvers import get_script_prefix
from django.template.loader import render_to_string
from django.utils.html import mark_safe
from django_js_reverse.core import prepare_url_list
from django_js_reverse.rjsmin import jsmin

from kolibri.core.content.utils.paths import get_content_storage_url
from kolibri.core.hooks import NavigationHook
from kolibri.core.webpack.utils import webpack_asset_render
from kolibri.utils.conf import OPTIONS

register = template.Library()

logger = logging.getLogger(__name__)


@register.simple_tag()
def kolibri_navigation_actions():
    """
    A tag to include an initial JS-object to bootstrap nav action data into the app.
    :return: An html string
    """
    return webpack_asset_render(NavigationHook)


@register.simple_tag(takes_context=True)
def kolibri_set_urls(context):
    # Modified from:
    # https://github.com/ierror/django-js-reverse/blob/master/django_js_reverse/core.py#L101
    js_global_object_name = "window"
    js_var_name = "kolibriUrls"
    script_prefix = get_script_prefix()

    if "request" in context:
        default_urlresolver = get_resolver(getattr(context["request"], "urlconf", None))
    else:
        default_urlresolver = get_resolver(None)

    js = render_to_string(
        "django_js_reverse/urls_js.tpl",
        {
            "urls": sorted(list(prepare_url_list(default_urlresolver))),
            "url_prefix": script_prefix,
            "js_var_name": js_var_name,
            "js_global_object_name": js_global_object_name,
        },
    )

    return mark_safe(
        """<script type="text/javascript">"""
        + jsmin(js)
        + """
        {global_object}.staticUrl = '{static_url}';
        {global_object}.mediaUrl = '{media_url}';
        {global_object}.contentUrl = '{content_url}';
        </script>
        """.format(
            global_object=js_global_object_name,
            static_url=settings.STATIC_URL,
            media_url=settings.MEDIA_URL,
            content_url=get_content_storage_url(
                baseurl=OPTIONS["Deployment"]["URL_PATH_PREFIX"]
            ),
        )
    )
