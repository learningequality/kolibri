# -*- coding: utf-8 -*-
"""kolibri URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Add an import:  from blog import urls as blog_urls
    2. Add a URL to urlpatterns:  path('blog/', include(blog_urls))

.. moduleauthor:: Learning Equality <info@learningequality.org>

"""
from django.urls import include
from django.urls import path
from django.urls import re_path
from morango import urls as morango_urls

from kolibri.plugins.utils.urls import get_root_urls
from kolibri.utils.conf import OPTIONS

path_prefix = OPTIONS["Deployment"]["URL_PATH_PREFIX"]

if path_prefix == "/":
    path_prefix = ""

url_patterns_prefixed = [
    re_path(r"", include(morango_urls)),
    re_path(r"", include("kolibri.core.urls")),
    re_path(r"", include(get_root_urls())),
]

urlpatterns = [path(path_prefix, include(url_patterns_prefixed))]
