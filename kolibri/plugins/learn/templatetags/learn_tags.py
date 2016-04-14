from django import template
from kolibri.core.templatetags.kolibri_tags import frontend_async
from kolibri.plugins.hooks import CONTENT_RENDERER_ASYNC

register = template.Library()

@register.simple_tag()
def content_renderer_frontend_async():
    """
    This is a script tag for the CONTENT_RENDERER_ASYNC hook - this is used in the learn.html template to populate any
    Javascript and CSS that should be registered at page load, but loading deferred until needed.
    :return: HTML of script tags to insert into base.html
    """
    return frontend_async(CONTENT_RENDERER_ASYNC)
