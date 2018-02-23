"""
Kolibri template tags
=====================
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import copy
import json
import re

from django import template
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.core.urlresolvers import resolve
from django.core.urlresolvers import reverse
from django.utils.html import mark_safe
from django.utils.timezone import now
from django.utils.translation import get_language
from django.utils.translation import get_language_bidi
from django.utils.translation import get_language_info
from django_js_reverse.js_reverse_settings import JS_GLOBAL_OBJECT_NAME
from django_js_reverse.js_reverse_settings import JS_VAR_NAME
from django_js_reverse.templatetags.js_reverse import js_reverse_inline
from rest_framework.renderers import JSONRenderer
from six import iteritems

from kolibri.core.hooks import NavigationHook
from kolibri.core.hooks import UserNavigationHook
from kolibri.utils import conf

register = template.Library()

@register.simple_tag(takes_context=True)
def kolibri_language_globals(context):
    lang_dir = "rtl" if get_language_bidi() else "ltr"
    js = """
    <script>
      var languageCode = '{lang_code}';
      var languageDir = '{lang_dir}';
      var languages = JSON.parse('{languages}');
    </script>
    """.format(
        lang_code=get_language(),
        lang_dir=lang_dir,
        languages=json.dumps({code: {
            # Format to match the schema of the content Language model
            'id': code,
            'lang_name': name,
            'lang_direction': get_language_info(code)['bidi']
        } for code, name in settings.LANGUAGES}),
    )
    return mark_safe(js)


@register.simple_tag()
def kolibri_main_navigation():
    """
    A tag to include an initial JS-object to bootstrap data into the app.
    :return: An html string
    """
    init_data = {
        'nav_items': [],
        'user_nav_items': [],
    }

    for hook in NavigationHook().registered_hooks:
        init_data['nav_items'].append({
            'text': str(hook.label),
            'url': str(hook.url),
        })

    for hook in UserNavigationHook().registered_hooks:
        init_data['user_nav_items'].append({
            'text': str(hook.label),
            'url': str(hook.url),
        })

    html = ("<script type='text/javascript'>"
            "window._nav={0};"
            "</script>".format(json.dumps(init_data)))
    return mark_safe(html)


@register.simple_tag(takes_context=True)
def kolibri_set_urls(context):
    js_global_object_name = getattr(settings, 'JS_REVERSE_JS_GLOBAL_OBJECT_NAME', JS_GLOBAL_OBJECT_NAME)
    js_var_name = getattr(settings, 'JS_REVERSE_JS_VAR_NAME', JS_VAR_NAME)
    js = (js_reverse_inline(context) +
          "Object.assign({0}.urls, {1}.{2})".format(conf.KOLIBRI_CORE_JS_NAME,
                                                    js_global_object_name,
                                                    js_var_name))
    return mark_safe(js)


@register.simple_tag()
def kolibri_set_server_time():
    html = ("<script type='text/javascript'>"
            "{0}.utils.serverClock.setServerTime({1});"
            "</script>".format(conf.KOLIBRI_CORE_JS_NAME,
                               json.dumps(now(), cls=DjangoJSONEncoder)))
    return mark_safe(html)


@register.simple_tag(takes_context=True)
def kolibri_bootstrap_model(context, base_name, api_resource, **kwargs):
    response, kwargs, url_params = _kolibri_bootstrap_helper(context, base_name, api_resource, 'detail', **kwargs)
    html = ("<script type='text/javascript'>"
            "var model = {0}.resources.{1}.createModel(JSON.parse({2}), {3});"
            "model.synced = true;"
            "</script>".format(conf.KOLIBRI_CORE_JS_NAME,
                               api_resource,
                               json.dumps(JSONRenderer().render(response.data).decode('utf-8')),
                               json.dumps(url_params)))
    return mark_safe(html)

@register.simple_tag(takes_context=True)
def kolibri_bootstrap_collection(context, base_name, api_resource, **kwargs):
    response, kwargs, url_params = _kolibri_bootstrap_helper(context, base_name, api_resource, 'list', **kwargs)
    html = ("<script type='text/javascript'>"
            "var collection = {0}.resources.{1}.createCollection({2}, {3}, JSON.parse({4}));"
            "collection.synced = true;"
            "</script>".format(conf.KOLIBRI_CORE_JS_NAME,
                               api_resource,
                               json.dumps(url_params),
                               json.dumps(kwargs),
                               json.dumps(JSONRenderer().render(response.data).decode('utf-8')),
                               ))
    return mark_safe(html)

def _replace_dict_values(check, replace, dict):
    for (key, value) in iteritems(dict):
        if dict[key] is check:
            dict[key] = replace

def _kolibri_bootstrap_helper(context, base_name, api_resource, route, **kwargs):
    reversal = dict()
    kwargs_check = 'kwargs_'
    # remove prepended string and matching items from kwargs
    for key in list(kwargs.keys()):
        if kwargs_check in key:
            item = kwargs.pop(key)
            key = re.sub(kwargs_check, '', key)
            reversal[key] = item
    view, view_args, view_kwargs = resolve(reverse('{0}-{1}'.format(base_name, route), kwargs=reversal))
    # switch out None temporarily because invalid filtering and caching can occur
    _replace_dict_values(None, str(''), kwargs)
    request = copy.copy(context['request'])
    request.GET = request.GET.copy()
    for key in kwargs:
        request.GET[key] = kwargs[key]
    response = view(request, **view_kwargs)
    _replace_dict_values(str(''), None, kwargs)
    return response, kwargs, reversal
