"""
Kolibri template tags
=====================
"""
from __future__ import absolute_import, print_function, unicode_literals

import json
import re

from django import template
from django.conf import settings
from django.core.urlresolvers import reverse
from django.utils.html import mark_safe
from kolibri.core.hooks import NavigationHook, UserNavigationHook
from rest_framework.renderers import JSONRenderer
from rest_framework.test import APIClient
from six import iteritems

register = template.Library()


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
def kolibri_bootstrap_model(context, base_name, api_resource, **kwargs):
    # check necessary for when there is no initial content databases
    if 'kwargs_channel_id' in kwargs:
        if not context['currentChannel']:
            return ''
    response, kwargs = _kolibri_bootstrap_helper(context, base_name, api_resource, 'detail', **kwargs)
    html = ("<script type='text/javascript'>"
            "var model = {0}.resources.{1}.createModel(JSON.parse({2}));"
            "model.synced = true;"
            "</script>".format(settings.KOLIBRI_CORE_JS_NAME,
                               api_resource,
                               JSONRenderer().render(response.content.decode('utf-8')).decode('utf-8')))
    return mark_safe(html)

@register.simple_tag(takes_context=True)
def kolibri_bootstrap_collection(context, base_name, api_resource, **kwargs):
    # check necessary for when there is no initial content databases
    if 'kwargs_channel_id' in kwargs:
        if not context['currentChannel']:
            return ''
    response, kwargs = _kolibri_bootstrap_helper(context, base_name, api_resource, 'list', **kwargs)
    html = ("<script type='text/javascript'>"
            "var collection = {0}.resources.{1}.createCollection({2}, JSON.parse({3}));"
            "collection.synced = true;"
            "</script>".format(settings.KOLIBRI_CORE_JS_NAME,
                               api_resource,
                               json.dumps(kwargs),
                               JSONRenderer().render(response.content.decode('utf-8')).decode('utf-8')))
    return mark_safe(html)

def _replace_dict_values(check, replace, dict):
    for (key, value) in iteritems(dict):
        if dict[key] is check:
            dict[key] = replace

def _kolibri_bootstrap_helper(context, base_name, api_resource, route, **kwargs):
    # instantiate client instance to make requests to server
    client = APIClient()
    # copy session key to client to make requests on behalf of user
    client.cookies[settings.SESSION_COOKIE_NAME] = context['request'].session.session_key
    reversal = dict()
    kwargs_check = 'kwargs_'
    # remove prepended string and matching items from kwargs
    for key in list(kwargs.keys()):
        if kwargs_check in key:
            item = kwargs.pop(key)
            key = re.sub(kwargs_check, '', key)
            reversal[key] = item
    url = reverse('{0}-{1}'.format(base_name, route), kwargs=reversal)
    # switch out None temporarily because invalid filtering and caching can occur
    _replace_dict_values(None, str(''), kwargs)
    response = client.get(url, data=kwargs)
    _replace_dict_values(str(''), None, kwargs)
    return response, kwargs
