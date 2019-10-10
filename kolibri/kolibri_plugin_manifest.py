"""
This module exposes a 'plugins' list that is a list of module paths
for all plugins that Kolibri exposes.
This kolibri_plugin_manifest can be used by any Python package in order
to signal to Kolibri which plugins it makes available.
"""
from pkg_resources import resource_exists
from pkg_resources import resource_isdir
from pkg_resources import resource_listdir

plugins = []
for item in resource_listdir("kolibri.plugins", "."):
    try:
        if resource_isdir("kolibri.plugins", item) and resource_exists(
            "kolibri.plugins." + item, "kolibri_plugin.py"
        ):
            plugins.append("kolibri.plugins." + item)
    except ImportError:
        pass
    except NotImplementedError:
        pass
