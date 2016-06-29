"""
Kolibri core settings module
============================

This module is *not* the project settings but defines variables that can be
configured through the project settings - and their defaults.

If something in the core uses a custom project setting, it should use a
naming scheme in django.conf.settings like ``KOLIBRI_*``.

Please avoid depending on settings in kolibri.deployments.default.settings,
rather define the default here so we don't have multiple layers of defaults.
"""

from django.conf import settings

#: These plugins are automatically enabled if they exist at the first run of
#: Kolibri. After that, they are not searched for automatically since that would
#: require explicitly disabling them in case they were to be removed on purpose
#: from INSTALLED_APPS.
DEFAULT_PLUGINS = getattr(
    settings,
    'KOLIBRI_DEFAULT_PLUGINS',
    []
)

#: Skips automatically migrating the database when running kolibri commands
SKIP_AUTO_DATABASE_MIGRATION = getattr(
    settings,
    'KOLIBRI_SKIP_AUTO_DATABASE_MIGRATION',
    False
)
