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

from kolibri.utils.conf import OPTIONS

path_prefix = OPTIONS['Deployment']['PATH_PREFIX']

if path_prefix == '/':
    path_prefix = ''

urlpatterns = [
    url(path_prefix, include('kolibri.core.urls')),
]
