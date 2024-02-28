from __future__ import unicode_literals

from django.urls import include
from django.urls import path

from .locale_middleware_urls import patterns

path_prefix = "test/"

urlpatterns = [path(path_prefix, include(patterns))]
