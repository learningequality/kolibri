from __future__ import unicode_literals

from django.conf.urls import include
from django.conf.urls import url

from .locale_middleware_urls import patterns

path_prefix = "test/"

urlpatterns = [url(path_prefix, include(patterns))]
