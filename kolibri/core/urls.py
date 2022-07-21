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
    {% url 'kolibri:core:url_name' %}

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
from rest_framework import routers

from .views import GuestRedirectView
from .views import logout_view
from .views import RootURLRedirectView
from .views import set_language
from .views import StatusCheckView
from .views import UnsupportedBrowserView
from kolibri.core.device.api import PluginsViewSet
from kolibri.core.device.translation import i18n_patterns
from kolibri.plugins.utils.urls import get_urls as plugin_urls

app_name = "kolibri"

router = routers.SimpleRouter()

router.register(r"plugins", PluginsViewSet, basename="plugins")

# Patterns that we want to prefix because they need access to the current language
lang_prefixed_patterns = [
    url(r"^i18n/setlang/$", set_language, name="set_language"),
    url(r"^logout/$", logout_view, name="logout"),
    url(r"^redirectuser/$", RootURLRedirectView.as_view(), name="redirect_user"),
    url(r"^guestaccess/$", GuestRedirectView.as_view(), name="guest"),
    url(r"^unsupported/$", UnsupportedBrowserView.as_view(), name="unsupported"),
    url(r"^$", RootURLRedirectView.as_view(), name="root_redirect"),
    url(r"^", include(router.urls)),
]

core_urlpatterns = (
    [
        url(r"^api/", include("kolibri.core.api_urls")),
        url(r"", include(i18n_patterns(lang_prefixed_patterns))),
        url(r"", include("kolibri.core.content.urls")),
        url(r"^status/", StatusCheckView.as_view(), name="status_check"),
    ],
    "core",
)


urlpatterns = [url(r"", include(core_urlpatterns))]

urlpatterns += plugin_urls()
