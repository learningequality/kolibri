"""TODO: Write something about this module (everything in the docstring
enters the docs)
"""
from __future__ import absolute_import, print_function, unicode_literals

from django.conf.urls import url
from kolibri.plugins import hooks

from . import views

app_name = 'kolibri'

urlpatterns = [
    url('^/$', views.IndexView.as_view(), name='index'),
    # url('.* ', views.TODOView.as_view())
]

def retrieve_plugin_urls():
    for callback in hooks.get_callables(hooks.IMPORT_URLS):
            for item in callback():
                if 'url_base' in item and 'urls' in item:
                    yield url(item.get('url_base'), item.get('urls'))


urlpatterns += (item for item in retrieve_plugin_urls())
