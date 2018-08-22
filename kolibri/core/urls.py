"""
Kolibri core url patterns
=========================

This module should be the glue between all other url patterns.

Do NOT use kolibri.deployment.default project's urlconf for such! That file can
be modified by users.

Reverse lookups
---------------

Kolibri uses the ``'kolibri'`` namespace. To point to something in Kolibri, use
the following lookup pattern:

.. code-block:: html+django

    <!-- A built-in kolibri URL -->
    {% url 'kolibri:url_name' %}

    <!-- A plugin URL -->
    {% url 'kolibri:pluginnamespace:url_name' %}


Defining URLs for plugins
-------------------------

Plugin classes can define url modules, and they will automatically be included.

Place a url.py and have your plugin's definition class's ``url_module`` method
return the module.
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.conf.urls import include
from django.conf.urls import url
from django.conf.urls.static import static
from django.contrib import admin
from morango import urls as morango_urls

from .views import GuestRedirectView
from .views import logout_view
from .views import RootURLRedirectView
from .views import set_language
from kolibri.core.content.utils import paths
from kolibri.plugins.registry import get_urls as plugin_urls

app_name = 'kolibri'

urlpatterns = [
    url(r'^admin/', include(admin.site.urls)),
    url(r'^content/', include('kolibri.core.content.urls')),
    url(r'^api/auth/', include('kolibri.core.auth.api_urls')),
    url(r'^api/content/', include('kolibri.core.content.api_urls')),
    url(r'^api/logger/', include('kolibri.core.logger.api_urls')),
    url(r'^api/tasks/', include('kolibri.core.tasks.api_urls')),
    url(r'^api/exams/', include('kolibri.core.exams.api_urls')),
    url(r'^api/device/', include('kolibri.core.device.api_urls')),
    url(r'^api/lessons/', include('kolibri.core.lessons.api_urls')),
    url(r'^api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    url(r'', include(morango_urls)),
]

urlpatterns += plugin_urls()

urlpatterns += static(paths.get_content_url("/"), document_root=paths.get_content_dir_path())

urlpatterns += [
    url(r'^i18n/setlang/$', set_language, name='set_language'),
    url(r'^$', RootURLRedirectView.as_view()),
    url(r'^redirectuser/$', RootURLRedirectView.as_view(), name="redirect_user"),
    url(r'^guestaccess/$', GuestRedirectView.as_view(), name="guest"),
    url(r'^logout/$', logout_view, name='logout'),
]
