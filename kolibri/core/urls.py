"""TODO: Write something about this module (everything in the docstring
enters the docs)
"""
from __future__ import absolute_import, print_function, unicode_literals

from django.conf.urls import url
from kolibri.plugins import hooks

from . import views

app_name = 'kolibri'

urlpatterns = []

for url_confs_func in hooks.get_callables(hooks.URLCONF_POPULATE):
    for urlconf in url_confs_func():
        urlpatterns.append(urlconf)

urlpatterns += [
    url('', views.IndexView.as_view(), name='index'),
]
