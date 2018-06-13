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

from django.conf import settings
from django.conf.urls import include
from django.conf.urls import url
from django.contrib import admin
from morango import urls as morango_urls

from .views import RootURLRedirectView

urlpatterns = [
    url(r'^$', RootURLRedirectView.as_view()),
    url(r'^admin/', include(admin.site.urls)),
    url(r'', include('kolibri.core.urls')),
    url(r'', include('kolibri.core.content.urls')),
    url(r'^api/', include('kolibri.core.auth.api_urls')),
    url(r'^api/', include('kolibri.core.content.api_urls')),
    url(r'^api/', include('kolibri.logger.api_urls')),
    url(r'^api/', include('kolibri.tasks.api_urls')),
    url(r'^api/', include('kolibri.core.exams.api_urls')),
    url(r'^api/', include('kolibri.core.device.api_urls')),
    url(r'^api/', include('kolibri.core.lessons.api_urls')),
    url(r'^api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    url(r'', include(morango_urls)),
]

if getattr(settings, 'DEBUG_PANEL_ACTIVE', False):

    import debug_toolbar
    urlpatterns = [
        url(r'^__debug__/', include(debug_toolbar.urls)),
    ] + urlpatterns

if getattr(settings, 'REST_SWAGGER', False):
    from rest_framework_swagger.views import get_swagger_view

    schema_view = get_swagger_view(title='Kolibri API')

    urlpatterns += [
        url(r'^api_explorer/', schema_view)
    ]

if getattr(settings, 'REDIRECT_WEBPACK', False):
    from django.http.response import HttpResponseRedirect

    def webpack_redirect_view(request):
        return HttpResponseRedirect('http://127.0.0.1:3000/__open-in-editor?{query}'.format(query=request.GET.urlencode()))

    urlpatterns += [
        url(r'^__open-in-editor/', webpack_redirect_view)
    ]
