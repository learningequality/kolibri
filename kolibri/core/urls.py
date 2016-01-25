"""TODO: Write something about this module (everything in the docstring
enters the docs)
"""
from __future__ import absolute_import, print_function, unicode_literals

from django.conf.urls import url

from . import views

app_name = 'kolibri'

urlpatterns = [
    url('^', views.IndexView.as_view(), name='index'),
    # url('.* ', views.TODOView.as_view())
]
