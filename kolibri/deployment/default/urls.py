# -*- coding: utf-8 -*-
"""kolibri URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.8/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Add an import:  from blog import urls as blog_urls
    2. Add a URL to urlpatterns:  url(r'^blog/', include(blog_urls))

.. moduleauthor:: Learning Equality <info@learningequality.org>

"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.conf.urls import include
from django.conf.urls import url
from django.contrib import admin
from morango import urls as morango_urls

from kolibri.plugins.utils.urls import get_root_urls
from kolibri.utils.conf import OPTIONS

path_prefix = OPTIONS["Deployment"]["URL_PATH_PREFIX"]

if path_prefix == "/":
    path_prefix = ""

url_patterns_prefixed = [
    url(r"^admin/", include(admin.site.urls)),
    url(r"^api-auth/", include("rest_framework.urls", namespace="rest_framework")),
    url(r"", include(morango_urls)),
    url(r"", include("kolibri.core.urls")),
    url(r"", include(get_root_urls())),
]

urlpatterns = [url(path_prefix, include(url_patterns_prefixed))]
