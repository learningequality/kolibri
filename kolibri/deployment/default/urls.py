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
from __future__ import absolute_import, print_function, unicode_literals

from django.conf.urls import include, url
from django.contrib import admin

from .views import RootURLRedirectView

urlpatterns = [
    url(r'^$', RootURLRedirectView.as_view()),
    url(r'^admin/', include(admin.site.urls)),
    url(r'', include('kolibri.core.urls')),
    url(r'', include('kolibri.content.urls')),
    url(r'^api/', include('kolibri.auth.api_urls')),
    url(r'^api/', include('kolibri.content.api_urls')),
    url(r'^api/', include('kolibri.logger.api_urls')),
    url(r'^api/', include('kolibri.tasks.api_urls')),
    url(r'^api-auth/', include('rest_framework.urls', namespace='rest_framework')),
]
