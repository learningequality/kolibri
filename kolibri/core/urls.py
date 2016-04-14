"""TODO: Write something about this module (everything in the docstring
enters the docs)
"""
from __future__ import absolute_import, print_function, unicode_literals

from django.conf.urls import url
from kolibri.core.views.component_demo import ComponentDemoView

from . import views

app_name = 'kolibri'

urlpatterns = [
    url('^component_demo$', ComponentDemoView.as_view(), name='component_demo'),
    url('^$', views.IndexView.as_view(), name='index'),
]
