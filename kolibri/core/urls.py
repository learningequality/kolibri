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
from __future__ import absolute_import, print_function, unicode_literals

from django.conf.urls import url

from kolibri.plugins.registry import get_urls as plugin_urls

from . import views


app_name = 'kolibri'

urlpatterns = plugin_urls() + [
    url('^$', views.IndexView.as_view(), name='index'),
]
